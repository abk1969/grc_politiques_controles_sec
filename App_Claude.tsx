import React, { useState, useMemo, useCallback } from 'react';
import { parseExcelFile, getExcelHeaders } from './services/excelService';
import { analyzeComplianceData } from './services/claudeServiceSecure';
import type { AnalysisResult, Stats, ColumnMapping } from './types';
import { AppState } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FileUploadScreen } from './components/FileUploadScreen';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import { DashboardScreen } from './components/DashboardScreen';
import { ChatModalClaude } from './components/ChatModalClaude';

// Main App Component
export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [chatRequirement, setChatRequirement] = useState<AnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

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
    try {
      const requirements = await parseExcelFile(selectedFile, mapping);
      if (requirements.length === 0) {
        throw new Error("Aucune exigence valide trouvée dans le fichier avec le mappage fourni.");
      }

      setAppState(AppState.ANALYZING);
      const results = await analyzeComplianceData(requirements);
      setAnalysisResults(results);
      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
      setAppState(AppState.ERROR);
    }
  }, [selectedFile]);

  const handleReset = () => {
    setAnalysisResults([]);
    setError(null);
    setChatRequirement(null);
    setSelectedFile(null);
    setDetectedHeaders([]);
    setAppState(AppState.IDLE);
  };

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
        <FileUploadScreen onFileSelect={handleFileSelect} appState={appState} error={error} />
        <ColumnMappingModal
          isOpen={appState === AppState.MAPPING}
          headers={detectedHeaders}
          file={selectedFile}
          onConfirm={handleConfirmMapping}
          onClose={handleReset}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardScreen results={analysisResults} stats={stats} onReset={handleReset} onOpenChat={setChatRequirement} />
      {chatRequirement && <ChatModalClaude requirement={chatRequirement} onClose={() => setChatRequirement(null)} />}
    </ErrorBoundary>
  );
}
