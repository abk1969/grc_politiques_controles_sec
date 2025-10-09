
import { GoogleGenAI, Type, Chat } from "@google/genai";
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
export class GeminiAPIError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

// Validate API key
const getAPIKey = (): string => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError("La clé API Gemini n'est pas configurée. Veuillez l'ajouter dans le fichier .env.local");
  }
  return apiKey;
};

const ai = new GoogleGenAI({ apiKey: getAPIKey() });

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.NUMBER,
        description: "L'identifiant original de l'exigence fournie en entrée.",
      },
      requirement: {
        type: Type.STRING,
        description: "Le texte original de l'exigence.",
      },
      verificationPoint: {
        type: Type.STRING,
        description: "Le texte original du point à vérifier.",
      },
      scfMapping: {
        type: Type.STRING,
        description: "Le contrôle SCF le plus pertinent mappé à l'exigence. Format: 'ID - Titre'.",
      },
      iso27001Mapping: {
        type: Type.STRING,
        description: "Le contrôle ISO 27001:2022 le plus pertinent mappé à l'exigence. Format: 'ID - Titre'.",
      },
      iso27002Mapping: {
        type: Type.STRING,
        description: "Le contrôle ISO 27002:2022 le plus pertinent mappé à l'exigence. Format: 'ID - Titre'.",
      },
      cobit5Mapping: {
        type: Type.STRING,
        description: "Le contrôle COBIT 5 le plus pertinent mappé au point à vérifier. Format: 'ID - Titre'.",
      },
      analysis: {
        type: Type.STRING,
        description: "Une brève analyse ou justification pour les mappings proposés.",
      },
    },
    required: ["id", "requirement", "verificationPoint", "scfMapping", "iso27001Mapping", "iso27002Mapping", "cobit5Mapping", "analysis"],
  },
};

const buildPrompt = (requirements: Requirement[]): string => {
  const requirementsString = JSON.stringify(requirements, null, 2);
  return `
    Vous êtes un agent expert en GRC (Gouvernance, Risque et Conformité) spécialisé dans la cybersécurité.
    Votre mission est d'analyser une liste d'exigences et de points de contrôle extraits de politiques de sécurité.

    TÂCHES:
    1. Pour chaque 'requirement', identifiez et mappez le contrôle le plus pertinent des référentiels suivants : SCF, ISO 27001:2022, et ISO 27002:2022.
    2. Pour chaque 'verificationPoint' associé, identifiez et mappez le contrôle le plus pertinent du référentiel COBIT 5.
    3. Fournissez une brève justification pour vos choix de mapping dans le champ 'analysis'.
    4. Renvoyez TOUJOURS le résultat sous la forme d'un tableau JSON valide qui correspond exactement au schéma fourni. Ne renvoyez aucun texte ou formatage en dehors de ce tableau JSON.

    Voici les données à analyser:
    ${requirementsString}
  `;
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

export const analyzeComplianceData = async (requirements: Requirement[]): Promise<AnalysisResult[]> => {
  const prompt = buildPrompt(requirements);

  try {
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.1,
        },
      });
    });

    const jsonText = response.text.trim();

    if (!jsonText) {
      throw new GeminiAPIError("L'API Gemini a retourné une réponse vide.");
    }

    const result = JSON.parse(jsonText);

    // Validate with Zod
    const validationResult = AnalysisResultArraySchema.safeParse(result);

    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.flatten());
      throw new GeminiAPIError(
        `La réponse de l'API ne correspond pas au format attendu: ${validationResult.error.message}`
      );
    }

    return validationResult.data;
  } catch (error) {
    console.error("Erreur de l'API Gemini:", error);

    if (error instanceof GeminiConfigError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new GeminiAPIError("Erreur de parsing JSON de la réponse de l'IA.", error);
    }

    if (error instanceof GeminiAPIError) {
      throw error;
    }

    throw new GeminiAPIError(
      "L'analyse par l'IA a échoué. Veuillez vérifier votre connexion internet et réessayer.",
      error
    );
  }
};

export const createRequirementChat = (requirement: AnalysisResult): Chat => {
    const systemInstruction = `
      Vous êtes un agent expert en GRC (Gouvernance, Risque et Conformité) spécialisé dans la cybersécurité.
      Votre mission est de discuter d'une exigence de sécurité spécifique qui a déjà été analysée et mappée à des référentiels de conformité.

      CONTEXTE DE L'EXIGENCE N°${requirement.id}:
      - Exigence: "${requirement.requirement}"
      - Point de Vérification: "${requirement.verificationPoint}"
      - Mapping SCF: "${requirement.scfMapping}"
      - Mapping ISO 27001: "${requirement.iso27001Mapping}"
      - Mapping ISO 27002: "${requirement.iso27002Mapping}"
      - Mapping COBIT 5: "${requirement.cobit5Mapping}"
      - Analyse Initiale de l'IA: "${requirement.analysis}"

      Votre rôle est de répondre aux questions de l'utilisateur concernant cette exigence spécifique. Soyez utile, concis et professionnel.
      Vous pouvez élaborer sur les mappings, suggérer des alternatives, expliquer les contrôles ou discuter des détails de mise en œuvre.
      Basez vos réponses sur le contexte fourni.
    `;

    const chat = ai.chats.create({
      model: 'gemini-flash-latest',
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return chat;
};
