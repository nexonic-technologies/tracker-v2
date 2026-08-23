import { defaultMongoBrainMemoryStore } from '../providers/MongoBrainMemoryStore.js';
import { defaultLLMManager } from '../providers/LLMManager.js';
import { defaultTokenRegistry } from '../tokens/TokenRegistry.js';
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
   * Deterministic declarative syntactic pattern extraction for explicit facts
   */
  _extractDeclarativeTriples(text) {
    if (!text || typeof text !== 'string') return [];
    const trimmed = text.trim();
    if (!/^remember\b/i.test(trimmed) && (/[?]$/.test(trimmed) || /^(what|who|where|which|when|how|is|was|are|were|do|does|did)\b/i.test(trimmed))) {
      return [];
    }
    const clean = text.replace(/^remember(?:\s+this|\s+that)?(?::|\s+)\s*/i, '').replace(/[.\n\r?]+$/, '').trim();
    const triples = [];

    // 1. Passive pattern: "[Subject] was|is [verb]ed by [Agent]" (e.g. "The Obsidian Map was discovered by Kael Varen")
    const passiveMatch = clean.match(/^(?:the\s+)?(.+?)\s+(?:was|is)\s+(\w+(?:ed|en|t|d))\s+by\s+(?:the\s+)?(.+)$/i);
    if (passiveMatch) {
      const subject = passiveMatch[1].trim();
      const verb = passiveMatch[2].trim().toLowerCase();
      const agent = passiveMatch[3].trim();
      triples.push({ subject, relation: `${verb}_by`, object: agent });
      triples.push({ subject: agent, relation: verb, object: subject });
      return triples;
    }

    // 2. Copular property pattern: "[Object] is/was the [Property] of [Subject]" (e.g. "Chennai is the capital of Tamil Nadu")
    const copulaOfMatch = clean.match(/^(?:the\s+)?(.+?)\s+(?:is|was)\s+(?:the\s+)?(\w+)\s+of\s+(?:the\s+)?(.+)$/i);
    if (copulaOfMatch) {
      const obj = copulaOfMatch[1].trim();
      const prop = copulaOfMatch[2].trim().toLowerCase();
      const sub = copulaOfMatch[3].trim();
      triples.push({ subject: sub, relation: `has_${prop}`, object: obj });
      triples.push({ subject: obj, relation: `${prop}_of`, object: sub });
      return triples;
    }

    // 3. Active transitive pattern: "[Agent] [verb]ed [the] [Subject]" (e.g. "Lyra Venn discovered the Celestial Archive")
    const activeMatch = clean.match(/^(?:the\s+)?([A-Z][\w\s.-]+?)\s+(\w+(?:ed|d|t))\s+(?:the\s+)?(.+)$/);
    if (activeMatch && !/^(is|was|has|had|are|were)$/i.test(activeMatch[2])) {
      const agent = activeMatch[1].trim();
      const verb = activeMatch[2].trim().toLowerCase();
      const subject = activeMatch[3].trim();
      triples.push({ subject: agent, relation: verb, object: subject });
      triples.push({ subject, relation: `${verb}_by`, object: agent });
      return triples;
    }

    return triples;
  }

  /**
   * Universal Background LLM Knowledge Graph Triple Distillation
   * (Sacred Law Compliant: Zero Hardcoded Regexes / Zero Domain Role Strings)
   */
  async _distillFactualTriplesViaLLM(utterance, responseText, ctx) {
    if (!utterance) return;

    // 1. Fast deterministic declarative extraction
    const directTriples = this._extractDeclarativeTriples(utterance);
    if (directTriples.length > 0) {
      for (const t of directTriples) {
        const subToken = this.tokenRegistry.lookup(t.subject) || this.tokenRegistry.register({ canonical: t.subject, type: 'entity' });
        const objToken = this.tokenRegistry.lookup(t.object) || this.tokenRegistry.register({ canonical: t.object, type: 'entity' });
        this.graph.addRelationship(subToken.id, t.relation.toLowerCase().replace(/\s+/g, '_'), objToken.id, 1.0);
        if (ctx && typeof ctx.log === 'function') {
          ctx.log('LearningAnalyst', `Direct declarative triple ingested: (${subToken.canonical}) ──[${t.relation}]──► (${objToken.canonical})`);
        }
      }
      return;
    }

    if (!this.llmManager) return;

    const systemPrompt = `You are the Universal Knowledge Graph Extraction Engine for J.A.R.V.I.S.
Extract all concrete factual relationships, entities, roles, properties, positions, quantities, counts, and definitions from the conversation turn as semantic triples.

CRITICAL EXTRACTION GUIDELINES:
1. Always preserve exact counts, metrics, numbers, and descriptive qualifiers inside the object target entity.
2. Extract normalized snake_case relation names expressing the exact semantic property (e.g. has_property, count_of_items, won_award, birth_year, located_in, discovered_by, engineered_by).
3. NEVER extract relation verbs (e.g. "discovered", "created", "built") as the object value. The object must be the target actor, entity, or value.
4. If a passive sentence "X was [verb]ed by Y" occurs, extract subject: "X", relation: "[verb]_by", object: "Y".

Format MUST be strict JSON:
{
  "triples": [
    {
      "subject": "Canonical entity name string",
      "relation": "snake_case_relation_string",
      "object": "Target entity, metric, count, or value string"
    }
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

      let triples = [];
      try {
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
        if (Array.isArray(parsed.triples)) {
          triples = parsed.triples;
        }
      } catch (parseErr) {
        // Fallback parser: Recover individual completed triple JSON objects from malformed or truncated LLM streams
        const regex = /"subject"\s*:\s*"([^"]+)"[\s\S]*?"relation"\s*:\s*"([^"]+)"[\s\S]*?"object"\s*:\s*"([^"]+)"/g;
        let m;
        while ((m = regex.exec(clean)) !== null) {
          triples.push({ subject: m[1].trim(), relation: m[2].trim(), object: m[3].trim() });
        }
      }

      if (triples.length > 0) {
        for (const t of triples) {
          if (t.subject && t.object && t.relation) {
            const relNorm = t.relation.toLowerCase().replace(/\s+/g, '_');
            const subToken = this.tokenRegistry.lookup(t.subject) || this.tokenRegistry.register({ canonical: t.subject, type: 'entity' });
            const objToken = this.tokenRegistry.lookup(t.object) || this.tokenRegistry.register({ canonical: t.object, type: 'entity' });
            this.graph.addRelationship(subToken.id, relNorm, objToken.id, 1.0);

            // Also register inverse relation edge in graph for bidirectional queries
            if (this.relationRegistry) {
              const invRel = this.relationRegistry.getInverse(relNorm);
              if (invRel && invRel !== relNorm) {
                this.graph.addRelationship(objToken.id, invRel, subToken.id, 1.0);
              }
            }

            if (ctx && typeof ctx.log === 'function') {
              ctx.log('LearningAnalyst', `Ingested knowledge triple: (${subToken.canonical}) ──[${relNorm}]──► (${objToken.canonical})`);
            }
          }
        }
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
      this.brainMemory.storePattern(candidate).catch(() => {});
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

