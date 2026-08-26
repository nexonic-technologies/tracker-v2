import { defaultMongoBrainMemoryStore } from '../providers/MongoBrainMemoryStore.js';
import { defaultLLMManager } from '../providers/LLMManager.js';
import { defaultTokenRegistry, TokenType, STOP_WORDS } from '../tokens/TokenRegistry.js';
import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';
import { RelationRegistry } from '../reasoning/RelationRegistry.js';

export class LearningAnalyst {
  constructor({ brainMemory, llmManager, tokenRegistry, graph, relationRegistry } = {}) {
    this.brainMemory = brainMemory || defaultMongoBrainMemoryStore;
    this.llmManager = llmManager || defaultLLMManager;
    this.tokenRegistry = tokenRegistry || defaultTokenRegistry;
    this.graph = graph || defaultRelationshipGraph;
    this.relationRegistry = relationRegistry || new RelationRegistry({ graph: this.graph, tokenRegistry: this.tokenRegistry });
  }

  /**
   * Universal Entity Phrase Normalizer
   * (Pure syntax rules, strips noise/copulas/prepositions universally)
   */
  _cleanEntityPhrase(phrase) {
    if (!phrase || typeof phrase !== 'string') return '';
    let s = phrase.trim();
    s = s.replace(/^(?:the|a|an)\s+/i, '');
    s = s.replace(/^(?:in|at|on|to|from|by|of|with|for)\s+/i, '');
    s = s.replace(/\s+(?:is|was|are|were)(?:\s+(?:a|an|the)\s+[\w\s]+?)?\s*(?:is|was|are|were)?$/i, '');
    s = s.replace(/\s+(?:is|was|are|were)$/i, '');
    s = s.replace(/^["']|["']$/g, '').trim();
    return s;
  }

  /**
   * Deterministic declarative pattern extraction ONLY for explicit short micro-facts (e.g. "Remember: Chennai is the capital of Tamil Nadu")
   * All complex, multi-word, or natural-language sentences are strictly delegated to LLM Teacher distillation.
   */
  _extractDeclarativeTriples(text) {
    if (!text || typeof text !== 'string') return [];
    const trimmed = text.trim();
    if (!/^remember\b/i.test(trimmed) && (/[?]$/.test(trimmed) || /^(what|who|where|which|when|how|is|was|are|were|do|does|did)\b/i.test(trimmed))) {
      return [];
    }

    const clean = text.replace(/^remember(?:\s+this|\s+that)?(?::|\s+)\s*/i, '').replace(/[.\n\r?]+$/, '').trim();

    // If the sentence contains relative pronouns, clauses, or is long (> 6 words), delegate strictly to LLM Teacher
    if (/\b(?:that|which|who|whom|whose|where|when|among|because|although|while)\b/i.test(clean) || clean.split(/\s+/).length > 6) {
      return [];
    }

    const triples = [];

    // Copular property pattern: "[Object] is/was the [Property] of [Subject]" (e.g. "Chennai is the capital of Tamil Nadu")
    const copulaOfMatch = clean.match(/^([A-Za-z0-9\s.-]{1,30})\s+(?:is|was|are|were)\s+(?:the\s+)?(\w+)\s+of\s+([A-Za-z0-9\s.-]{1,30})$/i);
    if (copulaOfMatch) {
      const obj = this._cleanEntityPhrase(copulaOfMatch[1]);
      const prop = copulaOfMatch[2].trim().toLowerCase();
      const sub = this._cleanEntityPhrase(copulaOfMatch[3]);
      if (sub && obj && sub.split(/\s+/).length <= 3 && obj.split(/\s+/).length <= 3) {
        triples.push({ subject: sub, relation: `has_${prop}`, object: obj });
        return triples;
      }
    }

    return triples;
  }

  /**
   * Ingests canonical entities and triples into TokenRegistry and RelationshipGraph
   */
  _ingestKnowledge({ entities = [], triples = [] } = {}, ctx = null) {
    // 1. Ingest entities with explicit semantic types
    for (const ent of entities) {
      if (ent.name) {
        const canonicalName = String(ent.name).trim();
        const entityType = ent.type ? String(ent.type).trim().toLowerCase() : TokenType.ENTITY;
        this.tokenRegistry.resolveOrRegister(canonicalName, entityType);
      }
    }

    // 2. Ingest relational triples
    for (const t of triples) {
      if (t.subject && t.object && t.relation) {
        const subName = String(t.subject).trim();
        const objName = String(t.object).trim();
        const relNorm = this.relationRegistry ? this.relationRegistry.normalizeRelation(t.relation) : String(t.relation).trim().toLowerCase().replace(/[\s-]+/g, '_');

        const subToken = this.tokenRegistry.resolveOrRegister(subName, TokenType.ENTITY);
        const objToken = this.tokenRegistry.resolveOrRegister(objName, TokenType.ENTITY);

        if (subToken && objToken && subToken.id !== objToken.id) {
          this.graph.addRelationship(subToken.id, relNorm, objToken.id, t.confidence || 1.0);

          // Register dynamic inverse edge in graph
          if (this.relationRegistry) {
            const invRel = this.relationRegistry.getInverse(relNorm);
            if (invRel && invRel !== relNorm) {
              this.graph.addRelationship(objToken.id, invRel, subToken.id, (t.confidence || 1.0) * 0.98);
            }
          }

          if (ctx && typeof ctx.log === 'function') {
            ctx.log('LearningAnalyst', `Ingested knowledge: (${subToken.canonical}) ──[${relNorm}]──► (${objToken.canonical})`);
          }
        }
      }
    }

    // 3. Reconcile graph to ensure global continuity
    this.reconcileGraph();
  }

  /**
   * Idempotent Graph Reconciliation
   * Scans tokens and graph topology, merges equivalent surface forms into canonical nodes,
   * repoints all incoming/outgoing edges transactionally, and preserves edge weights & provenance.
   */
  reconcileGraph() {
    if (!this.tokenRegistry || !this.graph) return;

    const allTokens = Array.from(this.tokenRegistry.tokensById.values());
    for (let i = 0; i < allTokens.length; i++) {
      const t1 = allTokens[i];
      if (t1.status === 'merged') continue;

      for (let j = i + 1; j < allTokens.length; j++) {
        const t2 = allTokens[j];
        if (t2.status === 'merged' || t1.id === t2.id) continue;

        // Check if t1 and t2 represent the same canonical entity
        const isEquiv = this.tokenRegistry.lookup(t2.canonical)?.id === t1.id ||
          this.tokenRegistry.lookup(t1.canonical)?.id === t2.id;

        if (isEquiv) {
          // Keep the shorter/canonical root as target
          const target = t1.canonical.length <= t2.canonical.length ? t1 : t2;
          const source = target.id === t1.id ? t2 : t1;

          // Merge source into target
          try {
            this.tokenRegistry.merge(source.id, target.id);
            this.graph.repointNode(source.id, target.id);
          } catch (e) {
            // Ignore if already merged
          }
        }
      }
    }
  }

  /**
   * Universal Background LLM Knowledge Graph Triple Distillation (Epistemic Teacher Bootstrapping)
   * (Sacred Law 9 Compliant: 0 String Hardcoding, Pure Neuro-Symbolic Distillation)
   */
  async _distillFactualTriplesViaLLM(utterance, responseText, ctx) {
    if (!utterance) return;

    // 1. Fast deterministic declarative extraction
    const directTriples = this._extractDeclarativeTriples(utterance);
    if (directTriples.length > 0) {
      this._ingestKnowledge({ triples: directTriples }, ctx);
      return;
    }

    if (!this.llmManager) return;

    const systemPrompt = `You are the Universal Knowledge Graph Extraction Engine for J.A.R.V.I.S.
Deconstruct input text into formal, atomic ontological entities and canonical semantic propositions.

FORMAL EXTRACTION PRINCIPLES:
1. ATOMIC NAMED ENTITIES: Extract discrete, canonical proper nouns and semantic concepts without extraneous modifiers, auxiliary verbs, or relative clauses.
2. ONTOLOGICAL TYPING: For every extracted entity, assign its specific category/type (e.g. administrative_division, creative_work, organization, location, person, artifact, temporal).
3. CANONICAL RELATIONAL PREDICATES: Express relational links as normalized, lower snake_case predicates (e.g. part_of, located_in, created_by, subclass_of, member_of, instance_of).
4. NOMINALIZATION & COREFERENCE RESOLUTION: Normalize nominalized action/event expressions by resolving the primary target entity as the subject and deriving the corresponding active relational predicate.

Format MUST be strict JSON:
{
  "entities": [
    { "name": "Canonical Entity Name", "type": "ontological_type" }
  ],
  "triples": [
    { "subject": "Subject Entity", "relation": "snake_case_predicate", "object": "Object Entity or Value" }
  ]
}`;

    try {
      const res = await this.llmManager.chat({
        systemPrompt,
        userMessage: `User Utterance: "${utterance}"\nAssistant Response: "${responseText || ''}"`,
      });

      let clean = res.text.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
      }

      let parsed = { entities: [], triples: [] };
      try {
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const obj = JSON.parse(jsonMatch[0]);
          parsed.entities = Array.isArray(obj.entities) ? obj.entities : [];
          parsed.triples = Array.isArray(obj.triples) ? obj.triples : [];
        }
      } catch (parseErr) {
        const regex = /"subject"\s*:\s*"([^"]+)"[\s\S]*?"relation"\s*:\s*"([^"]+)"[\s\S]*?"object"\s*:\s*"([^"]+)"/g;
        let m;
        while ((m = regex.exec(clean)) !== null) {
          parsed.triples.push({ subject: m[1].trim(), relation: m[2].trim(), object: m[3].trim() });
        }
      }

      if (parsed.entities.length > 0 || parsed.triples.length > 0) {
        this._ingestKnowledge(parsed, ctx);
      }
    } catch (err) {
      if (ctx && typeof ctx.log === 'function') {
        ctx.log('LearningAnalyst', `Knowledge distillation notice: ${err.message}`);
      }
    }
  }

  /**
   * Harvests domain entities and code symbols from generated responses/artifacts into TokenRegistry
   */
  _harvestResponseEntities(responseText) {
    if (!responseText || typeof responseText !== 'string') return [];
    const harvested = [];

    // Extract file paths (e.g. backend/src/services/leave.service.js)
    const fileMatches = responseText.match(/[\w/.-]+\.(?:js|jsx|ts|tsx|json|md)/g) || [];
    for (const file of fileMatches) {
      if (!this.tokenRegistry.lookup(file)) {
        const token = this.tokenRegistry.register({
          canonical: file,
          type: 'entity',
          metadata: { category: 'code_file' },
        });
        harvested.push(token);
      }
    }

    // Extract camelCase lifecycle hooks and technical modules (e.g. beforeApproval, policyEngine, ABAC)
    const hookMatches = responseText.match(/\b(before[A-Z]\w+|after[A-Z]\w+|policyEngine|ApprovalWorkflow|ABAC)\b/g) || [];
    for (const hook of hookMatches) {
      if (!this.tokenRegistry.lookup(hook)) {
        const token = this.tokenRegistry.register({
          canonical: hook,
          type: hook.startsWith('before') || hook.startsWith('after') ? 'action' : 'concept',
          metadata: { category: 'technical_architecture' },
        });
        harvested.push(token);
      }
    }

    return harvested;
  }

  /**
   * Captures explicit user corrections to LLM outputs as high-value training observations
   */
  recordHumanCorrection({ utterance, generatedOutput, correctedOutput, context = {} } = {}) {
    if (!utterance || !correctedOutput) return null;

    const candidate = {
      id: `correction_${Date.now()}`,
      type: 'HUMAN_CORRECTION',
      utterance,
      generatedOutput: generatedOutput || '',
      correctedOutput,
      weight: 3.0,
      source: 'human_correction',
      verified: true,
      context,
      createdAt: new Date().toISOString(),
    };

    if (this.brainMemory && typeof this.brainMemory.storePattern === 'function') {
      this.brainMemory.storePattern(candidate).catch(() => { });
    }

    return candidate;
  }

  /**
   * Observe context and synthesize learned patterns into Global MongoDB Brain (non-blocking background safe).
   * @param {import('../core/JarvisContext.js').JarvisContext} ctx
   */
  async analyze(ctx) {
    if (!ctx.utterance || (ctx.intent && ctx.intent.isConfirmation)) {
      return ctx;
    }
    if (ctx.offlineResolved && ctx.intent?.type !== 'explicit_learning') {
      return ctx;
    }

    const utterance = ctx.utterance.trim();
    const successfulTools = (ctx.toolResults || []).filter((r) => r.executed && !r.error);

    // 1. Autonomous Discovery Tool Ingestion
    for (const toolRes of successfulTools) {
      const triple = toolRes.data?.triple || toolRes.result?.triple;
      if (triple) {
        const { subject, relation, object } = triple;
        if (subject && object) {
          const subjectToken = this.tokenRegistry.lookup(subject) || this.tokenRegistry.register({ canonical: subject, type: 'entity' });
          const objectToken = this.tokenRegistry.lookup(object) || this.tokenRegistry.register({ canonical: object, type: 'entity' });
          this.graph.addRelationship(subjectToken.id, (relation || 'has_capital').toLowerCase().replace(/\s+/g, '_'), objectToken.id, 1.0);
          ctx.log('LearningAnalyst', `Harvested discovery triple: (${subjectToken.canonical}) -[${relation}]-> (${objectToken.canonical})`);
        }
      }
    }

    // 2. Response & Artifact Technical Entity Harvesting
    if (ctx.response) {
      const harvestedTokens = this._harvestResponseEntities(ctx.response);
      if (harvestedTokens.length > 0) {
        ctx.log('LearningAnalyst', `Harvested ${harvestedTokens.length} response tokens into TokenRegistry`);
      }
    }

    // 3. Universal Knowledge Graph Triple Distillation (Zero Hardcoding)
    await this._distillFactualTriplesViaLLM(utterance, ctx.response, ctx);

    // 4. Synthesize generalized parametric procedure from successful domain tool executions
    if (successfulTools.length > 0 && !successfulTools.some(t => t.tool === 'browser.search')) {
      const tool = successfulTools[0];
      const systemPrompt = `You are the Meta-Learning and Pattern Consolidation Analyst for Workhub Jarvis AI.
An interaction completed successfully. Distill a generalized PATTERN_PROCEDURE that maps natural language utterances to this tool execution.

CRITICAL REQUIREMENT:
Generalize specific variables (numbers, days, dates, names, leave types, expressions) into typed template slots.
Slot syntax:
- Numbers: {slotName:number} (e.g. "what is {a:number} + {b:number}", "apply for {days:number} days leave")
- Strings/Entities: {slotName:string} (e.g. "show payslip for {month:string} {year:number}", "policy for {role:string}")

Parameter mapping:
Reference slot variables inside parameter strings using {slotName} (e.g. { "expression": "{a} - {b}" } or { "totalDays": "{days}", "reason": "{reason}" }).

Output MUST be strict JSON (no code fences, no extra text):
{
  "id": "procedure_unique_name",
  "type": "PATTERN_PROCEDURE",
  "intent": "${ctx.intent?.type || 'domain_action'}",
  "category": "${ctx.intent?.taskCategory || 'hrms'}",
  "tool": "${tool.tool}",
  "templates": [
    "generalized template with slots",
    "alternative variation with slots"
  ],
  "triggers": [
    "${utterance.toLowerCase()}"
  ],
  "parameters": {
    "paramKey": "parametric string with {slotName}"
  },
  "confidence": 0.95
}`;

      const userPrompt = `Utterance: "${utterance}"
Executed Tool: "${tool.tool}"
Parameters: ${JSON.stringify(tool.params || {})}`;

      try {
        const res = await this.llmManager.chat({
          systemPrompt,
          userMessage: userPrompt,
        });

        let clean = res.text.trim();
        if (clean.startsWith('```')) {
          clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
        }

        const procedure = JSON.parse(clean);
        if (procedure && procedure.type === 'PATTERN_PROCEDURE' && procedure.tool) {
          await this.brainMemory.save({
            type: 'PATTERN_PROCEDURE',
            content: procedure,
            tags: ['learned-pattern', procedure.tool, procedure.intent],
            confidence: procedure.confidence || 0.9,
          });
          ctx.log('LearningAnalyst', `Distilled & saved Parametric Procedure: ${procedure.id}`);
        }
      } catch (err) {
        ctx.log('LearningAnalyst', 'Procedure distillation skipped or failed', { error: err.message });
      }
      return ctx;
    }

    // 5. Conversational Synapse Distillation (Zero LLM Repeat Calls for Learned Dialogues)
    if (!ctx.offlineResolved && ctx.response && !ctx.error && utterance.length > 1) {
      try {
        const normUtterance = utterance.toLowerCase().trim();
        // Save conversational synapse into MongoDB Global Brain
        await this.brainMemory.save({
          type: 'CONVERSATIONAL_SYNAPSE',
          content: {
            triggers: [normUtterance],
            response: ctx.response,
            learnedAt: new Date(),
          },
          tags: ['conversational-learning', 'synapse', normUtterance.slice(0, 30)],
          confidence: 0.95,
        });
        ctx.log('LearningAnalyst', `Distilled Conversational Synapse for: "${normUtterance}"`);
      } catch (err) {
        ctx.log('LearningAnalyst', 'Conversational synapse save notice', { error: err.message });
      }
    }

    return ctx;
  }
}

export const defaultLearningAnalyst = new LearningAnalyst();
export default defaultLearningAnalyst;

