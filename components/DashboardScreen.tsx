import React, { useState, useMemo } from 'react';
import { IconShield, IconBot, IconMessageSquare } from './icons';
import { StatCard } from './StatCard';
import { AdvancedFilters, defaultFilters, type FilterOptions } from './AdvancedFilters';
import type { AnalysisResult, Stats } from '../types';

interface DashboardScreenProps {
  results: AnalysisResult[];
  stats: Stats;
  onReset: () => void;
  onOpenChat: (result: AnalysisResult) => void;
  onOpenManualEntry?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ results, stats, onReset, onOpenChat, onOpenManualEntry }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);

  const filteredData = useMemo(() => {
    let filtered = results;

    // Filtre par texte de recherche
    if (filters.searchText) {
      const query = filters.searchText.toLowerCase();
      filtered = filtered.filter(item =>
        item.requirement.toLowerCase().includes(query) ||
        item.verificationPoint.toLowerCase().includes(query) ||
        item.scfMapping.toLowerCase().includes(query) ||
        item.iso27001Mapping.toLowerCase().includes(query) ||
        item.iso27002Mapping.toLowerCase().includes(query) ||
        item.cobit5Mapping.toLowerCase().includes(query) ||
        item.analysis.toLowerCase().includes(query) ||
        (item.threat && item.threat.toLowerCase().includes(query)) ||
        (item.risk && item.risk.toLowerCase().includes(query)) ||
        (item.controlImplementation && item.controlImplementation.toLowerCase().includes(query))
      );
    }

    // Filtre par frameworks
    if (filters.frameworks.scf) {
      filtered = filtered.filter(item => item.scfMapping && item.scfMapping !== 'Non mappé');
    }
    if (filters.frameworks.iso27001) {
      filtered = filtered.filter(item => item.iso27001Mapping && item.iso27001Mapping !== 'Non mappé');
    }
    if (filters.frameworks.iso27002) {
      filtered = filtered.filter(item => item.iso27002Mapping && item.iso27002Mapping !== 'Non mappé');
    }
    if (filters.frameworks.cobit5) {
      filtered = filtered.filter(item => item.cobit5Mapping && item.cobit5Mapping !== 'Non mappé');
    }

    // Filtre par champs enrichis
    if (filters.enriched.withThreat) {
      filtered = filtered.filter(item => item.threat && item.threat.length > 0);
    }
    if (filters.enriched.withRisk) {
      filtered = filtered.filter(item => item.risk && item.risk.length > 0);
    }
    if (filters.enriched.withImplementation) {
      filtered = filtered.filter(item => item.controlImplementation && item.controlImplementation.length > 0);
    }

    return filtered;
  }, [results, filters]);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Exigences" value={stats.total} />
        <StatCard title="Mappings SCF" value={stats.scf} percentage={stats.total > 0 ? (stats.scf / stats.total) * 100 : 0} />
        <StatCard title="Mappings ISO 27001" value={stats.iso27001} percentage={stats.total > 0 ? (stats.iso27001 / stats.total) * 100 : 0} />
        <StatCard title="Mappings COBIT 5" value={stats.cobit5} percentage={stats.total > 0 ? (stats.cobit5 / stats.total) * 100 : 0} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex items-center mb-4">
          <IconBot className="w-8 h-8 text-blue-600 mr-3"/>
          <h2 className="text-xl font-bold text-gray-800">Rapport d'Analyse IA</h2>
        </div>
        <p className="text-gray-600 mb-6">L'IA a analysé et mappé automatiquement vos exigences. Explorez les résultats ou engagez une conversation avec l'IA pour approfondir un point spécifique via l'onglet 'Exigences'.</p>
      </div>
    </div>
  );

  const renderRequirementsTable = () => (
    <div className="space-y-6">
      {/* Filtrage avancé */}
      <AdvancedFilters
        filters={filters}
        onChange={setFilters}
        totalResults={results.length}
        filteredResults={filteredData.length}
      />

      {/* Bouton Saisie manuelle */}
      {onOpenManualEntry && (
        <button
          onClick={onOpenManualEntry}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-3"
        >
          <span className="text-2xl">🤖</span>
          <span>Ajouter une nouvelle exigence avec analyse agentique IA (A2A + MCP)</span>
          <span className="text-2xl">✨</span>
        </button>
      )}

      <div className="bg-white rounded-lg shadow-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">N°</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Exigence & Point à vérifier</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mappings (SCF / ISO / COBIT)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Menaces & Risques</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Implémentation</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 align-top w-16">
                  <div className="font-bold text-gray-700">{item.id}</div>
                  {/* Badge si analyse agentique */}
                  {item.threat && item.risk && item.controlImplementation && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">
                      🤖 IA
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 align-top max-w-md">
                  <p className="font-semibold text-gray-800">{item.requirement}</p>
                  <p className="mt-2 text-gray-600 italic text-xs">✓ {item.verificationPoint}</p>
                </td>
                <td className="px-4 py-4 align-top text-xs max-w-xs">
                  <p><span className="font-bold text-blue-700">SCF:</span> {item.scfMapping}</p>
                  <p className="mt-1"><span className="font-bold text-green-700">ISO27001:</span> {item.iso27001Mapping}</p>
                  <p className="mt-1"><span className="font-bold text-green-700">ISO27002:</span> {item.iso27002Mapping}</p>
                  <p className="mt-1"><span className="font-bold text-purple-700">COBIT 5:</span> {item.cobit5Mapping}</p>
                </td>
                <td className="px-4 py-4 align-top max-w-sm text-xs">
                  {item.threat ? (
                    <div className="mb-3">
                      <span className="font-bold text-orange-700">🎯 Menace:</span>
                      <p className="text-gray-700 mt-1">{item.threat}</p>
                    </div>
                  ) : null}
                  {item.risk ? (
                    <div>
                      <span className="font-bold text-red-700">⚠️ Risque:</span>
                      <p className="text-gray-700 mt-1">{item.risk}</p>
                    </div>
                  ) : null}
                  {!item.threat && !item.risk && (
                    <span className="text-gray-400 italic">Non analysé</span>
                  )}
                </td>
                <td className="px-4 py-4 align-top max-w-sm text-xs">
                  {item.controlImplementation ? (
                    <div>
                      <span className="font-bold text-green-700">🔧 Guide:</span>
                      <p className="text-gray-700 mt-1">{item.controlImplementation}</p>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Non disponible</span>
                  )}
                </td>
                <td className="px-4 py-4 align-top">
                  <button
                    onClick={() => onOpenChat(item)}
                    className="p-2 text-gray-500 hover:bg-blue-100 hover:text-blue-600 rounded-full transition-colors"
                    title="Discuter avec l'IA"
                    aria-label={`Discuter avec l'IA sur l'exigence N°${item.id}`}
                  >
                    <IconMessageSquare className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-500">Aucun résultat trouvé pour votre recherche.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white text-gray-800 shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <IconShield className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold">GRC Compliance AI</h1>
          </div>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors"
          >
            Nouvelle Analyse
          </button>
        </div>
      </header>
      <div className="bg-white border-b sticky top-[76px] z-10">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              aria-selected={activeTab === 'dashboard'}
              role="tab"
            >
              Tableau de bord
            </button>
            <button
              onClick={() => setActiveTab('requirements')}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'requirements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              aria-selected={activeTab === 'requirements'}
              role="tab"
            >
              Exigences ({results.length})
            </button>
          </nav>
        </div>
      </div>
      <main className="container mx-auto px-6 py-8">
        {activeTab === 'dashboard' ? renderDashboard() : renderRequirementsTable()}
      </main>
    </div>
  );
};
