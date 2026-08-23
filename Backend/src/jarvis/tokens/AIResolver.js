import { defaultLLMManager } from '../providers/LLMManager.js';

/**
 * AI Semantic Resolver for Unknown Concepts
 */
export class AIResolver {
  constructor({ llmManager, timeoutMs = 12000 } = {}) {
    this.llmManager = llmManager || defaultLLMManager;
    this.timeoutMs = timeoutMs;
  }

  async resolveConcept({ candidate, context = '', knownTokens = [] }) {
    const knownTokensSummary = knownTokens.map((t) => `ID ${t.id}: "${t.canonical}" (${t.type})`).join(', ');

    const systemPrompt = `You are a strict semantic concept resolver for a symbolic token knowledge graph.
Analyze the candidate concept within its context.
You MUST output ONLY valid JSON matching this exact schema:
{
  "canonical": "normalized concept name (string)",
  "type": "concept" | "entity" | "action" | "property" | "technical_term",
  "isSingleConcept": true,
  "confidence": 0.9,
  "relationships": [
    {
      "relation": "performs" | "acts_on" | "type_of" | "means" | "used_for",
      "targetConceptOrId": "string"
    }
  ],
  "reasoning": "brief explanation"
}
Do NOT include markdown formatting or extra text. Output pure JSON only.`;

    const userPrompt = `Candidate: "${candidate}"
Context: "${context || candidate}"
Known tokens: [${knownTokensSummary || 'None'}]`;

    try {
      const responsePromise = this.llmManager.generate({
        systemPrompt,
        userMessage: userPrompt,
      });

      let timeoutHandle;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`AI resolution timed out after ${this.timeoutMs}ms`));
        }, this.timeoutMs);
      });

      const rawText = await Promise.race([responsePromise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutHandle);
      });

      return this._parseAndValidate(rawText, candidate);
    } catch (err) {
      return {
        status: 'uncertain',
        candidate,
        reason: err.message,
        canonical: candidate,
        type: 'concept',
        confidence: 0.0,
        relationships: [],
      };
    }
  }

  _parseAndValidate(rawText, candidate) {
    if (!rawText || typeof rawText !== 'string') {
      return {
        status: 'uncertain',
        candidate,
        reason: 'Empty response',
        canonical: candidate,
        type: 'concept',
        confidence: 0.0,
        relationships: [],
      };
    }

    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    }

    try {
      const obj = JSON.parse(cleanJson);
      const canonical = typeof obj.canonical === 'string' && obj.canonical.trim() ? obj.canonical.trim() : candidate;
      const type = ['concept', 'entity', 'action', 'property', 'technical_term', 'phrase'].includes(obj.type)
        ? obj.type
        : 'concept';
      const confidence = typeof obj.confidence === 'number' ? Math.max(0, Math.min(1, obj.confidence)) : 0.8;
      const relationships = Array.isArray(obj.relationships)
        ? obj.relationships.filter((r) => r && r.relation && r.targetConceptOrId)
        : [];

      return {
        status: confidence >= 0.5 ? 'resolved' : 'uncertain',
        candidate,
        canonical,
        type,
        isSingleConcept: obj.isSingleConcept !== false,
        confidence,
        relationships,
        reasoning: obj.reasoning || '',
      };
    } catch (parseErr) {
      return {
        status: 'uncertain',
        candidate,
        reason: `Malformed JSON: ${parseErr.message}`,
        canonical: candidate,
        type: 'concept',
        confidence: 0.0,
        relationships: [],
      };
    }
  }
}

export const defaultAIResolver = new AIResolver();
export default defaultAIResolver;
