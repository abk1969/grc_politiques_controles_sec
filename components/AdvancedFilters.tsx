import React, { useState } from 'react';

export interface FilterOptions {
  searchText: string;
  frameworks: {
    scf: boolean;
    iso27001: boolean;
    iso27002: boolean;
    cobit5: boolean;
  };
  enriched: {
    withThreat: boolean;
    withRisk: boolean;
    withImplementation: boolean;
  };
}

export const defaultFilters: FilterOptions = {
  searchText: '',
  frameworks: {
    scf: false,
    iso27001: false,
    iso27002: false,
    cobit5: false,
  },
  enriched: {
    withThreat: false,
    withRisk: false,
    withImplementation: false,
  },
};

interface AdvancedFiltersProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  totalResults: number;
  filteredResults: number;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onChange,
  totalResults,
  filteredResults,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchChange = (value: string) => {
    onChange({ ...filters, searchText: value });
  };

  const handleFrameworkToggle = (framework: keyof FilterOptions['frameworks']) => {
    onChange({
      ...filters,
      frameworks: {
        ...filters.frameworks,
        [framework]: !filters.frameworks[framework],
      },
    });
  };

  const handleEnrichedToggle = (field: keyof FilterOptions['enriched']) => {
    onChange({
      ...filters,
      enriched: {
        ...filters.enriched,
        [field]: !filters.enriched[field],
      },
    });
  };

  const handleReset = () => {
    onChange(defaultFilters);
  };

  const hasActiveFilters =
    filters.searchText !== '' ||
    Object.values(filters.frameworks).some(v => v) ||
    Object.values(filters.enriched).some(v => v);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🔍 Filtrage avancé
            </h3>
            {hasActiveFilters && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {filteredResults} / {totalResults} résultats
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                🗑️ Réinitialiser
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              {isExpanded ? '▲ Masquer' : '▼ Afficher'}
            </button>
          </div>
        </div>

        {/* Quick Search (always visible) */}
        <div className="mt-4">
          <input
            type="text"
            value={filters.searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="🔎 Rechercher dans les exigences, points de vérification, mappings..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="px-6 py-4 space-y-6">
          {/* Framework Filters */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Filtrer par référentiel :</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.frameworks.scf}
                  onChange={() => handleFrameworkToggle('scf')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  SCF
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.frameworks.iso27001}
                  onChange={() => handleFrameworkToggle('iso27001')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  ISO 27001
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.frameworks.iso27002}
                  onChange={() => handleFrameworkToggle('iso27002')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  ISO 27002
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.frameworks.cobit5}
                  onChange={() => handleFrameworkToggle('cobit5')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  COBIT 5
                </span>
              </label>
            </div>
          </div>

          {/* Enriched Fields Filters */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Filtrer par contenu enrichi :</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.enriched.withThreat}
                  onChange={() => handleEnrichedToggle('withThreat')}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  🎯 Avec menace identifiée
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.enriched.withRisk}
                  onChange={() => handleEnrichedToggle('withRisk')}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  ⚠️ Avec risque identifié
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.enriched.withImplementation}
                  onChange={() => handleEnrichedToggle('withImplementation')}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  🔧 Avec guide d'implémentation
                </span>
              </label>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Astuce :</strong> Combinez plusieurs filtres pour affiner votre recherche.
              Les champs enrichis (menace, risque, implémentation) sont disponibles pour les exigences
              analysées avec le système agentique IA.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
