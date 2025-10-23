import React, { useState, useMemo, useCallback } from 'react';
import { parseExcelFile, getExcelHeaders } from './services/excelService';
import { analyzeComplianceData } from './services/claudeService';
import { uploadExcelFile, analyzeBatch, getRequirements, saveClaudeResults, type ImportSession } from './services/mlService';
import type { AnalysisResult, Stats, ColumnMapping } from './types';
import { AppState } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FileUploadScreen } from './components/FileUploadScreen';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import { DashboardScreen } from './components/DashboardScreen';
import { ChatModalClaude } from './components/ChatModalClaude';
import { ImportHistoryModal } from './components/ImportHistoryModal';
import { ManualRequirementModal } from './components/ManualRequirementModal';

// Main App Component - VERSION HYBRIDE (Claude + ML)
export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [chatRequirement, setChatRequirement] = useState<AnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

  // Nouveau: Tracker les résultats ML en arrière-plan
  const [mlAnalysisRunning, setMlAnalysisRunning] = useState(false);
  const [mlResults, setMlResults] = useState<any[]>([]);

  // Historique des imports
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [currentImportSessionId, setCurrentImportSessionId] = useState<number | null>(null);

  // Progression de l'analyse Claude
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [abortControllerRef, setAbortControllerRef] = useState<AbortController | null>(null);

  // Modal de saisie manuelle d'exigences
  const [manualEntryModalOpen, setManualEntryModalOpen] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setSelectedFile(file);
    try {
      const headers = await getExcelHeaders(file);
      setDetectedHeaders(headers);
      setAppState(AppState.MAPPING);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la lecture des en-têtes.');
      setAppState(AppState.ERROR);
    }
  }, []);

  const handleConfirmMapping = useCallback(async (mapping: ColumnMapping) => {
    if (!selectedFile) return;
    setError(null);
    setAppState(AppState.PARSING);

    // Créer un AbortController pour pouvoir annuler
    const abortController = new AbortController();
    setAbortControllerRef(abortController);

    try {
      // ÉTAPE 1: Parser le fichier Excel (côté client)
      const requirements = await parseExcelFile(selectedFile, mapping);
      if (requirements.length === 0) {
        throw new Error("Aucune exigence valide trouvée dans le fichier avec le mappage fourni.");
      }

      console.log(`📊 ${requirements.length} exigences extraites du fichier`);

      // Vérifier si annulé
      if (abortController.signal.aborted) {
        throw new Error('Traitement annulé par l\'utilisateur');
      }

      // ÉTAPE 2: Uploader vers le backend ML (PostgreSQL)
      console.log('💾 Sauvegarde dans PostgreSQL...');
      let importSessionId: number | null = null;
      try {
        const uploadResult = await uploadExcelFile(selectedFile);
        importSessionId = uploadResult.import_session_id || null;
        setCurrentImportSessionId(importSessionId);
        console.log(`✅ ${uploadResult.total_imported} exigences enregistrées (Session: ${importSessionId})`);
      } catch (uploadError) {
        console.warn('⚠️ Erreur lors de la sauvegarde PostgreSQL:', uploadError);
        // Continuer quand même avec Claude
      }

      // Vérifier si annulé
      if (abortController.signal.aborted) {
        throw new Error('Traitement annulé par l\'utilisateur');
      }

      // ÉTAPE 3: Analyser avec Claude (comme avant)
      setAppState(AppState.ANALYZING);
      setProgressTotal(requirements.length);
      setProgressCurrent(0);
      console.log('🤖 Analyse avec Claude en cours...');

      const claudeResults = await analyzeComplianceData(
        requirements,
        (current: number) => {
          // Callback de progression
          setProgressCurrent(current);
        },
        abortController.signal
      );

      setAnalysisResults(claudeResults);
      setAppState(AppState.SUCCESS);
      setProgressCurrent(0);
      setProgressTotal(0);
      console.log(`✅ Analyse Claude terminée: ${claudeResults.length} résultats`);

      // ÉTAPE 3.5: Sauvegarder les résultats Claude dans PostgreSQL
      try {
        console.log('💾 Sauvegarde des résultats Claude dans PostgreSQL...');
        const saveResult = await saveClaudeResults(claudeResults, selectedFile.name, importSessionId || undefined);
        console.log(`✅ ${saveResult.saved_count} résultats Claude sauvegardés (Session: ${saveResult.import_session_id})`);
        if (!importSessionId) {
          setCurrentImportSessionId(saveResult.import_session_id);
        }
      } catch (saveError) {
        console.warn('⚠️ Erreur lors de la sauvegarde des résultats Claude:', saveError);
      }

      // ÉTAPE 4: Lancer l'analyse ML en arrière-plan (ne bloque pas l'UI)
      setMlAnalysisRunning(true);
      console.log('🔬 Lancement de l\'analyse ML en arrière-plan...');

      // Analyse ML asynchrone
      setTimeout(async () => {
        try {
          // Récupérer les exigences depuis PostgreSQL
          const dbRequirements = await getRequirements(0, 1000, 'pending');

          if (dbRequirements.length > 0) {
            console.log(`🧠 Analyse ML de ${dbRequirements.length} exigences...`);

            // Analyser par batch de 20
            const batchSize = 20;
            const requirementIds = dbRequirements.map(r => r.id);

            for (let i = 0; i < requirementIds.length; i += batchSize) {
              const batch = requirementIds.slice(i, i + batchSize);
              const batchResult = await analyzeBatch(batch);
              console.log(`✅ ML Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requirementIds.length / batchSize)} terminé`);

              // Stocker les résultats ML
              setMlResults(prev => [...prev, ...batchResult.results]);
            }

            console.log('✅ Analyse ML terminée!');
          }
        } catch (mlError) {
          console.error('❌ Erreur analyse ML:', mlError);
        } finally {
          setMlAnalysisRunning(false);
        }
      }, 1000); // Démarre 1 seconde après l'affichage des résultats Claude

    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
      setAppState(AppState.ERROR);
      setProgressCurrent(0);
      setProgressTotal(0);
      setAbortControllerRef(null);
    }
  }, [selectedFile]);

  const handleAbort = useCallback(() => {
    if (abortControllerRef) {
      abortControllerRef.abort();
      setError('Traitement annulé par l\'utilisateur');
      setAppState(AppState.ERROR);
      setProgressCurrent(0);
      setProgressTotal(0);
      setAbortControllerRef(null);
    }
  }, [abortControllerRef]);

  const handleReset = () => {
    // Annuler tout traitement en cours
    if (abortControllerRef) {
      abortControllerRef.abort();
    }

    setAnalysisResults([]);
    setMlResults([]);
    setError(null);
    setChatRequirement(null);
    setSelectedFile(null);
    setDetectedHeaders([]);
    setMlAnalysisRunning(false);
    setCurrentImportSessionId(null);
    setProgressCurrent(0);
    setProgressTotal(0);
    setAbortControllerRef(null);
    setAppState(AppState.IDLE);
  };

  const handleLoadFromHistory = useCallback((results: AnalysisResult[], session: ImportSession) => {
    console.log(`📂 Chargement de la session ${session.id}: ${results.length} résultats`);
    setAnalysisResults(results);
    setCurrentImportSessionId(session.id);
    setAppState(AppState.SUCCESS);
    setError(null);
    setMlAnalysisRunning(false);
  }, []);

  const handleAddManualRequirement = useCallback((newRequirement: AnalysisResult) => {
    console.log('✅ Ajout d\'une nouvelle exigence analysée par orchestration multi-agents');

    // Ajuster l'ID pour éviter les conflits
    const maxId = analysisResults.length > 0
      ? Math.max(...analysisResults.map(r => r.id))
      : 0;

    const requirementWithNewId = {
      ...newRequirement,
      id: maxId + 1
    };

    setAnalysisResults(prev => [...prev, requirementWithNewId]);
    setManualEntryModalOpen(false);

    console.log(`✅ Exigence #${requirementWithNewId.id} ajoutée avec succès`);
  }, [analysisResults]);

  const stats = useMemo<Stats>(
    () =>
      analysisResults.reduce(
        (acc, item) => ({
          total: acc.total + 1,
          scf: acc.scf + (item.scfMapping ? 1 : 0),
          iso27001: acc.iso27001 + (item.iso27001Mapping ? 1 : 0),
          cobit5: acc.cobit5 + (item.cobit5Mapping ? 1 : 0),
        }),
        { total: 0, scf: 0, iso27001: 0, cobit5: 0 }
      ),
    [analysisResults]
  );

  if (appState !== AppState.SUCCESS) {
    return (
      <ErrorBoundary>
        <FileUploadScreen
          onFileSelect={handleFileSelect}
          appState={appState}
          error={error}
          onOpenHistory={() => setHistoryModalOpen(true)}
          progressCurrent={progressCurrent}
          progressTotal={progressTotal}
          onAbort={handleAbort}
        />
        <ColumnMappingModal
          isOpen={appState === AppState.MAPPING}
          headers={detectedHeaders}
          file={selectedFile}
          onConfirm={handleConfirmMapping}
          onClose={handleReset}
        />
        <ImportHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          onLoadSession={handleLoadFromHistory}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {/* Indicateur ML en cours */}
      {mlAnalysisRunning && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#4CAF50',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div className="spinner" style={{
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            animation: 'spin 1s linear infinite'
          }} />
          <span>🧠 Analyse ML en cours... ({mlResults.length} traités)</span>
        </div>
      )}

      <DashboardScreen
        results={analysisResults}
        stats={stats}
        onReset={handleReset}
        onOpenChat={setChatRequirement}
        onOpenManualEntry={() => setManualEntryModalOpen(true)}
      />
      {chatRequirement && <ChatModalClaude requirement={chatRequirement} onClose={() => setChatRequirement(null)} />}
      <ManualRequirementModal
        isOpen={manualEntryModalOpen}
        onClose={() => setManualEntryModalOpen(false)}
        onAddRequirement={handleAddManualRequirement}
        nextId={analysisResults.length > 0 ? Math.max(...analysisResults.map(r => r.id)) + 1 : 1}
      />

      {/* CSS pour l'animation du spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </ErrorBoundary>
  );
}
