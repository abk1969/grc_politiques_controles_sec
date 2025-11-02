/**
 * Service Claude SÉCURISÉ - Appelle le backend proxy au lieu de l'API directement
 *
 * SÉCURITÉ:
 * - Aucune clé API exposée côté client
 * - Toutes les requêtes passent par le backend
 * - Rate limiting appliqué côté serveur
 */

import { AnalysisResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * Erreur personnalisée pour les appels Claude
 */
export class ClaudeProxyError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ClaudeProxyError';
  }
}

/**
 * Interface pour les messages Claude
 */
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Analyser les exigences de conformité via Claude (BACKEND PROXY)
 */
export async function analyzeRequirements(
  requirements: Array<{ id: string; requirement: string; verificationPoint?: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<AnalysisResult[]> {
  console.log(`🔐 Analyse sécurisée via backend proxy: ${requirements.length} exigences`);

  const results: AnalysisResult[] = [];

  for (let i = 0; i < requirements.length; i++) {
    const req = requirements[i];

    if (onProgress) {
      onProgress(i + 1, requirements.length);
    }

    try {
      // Construire le prompt
      const prompt = buildAnalysisPrompt(req);

      // Appeler le BACKEND PROXY (pas l'API Claude directement)
      const response = await fetch(`${API_BASE_URL}/api/ai/claude/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 8192,
          temperature: 0.0,
          system: 'Tu es un expert en conformité GRC et en mapping de contrôles de sécurité.'
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Erreur réseau' }));
        throw new ClaudeProxyError(
          `Erreur backend: ${error.detail || response.statusText}`,
          response.status
        );
      }

      const data = await response.json();

      // Parser la réponse
      const analysisResult = parseClaudeResponse(data, req);
      results.push(analysisResult);

    } catch (error) {
      console.error(`❌ Erreur analyse requirement ${req.id}:`, error);

      // Créer un résultat par défaut en cas d'erreur
      results.push({
        id: req.id,
        requirement: req.requirement,
        verificationPoint: req.verificationPoint || '',
        scfMapping: '',
        iso27001Mapping: '',
        iso27002Mapping: '',
        cobit5Mapping: '',
        analysis: `Erreur lors de l'analyse: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        confidenceScore: 0
      });
    }
  }

  console.log(`✅ Analyse terminée: ${results.length} résultats`);
  return results;
}

/**
 * Chat avec Claude via backend proxy (avec streaming)
 */
export async function chatWithClaude(
  messages: ClaudeMessage[],
  requirementContext?: string,
  onChunk?: (text: string) => void
): Promise<string> {
  console.log(`💬 Chat sécurisé via backend proxy`);

  try {
    // Appeler le backend proxy avec streaming
    const response = await fetch(`${API_BASE_URL}/api/ai/claude/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        requirement_context: requirementContext,
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new ClaudeProxyError(
        `Erreur backend chat: ${response.statusText}`,
        response.status
      );
    }

    // Traiter le stream SSE (Server-Sent Events)
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) {
      throw new ClaudeProxyError('Pas de reader disponible pour le streaming');
    }

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text') {
              fullResponse += data.text;
              if (onChunk) {
                onChunk(data.text);
              }
            } else if (data.type === 'error') {
              throw new ClaudeProxyError(`Erreur streaming: ${data.error}`);
            } else if (data.type === 'done') {
              // Fin du stream
              break;
            }
          } catch (e) {
            // Ignorer les lignes mal formées
            if (e instanceof ClaudeProxyError) throw e;
          }
        }
      }
    }

    return fullResponse;

  } catch (error) {
    console.error('❌ Erreur chat Claude:', error);
    throw error instanceof ClaudeProxyError
      ? error
      : new ClaudeProxyError('Erreur lors du chat', undefined, error);
  }
}

/**
 * Construire le prompt d'analyse
 */
function buildAnalysisPrompt(req: {
  id: string;
  requirement: string;
  verificationPoint?: string;
}): string {
  return `Analyse cette exigence de conformité et mappe-la aux frameworks de sécurité.

**Exigence #${req.id}:**
${req.requirement}

${req.verificationPoint ? `**Point de vérification:**\n${req.verificationPoint}\n` : ''}

**Instructions:**
1. Identifie les contrôles SCF 2025.2 pertinents
2. Mappe aux normes ISO 27001:2022 et ISO 27002:2022
3. Mappe au framework COBIT 5
4. Fournis une analyse détaillée

**Format de réponse attendu (JSON):**
\`\`\`json
{
  "scf_mapping": "SCF-XXX-XX",
  "iso27001_mapping": "A.X.X",
  "iso27002_mapping": "X.X.X",
  "cobit5_mapping": "DSSXX.XX",
  "analysis": "Analyse détaillée du mapping et justification",
  "confidence": 0.95
}
\`\`\`

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;
}

/**
 * Parser la réponse de Claude
 */
function parseClaudeResponse(
  response: any,
  req: { id: string; requirement: string; verificationPoint?: string }
): AnalysisResult {
  try {
    // Extraire le contenu texte
    const content = response.content[0]?.text || '';

    // Essayer de parser le JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      return {
        id: req.id,
        requirement: req.requirement,
        verificationPoint: req.verificationPoint || '',
        scfMapping: parsed.scf_mapping || '',
        iso27001Mapping: parsed.iso27001_mapping || '',
        iso27002Mapping: parsed.iso27002_mapping || '',
        cobit5Mapping: parsed.cobit5_mapping || '',
        analysis: parsed.analysis || content,
        confidenceScore: parsed.confidence || 0.9
      };
    }

    // Fallback si pas de JSON
    return {
      id: req.id,
      requirement: req.requirement,
      verificationPoint: req.verificationPoint || '',
      scfMapping: '',
      iso27001Mapping: '',
      iso27002Mapping: '',
      cobit5Mapping: '',
      analysis: content,
      confidenceScore: 0.5
    };

  } catch (error) {
    console.error('❌ Erreur parsing réponse Claude:', error);
    throw new ClaudeProxyError('Erreur parsing réponse Claude', undefined, error);
  }
}

/**
 * Vérifier la disponibilité du service
 */
export async function checkClaudeAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/health`);
    if (!response.ok) return false;

    const data = await response.json();
    return data.services?.claude?.available === true;
  } catch {
    return false;
  }
}

/**
 * ALIAS pour compatibilité avec l'ancien code
 */
export const analyzeComplianceData = analyzeRequirements;

/**
 * ALIAS pour compatibilité - Créer une conversation pour un requirement
 */
export function createRequirementChat(requirement: AnalysisResult) {
  return {
    requirement,
    messages: [] as Array<{ role: 'user' | 'assistant'; content: string }>
  };
}

/**
 * ALIAS pour compatibilité - Envoyer un message de chat en streaming
 */
export async function sendChatMessageStream(
  conversation: { requirement: AnalysisResult; messages: Array<{ role: 'user' | 'assistant'; content: string }> },
  userMessage: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const newMessages = [
    ...conversation.messages,
    { role: 'user' as const, content: userMessage }
  ];

  await chatWithClaude(newMessages, conversation.requirement, onChunk, signal);
}
