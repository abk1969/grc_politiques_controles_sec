/**
 * Modal pour afficher l'historique des imports et charger un import précédent
 * Permet de retrouver les analyses passées sans refaire les inférences LLM coûteuses
 */

import { useState, useEffect } from 'react';
import { XIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon, DownloadIcon } from './icons';
import { Loader } from './Loader';
import { getImportSessions, loadImportSession, type ImportSession } from '../services/mlService';
import type { AnalysisResult } from '../types';

interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession: (results: AnalysisResult[], session: ImportSession) => void;
}

export function ImportHistoryModal({ isOpen, onClose, onLoadSession }: ImportHistoryModalProps) {
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Charger les sessions au montage
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = { limit: 50, offset: 0 };

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterSource !== 'all') {
        params.analysis_source = filterSource;
      }

      const response = await getImportSessions(params);

      if (response.success) {
        setSessions(response.sessions);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSession = async (sessionId: number) => {
    setLoadingSessionId(sessionId);
    setError(null);

    try {
      const response = await loadImportSession(sessionId);

      if (response.success) {
        onLoadSession(response.results, response.session);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de la session');
    } finally {
      setLoadingSessionId(null);
    }
  };

  // Filtrer les sessions
  useEffect(() => {
    loadSessions();
  }, [filterStatus, filterSource]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertCircleIcon className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'claude':
        return 'bg-purple-100 text-purple-800';
      case 'ml':
        return 'bg-blue-100 text-blue-800';
      case 'gemini':
        return 'bg-green-100 text-green-800';
      case 'hybrid':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">Historique des imports</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <XIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Filtres */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Tous</option>
                <option value="completed">Terminés</option>
                <option value="processing">En cours</option>
                <option value="failed">Échoués</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source d'analyse
              </label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Toutes</option>
                <option value="claude">Claude</option>
                <option value="ml">ML Open-Source</option>
                <option value="gemini">Gemini</option>
                <option value="hybrid">Hybride</option>
                <option value="pending">En attente</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <Loader />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {!loading && sessions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ClockIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Aucun import trouvé</p>
              <p className="text-sm mt-2">Importez un fichier Excel pour commencer</p>
            </div>
          )}

          {!loading && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(session.status)}
                        <h3 className="text-lg font-semibold text-gray-800 truncate">
                          {session.filename}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getSourceBadgeColor(
                            session.analysis_source
                          )}`}
                        >
                          {session.analysis_source.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mt-3">
                        <div>
                          <span className="font-medium">Date:</span>{' '}
                          {formatDate(session.import_date)}
                        </div>
                        <div>
                          <span className="font-medium">Exigences:</span>{' '}
                          {session.total_requirements}
                        </div>
                        <div>
                          <span className="font-medium">Feuille:</span>{' '}
                          {session.source_sheet || 'N/A'}
                        </div>
                      </div>

                      {session.tags && (
                        <div className="mt-2 text-xs text-gray-500">
                          Tags: {session.tags}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleLoadSession(session.id)}
                      disabled={loadingSessionId === session.id || session.status !== 'completed'}
                      className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                        session.status === 'completed' && loadingSessionId !== session.id
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      } transition-colors`}
                    >
                      {loadingSessionId === session.id ? (
                        <>
                          <Loader size="small" />
                          Chargement...
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="w-4 h-4" />
                          Charger
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Total: <span className="font-semibold">{sessions.length}</span> import(s) trouvé(s)
          </p>
        </div>
      </div>
    </div>
  );
}
