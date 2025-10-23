import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisResult } from '../types';
import { z } from 'zod';

// ============================================================================
// TYPES ET SCHEMAS
// ============================================================================

// Zod schema pour validation de l'analyse agentique enrichie
const AgenticAnalysisSchema = z.object({
  id: z.number(),
  requirement: z.string(),
  verificationPoint: z.string(),
  scfMapping: z.string(),
  iso27001Mapping: z.string(),
  iso27002Mapping: z.string(),
  cobit5Mapping: z.string(),
  analysis: z.string(),
  threat: z.string(),
  risk: z.string(),
  controlImplementation: z.string(),
});

// Contexte partagé MCP (Model Context Protocol)
interface MCPContext {
  requirement: string;
  verificationPoint?: string;
  scfMapping?: string;
  iso27001Mapping?: string;
  iso27002Mapping?: string;
  cobit5Mapping?: string;
  threat?: string;
  risk?: string;
  controlImplementation?: string;
  analysis?: string;
  agentInsights: Record<string, string>; // Insights partagés entre agents
}

// Message A2A (Agent-to-Agent)
interface A2AMessage {
  fromAgent: string;
  toAgent: string;
  messageType: 'context' | 'insight' | 'question' | 'answer';
  content: string;
  timestamp: Date;
}

// Résultat d'un agent spécialisé
interface AgentResult {
  agentName: string;
  success: boolean;
  data?: any;
  insights?: string;
  error?: string;
}

// Custom error types
export class AgenticAnalysisError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'AgenticAnalysisError';
  }
}

// ============================================================================
// CONFIGURATION API
// ============================================================================

const getAPIKey = (): string => {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new AgenticAnalysisError("La clé API Claude n'est pas configurée. Veuillez l'ajouter dans le fichier .env.local");
  }
  return apiKey;
};

const anthropic = new Anthropic({
  apiKey: getAPIKey(),
  dangerouslyAllowBrowser: true,
});

// Configuration backend API
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

// ============================================================================
// SERVICES API BACKEND SCF
// ============================================================================

interface SCFSearchResult {
  scf_id: string;
  scf_control: string;
  scf_domain: string;
  description: string;
  cobit_2019: string;
  control_question: string;
  possible_solutions: string;
  similarity_score: number;
}

interface SCFValidationResult {
  is_valid: boolean;
  scf_id?: string;
  scf_control?: string;
  message: string;
}

interface ThreatRiskResult {
  threat: string | null;
  risk: string | null;
}

/**
 * Recherche sémantique dans la base de connaissances SCF
 */
async function searchSCFControls(requirementText: string, topK: number = 5): Promise<SCFSearchResult[]> {
  try {
    // Créer un contrôleur d'avortement avec timeout de 10 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes

    const response = await fetch(`${BACKEND_URL}/api/scf/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement_text: requirementText,
        top_k: topK,
        min_similarity: 0.5
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur API SCF: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Erreur recherche SCF:', error);
    throw new AgenticAnalysisError('Impossible de rechercher dans la base SCF', error);
  }
}

/**
 * Valide qu'une référence SCF existe réellement
 */
async function validateSCFReference(scfRef: string): Promise<SCFValidationResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes

    const response = await fetch(`${BACKEND_URL}/api/scf/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scf_reference: scfRef }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur validation SCF: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Erreur validation SCF:', error);
    throw new AgenticAnalysisError('Impossible de valider la référence SCF', error);
  }
}

/**
 * Trouve les menaces et risques depuis les catalogues SCF
 */
async function findThreatAndRisk(requirementText: string): Promise<ThreatRiskResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes

    const response = await fetch(`${BACKEND_URL}/api/scf/threat-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement_text: requirementText }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur recherche menace/risque: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Erreur recherche menace/risque:', error);
    throw new AgenticAnalysisError('Impossible de rechercher menaces/risques', error);
  }
}

// ============================================================================
// ORCHESTRATEUR D'AGENTS MULTI-SPÉCIALISÉS
// ============================================================================

class AgentOrchestrator {
  private mcpContext: MCPContext;
  private a2aMessages: A2AMessage[] = [];

  constructor(requirement: string) {
    this.mcpContext = {
      requirement,
      agentInsights: {},
    };
  }

  /**
   * Envoie un message A2A entre agents
   */
  private sendA2AMessage(from: string, to: string, type: A2AMessage['messageType'], content: string) {
    const message: A2AMessage = {
      fromAgent: from,
      toAgent: to,
      messageType: type,
      content,
      timestamp: new Date(),
    };
    this.a2aMessages.push(message);
    console.log(`📨 [A2A] ${from} → ${to}: ${content.substring(0, 100)}...`);
  }

  /**
   * Met à jour le contexte MCP avec les résultats d'un agent
   */
  private updateMCPContext(agentName: string, updates: Partial<MCPContext>) {
    Object.assign(this.mcpContext, updates);
    console.log(`🔄 [MCP] Contexte mis à jour par ${agentName}`);
  }

  /**
   * Génère le contexte MCP partagé pour les agents
   */
  private getMCPContextPrompt(): string {
    return `
CONTEXTE PARTAGÉ MCP (Model Context Protocol):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Exigence analysée: "${this.mcpContext.requirement}"

${this.mcpContext.verificationPoint ? `Point de vérification: ${this.mcpContext.verificationPoint}` : ''}
${this.mcpContext.scfMapping ? `SCF identifié: ${this.mcpContext.scfMapping}` : ''}
${this.mcpContext.iso27001Mapping ? `ISO 27001 identifié: ${this.mcpContext.iso27001Mapping}` : ''}
${this.mcpContext.iso27002Mapping ? `ISO 27002 identifié: ${this.mcpContext.iso27002Mapping}` : ''}
${this.mcpContext.cobit5Mapping ? `COBIT 5 identifié: ${this.mcpContext.cobit5Mapping}` : ''}
${this.mcpContext.threat ? `Menace identifiée: ${this.mcpContext.threat}` : ''}
${this.mcpContext.risk ? `Risque identifié: ${this.mcpContext.risk}` : ''}

INSIGHTS DES AUTRES AGENTS:
${Object.entries(this.mcpContext.agentInsights).map(([agent, insight]) => `• ${agent}: ${insight}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  /**
   * AGENT 1 : Expert Point de Vérification
   */
  async agentVerificationPoint(): Promise<AgentResult> {
    const agentName = "Agent-VerificationPoint";
    console.log(`🤖 [${agentName}] Démarrage...`);

    const prompt = `${this.getMCPContextPrompt()}

TU ES: Agent spécialisé en audit et vérification de conformité

TA MISSION: Formule un point de vérification/contrôle concret et actionnable pour auditer cette exigence.

CRITÈRES:
- Doit être mesurable et testable
- Orienté audit pratique
- 2-3 phrases maximum
- Format opérationnel

Réponds UNIQUEMENT avec le texte du point de vérification, sans préambule.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }]
      });

      const text = this.extractText(response);
      this.updateMCPContext(agentName, { verificationPoint: text });
      this.mcpContext.agentInsights[agentName] = "Point de vérification opérationnel créé";

      return { agentName, success: true, data: text, insights: "Point de vérification créé" };
    } catch (error) {
      console.error(`❌ [${agentName}] Erreur:`, error);
      return { agentName, success: false, error: String(error) };
    }
  }

  /**
   * AGENT 2 : Expert SCF (Secure Controls Framework)
   * NOUVEAU: Utilise la base de connaissances SCF réelle avec recherche sémantique et validation
   * FALLBACK: Si backend indisponible, utilise Claude directement
   */
  async agentSCF(): Promise<AgentResult> {
    const agentName = "Agent-SCF";
    console.log(`🤖 [${agentName}] Démarrage avec recherche sémantique dans la base SCF...`);

    try {
      // ÉTAPE 1: Recherche sémantique dans la base de connaissances SCF
      console.log(`🔍 [${agentName}] Recherche sémantique pour: "${this.mcpContext.requirement.substring(0, 60)}..."`);
      const scfResults = await searchSCFControls(this.mcpContext.requirement, 5);

      if (scfResults.length === 0) {
        console.warn(`⚠️ [${agentName}] Aucun contrôle SCF trouvé avec similarité > 0.5, utilisation du fallback Claude`);
        return await this.agentSCFFallback();
      }

      // Prendre le meilleur résultat (score le plus élevé)
      const bestMatch = scfResults[0];
      console.log(`✅ [${agentName}] Meilleur match: ${bestMatch.scf_id} (score: ${bestMatch.similarity_score.toFixed(3)})`);

      // ÉTAPE 2: Validation du contrôle trouvé
      const scfReference = `${bestMatch.scf_id} - ${bestMatch.scf_control}`;
      console.log(`🔐 [${agentName}] Validation de: ${scfReference}`);
      const validation = await validateSCFReference(bestMatch.scf_id);

      if (!validation.is_valid) {
        console.error(`❌ [${agentName}] Validation échouée pour ${bestMatch.scf_id}, fallback Claude`);
        return await this.agentSCFFallback();
      }

      console.log(`✅ [${agentName}] Contrôle validé avec succès`);

      // ÉTAPE 3: Construire le mapping complet
      const scfMapping = `${bestMatch.scf_id} - ${bestMatch.scf_control}`;
      const insights = `Contrôle SCF validé depuis la base de connaissances (similarité: ${(bestMatch.similarity_score * 100).toFixed(1)}%). Domaine: ${bestMatch.scf_domain}`;

      // Mettre à jour le contexte MCP
      this.updateMCPContext(agentName, { scfMapping });
      this.mcpContext.agentInsights[agentName] = insights;
      this.sendA2AMessage(agentName, "Agent-ISO", "context", `SCF vérifié: ${scfMapping}`);

      // Stocker les données COBIT trouvées pour l'agent COBIT
      if (bestMatch.cobit_2019 && bestMatch.cobit_2019.trim()) {
        this.mcpContext.agentInsights['scf_cobit_hint'] = bestMatch.cobit_2019;
      }

      return {
        agentName,
        success: true,
        data: scfMapping,
        insights: `${insights}\nDescription: ${bestMatch.description.substring(0, 150)}...`
      };

    } catch (error) {
      console.error(`❌ [${agentName}] Erreur backend SCF, utilisation du fallback Claude:`, error);
      return await this.agentSCFFallback();
    }
  }

  /**
   * Fallback: génération de contrôle SCF par Claude si la base SCF est indisponible
   */
  private async agentSCFFallback(): Promise<AgentResult> {
    const agentName = "Agent-SCF";
    console.log(`⚠️ [${agentName}] Utilisation du fallback Claude...`);

    const prompt = `${this.getMCPContextPrompt()}

TU ES: Agent expert en Secure Controls Framework (SCF 2025.2)

TA MISSION: Identifie le contrôle SCF le plus pertinent pour cette exigence.

CRITÈRES:
- Référence SCF complète (ex: "GOV-01 - Governance Program")
- Format: "DOMAINE-XX - Titre du contrôle"
- Domaines SCF courants: GOV (Gouvernance), IAC (Contrôle d'accès), NET (Sécurité réseau), etc.
- Cohérence avec le contexte de l'exigence

Format de sortie:
SCF: DOMAINE-XX - Titre
Justification: [1 phrase]

Réponds UNIQUEMENT avec ce format, sans markdown.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }]
      });

      const text = this.extractText(response);
      const scfMapping = text.split('\n').find(l => l.includes('SCF:'))?.replace('SCF:', '').trim() || text.split('\n')[0];

      this.updateMCPContext(agentName, { scfMapping });
      this.mcpContext.agentInsights[agentName] = "Contrôle SCF généré par IA (base de connaissances non disponible)";
      this.sendA2AMessage(agentName, "Agent-ISO", "context", `SCF identifié: ${scfMapping}`);

      return { agentName, success: true, data: scfMapping, insights: "Contrôle SCF généré par IA" };
    } catch (error) {
      console.error(`❌ [${agentName}] Erreur fallback:`, error);
      this.updateMCPContext(agentName, { scfMapping: 'Non mappé' });
      return { agentName, success: false, error: String(error) };
    }
  }

  /**
   * AGENT 3 : Expert ISO 27001/27002:2022
   */
  async agentISO(): Promise<AgentResult> {
    const agentName = "Agent-ISO";
    console.log(`🤖 [${agentName}] Démarrage...`);

    const prompt = `${this.getMCPContextPrompt()}

TU ES: Agent expert en ISO/IEC 27001:2022 et ISO/IEC 27002:2022

TA MISSION: Identifie les contrôles ISO 27001:2022 et ISO 27002:2022 les plus pertinents.

CRITÈRES:
- Références précises des normes 2022
- ISO 27001:2022 format: "A.X.Y - Titre"
- ISO 27002:2022 format: "X.Y.Z - Titre"
- Cohérence avec les autres mappings identifiés

Format de sortie:
ISO27001: A.X.Y - Titre
ISO27002: X.Y.Z - Titre
Justification: [1 phrase]

Réponds UNIQUEMENT avec ce format, sans markdown.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }]
      });

      const text = this.extractText(response);
      const lines = text.split('\n');
      const iso27001Mapping = lines.find(l => l.startsWith('ISO27001:'))?.replace('ISO27001:', '').trim() || '';
      const iso27002Mapping = lines.find(l => l.startsWith('ISO27002:'))?.replace('ISO27002:', '').trim() || '';

      this.updateMCPContext(agentName, { iso27001Mapping, iso27002Mapping });
      this.mcpContext.agentInsights[agentName] = `ISO mappings: ${iso27001Mapping}`;
      this.sendA2AMessage(agentName, "Agent-COBIT", "context", `ISO identifiés`);

      return { agentName, success: true, data: { iso27001Mapping, iso27002Mapping }, insights: text };
    } catch (error) {
      console.error(`❌ [${agentName}] Erreur:`, error);
      return { agentName, success: false, error: String(error) };
    }
  }

  /**
   * AGENT 4 : Expert COBIT 5
   */
  async agentCOBIT(): Promise<AgentResult> {
    const agentName = "Agent-COBIT";
    console.log(`🤖 [${agentName}] Démarrage...`);

    const prompt = `${this.getMCPContextPrompt()}

TU ES: Agent expert en COBIT 5 (Control Objectives for Information and Related Technology)

TA MISSION: Identifie le processus/contrôle COBIT 5 le plus pertinent.

CRITÈRES:
- Référence COBIT 5 complète
- Format: "DSSX.YY - Titre du processus"
- Aligné avec les domaines COBIT 5 (APO, BAI, DSS, MEA, EDM)
- Cohérence avec SCF et ISO identifiés

Format de sortie:
COBIT5: DSSX.YY - Titre
Justification: [1 phrase]

Réponds UNIQUEMENT avec ce format, sans markdown.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }]
      });

      const text = this.extractText(response);
      const cobit5Mapping = text.split('\n').find(l => l.includes('COBIT5:'))?.replace('COBIT5:', '').trim() || text.split('\n')[0];

      this.updateMCPContext(agentName, { cobit5Mapping });
      this.mcpContext.agentInsights[agentName] = `COBIT identifié: ${cobit5Mapping}`;
      this.sendA2AMessage(agentName, "Agent-Threat", "context", "Frameworks mappés, analyse de menaces possible");

      return { agentName, success: true, data: cobit5Mapping, insights: text };
    } catch (error) {
      console.error(`❌ [${agentName}] Erreur:`, error);
      return { agentName, success: false, error: String(error) };
    }
  }

  /**
   * AGENT 5 : Expert Menaces Cyber
   * NOUVEAU: Utilise le catalogue de menaces SCF réel avec recherche sémantique
   */
  async agentThreat(): Promise<AgentResult> {
    const agentName = "Agent-Threat";
    console.log(`🤖 [${agentName}] Démarrage avec recherche dans le catalogue de menaces SCF...`);

    try {
      // Rechercher dans le catalogue de menaces ET risques SCF
      console.log(`🔍 [${agentName}] Recherche de menace pour: "${this.mcpContext.requirement.substring(0, 60)}..."`);
      const threatRiskResult = await findThreatAndRisk(this.mcpContext.requirement);

      if (!threatRiskResult.threat || threatRiskResult.threat.trim() === '') {
        console.warn(`⚠️ [${agentName}] Aucune menace trouvée dans le catalogue SCF`);
        // Fallback: utiliser Claude pour générer une menace si rien trouvé
        return await this.agentThreatFallback();
      }

      const threat = threatRiskResult.threat;
      console.log(`✅ [${agentName}] Menace trouvée dans le catalogue SCF: "${threat.substring(0, 100)}..."`);

      this.updateMCPContext(agentName, { threat });
      this.mcpContext.agentInsights[agentName] = "Menace cyber identifiée depuis le catalogue SCF officiel";
      this.sendA2AMessage(agentName, "Agent-Risk", "context", `Menace SCF: ${threat.substring(0, 100)}`);

      // Stocker le risque pour l'agent suivant
      if (threatRiskResult.risk) {
        this.mcpContext.agentInsights['scf_risk_hint'] = threatRiskResult.risk;
      }

      return {
        agentName,
        success: true,
        data: threat,
        insights: "Menace identifiée depuis catalogue SCF"
      };

    } catch (error) {
      console.error(`❌ [${agentName}] Erreur:`, error);
      // Fallback en cas d'erreur API
      return await this.agentThreatFallback();
    }
  }

  /**
   * Fallback: génération de menace par Claude si catalogue SCF ne retourne rien
   */
  private async agentThreatFallback(): Promise<AgentResult> {
    const agentName = "Agent-Threat";
    console.log(`⚠️ [${agentName}] Utilisation du fallback Claude...`);

    const prompt = `${this.getMCPContextPrompt()}

TU ES: Agent expert en cybersécurité et analyse de menaces (Threat Intelligence)

TA MISSION: Identifie la principale menace cyber que cette exigence cherche à mitiger.

CRITÈRES:
- Menace technique et précise
- Référence à des tactiques MITRE ATT&CK si pertinent
- 2-3 phrases maximum
- Contexte des frameworks déjà identifiés

Réponds UNIQUEMENT avec la description de la menace, sans préambule ni markdown.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        temperature: 0.15,
        messages: [{ role: "user", content: prompt }]
      });

      const threat = this.extractText(response);
      this.updateMCPContext(agentName, { threat });
      this.mcpContext.agentInsights[agentName] = "Menace générée par analyse IA (catalogue SCF non disponible)";

      return { agentName, success: true, data: threat, insights: "Menace générée par IA" };
    } catch (error) {
      console.error(`❌ [${agentName}] Erreur fallback:`, error);
      return { agentName, success: false, error: String(error) };
    }
  }

  /**
   * AGENT 6 : Expert Analyse de Risques
   * NOUVEAU: Utilise le catalogue de risques SCF réel avec recherche sémantique
   */
  async agentRisk(): Promise<AgentResult> {
    const agentName = "Agent-Risk";
    console.log(`🤖 [${agentName}] Démarrage avec recherche dans le catalogue de risques SCF...`);

    try {
      // Vérifier si on a déjà un risque depuis l'agent Threat
      const scfRiskHint = this.mcpContext.agentInsights['scf_risk_hint'];

      if (scfRiskHint && scfRiskHint.trim()) {
        console.log(`✅ [${agentName}] Risque trouvé depuis le catalogue SCF: "${scfRiskHint.substring(0, 100)}..."`);

        this.updateMCPContext(agentName, { risk: scfRiskHint });
        this.mcpContext.agentInsights[agentName] = "Risque business/cyber identifié depuis le catalogue SCF officiel";
        this.sendA2AMessage(agentName, "Agent-Implementation", "context", "Risques SCF identifiés, implémentation requise");

        return {
          agentName,
          success: true,
          data: scfRiskHint,
          insights: "Risque identifié depuis catalogue SCF"
        };
      }

      // Sinon, rechercher directement
      console.log(`🔍 [${agentName}] Recherche de risque pour: "${this.mcpContext.requirement.substring(0, 60)}..."`);
      const threatRiskResult = await findThreatAndRisk(this.mcpContext.requirement);

      if (!threatRiskResult.risk || threatRiskResult.risk.trim() === '') {
        console.warn(`⚠️ [${agentName}] Aucun risque trouvé dans le catalogue SCF`);
        // Fallback: utiliser Claude pour générer un risque
        return await this.agentRiskFallback();
      }

      const risk = threatRiskResult.risk;
      console.log(`✅ [${agentName}] Risque trouvé dans le catalogue SCF`);

      this.updateMCPContext(agentName, { risk });
      this.mcpContext.agentInsights[agentName] = "Risque identifié depuis catalogue SCF";
      this.sendA2AMessage(agentName, "Agent-Implementation", "context", "Risques identifiés, implémentation requise");

      return {
        agentName,
        success: true,
        data: risk,
        insights: "Risque identifié depuis catalogue SCF"
      };

    } catch (error) {
      console.error(`❌ [${agentName}] Erreur:`, error);
      // Fallback en cas d'erreur API
      return await this.agentRiskFallback();
    }
  }

  /**
   * Fallback: génération de risque par Claude si catalogue SCF ne retourne rien
   */
  private async agentRiskFallback(): Promise<AgentResult> {
    const agentName = "Agent-Risk";
    console.log(`⚠️ [${agentName}] Utilisation du fallback Claude...`);

    const prompt = `${this.getMCPContextPrompt()}

TU ES: Agent expert en gestion des risques cyber (Risk Management)

TA MISSION: Décris le risque métier/cyber si cette exigence N'EST PAS respectée.

CRITÈRES:
- Impact métier concret
- Probabilité et gravité
- Conséquences techniques et business
- 2-3 phrases maximum
- Lié à la menace identifiée

Réponds UNIQUEMENT avec la description du risque, sans préambule ni markdown.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        temperature: 0.15,
        messages: [{ role: "user", content: prompt }]
      });

      const risk = this.extractText(response);
      this.updateMCPContext(agentName, { risk });
      this.mcpContext.agentInsights[agentName] = "Risque généré par analyse IA (catalogue SCF non disponible)";

      return { agentName, success: true, data: risk, insights: "Risque généré par IA" };
    } catch (error) {
      console.error(`❌ [${agentName}] Erreur fallback:`, error);
      return { agentName, success: false, error: String(error) };
    }
  }

  /**
   * AGENT 7 : Expert Implémentation de Contrôles
   */
  async agentImplementation(): Promise<AgentResult> {
    const agentName = "Agent-Implementation";
    console.log(`🤖 [${agentName}] Démarrage...`);

    const prompt = `${this.getMCPContextPrompt()}

TU ES: Agent expert en implémentation pratique de contrôles de sécurité

TA MISSION: Propose un guide concret d'implémentation de ce contrôle.

CRITÈRES:
- Étapes concrètes et actionnables
- Technologies/outils mentionnés si pertinent
- Bonnes pratiques industrielles
- 3-4 phrases maximum
- Cohérent avec les frameworks (SCF, ISO, COBIT) identifiés

Réponds UNIQUEMENT avec le guide d'implémentation, sans préambule ni markdown.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 700,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }]
      });

      const implementation = this.extractText(response);

      this.updateMCPContext(agentName, { controlImplementation: implementation });
      this.mcpContext.agentInsights[agentName] = "Guide d'implémentation créé";

      return { agentName, success: true, data: implementation, insights: "Implémentation définie" };
    } catch (error) {
      console.error(`❌ [${agentName}] Erreur:`, error);
      return { agentName, success: false, error: String(error) };
    }
  }

  /**
   * AGENT 8 : Synthétiseur Final
   */
  async agentSynthesizer(): Promise<AgentResult> {
    const agentName = "Agent-Synthesizer";
    console.log(`🤖 [${agentName}] Synthèse finale...`);

    const prompt = `${this.getMCPContextPrompt()}

TU ES: Agent de synthèse et validation finale

TA MISSION: Rédige une analyse justificative concise (1-2 phrases) expliquant la cohérence des mappings identifiés par les autres agents.

Réponds UNIQUEMENT avec l'analyse de justification, sans préambule ni markdown.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }]
      });

      const analysis = this.extractText(response);
      this.updateMCPContext(agentName, { analysis });

      return { agentName, success: true, data: analysis, insights: "Synthèse finalisée" };
    } catch (error) {
      console.error(`❌ [${agentName}] Erreur:`, error);
      return { agentName, success: false, error: String(error) };
    }
  }

  /**
   * Orchestre tous les agents en séquence avec A2A et MCP
   */
  async orchestrate(requirementId: number): Promise<AnalysisResult> {
    console.log('🎭 ========================================');
    console.log('🎭 ORCHESTRATION MULTI-AGENTS DÉMARRÉE');
    console.log('🎭 Protocoles: A2A + MCP');
    console.log('🎭 ========================================\n');

    try {
      // Phase 1: Point de vérification
      await this.agentVerificationPoint();

      // Phase 2: Mappings frameworks (peut être parallélisé)
      await Promise.all([
        this.agentSCF(),
        this.agentISO(),
        this.agentCOBIT()
      ]);

      // Phase 3: Analyse menaces et risques (séquentiel car le risque dépend de la menace)
      await this.agentThreat();
      await this.agentRisk();

      // Phase 4: Implémentation
      await this.agentImplementation();

      // Phase 5: Synthèse finale
      await this.agentSynthesizer();

      console.log('\n🎭 ========================================');
      console.log('🎭 ORCHESTRATION TERMINÉE AVEC SUCCÈS');
      console.log(`🎭 Messages A2A échangés: ${this.a2aMessages.length}`);
      console.log('🎭 ========================================\n');

      // Construction du résultat final
      const result: AnalysisResult = {
        id: requirementId,
        requirement: this.mcpContext.requirement,
        verificationPoint: this.mcpContext.verificationPoint || '',
        scfMapping: this.mcpContext.scfMapping || 'Non mappé',
        iso27001Mapping: this.mcpContext.iso27001Mapping || 'Non mappé',
        iso27002Mapping: this.mcpContext.iso27002Mapping || 'Non mappé',
        cobit5Mapping: this.mcpContext.cobit5Mapping || 'Non mappé',
        analysis: this.mcpContext.analysis || '',
        threat: this.mcpContext.threat,
        risk: this.mcpContext.risk,
        controlImplementation: this.mcpContext.controlImplementation,
      };

      return result;

    } catch (error) {
      console.error('❌ Erreur dans l\'orchestration:', error);
      throw new AgenticAnalysisError('L\'orchestration des agents a échoué', error);
    }
  }

  /**
   * Extrait le texte d'une réponse Anthropic
   */
  private extractText(response: any): string {
    const textContent = response.content.find((block: any) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new AgenticAnalysisError("L'API Claude n'a pas retourné de contenu texte.");
    }
    return textContent.text.trim();
  }
}

// ============================================================================
// API PUBLIQUE
// ============================================================================

/**
 * Système agentique orchestré avec A2A et MCP pour l'analyse approfondie
 * d'une exigence unique par 8 agents spécialisés.
 */
export const analyzeManualRequirement = async (
  requirementText: string,
  requirementId: number = 1
): Promise<AnalysisResult> => {
  const orchestrator = new AgentOrchestrator(requirementText);
  return await orchestrator.orchestrate(requirementId);
};

/**
 * Analyse multiple d'exigences avec orchestration parallèle
 */
export const analyzeMultipleManualRequirements = async (
  requirements: string[],
  onProgress?: (current: number, total: number) => void
): Promise<AnalysisResult[]> => {
  const results: AnalysisResult[] = [];
  const total = requirements.length;

  for (let i = 0; i < requirements.length; i++) {
    console.log(`\n📊 Progression: ${i + 1}/${total}`);
    const result = await analyzeManualRequirement(requirements[i], i + 1);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
};
