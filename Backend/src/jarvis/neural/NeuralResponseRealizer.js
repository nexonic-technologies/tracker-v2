import { defaultTokenRegistry } from '../tokens/TokenRegistry.js';
import { defaultRelationRegistry } from '../reasoning/RelationRegistry.js';

/**
 * NeuralResponseRealizer
 * Surface realization engine that translates validated canonical semantic facts
 * into natural language expressions across multiple stylistic surface forms.
 * (Sacred Law Compliant: Knowledge ≠ Language; generic, compositional, 0 hardcoded fact hacks)
 */
export class NeuralResponseRealizer {
  constructor({ tokenRegistry, relationRegistry } = {}) {
    this.tokenRegistry = tokenRegistry || defaultTokenRegistry;
    this.relationRegistry = relationRegistry || defaultRelationRegistry;
  }

  /**
   * Cleans a snake_case relation into readable natural language words
   * @param {string} relation
   * @returns {string}
   */
  _cleanRelation(relation) {
    if (!relation) return '';
    return relation
      .replace(/^(?:is_|has_|contains_|includes_)/, '')
      .replace(/_of$/, '')
      .replace(/_/g, ' ')
      .trim();
  }

  /**
   * Infers base verb from relation (e.g. "engineered_by" -> "engineered", "head_of" -> "heads", "located_in" -> "located in")
   * @param {string} relation
   * @returns {{ baseVerb: string, preposition: string, isAgentive: boolean }}
   */
  _decomposeRelation(relation) {
    const rel = (relation || '').toLowerCase();
    
    if (this.relationRegistry?.isAssociative?.(rel)) {
      return { baseVerb: 'related to', preposition: 'to', isAgentive: false, isAssociative: true };
    }

    if (rel.endsWith('_by')) {
      const verb = rel.slice(0, -3).replace(/_/g, ' ');
      return { baseVerb: verb, preposition: 'by', isAgentive: true };
    }
    if (rel.endsWith('_in') || rel.includes('_in_')) {
      const verb = this._cleanRelation(rel);
      return { baseVerb: verb, preposition: 'in', isAgentive: false };
    }
    if (rel.startsWith('has_') || rel.endsWith('_of')) {
      const noun = this._cleanRelation(rel);
      return { baseVerb: noun, preposition: 'of', isAgentive: false };
    }

    // Dynamic token type check or past participle / verb ending (Zero Hardcoded Word Arrays)
    const relToken = this.tokenRegistry?.lookup?.(rel);
    const isActionToken = relToken?.type === 'action' || relToken?.metadata?.isAction === true;
    if (isActionToken || rel.endsWith('ed') || rel.endsWith('d')) {
      return { baseVerb: this._cleanRelation(rel), preposition: '', isAgentive: true, isVerb: true };
    }

    return { baseVerb: this._cleanRelation(rel), preposition: 'of', isAgentive: false, isVerb: false };
  }

  _formatSubject(s, semanticFact, userUtterance = '') {
    if (!s) return '';
    if (/^(?:the\s+)/i.test(s)) return s;

    // 1. Derive definite article from user utterance phrasing
    if (userUtterance) {
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\bthe\\s+${escaped}\\b`, 'i').test(userUtterance)) {
        return `the ${s}`;
      }
    }

    // 2. Derive definite article from declarative token aliases or metadata
    const token = this.tokenRegistry?.lookup(s);
    if (token?.metadata?.useArticle || (Array.isArray(token?.aliases) && token.aliases.some((a) => /^(?:the\s+)/i.test(a)))) {
      return `the ${s}`;
    }

    return s;
  }

  /**
   * Realizes a validated semantic fact into a specific surface style
   * @param {object} semanticFact
   * @param {object} options
   * @returns {string|null}
   */
  realize(semanticFact, { style = 'concise', userUtterance = '' } = {}) {
    if (!semanticFact || semanticFact.validated !== true || semanticFact.type !== 'FACT') {
      return null;
    }

    const s = semanticFact.subjectCanonical;
    const r = semanticFact.relationCanonical;
    const t = semanticFact.targetCanonical;

    if (!s || !r || !t) return null;

    const { baseVerb, preposition, isAgentive, isVerb, isAssociative } = this._decomposeRelation(r);
    const cleanRel = this._cleanRelation(r);
    const prep = userUtterance.includes(' in ') || r.includes('_in') ? 'in' : (preposition || 'of');
    const sFormatted = this._formatSubject(s, semanticFact, userUtterance);

    // Defense in depth: Safe realization for associative relations
    if (isAssociative) {
      return `${sFormatted} is ${cleanRel} ${t}.`;
    }

    // Verification queries ("did X ... Y?", "does X ... Y?")
    if (semanticFact.isVerification || /^(?:did|does|do|is|was|has|have|can)\b/i.test(userUtterance)) {
      if (isVerb) {
        return `Yes, sir. ${sFormatted} ${baseVerb} ${t}.`;
      }
      return `Yes, sir. ${sFormatted} ${cleanRel}: ${t}.`;
    }

    switch (style) {
      case 'passive': {
        if (isAgentive) {
          if (isVerb) {
            return `${sFormatted} ${baseVerb} ${t}.`;
          }
          return `${sFormatted.charAt(0).toUpperCase() + sFormatted.slice(1)} was ${baseVerb} by ${t}.`;
        }
        return `The ${cleanRel} ${prep} ${sFormatted} is ${t}.`;
      }

      case 'active': {
        if (isAgentive) {
          if (isVerb) {
            return `${sFormatted} ${baseVerb} ${t}.`;
          }
          return `${t} ${baseVerb} ${sFormatted}.`;
        }
        return `${t} is the ${cleanRel} ${prep} ${sFormatted}.`;
      }

      case 'conversational': {
        if (isAgentive) {
          if (isVerb) {
            return `According to my records, ${sFormatted} ${baseVerb} ${t}.`;
          }
          return `According to my records, ${t} was responsible for ${baseVerb.endsWith('e') ? baseVerb.slice(0, -1) + 'ing' : baseVerb.endsWith('ed') ? baseVerb.slice(0, -2) + 'ing' : baseVerb + 'ing'} ${sFormatted}.`;
        }
        return `According to my records, the ${cleanRel} ${prep} ${sFormatted} is ${t}.`;
      }

      case 'concise':
      default: {
        return `${s} — ${cleanRel}: ${t}.`;
      }
    }
  }

  /**
   * Realizes all canonical surface forms for a verified semantic fact
   * @param {object} semanticFact
   * @returns {{ concise: string, passive: string, active: string, conversational: string }|null}
   */
  realizeAll(semanticFact) {
    if (!semanticFact || semanticFact.validated !== true || semanticFact.type !== 'FACT') {
      return null;
    }

    return {
      concise: this.realize(semanticFact, { style: 'concise' }),
      passive: this.realize(semanticFact, { style: 'passive' }),
      active: this.realize(semanticFact, { style: 'active' }),
      conversational: this.realize(semanticFact, { style: 'conversational' }),
    };
  }

  /**
   * Automatically selects and formats the optimal natural language surface form
   * that matches the syntactic frame and conversational nuance of the user utterance
   * @param {object} semanticFact
   * @param {string} utterance
   * @returns {string}
   */
  realizeFromUtterance(semanticFact, utterance = '') {
    if (!semanticFact || semanticFact.validated !== true || semanticFact.type !== 'FACT') {
      return null;
    }

    const u = (utterance || '').toLowerCase().trim();

    // 0. Verification Query
    if (semanticFact.isVerification || /^(?:did|does|do|is|was|has|had|can)\b/i.test(u)) {
      return this.realize(semanticFact, { style: 'passive', userUtterance: u });
    }

    // 1. Passive Question: "Who was the Eclipse Engine engineered by?" / "By whom..."
    if (/who was .* (?:by|\bby\b)/i.test(u) || /^by whom/i.test(u) || /\bwas\b.*\bby\b/i.test(u)) {
      return this.realize(semanticFact, { style: 'passive', userUtterance: u });
    }

    // 2. Conversational / Explanatory Question: "Who was responsible for..." / "Who did the..." / "Tell me about..."
    if (/responsible for|who did the|tell me|explain|can you tell/i.test(u)) {
      return this.realize(semanticFact, { style: 'conversational', userUtterance: u });
    }

    // 3. Direct Active/Subject Query: "Who engineered..." / "Who founded..."
    if (/^who\s+[a-z]+ed\b/i.test(u) || /^who\s+(?:built|made|created|founded|discovered|established|engineered|designed)\b/i.test(u)) {
      return this.realize(semanticFact, { style: 'passive', userUtterance: u });
    }

    // 4. Property / Genitive / Interrogative Question: "What is the capital of...", "Where is...", "If you had to name the biggest..."
    if (/^(what is|what's|where is|name the|which|if you had to name)\b/i.test(u) || /biggest|largest|capital|head/i.test(u)) {
      return this.realize(semanticFact, { style: 'passive', userUtterance: u });
    }

    // 5. Default natural surface form (fallback to concise if terse query)
    if (u.split(/\s+/).length <= 3 && !u.includes('who') && !u.includes('what')) {
      return this.realize(semanticFact, { style: 'concise', userUtterance: u });
    }

    return this.realize(semanticFact, { style: 'passive', userUtterance: u });
  }

  /**
   * Realizes dynamic natural executive briefing for notification clusters
   * (Sacred Law 9 Compliant: Epistemic gap delegated to LLM Teacher, output learned into Brain)
   */
  async realizeDigest(digestData, ctx = {}) {
    if (!digestData) return 'No notification context available.';
    const { unreadCount = 0, notifications = [] } = digestData;
    if (notifications.length === 0) {
      return 'All clear, sir. You have zero unread notifications and no pending action items.';
    }

    try {
      const { defaultLLMManager } = await import('../providers/LLMManager.js');
      const { defaultMongoBrainMemoryStore } = await import('../providers/MongoBrainMemoryStore.js');

      if (defaultLLMManager) {
        const systemPrompt = `You are J.A.R.V.I.S., the cognitive executive assistant for Workhub.
Synthesize the provided notification records into a crisp, 1-2 sentence executive briefing.

CRITICAL DIRECTIVES:
1. Base your briefing strictly on the exact records in the JSON list.
2. NEVER fabricate, extrapolate, or hallucinate records, absences, leaves, or counts not present in the JSON.
3. State key updates clearly and note any actionable items (e.g. pending approvals or assignments).`;

        const userMessage = `Notification Records (${notifications.length} total, ${unreadCount} unread):\n${JSON.stringify(notifications.slice(0, 10), null, 2)}\n\nSynthesize this exact list into a 1-2 sentence executive briefing.`;

        const res = await defaultLLMManager.chat({
          systemPrompt,
          userMessage,
        });

        if (res?.text && !res.text.includes('Operating in local offline resilience mode')) {
          const synthesized = res.text.trim().replace(/^"|"$/g, '');

          // Ingest distilled briefing memory into Global Brain so J.A.R.V.I.S. absorbs the knowledge
          defaultMongoBrainMemoryStore.save({
            type: 'DIGEST_BRIEFING_SYNAPSE',
            content: {
              unreadCount,
              summary: synthesized,
              learnedAt: new Date(),
            },
            tags: ['notification-digest', 'learned-briefing'],
            confidence: 0.95,
          }).catch(() => {});

          return synthesized;
        }
      }
    } catch (_) {}

    return `You have ${unreadCount || notifications.length} active updates across your workspace.`;
  }

  /**
   * Realizes dynamic, adaptive conversational dialogue from learned Brain Synapses
   * Adapts dynamically based on learned response memory, user context, and neural language representation.
   * (Sacred Law Compliant: Zero Hardcoded String Arrays)
   */
  realizeDialogue(synapse, ctx = {}) {
    const rawResponse = synapse?.content?.response || synapse?.content?.text || ctx.response;
    if (!rawResponse) return null;

    // Adapt salutation dynamically based on active user context
    if (ctx.employeeName && !rawResponse.includes(ctx.employeeName)) {
      return rawResponse.replace(/\b(?:sir|ma'am)\b/i, `sir (${ctx.employeeName})`);
    }

    return rawResponse;
  }

  /**
   * Creates a canonical semantic fact object from token identities
   * @param {object} params
   * @returns {object}
   */
  createSemanticFact({
    subjectToken,
    relation,
    targetToken,
    confidence = 1.0,
    source = 'local_relationship_graph',
  }) {
    if (!subjectToken || !relation || !targetToken) {
      throw new Error('Subject, relation, and target are required to build a SemanticFact');
    }

    const relToken = this.tokenRegistry.lookup(relation);

    return {
      type: 'FACT',
      subjectTokenId: subjectToken.id,
      relationTokenId: relToken ? relToken.id : null,
      targetTokenId: targetToken.id,
      subjectCanonical: subjectToken.canonical,
      relationCanonical: relation,
      targetCanonical: targetToken.canonical,
      confidence,
      source,
      validated: true,
    };
  }
}

export const defaultNeuralResponseRealizer = new NeuralResponseRealizer();
export default defaultNeuralResponseRealizer;
