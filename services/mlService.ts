/**
 * Service ML Backend - Communication avec l'API Python FastAPI
 * Remplace les appels coûteux à Claude/Gemini par des modèles ML open-source
 */

import type { Requirement, AnalysisResult } from '../types';

// Configuration de l'API Backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

// Custom error classes
export class MLAPIError extends Error {
  constructor(message: string, public statusCode?: number, public originalError?: unknown) {
    super(message);
    this.name = 'MLAPIError';
  }
}

/**
 * Vérifie que le backend est accessible
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Backend non accessible: ${response.status}`);
    }
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Erreur de connexion au backend ML:', error);
    return false;
  }
};

/**
 * Upload un fichier Excel et importe les exigences dans la base de données
 */
export const uploadExcelFile = async (file: File): Promise<{
  success: boolean;
  total_imported: number;
  sheets: Array<{ sheet_name: string; rows_imported: number }>;
  message: string;
}> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/import/excel`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
      throw new MLAPIError(
        errorData.detail || `Erreur HTTP ${response.status}`,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MLAPIError) {
      throw error;
    }
    throw new MLAPIError(
      "Impossible de se connecter au backend ML. Assurez-vous qu'il est lancé (port 8000).",
      undefined,
      error
    );
  }
};

/**
 * Récupère toutes les exigences depuis la base de données
 */
export const getRequirements = async (
  skip: number = 0,
  limit: number = 1000,
  status?: 'pending' | 'analyzed' | 'manual'
): Promise<Requirement[]> => {
  try {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    if (status) {
      params.append('status', status);
    }

    const response = await fetch(`${API_BASE_URL}/api/requirements?${params}`);

    if (!response.ok) {
      throw new MLAPIError(`Erreur HTTP ${response.status}`, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MLAPIError) {
      throw error;
    }
    throw new MLAPIError('Erreur lors de la récupération des exigences', undefined, error);
  }
};

/**
 * Analyse un lot d'exigences avec le modèle ML
 */
export const analyzeBatch = async (requirementIds: number[]): Promise<{
  success: boolean;
  analyzed_count: number;
  results: Array<{
    requirement_id: number;
    best_match?: {
      control_id: string;
      control_title: string;
      similarity_score: number;
      auto_mapped: boolean;
    };
    alternatives?: Array<{
      control_id: string;
      control_title: string;
      similarity_score: number;
    }>;
    status: 'success' | 'error' | 'no_match';
    message?: string;
  }>;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requirement_ids: requirementIds }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
      throw new MLAPIError(
        errorData.detail || `Erreur HTTP ${response.status}`,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MLAPIError) {
      throw error;
    }
    throw new MLAPIError("Erreur lors de l'analyse ML", undefined, error);
  }
};

/**
 * Recherche les contrôles SCF similaires à une exigence
 */
export const findSimilarControls = async (
  requirementText: string,
  topK: number = 5
): Promise<Array<{
  control_id: string;
  control_title: string;
  control_description?: string;
  similarity_score: number;
  domain?: string;
  category?: string;
}>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze/similarity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requirement_text: requirementText,
        top_k: topK,
      }),
    });

    if (!response.ok) {
      throw new MLAPIError(`Erreur HTTP ${response.status}`, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MLAPIError) {
      throw error;
    }
    throw new MLAPIError('Erreur lors de la recherche de similarité', undefined, error);
  }
};

/**
 * Récupère les statistiques globales
 */
export const getStats = async (): Promise<{
  total_requirements: number;
  analyzed: number;
  pending: number;
  manual: number;
  total_mappings: number;
  completion_rate: number;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats`);

    if (!response.ok) {
      throw new MLAPIError(`Erreur HTTP ${response.status}`, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MLAPIError) {
      throw error;
    }
    throw new MLAPIError('Erreur lors de la récupération des statistiques', undefined, error);
  }
};

/**
 * Récupère les exigences avec leurs mappings (version complète pour le dashboard)
 */
export const getAnalysisResults = async (): Promise<AnalysisResult[]> => {
  try {
    // Récupérer uniquement les exigences analysées
    const requirements = await getRequirements(0, 1000, 'analyzed');

    // Transformer en AnalysisResult
    // Note: Le backend devrait retourner les mappings joints
    // Pour l'instant, on fait une conversion basique
    const results: AnalysisResult[] = requirements.map((req) => ({
      id: req.id,
      requirement: req.requirement,
      verificationPoint: req.verificationPoint,
      // Ces champs viendront des mappings joints dans une version future
      scfMapping: '(À mapper)',
      iso27001Mapping: '(À mapper)',
      iso27002Mapping: '(À mapper)',
      cobit5Mapping: '(À mapper)',
      analysis: 'Mapping ML disponible',
    }));

    return results;
  } catch (error) {
    if (error instanceof MLAPIError) {
      throw error;
    }
    throw new MLAPIError('Erreur lors de la récupération des résultats', undefined, error);
  }
};

/**
 * Flux complet : Upload + Analyse automatique
 * Cette fonction combine l'upload Excel et l'analyse ML en une seule opération
 */
export const uploadAndAnalyze = async (file: File): Promise<{
  uploadResult: {
    success: boolean;
    total_imported: number;
    message: string;
  };
  analysisResult: {
    success: boolean;
    analyzed_count: number;
  };
  finalResults: AnalysisResult[];
}> => {
  try {
    // Étape 1 : Upload du fichier
    console.log('📤 Upload du fichier Excel...');
    const uploadResult = await uploadExcelFile(file);

    if (!uploadResult.success) {
      throw new MLAPIError("L'upload du fichier a échoué");
    }

    console.log(`✅ ${uploadResult.total_imported} exigences importées`);

    // Étape 2 : Récupérer les IDs des exigences importées (pending)
    console.log('🔍 Récupération des exigences à analyser...');
    const pendingRequirements = await getRequirements(0, 1000, 'pending');

    if (pendingRequirements.length === 0) {
      throw new MLAPIError('Aucune exigence à analyser');
    }

    const requirementIds = pendingRequirements.map((req) => req.id);
    console.log(`📊 ${requirementIds.length} exigences à analyser`);

    // Étape 3 : Analyser par batch de 20 (pour éviter les timeouts)
    const BATCH_SIZE = 20;
    let totalAnalyzed = 0;

    for (let i = 0; i < requirementIds.length; i += BATCH_SIZE) {
      const batch = requirementIds.slice(i, i + BATCH_SIZE);
      console.log(`🤖 Analyse du batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(requirementIds.length / BATCH_SIZE)}...`);

      const batchResult = await analyzeBatch(batch);
      totalAnalyzed += batchResult.analyzed_count;
    }

    console.log(`✅ ${totalAnalyzed} exigences analysées`);

    // Étape 4 : Récupérer les résultats finaux
    const finalResults = await getAnalysisResults();

    return {
      uploadResult: {
        success: uploadResult.success,
        total_imported: uploadResult.total_imported,
        message: uploadResult.message,
      },
      analysisResult: {
        success: true,
        analyzed_count: totalAnalyzed,
      },
      finalResults,
    };
  } catch (error) {
    if (error instanceof MLAPIError) {
      throw error;
    }
    throw new MLAPIError('Erreur lors du flux upload + analyse', undefined, error);
  }
};

// ============================================
// Import Sessions - Historique des imports
// ============================================

export interface ImportSession {
  id: number;
  filename: string;
  source_sheet: string | null;
  import_date: string;
  total_requirements: number;
  analysis_source: 'pending' | 'claude' | 'ml' | 'gemini' | 'hybrid';
  status: 'processing' | 'completed' | 'failed';
  tags: string | null;
  metadata: Record<string, any> | null;
}

/**
 * Récupère la liste des imports passés
 */
export const getImportSessions = async (params?: {
  limit?: number;
  offset?: number;
  status?: string;
  analysis_source?: string;
}): Promise<{
  success: boolean;
  total: number;
  sessions: ImportSession[];
}> => {
  try {
    const queryParams = new URLSearchParams();

    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.analysis_source) queryParams.append('analysis_source', params.analysis_source);

    // Créer un AbortController avec timeout de 10 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE_URL}/api/import-sessions?${queryParams}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new MLAPIError(`Erreur HTTP ${response.status}`, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MLAPIError) {
      throw error;
    }

    // Gestion spécifique du timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new MLAPIError(
        'Le backend ne répond pas (timeout 10s). Vérifiez que le serveur Python est démarré sur le port 8001.',
        undefined,
        error
      );
    }

    throw new MLAPIError(
      'Backend non disponible. Assurez-vous que le serveur Python est démarré (port 8001).',
      undefined,
      error
    );
  }
};

/**
 * Charge les résultats d'un import spécifique
 */
export const loadImportSession = async (sessionId: number): Promise<{
  success: boolean;
  session: ImportSession;
  results: AnalysisResult[];
}> => {
  try {
    // Créer un AbortController avec timeout de 15 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${API_BASE_URL}/api/import-sessions/${sessionId}/results`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
      throw new MLAPIError(
        errorData.detail || `Erreur HTTP ${response.status}`,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MLAPIError) {
      throw error;
    }

    // Gestion spécifique du timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new MLAPIError(
        'Le backend ne répond pas (timeout 15s). Vérifiez que le serveur Python est démarré sur le port 8001.',
        undefined,
        error
      );
    }

    throw new MLAPIError(
      'Backend non disponible. Assurez-vous que le serveur Python est démarré (port 8001).',
      undefined,
      error
    );
  }
};

/**
 * Sauvegarde les résultats Claude dans PostgreSQL avec une session d'import
 */
export const saveClaudeResults = async (
  results: AnalysisResult[],
  filename: string,
  importSessionId?: number
): Promise<{
  success: boolean;
  saved_count: number;
  import_session_id: number;
  message: string;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/save-claude-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        results,
        filename,
        import_session_id: importSessionId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
      throw new MLAPIError(
        errorData.detail || `Erreur HTTP ${response.status}`,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MLAPIError) {
      throw error;
    }
    throw new MLAPIError('Erreur lors de la sauvegarde des résultats Claude', undefined, error);
  }
};

/**
 * Enrichit les résultats Claude avec les champs agentiques (threat, risk, controlImplementation)
 * Cette fonction est OPTIONNELLE et peut être appelée après Claude pour ajouter les champs enrichis
 *
 * @param results - Résultats Claude à enrichir
 * @param onProgress - Callback optionnel pour suivre la progression
 * @returns Résultats enrichis avec threat, risk, controlImplementation
 */
export const enrichResultsWithAgenticAnalysis = async (
  results: AnalysisResult[],
  onProgress?: (current: number, total: number) => void
): Promise<AnalysisResult[]> => {
  try {
    // Importer dynamiquement le service agentique
    const { analyzeManualRequirement } = await import('./agenticService');

    const enrichedResults: AnalysisResult[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      try {
        // Appeler le service agentique pour enrichir
        const agenticResult = await analyzeManualRequirement(
          result.requirement,
          result.id
        );

        // Fusionner les résultats: garder les mappings Claude, ajouter les champs enrichis
        const enriched: AnalysisResult = {
          ...result,
          threat: agenticResult.threat,
          risk: agenticResult.risk,
          controlImplementation: agenticResult.controlImplementation
        };

        enrichedResults.push(enriched);

        // Appeler le callback de progression
        if (onProgress) {
          onProgress(i + 1, results.length);
        }

        console.log(`✅ Enrichissement ${i + 1}/${results.length}: Exigence #${result.id} enrichie`);
      } catch (error) {
        console.warn(`⚠️ Enrichissement échoué pour exigence #${result.id}:`, error);
        // En cas d'erreur, garder le résultat original sans enrichissement
        enrichedResults.push(result);
      }
    }

    return enrichedResults;
  } catch (error) {
    console.error('Erreur lors de l\'enrichissement agentique:', error);
    throw new MLAPIError(
      'Erreur lors de l\'enrichissement agentique des résultats',
      undefined,
      error
    );
  }
};
