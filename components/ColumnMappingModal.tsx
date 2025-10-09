import React, { useState, useEffect } from 'react';
import { IconMapping, IconInfo, IconRefresh, IconCheck, IconEye } from './icons';
import type { ColumnMapping, ColumnSuggestion, ColumnPreview } from '../types';
import { suggestColumnMapping, getColumnPreview } from '../services/excelService';

interface ColumnMappingModalProps {
  isOpen: boolean;
  headers: string[];
  file: File | null;
  onConfirm: (mapping: ColumnMapping) => void;
  onClose: () => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({ isOpen, headers, file, onConfirm, onClose }) => {
  const [mapping, setMapping] = useState<ColumnMapping>({ id: '', requirement: '', verificationPoint: '' });
  const [suggestions, setSuggestions] = useState<ColumnSuggestion[]>([]);
  const [previews, setPreviews] = useState<Record<string, ColumnPreview>>({});
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const isMappingComplete = mapping.id && mapping.requirement && mapping.verificationPoint;

  // Auto-détection des colonnes quand les headers changent
  useEffect(() => {
    if (headers.length > 0) {
      const autoSuggestions = suggestColumnMapping(headers);
      setSuggestions(autoSuggestions);

      // Appliquer automatiquement les suggestions avec une confiance élevée
      const autoMapping: ColumnMapping = { id: '', requirement: '', verificationPoint: '' };
      autoSuggestions.forEach(suggestion => {
        if (suggestion.confidence >= 0.8) {
          autoMapping[suggestion.field] = suggestion.suggestedColumn;
        }
      });
      setMapping(autoMapping);
    }
  }, [headers]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, field: keyof ColumnMapping) => {
    setMapping(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handlePreviewColumn = async (columnName: string) => {
    if (!file || !columnName) return;

    setIsLoadingPreview(true);
    setShowPreview(columnName);

    try {
      if (!previews[columnName]) {
        const preview = await getColumnPreview(file, columnName);
        setPreviews(prev => ({ ...prev, [columnName]: preview }));
      }
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleResetMapping = () => {
    setMapping({ id: '', requirement: '', verificationPoint: '' });
    setShowPreview(null);
  };

  const getSuggestionForField = (field: keyof ColumnMapping) => {
    return suggestions.find(s => s.field === field);
  };

  const handleConfirm = () => {
    if (isMappingComplete) {
      onConfirm(mapping);
    }
  };

  if (!isOpen) return null;

  const requiredFields: { key: keyof ColumnMapping; label: string; description: string }[] = [
    {
      key: 'id',
      label: 'Colonne pour l\'identifiant (N°)',
      description: 'Colonne contenant un identifiant unique numérique pour chaque exigence'
    },
    {
      key: 'requirement',
      label: 'Colonne pour l\'exigence (Exigence extraite)',
      description: 'Colonne contenant le texte de l\'exigence ou de la politique'
    },
    {
      key: 'verificationPoint',
      label: 'Colonne pour le point à vérifier (Points à vérifier)',
      description: 'Colonne contenant les points de contrôle ou de vérification'
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mapping-modal-title"
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
        <header className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <IconMapping className="w-6 h-6 text-blue-600" aria-hidden="true"/>
            <h2 id="mapping-modal-title" className="text-xl font-bold text-gray-800">Mapper les Colonnes</h2>
          </div>
          <button
            type="button"
            onClick={handleResetMapping}
            className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            title="Réinitialiser le mapping"
          >
            <IconRefresh className="w-4 h-4" />
            <span>Réinitialiser</span>
          </button>
        </header>
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <IconInfo className="w-4 h-4 inline mr-2" />
              Les colonnes ont été automatiquement détectées et mappées quand possible.
              Vous pouvez ajuster les mappings ci-dessous et prévisualiser les données.
            </p>
          </div>
          {requiredFields.map(field => {
            const suggestion = getSuggestionForField(field.key);
            const selectedColumn = mapping[field.key];

            return (
              <div key={field.key} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label htmlFor={`mapping-${field.key}`} className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">{field.description}</p>
                  </div>
                  {selectedColumn && (
                    <button
                      type="button"
                      onClick={() => handlePreviewColumn(selectedColumn)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title="Prévisualiser les données"
                    >
                      <IconEye className="w-3 h-3" />
                      <span>Aperçu</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select
                    id={`mapping-${field.key}`}
                    value={selectedColumn}
                    onChange={(e) => handleSelectChange(e, field.key)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      suggestion && selectedColumn === suggestion.suggestedColumn
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                    aria-required="true"
                  >
                    <option value="" disabled>Sélectionner une colonne</option>
                    {headers.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>

                  {suggestion && selectedColumn === suggestion.suggestedColumn && (
                    <div className="absolute right-2 top-2">
                      <IconCheck className="w-4 h-4 text-green-600" title="Suggestion automatique appliquée" />
                    </div>
                  )}
                </div>

                {suggestion && selectedColumn !== suggestion.suggestedColumn && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                    <p className="text-xs text-yellow-800">
                      <strong>Suggestion:</strong> "{suggestion.suggestedColumn}"
                      <span className="text-yellow-600"> ({suggestion.reason})</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setMapping(prev => ({ ...prev, [field.key]: suggestion.suggestedColumn }))}
                      className="text-xs text-yellow-700 hover:text-yellow-900 underline mt-1"
                    >
                      Appliquer cette suggestion
                    </button>
                  </div>
                )}

                {/* Prévisualisation des données */}
                {showPreview === selectedColumn && selectedColumn && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Aperçu de "{selectedColumn}"
                    </h4>
                    {isLoadingPreview ? (
                      <p className="text-xs text-gray-500">Chargement...</p>
                    ) : previews[selectedColumn] ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <span>Type: {previews[selectedColumn].dataType}</span>
                          {previews[selectedColumn].hasEmptyValues && (
                            <span className="text-orange-600">⚠ Contient des valeurs vides</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-700">Exemples de données:</p>
                          {previews[selectedColumn].sampleData.slice(0, 3).map((data, idx) => (
                            <div key={idx} className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                              {data || <em className="text-gray-400">(vide)</em>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <footer className="p-4 bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isMappingComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            Confirmer le Mapping
          </button>
        </footer>
      </div>
    </div>
  );
};
