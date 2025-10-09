import React from 'react';
import { IconShield, IconUpload, ClockIcon } from './icons';
import { Loader } from './Loader';
import { AppState } from '../types';

interface FileUploadScreenProps {
  onFileSelect: (file: File) => void;
  appState: AppState;
  error: string | null;
  onOpenHistory?: () => void;
  progressCurrent?: number;
  progressTotal?: number;
  onAbort?: () => void;
}

export const FileUploadScreen: React.FC<FileUploadScreenProps> = ({
  onFileSelect,
  appState,
  error,
  onOpenHistory,
  progressCurrent = 0,
  progressTotal = 0,
  onAbort
}) => {
  const isLoading = appState === AppState.PARSING || appState === AppState.ANALYZING;
  const loadingText = appState === AppState.PARSING ? "Analyse du fichier Excel..." : "L'IA analyse les données...";
  const showProgress = appState === AppState.ANALYZING && progressTotal > 0;
  const progressPercent = progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full transform transition-all hover:scale-[1.01]">
        {/* Bouton Historique toujours visible en haut à droite */}
        {onOpenHistory && (
          <div className="flex justify-end mb-4">
            <button
              onClick={onOpenHistory}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
              title="Voir l'historique des imports précédents"
            >
              <ClockIcon className="w-4 h-4" />
              Historique
            </button>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
            <IconShield className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GRC Compliance Mapping AI</h1>
          <p className="text-gray-600">Analyse intelligente avec Gemini AI</p>
        </div>

        {isLoading ? (
          <div className="my-8">
            <Loader text={loadingText} />
            {showProgress && (
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Analyse en cours...</span>
                  <span>{progressCurrent} / {progressTotal} exigences ({progressPercent}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {onAbort && (
                  <button
                    onClick={onAbort}
                    className="w-full px-4 py-2 mt-4 bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 transition-colors font-medium"
                  >
                    ⏹ Arrêter le traitement
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg p-6 text-center">
            <IconUpload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-4">Chargez votre fichier Excel</h2>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <label className="cursor-pointer inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                Sélectionner un fichier
                <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
              </label>
              {onOpenHistory && (
                <button
                  onClick={onOpenHistory}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg shadow-md hover:bg-blue-50 transition-colors"
                >
                  <ClockIcon className="w-5 h-5" />
                  Historique des imports
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
            <strong className="font-bold">Erreur: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-6 mt-6">
          <h3 className="font-semibold mb-3">Prérequis du fichier Excel :</h3>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Une feuille nommée : <code className="bg-gray-200 text-gray-800 px-1 rounded">Politiques</code> (ou la première feuille sera utilisée automatiquement)</li>
            <li>Doit contenir les colonnes pour l'identifiant, l'exigence et le point de vérification.</li>
            <li>La première ligne doit contenir les en-têtes de colonnes.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
