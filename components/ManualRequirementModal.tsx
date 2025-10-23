import React, { useState } from 'react';
import { analyzeManualRequirement } from '../services/agenticService';
import type { AnalysisResult } from '../types';
import { Loader } from './Loader';

interface ManualRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRequirement: (result: AnalysisResult) => void;
  nextId: number; // ID pour la nouvelle exigence
}

export const ManualRequirementModal: React.FC<ManualRequirementModalProps> = ({
  isOpen,
  onClose,
  onAddRequirement,
  nextId
}) => {
  const [requirementText, setRequirementText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!requirementText.trim()) {
      setError('Veuillez saisir une exigence');
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      const result = await analyzeManualRequirement(requirementText, nextId);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToResults = () => {
    if (analysisResult) {
      onAddRequirement(analysisResult);
      handleClose();
    }
  };

  const handleClose = () => {
    setRequirementText('');
    setAnalysisResult(null);
    setError(null);
    setIsAnalyzing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">
            🤖 Analyse Agentique IA - Nouvelle Exigence
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            title="Fermer"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Input Section */}
          {!analysisResult && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Saisissez votre exigence de sécurité :
                </label>
                <textarea
                  value={requirementText}
                  onChange={(e) => setRequirementText(e.target.value)}
                  placeholder="Exemple : L'organisation doit mettre en place un système de gestion des accès privilégiés avec authentification multi-facteurs..."
                  className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isAnalyzing}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  🧠 L'IA va automatiquement générer :
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Point de vérification</li>
                  <li>✓ Contrôle SCF avec référence</li>
                  <li>✓ Contrôle COBIT 5 avec référence</li>
                  <li>✓ Référence ISO 27001:2022</li>
                  <li>✓ Référence ISO 27002:2022</li>
                  <li>✓ Menace associée</li>
                  <li>✓ Risque associé</li>
                  <li>✓ Guide d'implémentation du contrôle</li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                  <strong className="font-bold">Erreur: </strong>
                  <span>{error}</span>
                </div>
              )}

              {isAnalyzing && (
                <div className="my-6">
                  <Loader text="L'IA analyse votre exigence en profondeur..." />
                </div>
              )}

              {!isAnalyzing && (
                <button
                  onClick={handleAnalyze}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  🚀 Analyser avec l'IA
                </button>
              )}
            </div>
          )}

          {/* Results Section */}
          {analysisResult && !isAnalyzing && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                <h3 className="font-bold text-green-900 text-lg mb-2">
                  ✅ Analyse terminée avec succès !
                </h3>
                <p className="text-green-800 text-sm">
                  L'IA a généré tous les mappings et analyses pour votre exigence.
                </p>
              </div>

              {/* Exigence */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Exigence :</h4>
                <p className="text-gray-700">{analysisResult.requirement}</p>
              </div>

              {/* Point de vérification */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Point de vérification :</h4>
                <p className="text-gray-700">{analysisResult.verificationPoint}</p>
              </div>

              {/* Mappings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">SCF :</h4>
                  <p className="text-purple-800 text-sm">{analysisResult.scfMapping}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">COBIT 5 :</h4>
                  <p className="text-indigo-800 text-sm">{analysisResult.cobit5Mapping}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">ISO 27001:2022 :</h4>
                  <p className="text-blue-800 text-sm">{analysisResult.iso27001Mapping}</p>
                </div>
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                  <h4 className="font-semibold text-cyan-900 mb-2">ISO 27002:2022 :</h4>
                  <p className="text-cyan-800 text-sm">{analysisResult.iso27002Mapping}</p>
                </div>
              </div>

              {/* Menace */}
              {analysisResult.threat && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">🎯 Menace associée :</h4>
                  <p className="text-orange-800">{analysisResult.threat}</p>
                </div>
              )}

              {/* Risque */}
              {analysisResult.risk && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">⚠️ Risque associé :</h4>
                  <p className="text-red-800">{analysisResult.risk}</p>
                </div>
              )}

              {/* Implémentation */}
              {analysisResult.controlImplementation && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">🔧 Guide d'implémentation :</h4>
                  <p className="text-green-800">{analysisResult.controlImplementation}</p>
                </div>
              )}

              {/* Analyse */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">💡 Justification :</h4>
                <p className="text-gray-700 text-sm italic">{analysisResult.analysis}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleAddToResults}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  ✅ Ajouter aux résultats
                </button>
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="flex-1 bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  🔄 Nouvelle analyse
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
