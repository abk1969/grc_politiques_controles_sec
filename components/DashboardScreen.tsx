import React, { useState, useMemo } from 'react';
import { IconShield, IconSearch, IconBot, IconMessageSquare } from './icons';
import { StatCard } from './StatCard';
import { useDebounce } from '../hooks/useDebounce';
import type { AnalysisResult, Stats } from '../types';

interface DashboardScreenProps {
  results: AnalysisResult[];
  stats: Stats;
  onReset: () => void;
  onOpenChat: (result: AnalysisResult) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ results, stats, onReset, onOpenChat }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const filteredData = useMemo(() => {
    if (!debouncedSearchQuery) return results;
    const query = debouncedSearchQuery.toLowerCase();
    return results.filter(item =>
      item.requirement.toLowerCase().includes(query) ||
      item.verificationPoint.toLowerCase().includes(query)
    );
  }, [results, debouncedSearchQuery]);

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
      <div className="relative">
        <IconSearch className="w-5 h-5 text-gray-400 absolute top-1/2 left-4 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Rechercher une exigence ou un point de contrôle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">N°</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Exigence & Point à vérifier</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mappings (SCF / ISO / COBIT)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Analyse IA</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 align-top w-16">
                  <div className="font-bold text-gray-700">{item.id}</div>
                </td>
                <td className="px-4 py-4 align-top max-w-md">
                  <p className="font-semibold text-gray-800">{item.requirement}</p>
                  <p className="mt-2 text-gray-600 italic">Vérification: {item.verificationPoint}</p>
                </td>
                <td className="px-4 py-4 align-top text-xs max-w-xs">
                  <p><span className="font-bold text-blue-700">SCF:</span> {item.scfMapping}</p>
                  <p className="mt-1"><span className="font-bold text-green-700">ISO27001:</span> {item.iso27001Mapping}</p>
                  <p className="mt-1"><span className="font-bold text-green-700">ISO27002:</span> {item.iso27002Mapping}</p>
                  <p className="mt-1"><span className="font-bold text-purple-700">COBIT 5:</span> {item.cobit5Mapping}</p>
                </td>
                <td className="px-4 py-4 align-top text-gray-600 max-w-sm">{item.analysis}</td>
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
