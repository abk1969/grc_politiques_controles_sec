import Anthropic from '@anthropic-ai/sdk';
import type { Requirement, AnalysisResult } from '../types';
import { z } from 'zod';

// Zod schemas for validation
const AnalysisResultSchema = z.object({
  id: z.number(),
  requirement: z.string(),
  verificationPoint: z.string(),
  scfMapping: z.string(),
  iso27001Mapping: z.string(),
  iso27002Mapping: z.string(),
  cobit5Mapping: z.string(),
  analysis: z.string(),
});

const AnalysisResultArraySchema = z.array(AnalysisResultSchema);

// Custom error types for better error handling
export class ClaudeAPIError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'ClaudeAPIError';
  }
}

export class ClaudeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeConfigError';
  }
}

// Validate API key
const getAPIKey = (): string => {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new ClaudeConfigError("La clé API Claude n'est pas configurée. Veuillez l'ajouter dans le fichier .env.local (ANTHROPIC_API_KEY ou CLAUDE_API_KEY)");
  }
  return apiKey;
};

const anthropic = new Anthropic({
  apiKey: getAPIKey(),
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

const buildPrompt = (requirements: Requirement[]): string => {
  const requirementsString = JSON.stringify(requirements, null, 2);
  return `Vous êtes un agent expert en GRC (Gouvernance, Risque et Conformité) spécialisé dans la cybersécurité.
Votre mission est d'analyser une liste d'exigences et de points de contrôle extraits de politiques de sécurité.

TÂCHES:
1. Pour chaque 'requirement', identifiez et mappez le contrôle le plus pertinent des référentiels suivants : SCF, ISO 27001:2022, et ISO 27002:2022.
2. Pour chaque 'verificationPoint' associé, identifiez et mappez le contrôle le plus pertinent du référentiel COBIT 5.
3. Fournissez une COURTE justification (1-2 phrases maximum) pour vos choix de mapping dans le champ 'analysis'.
4. Renvoyez TOUJOURS le résultat sous la forme d'un tableau JSON valide. Ne renvoyez RIEN d'autre que le JSON.

IMPORTANT - FORMAT JSON:
- Retournez UNIQUEMENT du JSON valide, sans texte avant ou après
- Les chaînes de caractères dans le JSON ne doivent PAS contenir de guillemets non échappés
- Les sauts de ligne dans les chaînes doivent être échappés (\\n)
- Gardez l'analyse courte et simple (1-2 phrases max)
- Assurez-vous que toutes les chaînes JSON sont correctement fermées

Format de sortie requis (tableau JSON):
[
  {
    "id": number,
    "requirement": "string",
    "verificationPoint": "string",
    "scfMapping": "ID - Titre",
    "iso27001Mapping": "ID - Titre",
    "iso27002Mapping": "ID - Titre",
    "cobit5Mapping": "ID - Titre",
    "analysis": "string"
  }
]

Voici les données à analyser:
${requirementsString}`;
};

// Helper for retry logic with exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = i === maxRetries - 1;
      if (isLastAttempt) throw error;

      const delay = baseDelay * Math.pow(2, i);
      console.warn(`Tentative ${i + 1}/${maxRetries} échouée. Nouvelle tentative dans ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Toutes les tentatives ont échoué');
};

export const analyzeComplianceData = async (
  requirements: Requirement[],
  onProgress?: (current: number) => void,
  abortSignal?: AbortSignal
): Promise<AnalysisResult[]> => {
  // Process in batches if dataset is large to avoid token limits
  const BATCH_SIZE = 10; // Process 10 requirements at a time

  if (requirements.length > BATCH_SIZE) {
    console.log(`Processing ${requirements.length} requirements in batches of ${BATCH_SIZE}...`);
    const results: AnalysisResult[] = [];

    for (let i = 0; i < requirements.length; i += BATCH_SIZE) {
      // Vérifier si annulé
      if (abortSignal?.aborted) {
        throw new ClaudeAPIError('Traitement annulé par l\'utilisateur');
      }

      const batch = requirements.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(requirements.length / BATCH_SIZE)}...`);
      const batchResults = await analyzeComplianceBatch(batch, abortSignal);
      results.push(...batchResults);

      // Mettre à jour la progression
      if (onProgress) {
        onProgress(Math.min(i + BATCH_SIZE, requirements.length));
      }
    }

    return results;
  }

  const result = await analyzeComplianceBatch(requirements, abortSignal);
  if (onProgress) {
    onProgress(requirements.length);
  }
  return result;
};

const analyzeComplianceBatch = async (requirements: Requirement[], abortSignal?: AbortSignal): Promise<AnalysisResult[]> => {
  const prompt = buildPrompt(requirements);

  try {
    // Vérifier si annulé avant de commencer
    if (abortSignal?.aborted) {
      throw new ClaudeAPIError('Traitement annulé par l\'utilisateur');
    }

    const response = await retryWithBackoff(async () => {
      // Vérifier si annulé pendant les tentatives
      if (abortSignal?.aborted) {
        throw new ClaudeAPIError('Traitement annulé par l\'utilisateur');
      }

      return await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000, // Increased from 8000 to handle larger responses
        temperature: 0, // Deterministic output for reliable JSON
        messages: [{
          role: "user",
          content: prompt
        }]
      });
    });

    // Check if response was truncated
    if (response.stop_reason === 'max_tokens') {
      throw new ClaudeAPIError(
        "La réponse de Claude a été tronquée (limite de tokens atteinte). " +
        "Le fichier contient trop d'exigences. Veuillez réessayer avec un fichier plus petit ou contactez le support."
      );
    }

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new ClaudeAPIError("L'API Claude n'a pas retourné de contenu texte.");
    }

    let jsonText = textContent.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    if (!jsonText) {
      throw new ClaudeAPIError("L'API Claude a retourné une réponse vide.");
    }

    // Parse JSON with error handling
    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseError) {
      // Log the problematic JSON for debugging
      console.error('JSON parsing failed. First 500 chars:', jsonText.substring(0, 500));
      console.error('Last 500 chars:', jsonText.substring(jsonText.length - 500));
      console.error('JSON length:', jsonText.length);
      throw new ClaudeAPIError(
        `Erreur de parsing JSON: ${parseError instanceof Error ? parseError.message : 'Format invalide'}. ` +
        `Claude a retourné du JSON mal formé. Veuillez réessayer.`,
        parseError
      );
    }

    // Validate with Zod
    const validationResult = AnalysisResultArraySchema.safeParse(result);

    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.flatten());
      throw new ClaudeAPIError(
        `La réponse de l'API ne correspond pas au format attendu: ${validationResult.error.message}`
      );
    }

    return validationResult.data;
  } catch (error) {
    console.error("Erreur de l'API Claude:", error);

    if (error instanceof ClaudeConfigError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new ClaudeAPIError("Erreur de parsing JSON de la réponse de l'IA.", error);
    }

    if (error instanceof ClaudeAPIError) {
      throw error;
    }

    throw new ClaudeAPIError(
      "L'analyse par l'IA a échoué. Veuillez vérifier votre connexion internet et réessayer.",
      error
    );
  }
};

// Chat session management for Claude
interface ClaudeConversation {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  requirement: AnalysisResult;
}

export const createRequirementChat = (requirement: AnalysisResult): ClaudeConversation => {
  return {
    messages: [],
    requirement: requirement
  };
};

export const sendChatMessage = async (
  conversation: ClaudeConversation,
  userMessage: string
): Promise<string> => {
  const systemPrompt = `Vous êtes un agent expert en GRC (Gouvernance, Risque et Conformité) spécialisé dans la cybersécurité.
Votre mission est de discuter d'une exigence de sécurité spécifique qui a déjà été analysée et mappée à des référentiels de conformité.

CONTEXTE DE L'EXIGENCE N°${conversation.requirement.id}:
- Exigence: "${conversation.requirement.requirement}"
- Point de Vérification: "${conversation.requirement.verificationPoint}"
- Mapping SCF: "${conversation.requirement.scfMapping}"
- Mapping ISO 27001: "${conversation.requirement.iso27001Mapping}"
- Mapping ISO 27002: "${conversation.requirement.iso27002Mapping}"
- Mapping COBIT 5: "${conversation.requirement.cobit5Mapping}"
- Analyse Initiale de l'IA: "${conversation.requirement.analysis}"

Votre rôle est de répondre aux questions de l'utilisateur concernant cette exigence spécifique. Soyez utile, concis et professionnel.
Vous pouvez élaborer sur les mappings, suggérer des alternatives, expliquer les contrôles ou discuter des détails de mise en œuvre.
Basez vos réponses sur le contexte fourni.`;

  // Add user message to history
  conversation.messages.push({
    role: 'user',
    content: userMessage
  });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    });

    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new ClaudeAPIError("L'API Claude n'a pas retourné de contenu texte.");
    }

    const assistantMessage = textContent.text;

    // Add assistant response to history
    conversation.messages.push({
      role: 'assistant',
      content: assistantMessage
    });

    return assistantMessage;
  } catch (error) {
    console.error("Erreur du chat Claude:", error);
    throw new ClaudeAPIError(
      "Erreur lors de l'envoi du message. Veuillez réessayer.",
      error
    );
  }
};

// Streaming support for chat (for future implementation)
export const sendChatMessageStream = async function* (
  conversation: ClaudeConversation,
  userMessage: string
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = `Vous êtes un agent expert en GRC (Gouvernance, Risque et Conformité) spécialisé dans la cybersécurité.
Votre mission est de discuter d'une exigence de sécurité spécifique qui a déjà été analysée et mappée à des référentiels de conformité.

CONTEXTE DE L'EXIGENCE N°${conversation.requirement.id}:
- Exigence: "${conversation.requirement.requirement}"
- Point de Vérification: "${conversation.requirement.verificationPoint}"
- Mapping SCF: "${conversation.requirement.scfMapping}"
- Mapping ISO 27001: "${conversation.requirement.iso27001Mapping}"
- Mapping ISO 27002: "${conversation.requirement.iso27002Mapping}"
- Mapping COBIT 5: "${conversation.requirement.cobit5Mapping}"
- Analyse Initiale de l'IA: "${conversation.requirement.analysis}"

Votre rôle est de répondre aux questions de l'utilisateur concernant cette exigence spécifique. Soyez utile, concis et professionnel.`;

  conversation.messages.push({
    role: 'user',
    content: userMessage
  });

  try {
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    });

    let fullResponse = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullResponse += event.delta.text;
        yield event.delta.text;
      }
    }

    // Add complete response to conversation history
    conversation.messages.push({
      role: 'assistant',
      content: fullResponse
    });

  } catch (error) {
    console.error("Erreur du streaming Claude:", error);
    throw new ClaudeAPIError(
      "Erreur lors du streaming du message. Veuillez réessayer.",
      error
    );
  }
};
