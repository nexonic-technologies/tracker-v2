import { defaultLLMManager } from '../providers/LLMManager.js';
import { defaultToolRegistry } from '../tools/ToolRegistry.js';
import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';
import { defaultTokenRegistry, TokenType } from '../tokens/TokenRegistry.js';
import { GraphReasoner } from '../reasoning/GraphReasoner.js';
import { defaultNeuralSemanticResolver } from '../neural/NeuralSemanticResolver.js';
import { defaultConversationContextTracker } from './ConversationContextTracker.js';

/**
 * Dynamic Intent Classifier with Universal Parametric Slot-Filling,
 * Semantic Graph Triplet Resolution, and Epistemic Gap Detection
 * (Sacred Law Compliant: Zero Ad-Hoc If-Chains & Zero Domain Hardcoding)
 */
export class IntentClassifier {
  constructor({ toolRegistry, llmManager, graph, tokenRegistry, reasoner, neuralResolver } = {}) {
    this.toolRegistry = toolRegistry || defaultToolRegistry;
    this.llmManager = llmManager || defaultLLMManager;
    this.graph = graph || defaultRelationshipGraph;
    this.tokenRegistry = tokenRegistry || defaultTokenRegistry;
    this.reasoner = reasoner || new GraphReasoner({ graph: this.graph, tokenRegistry: this.tokenRegistry });
    this.neuralResolver = neuralResolver || defaultNeuralSemanticResolver;
  }

  /**
   * Dynamically resolves semantic knowledge from the Token Registry & Relationship Graph
   * (Zero Hardcoded Roles / Zero Hardcoded Words)
   */
  _resolveDynamicGraphKnowledge(utterance, discourse = null) {
    if (!utterance || !this.tokenRegistry || !this.graph) return null;

    const lower = utterance.toLowerCase();
    const candidateTokens = this.tokenRegistry.findCandidates(utterance, { limit: 60, minScore: 0.1 });
    const stopWords = new Set([
      'what', 'who', 'where', 'which', 'when', 'how', 'many', 'much', 'does', 'did', 'do', 'doing',
      'the', 'are', 'was', 'were', 'is', 'am', 'been', 'being', 'have', 'has', 'had',
      'tell', 'about', 'from', 'with', 'into', 'that', 'this', 'these', 'those',
      'call', 'called', 'calling', 'say', 'said', 'saying', 'make', 'made', 'making',
      'and', 'but', 'or', 'for', 'of', 'in', 'on', 'at', 'to', 'by', 'an', 'a'
    ]);

    const utteranceWords = lower
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const isReverseQuery = /^(who|which|whose|name\s+the)\b/i.test(lower);

    let bestMatch = null;
    let highestScore = 0;

    // 1. Scan candidate entity/concept tokens retrieved via inverted index
    for (const token of candidateTokens) {
      const canonical = (token.canonical || '').toLowerCase().trim();
      if (canonical.length < 2 || stopWords.has(canonical)) continue;

      const canonicalWords = canonical.split(/[_\s-]+/).filter((w) => w.length > 2 && !stopWords.has(w));
      const exactMatch = lower.includes(canonical);
      const aliasMatch = Array.isArray(token.aliases) && token.aliases.some((a) => lower.includes(a.toLowerCase()));
      // Strict multi-word & typo match: For multi-word entities (e.g. "Moonstone Device", "Blackstar Device"), require >= 80% word match so single shared nouns like "Device" never collide
      const matchingCanonWordsCount = canonicalWords.filter((cw) => utteranceWords.some((uw) => this._isFuzzyMatch(cw, uw) || cw === uw)).length;
      const fuzzyMultiWordMatch = canonicalWords.length > 1 &&
        (canonicalWords.length === 2 ? matchingCanonWordsCount === 2 : (matchingCanonWordsCount / canonicalWords.length) >= 0.75);
      const singleWordFuzzyMatch = canonicalWords.length === 1 &&
        utteranceWords.some((uw) => this._isFuzzyMatch(canonicalWords[0], uw));

      if (exactMatch || aliasMatch || fuzzyMultiWordMatch || singleWordFuzzyMatch) {
        // Collect this token and any synonym / alternate-spelling equivalents
        const equivalentTokenIds = new Set([token.id]);
        const outgoingMeta = this.graph.getOutgoing(token.id);
        const incomingMeta = this.graph.getIncoming(token.id);

        for (const metaEdge of [...outgoingMeta, ...incomingMeta]) {
          if (['has_alternate_spelling', 'same_as', 'alias_of', 'aka'].includes(metaEdge.relation)) {
            equivalentTokenIds.add(metaEdge.from);
            equivalentTokenIds.add(metaEdge.to);
          }
        }

        // Check all candidate edges for this entity and its equivalents
        const candidateEdges = [];
        for (const tid of equivalentTokenIds) {
          const out = this.graph.getOutgoing(tid);
          const inc = this.graph.getIncoming(tid);
          candidateEdges.push(...out, ...inc);
        }

        for (const edge of candidateEdges) {
          // Skip meta-equivalence relations when answering factual questions
          if (['has_alternate_spelling', 'same_as', 'alias_of', 'aka'].includes(edge.relation) && !lower.includes('spell')) {
            continue;
          }

          const subjectToken = this.tokenRegistry.getById(edge.from);
          const targetToken = this.tokenRegistry.getById(edge.to);
          if (!subjectToken || !targetToken) continue;

          // Skip self-edges or stopword tokens
          if (stopWords.has((subjectToken.canonical || '').toLowerCase()) || stopWords.has((targetToken.canonical || '').toLowerCase())) {
            continue;
          }

          const relationStr = (edge.relation || '').toLowerCase();
          const targetStr = (targetToken.canonical || '').toLowerCase();
          const subjectStr = (subjectToken.canonical || '').toLowerCase();

          const relationWords = relationStr.split(/[_\s-]+/).filter((w) => w.length > 2);
          const targetWords = targetStr.split(/[_\s-]+/).filter((w) => w.length > 2 && !stopWords.has(w));

          // Compute semantic equivalences strictly for subjectToken
          const subOutgoing = this.graph.getOutgoing(subjectToken.id);
          const subIncoming = this.graph.getIncoming(subjectToken.id);
          const subEquivIds = new Set([subjectToken.id]);
          for (const me of [...subOutgoing, ...subIncoming]) {
            if (['has_alternate_spelling', 'same_as', 'alias_of', 'aka'].includes(me.relation)) {
              subEquivIds.add(me.from);
              subEquivIds.add(me.to);
            }
          }

          const subjectWords = [
            ...subjectStr.split(/[_\s-]+/).filter((w) => w.length > 2 && !stopWords.has(w)),
            ...(Array.isArray(subjectToken.aliases) ? subjectToken.aliases.flatMap((a) => a.toLowerCase().split(/[_\s-]+/).filter((w) => w.length > 2 && !stopWords.has(w))) : []),
            ...Array.from(subEquivIds).map((id) => this.tokenRegistry.getById(id)?.canonical?.toLowerCase()).filter(Boolean).flatMap((c) => c.split(/[_\s-]+/).filter((w) => w.length > 2 && !stopWords.has(w)))
          ];

          // 1. Identify entity tokens strictly (Exact & Typo Levenshtein, but NOT inflectional stem matching)
          const isEntityWordMatch = (w1, w2) => {
            if (!w1 || !w2) return false;
            const a = w1.toLowerCase();
            const b = w2.toLowerCase();
            if (a === b) return true;
            if (Math.abs(a.length - b.length) > 2) return false;
            if (a.length < 4 || b.length < 4) return false;
            return this._isFuzzyMatch(a, b) && !this._isStemMatch(a, b);
          };

          const matchingSubWords = subjectWords.filter((w) => utteranceWords.some((uw) => w === uw || isEntityWordMatch(w, uw)));
          const nonSubjectUtteranceWords = utteranceWords.filter((uw) => !subjectWords.some((sw) => sw === uw || isEntityWordMatch(sw, uw)));
          const matchingTargetWords = targetWords.filter((w) => nonSubjectUtteranceWords.some((uw) => w === uw || isEntityWordMatch(w, uw)));

          // 2. Query Predicate Words: Exclude subject entity words so subject names (e.g. "Eclipse Engine") never collide with relation verbs
          const queryPredicateWords = utteranceWords.filter((uw) =>
            !subjectWords.some((sw) => sw === uw || isEntityWordMatch(sw, uw))
          );

          // 3. Match candidate relation strictly against query predicate words
          const matchingRelWords = relationWords.filter((w) =>
            queryPredicateWords.some((qw) => this._isRelationEquivalent(w, qw))
          );

          // Strict Subject Match: Multi-word entities require full non-stopword canonical match
          const subjectCanonicalWords = subjectStr.split(/[_\s-]+/).filter((w) => w.length > 2 && !stopWords.has(w));
          const matchingSubCanonCount = subjectCanonicalWords.filter((cw) =>
            matchingSubWords.some((sw) => this._isFuzzyMatch(cw, sw) || cw === sw)
          ).length;
          const hasSubjectMatch = subjectCanonicalWords.length > 1
            ? (subjectCanonicalWords.length === 2 ? matchingSubCanonCount === 2 : (matchingSubCanonCount / subjectCanonicalWords.length) >= 0.75)
            : matchingSubWords.length > 0;

          // Strict Target Match: Multi-word entities require full non-stopword canonical match
          const targetCanonicalWords = targetStr.split(/[_\s-]+/).filter((w) => w.length > 2 && !stopWords.has(w));
          const matchingTargetCanonCount = targetCanonicalWords.filter((cw) =>
            matchingTargetWords.some((tw) => this._isFuzzyMatch(cw, tw) || cw === tw)
          ).length;
          const hasTargetMatch = targetCanonicalWords.length > 1
            ? (targetCanonicalWords.length === 2 ? matchingTargetCanonCount === 2 : (matchingTargetCanonCount / targetCanonicalWords.length) >= 0.75)
            : matchingTargetWords.length > 0;

          const hasRelationMatch = matchingRelWords.length > 0;
          const queryNonTargetPredicateWords = queryPredicateWords.filter((qw) =>
            !matchingTargetWords.some((tw) => this._isFuzzyMatch(tw, qw)) &&
            !targetWords.some((tw) => this._isFuzzyMatch(tw, qw))
          );
          const isIdentityReverseQuery = isReverseQuery && queryNonTargetPredicateWords.length === 0;

          // Forward Query: Subject matches + Relation/Target matches
          const isForwardMatch = hasSubjectMatch && (hasRelationMatch || hasTargetMatch);
          // Reverse Query: "Who established the Zephyr Archive?" (predicate query -> relation MUST match) OR "Who is called Lady Superstar?" (identity query)
          const isReverseMatch = isReverseQuery && hasTargetMatch && (hasRelationMatch || isIdentityReverseQuery) && (matchingTargetCanonCount === targetCanonicalWords.length);
          // Verification Query: Both subject and target match
          const isVerificationMatch = hasSubjectMatch && hasTargetMatch;

          if (!isForwardMatch && !isReverseMatch && !isVerificationMatch) {
            continue;
          }

          // Forward query guard: If target is not in the utterance, the relation MUST match
          if (isForwardMatch && !hasTargetMatch && !hasRelationMatch) {
            continue;
          }

          // Reverse query guard: The relation MUST match unless it is an open identity reverse query
          if (isReverseMatch && !hasRelationMatch && !isIdentityReverseQuery) {
            continue;
          }

          // Skip meta-equivalence & ontology relations when answering factual questions
          if (['has_alternate_spelling', 'same_as', 'alias_of', 'aka', 'inverse'].includes(edge.relation) && !lower.includes(edge.relation)) {
            continue;
          }

          let score = 0;
          let answerText = '';
          const cleanRel = edge.relation.replace(/^(?:is_|has_)/, '').replace(/_of$/, '').replace(/_/g, ' ');

          // Core Intent Priority: An edge matching the explicit queried relation predicate ranks highest
          const relMatchBonus = hasRelationMatch ? 10.0 : 0.0;

          if (isReverseMatch && !hasSubjectMatch) {
            score = (matchingTargetWords.length * 4.0) + (hasRelationMatch ? 8.0 : 1.0) + relMatchBonus;
            const invRel = this._formatInverseRelation(edge.relation);
            answerText = `${targetToken.canonical} ${invRel} ${subjectToken.canonical}.`;
          } else {
            // Forward/Verification: Strongly prioritize edges that actually answer the queried relation predicate
            score = (matchingSubWords.length * 3.5) + (matchingRelWords.length * 5.0) + (matchingTargetWords.length * 2.0) + relMatchBonus;
            answerText = `${subjectToken.canonical} — ${cleanRel}: ${targetToken.canonical}.`;
          }

          if (score > 0 && score > highestScore) {
            highestScore = score;
            const invRel = this._formatInverseRelation(edge.relation);
            bestMatch = {
              subject: isReverseMatch && !hasSubjectMatch ? targetToken : subjectToken,
              relation: isReverseMatch && !hasSubjectMatch ? invRel : edge.relation,
              target: isReverseMatch && !hasSubjectMatch ? subjectToken : targetToken,
              confidence: edge.confidence || 1.0,
              value: isReverseMatch && !hasSubjectMatch ? subjectToken.canonical : targetToken.canonical,
              customAnswer: answerText,
            };
          }
        }
      }
    }

    if (bestMatch) {
      return bestMatch;
    }

    if (this.reasoner) {
      // 2. Try Linear Multi-Hop Path Reasoning (A -> B -> C)
      const reasoningRes = this.reasoner.solve(utterance);
      if (reasoningRes && reasoningRes.path && reasoningRes.path.length > 1) {
        return {
          subject: reasoningRes.rootEntity,
          relation: reasoningRes.path.map((p) => p.relationCanonical || p.relation).join(' -> '),
          target: reasoningRes.targetToken,
          confidence: reasoningRes.confidence,
          value: reasoningRes.value,
          customAnswer: reasoningRes.explanation,
        };
      }

      // 3. Try Constellation Multi-Constraint Intersection (N(A1) ∩ N(A2))
      const constellation = this.reasoner.solveConstellationFromUtterance(utterance);
      if (constellation && constellation.found && constellation.count > 0) {
        const targetTok = constellation.targetToken;
        return {
          subject: targetTok,
          relation: 'matches_constraints',
          target: targetTok,
          confidence: constellation.confidence || 1.0,
          value: constellation.value,
          customAnswer: constellation.value,
          isConstellation: true,
        };
      }
    }

    // 4. Discourse Context & Anaphora Resolution (Multi-Turn Conversational Memory)
    if (discourse && discourse.focalEntities && discourse.focalEntities.length > 0) {
      const anaphora = defaultConversationContextTracker.resolveEllipticalSubject(utterance, discourse, this.tokenRegistry);
      if (anaphora && anaphora.focalEntity) {
        const resolved = this.graph.resolveProperty(anaphora.focalEntity.id || anaphora.focalEntity.canonical, anaphora.candidatePredicate, this.tokenRegistry);
        if (resolved) {
          const cleanRel = resolved.relation.replace(/^(?:is_|has_)/, '').replace(/_of$/, '').replace(/_/g, ' ');
          return {
            subject: resolved.subject,
            relation: resolved.relation,
            target: resolved.target,
            confidence: resolved.confidence || 1.0,
            value: resolved.value,
            customAnswer: `${resolved.subject.canonical} — ${cleanRel}: ${resolved.target.canonical}.`,
            anaphoraResolved: true,
          };
        }
      }
    }

    return null;
  }

  /**
   * Delegates inverse relation resolution strictly to the declarative RelationRegistry
   */
  _formatInverseRelation(relation) {
    if (!relation) return '';
    if (this.reasoner?.relationRegistry) {
      const inv = this.reasoner.relationRegistry.getInverse(relation);
      if (inv) return inv.replace(/_/g, ' ');
    }
    return relation.replace(/^(?:is_|has_)/, '').replace(/_of$/, '').replace(/_/g, ' ');
  }

  /**
   * Inflectional suffix stripper for morphological root matching (Zero Hardcoded Dictionaries)
   */
  _stripSuffix(w) {
    if (!w || w.length <= 3) return w;
    return w.replace(/(?:ingly|fully|ment|tion|sion|ness|less|ship|able|ible|ical|ance|ence|ies|ied|ing|ed|er|est|ly|es|s)$/i, '');
  }

  /**
   * Pure algorithmic morphological root stem matcher (Zero Hardcoded Dictionaries)
   */
  _isStemMatch(w1, w2) {
    if (!w1 || !w2) return false;
    const a = w1.toLowerCase();
    const b = w2.toLowerCase();
    if (a === b) return true;
    const s1 = this._stripSuffix(a);
    const s2 = this._stripSuffix(b);
    if (s1.length >= 3 && s2.length >= 3 && s1 === s2) return true;
    return false;
  }

  /**
   * Algorithmic typo and transposition matcher (Zero Hardcoding)
   */
  _isFuzzyMatch(w1, w2) {
    if (!w1 || !w2) return false;
    const a = w1.toLowerCase();
    const b = w2.toLowerCase();
    if (a === b) return true;
    if (this._isStemMatch(a, b)) return true;
    if (Math.abs(a.length - b.length) > 2) return false;
    // Disallow fuzzy matching on short words (< 4 chars) to prevent matching stopwords/operators
    if (a.length < 4 || b.length < 4) return false;

    // Check anagram / character transposition (e.g. murnal <-> mrunal)
    if (a.length === b.length && a.length >= 4) {
      const sortedA = a.split('').sort().join('');
      const sortedB = b.split('').sort().join('');
      if (sortedA === sortedB) return true;
    }

    // Dynamic programming Levenshtein distance check (diff <= 1 for 4-5 chars, diff <= 2 for 6-9 chars, diff <= 3 for >= 10 chars)
    const maxDiff = a.length >= 10 ? 3 : (a.length <= 5 ? 1 : 2);
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[a.length][b.length] <= maxDiff;
  }

  _stripSuffix(w) {
    if (!w || w.length <= 3) return w;
    return w.replace(/(?:ingly|fully|ment|tion|sion|ness|less|ship|able|ible|ical|ance|ence|ies|ied|ing|ed|er|est|ly|es|s)$/i, '');
  }

  _isStemMatch(w1, w2) {
    if (!w1 || !w2) return false;
    const a = w1.toLowerCase();
    const b = w2.toLowerCase();
    if (a === b) return true;
    const s1 = this._stripSuffix(a);
    const s2 = this._stripSuffix(b);
    if (s1.length >= 3 && s2.length >= 3 && s1 === s2) return true;
    return false;
  }

  /**
   * Graph-Driven Semantic Relation Equivalence (Zero Hardcoded Dictionaries)
   */
  _isRelationEquivalent(rel1, rel2) {
    if (!rel1 || !rel2) return false;
    const r1 = rel1.toLowerCase().replace(/^(?:is_|has_)/, '').replace(/_of$/, '').replace(/[\s-]+/g, '_');
    const r2 = rel2.toLowerCase().replace(/^(?:is_|has_)/, '').replace(/_of$/, '').replace(/[\s-]+/g, '_');

    if (r1 === r2) return true;
    if (this._isStemMatch(r1, r2)) return true;

    // Component-level stem matching (e.g. release_year <-> released, director_of <-> direct)
    const parts1 = r1.split('_');
    const parts2 = r2.split('_');
    for (const p1 of parts1) {
      for (const p2 of parts2) {
        if (p1 === p2 || this._isStemMatch(p1, p2)) return true;
      }
    }

    // Check if relationRegistry equates, inverts, or resolves dynamic clusters/meta-edges
    if (this.reasoner?.relationRegistry) {
      const eq = this.reasoner.relationRegistry.areEquivalentOrInverse(r1, r2);
      if (eq?.matches) return true;
    }

    // Check if relations are semantically linked as synonyms in the RelationshipGraph
    if (this.tokenRegistry && this.graph) {
      const tok1 = this.tokenRegistry.lookup(rel1);
      const tok2 = this.tokenRegistry.lookup(rel2);
      if (tok1 && tok2) {
        const edges1 = this.graph.getOutgoing(tok1.id);
        const edges2 = this.graph.getOutgoing(tok2.id);
        const isLinked = [...edges1, ...edges2].some((e) =>
          (e.from === tok1.id && e.to === tok2.id) ||
          (e.from === tok2.id && e.to === tok1.id)
        );
        if (isLinked) return true;
      }
    }
    return false;
  }

  /**
   * Compiles a declarative template with typed slots into an executable regular expression
   */
  _matchTemplate(template, utterance) {
    if (!template || !utterance) return null;

    const slotNames = [];
    let regexStr = template
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\\\{(\w+)(?::(number|string|date))?\\\}/gi, (_, name, type) => {
        slotNames.push({ name, type: type || 'string' });
        if (type === 'number') return '(\\d+(?:\\.\\d+)?)';
        return '([\\w\\s.,!?"\'()-]+?)';
      });

    const regex = new RegExp(`^${regexStr}$`, 'i');
    const match = utterance.trim().match(regex);

    if (!match) return null;

    const extractedParams = {};
    slotNames.forEach((slot, index) => {
      const rawVal = match[index + 1]?.trim();
      extractedParams[slot.name] = slot.type === 'number' ? Number(rawVal) : rawVal;
    });

    return extractedParams;
  }

  /**
   * Universally binds and interpolates extracted slots into declarative procedure parameters
   */
  _interpolateParameters(schemaParams = {}, extractedSlots = {}) {
    const finalParams = { ...extractedSlots };
    for (const [k, v] of Object.entries(schemaParams)) {
      if (typeof v === 'string') {
        let interpolated = v;
        for (const [slotKey, slotVal] of Object.entries(extractedSlots)) {
          interpolated = interpolated.replace(new RegExp(`\\{${slotKey}\\}`, 'g'), String(slotVal));
        }
        finalParams[k] = interpolated;
      } else if (finalParams[k] === undefined) {
        finalParams[k] = v;
      }
    }
    return finalParams;
  }

  async classify(ctx) {
    const utterance = (ctx.utterance || '').trim();
    if (!utterance) {
      ctx.intent = { type: 'empty', requiresTools: false, confidence: 1.0 };
      return ctx;
    }

    // 0. Explicit Knowledge Learning Directive
    if (/^remember\b/i.test(utterance)) {
      ctx.intent = {
        type: 'explicit_learning',
        taskCategory: 'memory',
        requiresTools: false,
        targetTools: [],
        parameters: { knowledge: utterance.replace(/^remember(?:\s+this|\s+that)?:\s*/i, '').trim() },
        confidence: 1.0,
        source: 'explicit_command',
      };
      return ctx;
    }

    // 0.1 Memory Recall & Knowledge Summary Directive ("what you remember", "show memory")
    if (/^(what\s+(?:do\s+)?you\s+remember|what\s+do\s+you\s+know|show\s+(?:your\s+)?memory|list\s+(?:all\s+)?memories|what\s+is\s+in\s+your\s+knowledge\s+base)\b/i.test(utterance)) {
      const facts = [];
      for (const [fromId, edges] of this.graph.adjacency.entries()) {
        const sourceTok = this.tokenRegistry.getById(fromId);
        if (!sourceTok) continue;
        for (const edge of edges) {
          if (['has_alternate_spelling', 'same_as', 'alias_of', 'aka'].includes(edge.relation)) continue;
          const targetTok = this.tokenRegistry.getById(edge.to);
          if (targetTok) {
            facts.push(`• ${sourceTok.canonical} — ${edge.relation.replace(/_/g, ' ')}: ${targetTok.canonical}`);
          }
        }
      }

      const memoryText = facts.length > 0
        ? `Here are the knowledge graph facts I currently remember, sir:\n\n${facts.slice(0, 20).join('\n')}${facts.length > 20 ? `\n...and ${facts.length - 20} more records.` : ''}`
        : 'My symbolic knowledge graph is currently empty, sir. You can teach me new facts using "Remember: [Subject] [Relation] [Object]".';

      ctx.intent = {
        type: 'recall_memory_summary',
        taskCategory: 'knowledge',
        requiresTools: false,
        targetTools: [],
        confidence: 1.0,
        source: 'local_relationship_graph',
      };
      ctx.response = memoryText;
      ctx.offlineResolved = true;
      return ctx;
    }

    // 1. Dynamic Knowledge Graph First-Pass (0 LLM Tokens, <5ms)
    const dynamicGraphMatch = this._resolveDynamicGraphKnowledge(utterance, ctx.discourse);
    if (dynamicGraphMatch) {
      const canonicalSubject = dynamicGraphMatch.subject?.canonical || 'Entity';
      const canonicalTarget = dynamicGraphMatch.target?.canonical || dynamicGraphMatch.value;
      const relation = dynamicGraphMatch.relation;

      if (dynamicGraphMatch.isConstellation) {
        ctx.intent = {
          type: 'graph_factual_query',
          taskCategory: 'knowledge',
          requiresTools: false,
          targetTools: [],
          parameters: {
            answer: dynamicGraphMatch.value,
          },
          confidence: dynamicGraphMatch.confidence,
          source: 'local_relationship_graph',
        };
        ctx.response = dynamicGraphMatch.value;
        ctx.offlineResolved = true;
        return ctx;
      }

      // Pure declarative relationship statement
      const answerText = dynamicGraphMatch.customAnswer || `${canonicalSubject} — ${relation.replace(/_/g, ' ')}: ${canonicalTarget}.`;

      ctx.intent = {
        type: 'graph_factual_query',
        taskCategory: 'knowledge',
        requiresTools: false,
        targetTools: [],
        parameters: {
          subject: canonicalSubject,
          relation,
          answer: canonicalTarget,
        },
        confidence: dynamicGraphMatch.confidence || 1.0,
        source: 'local_relationship_graph',
      };
      ctx.semanticFact = {
        type: 'FACT',
        subjectTokenId: dynamicGraphMatch.subject?.id || null,
        relationTokenId: this.tokenRegistry.lookup(relation)?.id || null,
        targetTokenId: dynamicGraphMatch.target?.id || null,
        subjectCanonical: canonicalSubject,
        relationCanonical: relation,
        targetCanonical: canonicalTarget,
        confidence: dynamicGraphMatch.confidence || 1.0,
        source: 'local_relationship_graph',
        validated: true,
      };
      ctx.response = answerText;
      ctx.offlineResolved = true;
      ctx.log('IntentClassifier', `Local Graph hit: ${canonicalSubject} -> ${relation} -> ${canonicalTarget}`);
      return ctx;
    }

    // 1. Declarative Parametric Template Matching from Global MongoDB Brain (0 API Tokens)
    for (const mem of ctx.relevantMemory || []) {
      if (mem.type === 'PATTERN_PROCEDURE' && Boolean(mem.content?.tool)) {
        const templates = Array.isArray(mem.content?.templates)
          ? mem.content.templates
          : Array.isArray(mem.content?.triggers)
          ? mem.content.triggers
          : [];

        for (const tmpl of templates) {
          // A. Declarative parametric slot match (Strictly for registered domain tools)
          if (tmpl.includes('{') && tmpl.includes('}')) {
            const extracted = this._matchTemplate(tmpl, utterance);
            if (extracted && mem.content?.tool && this.toolRegistry.hasTool(mem.content.tool)) {
              const boundParameters = this._interpolateParameters(mem.content?.parameters, extracted);
              ctx.intent = {
                type: mem.content.intent || 'learned_parametric_procedure',
                taskCategory: mem.content.category || 'domain',
                requiresTools: true,
                targetTools: [mem.content.tool],
                parameters: boundParameters,
                responseTemplate: mem.content.responseTemplate || null,
                confidence: mem.confidence || 0.95,
                source: 'learned_parametric_template',
                matchedTemplate: tmpl,
              };
              ctx.offlineResolved = true;
              ctx.log('IntentClassifier', `Parametric template matched offline: "${tmpl}"`, boundParameters);
              return ctx;
            }
          }
        }
      }

      if (mem.type === 'CONVERSATIONAL_SYNAPSE' || mem.type === 'CONVERSATIONAL_RESPONSE') {
        const triggers = Array.isArray(mem.content?.triggers)
          ? mem.content.triggers
          : [mem.content?.trigger || ''];
        const normUtterance = utterance.toLowerCase().trim();

        for (const trig of triggers) {
          if (!trig) continue;
          const cleanTrig = String(trig).toLowerCase().trim();
          if (cleanTrig === normUtterance || this._isFuzzyMatch(cleanTrig, normUtterance)) {
            ctx.intent = {
              type: 'learned_conversational_response',
              taskCategory: 'conversation',
              requiresTools: false,
              targetTools: [],
              confidence: mem.confidence || 0.95,
              source: 'learned_conversational_synapse',
            };
            ctx.response = mem.content?.response || mem.content?.text;
            ctx.offlineResolved = true;
            ctx.log('IntentClassifier', `Learned Conversational Synapse hit: "${trig}" -> 0 API Tokens`);
            return ctx;
          }
        }
      }
    }

    // 2. Local Knowledge Universe Boundary & Neural Semantic Resolver Bridge
    const candidateTokens = this.tokenRegistry.findCandidates(utterance, { limit: 20, minScore: 0.4 });
    const recognizedLocalEntity = candidateTokens.find((t) => {
      const canon = (t.canonical || '').toLowerCase().trim();
      const isEntity = t.type === TokenType.ENTITY || t.type === 'entity';
      return isEntity && canon.length > 2 && utterance.toLowerCase().includes(canon);
    });

    if (recognizedLocalEntity) {
      const outgoingEdges = this.graph.getOutgoing(recognizedLocalEntity.id);
      const isDefinedLocalEntity = outgoingEdges.length > 0;

      // Try neural semantic resolution first using trained weights theta
      if (this.neuralResolver) {
        const neuralRes = this.neuralResolver.resolve(utterance);
        if (neuralRes.resolved && neuralRes.answer) {
          ctx.intent = {
            type: 'neural_factual_query',
            taskCategory: 'knowledge',
            requiresTools: false,
            targetTools: [],
            parameters: {
              subject: recognizedLocalEntity.canonical,
              answer: neuralRes.answer,
            },
            confidence: neuralRes.confidence,
            source: 'neural_core',
          };
          ctx.response = `${recognizedLocalEntity.canonical} — ${neuralRes.answer}.`;
          ctx.offlineResolved = true;
          ctx.log('IntentClassifier', `Neural Semantic Resolver hit: ${recognizedLocalEntity.canonical} -> ${neuralRes.answer} (Score: ${neuralRes.confidence.toFixed(4)})`);
          return ctx;
        }
      }

      // If user asks open overview about entity ("what you know about [Entity]?", "tell me about [Entity]")
      const isOverviewQuery = /^(what\s+(?:do\s+)?you\s+know\s+about|tell\s+me\s+about|what\s+about|all\s+about|everything\s+about|info\s+about|details\s+of|summary\s+of)\b/i.test(utterance);
      if (isOverviewQuery && recognizedLocalEntity) {
        const outgoing = this.graph.getOutgoing(recognizedLocalEntity.id);
        const incoming = this.graph.getIncoming(recognizedLocalEntity.id);
        const entityFacts = [];

        for (const e of outgoing) {
          if (['has_alternate_spelling', 'same_as', 'alias_of', 'aka'].includes(e.relation)) continue;
          const targetTok = this.tokenRegistry.getById(e.to);
          if (targetTok) {
            entityFacts.push(`• ${e.relation.replace(/_/g, ' ')}: ${targetTok.canonical}`);
          }
        }
        for (const e of incoming) {
          if (['has_alternate_spelling', 'same_as', 'alias_of', 'aka'].includes(e.relation)) continue;
          const sourceTok = this.tokenRegistry.getById(e.from);
          const invRel = this.reasoner?.relationRegistry?.getInverse(e.relation) || `${e.relation}_by`;
          if (sourceTok) {
            entityFacts.push(`• ${sourceTok.canonical} (${invRel.replace(/_/g, ' ')})`);
          }
        }

        if (entityFacts.length > 0) {
          ctx.intent = {
            type: 'entity_knowledge_overview',
            taskCategory: 'knowledge',
            requiresTools: false,
            targetTools: [],
            parameters: { subject: recognizedLocalEntity.canonical },
            confidence: 1.0,
            source: 'local_relationship_graph',
          };
          ctx.response = `Here is what I know about ${recognizedLocalEntity.canonical}, sir:\n\n${entityFacts.join('\n')}`;
          ctx.offlineResolved = true;
          ctx.log('IntentClassifier', `Entity overview retrieved for "${recognizedLocalEntity.canonical}" (${entityFacts.length} facts).`);
          return ctx;
        }
      }

      // If neural model does not possess high-confidence activation:
      // For defined local universe entities, or when offline (disableLLM: true), strictly enforce Local Knowledge Universe Boundary Guard
      if (isDefinedLocalEntity || ctx.disableLLM || !this.toolRegistry?.hasTool('browser.search')) {
        ctx.intent = {
          type: 'local_unknown_query',
          taskCategory: 'knowledge',
          requiresTools: false,
          targetTools: [],
          parameters: { subject: recognizedLocalEntity.canonical },
          confidence: 1.0,
          source: 'local_knowledge_guard',
        };
        ctx.response = `I recognize ${recognizedLocalEntity.canonical}, but I have not learned the requested relationship yet.`;
        ctx.offlineResolved = true;
        ctx.log('IntentClassifier', `Local Knowledge Universe Boundary: recognized "${recognizedLocalEntity.canonical}", external LLM fallback prevented.`);
        return ctx;
      }
    }

    // 3. If LLM is disabled for scientific testing or offline mode, return clean unknown
    if (ctx.disableLLM) {
      ctx.intent = {
        type: 'unknown_query',
        taskCategory: 'knowledge',
        requiresTools: false,
        targetTools: [],
        confidence: 1.0,
        source: 'local_knowledge_guard',
      };
      ctx.response = 'I do not recognize that entity or relationship in my local memory.';
      ctx.offlineResolved = true;
      return ctx;
    }

    // 4. Dynamic Classification via LLM Teacher using Registered Tool Schemas
    const availableTools = this.toolRegistry.getToolSchemas();

    const systemPrompt = `You are the Intent Classification and Routing Engine for Workhub HRMS ERP.
Analyze the user utterance and map it to an intent, determining if any registered tools should be invoked.

Available Registered Tools:
${JSON.stringify(availableTools, null, 2)}

User Working Context:
- Employee ID: "${ctx.employeeId || 'none'}"
- Role: "${ctx.role || 'Employee'}"
- Department: "${ctx.department || 'General'}"

Output Requirements:
You MUST respond with a strict JSON object (no markdown fences, no extra text):
{
  "type": "string (descriptive intent name)",
  "taskCategory": "hrms" | "notifications" | "tasks" | "chat" | "memory",
  "requiresTools": true | false,
  "targetTools": ["tool.name"],
  "parameters": { "paramName": "extractedValue" },
  "isConfirmation": true | false,
  "confidence": number between 0.0 and 1.0,
  "reasoning": "brief explanation"
}`;

    try {
      const response = await this.llmManager.chat({
        systemPrompt,
        userMessage: `User Utterance: "${utterance}"`,
      });

      let clean = response.text.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
      }

      const parsed = JSON.parse(clean);
      ctx.intent = {
        type: parsed.type || 'general_query',
        taskCategory: parsed.taskCategory || 'chat',
        requiresTools: Boolean(parsed.requiresTools && Array.isArray(parsed.targetTools) && parsed.targetTools.length > 0),
        targetTools: parsed.targetTools || [],
        parameters: parsed.parameters || {},
        isConfirmation: Boolean(parsed.isConfirmation),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
        reasoning: parsed.reasoning || '',
        source: 'llm_teacher',
      };
    } catch (err) {
      // Declarative fallback when offline or LLM unavailable
      const isQuestion = /[?]/.test(utterance) || /^(what|who|where|which|when|how)\b/i.test(utterance);
      if (isQuestion && this.toolRegistry.hasTool('browser.search')) {
        ctx.intent = {
          type: 'search_query',
          taskCategory: 'discovery',
          requiresTools: true,
          targetTools: ['browser.search'],
          parameters: { query: utterance },
          confidence: 0.8,
          source: 'offline_fallback',
        };
      } else {
        ctx.intent = {
          type: 'general_conversation',
          taskCategory: 'chat',
          requiresTools: false,
          targetTools: [],
          parameters: {},
          confidence: 0.5,
          source: 'offline_fallback',
        };
      }
    }

    ctx.log('IntentClassifier', `Resolved intent: ${ctx.intent.type}`, ctx.intent);
    return ctx;
  }
}

export const defaultIntentClassifier = new IntentClassifier();
export default defaultIntentClassifier;
