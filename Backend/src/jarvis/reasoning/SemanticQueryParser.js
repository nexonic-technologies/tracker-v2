import { defaultTokenRegistry, TokenType, STOP_WORDS } from '../tokens/TokenRegistry.js';
import { defaultRelationRegistry } from './RelationRegistry.js';
import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';
import { defaultEntityCanonicalizer } from '../tokens/EntityCanonicalizer.js';

/**
 * Universal Semantic Query Parser & Planner
 * Decomposes natural language queries into structured cognitive reasoning plans
 * containing Anchor Entities, Target Semantic Types, Relational Trajectories, and Constraints.
 * (Sacred Law Compliant: Zero Hardcoding, Generic Typology & Syntax Decomposition)
 */
export class SemanticQueryParser {
  constructor({ tokenRegistry, relationRegistry, graph } = {}) {
    this.tokenRegistry = tokenRegistry || defaultTokenRegistry;
    this.relationRegistry = relationRegistry || defaultRelationRegistry;
    this.graph = graph || defaultRelationshipGraph;
    this.dynamicMacros = new Map();

    // Pure grammatical syntax markers (NEVER filter semantic types like country/continent/planet)
    this.grammarStopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'does', 'did', 'do', 'doing', 'have', 'has', 'had', 'having',
      'tell', 'know', 'give', 'show', 'list', 'find', 'get', 'name', 'can', 'could', 'would', 'should',
      'please', 'me', 'about', 'of', 'in', 'on', 'at', 'to',
      'for', 'by', 'with', 'from', 'where', 'that', 'this', 'there', 'what', 'which', 'who', 'when',
      'called', 'named', 'known', 'born', 'held', 'done', 'made', 'used',
      's', 'd', 'm', 't', 'll', 've', 're',
      'part', 'anchor', '__anchor__'
    ]);
  }

  _clean(str) {
    if (!str) return '';
    return str.trim().toLowerCase();
  }

  /**
   * Identifies candidate target semantic type from query syntax and registry metadata
   * Pure grammatical syntax decomposition — 100% generic, zero domain hardcoding.
   * @param {string} utterance - Natural language query
   * @param {object|null} anchorToken - Candidate anchor entity
   * @returns {string|null} Canonical target semantic type
   */
  _extractTargetType(utterance, anchorToken = null) {
    if (!utterance || typeof utterance !== 'string') return null;
    let lower = utterance.toLowerCase().trim();
    // Normalize contraction 's on question pronouns (what's -> what is, who's -> who is, where's -> where is)
    lower = lower.replace(/\b(what|who|where|how|that|there|it)'s\b/gi, '$1 is');

    const words = lower.split(/[^a-z0-9_]+/).filter(Boolean);
    const anchorWords = new Set((anchorToken?.canonical || '').toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean));
    if (Array.isArray(anchorToken?.aliases)) {
      for (const a of anchorToken.aliases) {
        for (const w of a.toLowerCase().split(/[^a-z0-9_]+/)) {
          if (w) anchorWords.add(w);
        }
      }
    }

    // 0. Prepositional Copular Pattern with qualifier: "Which [type] is (the) [targetProperty] of ..."
    // e.g. "Which city is the capital of Tamil Nadu?" -> extracts "capital"
    const whichOfMatch = lower.match(/\b(?:which|what)\s+[a-z0-9_]+\s+(?:is|was|are|were)\s+(?:the\s+|a\s+|an\s+)?([a-z0-9_]+)\s+of\b/i);
    if (whichOfMatch && whichOfMatch[1] && !STOP_WORDS.has(whichOfMatch[1]) && !this.grammarStopWords.has(whichOfMatch[1]) && !anchorWords.has(whichOfMatch[1])) {
      return whichOfMatch[1];
    }

    // 1. Prepositional Copular Pattern: "(what/who/which) (is/was) (the/a/an) [target] of ..."
    // e.g. "Who is the father of Bob's mother?" -> extracts "father"
    // e.g. "What is the capital of Tamil Nadu?" -> extracts "capital"
    const copularOfMatch = lower.match(/\b(?:which|what|who)\s+(?:is|was|are|were)\s+(?:the\s+|a\s+|an\s+)?([a-z0-9_]+)\s+of\b/i);
    if (copularOfMatch && copularOfMatch[1] && !STOP_WORDS.has(copularOfMatch[1]) && !this.grammarStopWords.has(copularOfMatch[1]) && !anchorWords.has(copularOfMatch[1])) {
      return copularOfMatch[1];
    }

    // 2. Direct Interrogative Target Pattern: "(in/at/to) which/what [targetType] ..."
    // e.g. "Which country was Amaran filmed in?", "Which state is Arunbharathi connected to?"
    for (let i = 0; i < words.length - 1; i++) {
      if (['which', 'what'].includes(words[i])) {
        const nextWord = words[i + 1];
        if (nextWord && nextWord.length > 1 && !STOP_WORDS.has(nextWord) && !this.grammarStopWords.has(nextWord) && !anchorWords.has(nextWord)) {
          return nextWord;
        }
      }
    }

    // 3. Possessive Pattern: "[Anchor]'s [targetType]" -> e.g. "What's Tamil Nadu's capital?", "Who is Bob's father?"
    const possessiveMatch = lower.match(/'s\s+([a-z0-9_]+)/i);
    if (possessiveMatch && possessiveMatch[1] && !STOP_WORDS.has(possessiveMatch[1]) && !this.grammarStopWords.has(possessiveMatch[1]) && !anchorWords.has(possessiveMatch[1])) {
      return possessiveMatch[1];
    }

    // 3. Copular Interrogative Pattern: "(what/who/which) (is/was/are/were) (the/a/an) [targetType] ..."
    // e.g. "What is the capital...", "Who is the father...", "Tell me the country..."
    for (let i = 0; i < words.length; i++) {
      if (['what', 'who', 'which', 'tell', 'name', 'give', 'show'].includes(words[i])) {
        // Find next non-stopword noun token in the clause
        for (let j = i + 1; j < Math.min(words.length, i + 5); j++) {
          const w = words[j];
          if (!STOP_WORDS.has(w) && !this.grammarStopWords.has(w) && !anchorWords.has(w) && w.length >= 3) {
            return w;
          }
        }
      }
    }

    // 4. Taxonomic Category Keyword Pattern: e.g. "planet earth", "country India", "film Amaran"
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (defaultEntityCanonicalizer?.taxonomyCategories?.has(w) && !anchorWords.has(w)) {
        return w;
      }
    }

    // 5. Lookup interrogative concept metadata from TokenRegistry (if configured in schema)
    const firstWord = words[0];
    if (firstWord && this.tokenRegistry) {
      const tok = this.tokenRegistry.lookup(firstWord);
      if (tok?.metadata?.targetType) {
        return String(tok.metadata.targetType);
      }
    }

    return null;
  }

  /**
   * Registers a dynamic composite relation macro at runtime
   * (e.g. grandfather -> [parent, father])
   */
  registerCompositeMacro(macroName, sequenceArray) {
    if (!macroName || !Array.isArray(sequenceArray)) return;
    const normMacro = this._clean(macroName);
    this.dynamicMacros.set(normMacro, sequenceArray.map((s) => this._clean(s)).filter(Boolean));
  }

  /**
   * Finds the best candidate anchor entity from the query
   * @param {string} utterance
   * @param {string|null} [targetType]
   * @returns {object|null}
   */
  _extractAnchorEntity(utterance, targetType = null) {
    if (!utterance || !this.tokenRegistry) return null;
    const candidates = this.tokenRegistry.findCandidates(utterance, { limit: 20, minScore: 0.1 });
    if (candidates.length === 0) return null;

    const lower = utterance.toLowerCase();
    const queryWords = lower.split(/[^a-z0-9_]+/).filter(Boolean).filter((w) => !STOP_WORDS.has(w) && !this.grammarStopWords.has(w));

    // Identify primary entity clause if prepositional structure exists (e.g. "X of Y", "Y's X")
    let entityClauseWords = [];
    if (lower.includes(' of ')) {
      const parts = lower.split(/\bof\b/);
      const afterOf = parts.slice(1).join(' ');
      entityClauseWords = afterOf.split(/[^a-z0-9_]+/).filter(Boolean).filter((w) => !STOP_WORDS.has(w));
    }

    let bestAnchor = null;
    let bestScore = -1;

    for (const cand of candidates) {
      const canon = (cand.canonical || '').toLowerCase().trim();
      if (canon.length < 2 || STOP_WORDS.has(canon)) continue;

      const exactMatch = lower.includes(canon);
      const aliasMatch = Array.isArray(cand.aliases) && cand.aliases.some((a) => lower.includes(a.toLowerCase()));

      const candWords = canon.split(/[^a-z0-9_]+/).filter(Boolean).filter((w) => !STOP_WORDS.has(w));
      const sharedWordCount = candWords.filter((w) => queryWords.includes(w)).length;
      const entityClauseMatches = entityClauseWords.length > 0
        ? candWords.filter((w) => entityClauseWords.includes(w)).length
        : 0;

      const hasEdges = this.graph && (this.graph.getOutgoing(cand.id).length > 0 || this.graph.getIncoming(cand.id).length > 0);

      // Score formulation: Exact match > Graph Connectivity > Entity clause relevance > Multi-word coverage
      let score = 0;
      if (exactMatch || aliasMatch) {
        score += 50 + canon.length * 2;
      } else {
        score += (cand.score || 1.0) * 10 + (sharedWordCount * 25);
      }

      // Strong preference for nominal entities over properties/relations
      if (cand.type === TokenType.PROPERTY || cand.type === TokenType.ACTION || cand.type === 'property' || cand.type === 'action') {
        score -= 80;
      } else {
        score += 40;
      }

      // If this candidate matches the target type, it's the goal concept, not the start anchor
      if (targetType && canon === targetType.toLowerCase()) {
        score -= 100;
      }

      if (entityClauseMatches > 0) {
        score += entityClauseMatches * 60; // Decisive boost for subject entity in prepositional clause
      }

      // Connected knowledge graph entities have primary cognitive priority over unlinked token fragments
      if (hasEdges) {
        score += 150;
      }

      if (score > bestScore) {
        bestScore = score;
        bestAnchor = cand;
      }
    }

    return bestAnchor || candidates[0] || null;
  }

  /**
   * Generates a fully compiled QueryPlan AST
   * @param {string} utterance - Query string
   * @returns {object|null} QueryPlan AST
   */
  parse(utterance) {
    if (!utterance || typeof utterance !== 'string') return null;

    const raw = utterance.trim();
    const lower = raw.toLowerCase();

    // 1. Identify Candidate Anchor Entity
    let anchorToken = this._extractAnchorEntity(raw, null);

    // 2. Identify Target Semantic Type (with anchorToken context to avoid anchor word collision)
    let targetType = this._extractTargetType(raw, anchorToken);

    // 3. Re-verify anchorToken if targetType was found
    if (targetType && anchorToken && (anchorToken.canonical || '').toLowerCase() === targetType.toLowerCase()) {
      anchorToken = this._extractAnchorEntity(raw, targetType);
    }
    if (!anchorToken) return null;

    if (targetType && this.dynamicMacros.has(this._clean(targetType))) {
      const macroSeq = this.dynamicMacros.get(this._clean(targetType));
      targetType = macroSeq[macroSeq.length - 1] || targetType;
    }

    // 3. Extract Relational Hints / Verbs from syntactic decomposition
    let beforeText = '';
    let afterText = '';

    const anchorCanon = anchorToken.canonical.toLowerCase();
    const anchorPattern = new RegExp(`\\b${anchorToken.canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:'s)?\\b`, 'gi');
    const parts = lower.split(anchorPattern);
    if (parts.length >= 2) {
      beforeText = parts[0] || '';
      afterText = parts.slice(1).join(' ') || '';
    } else if (lower.includes(' of ')) {
      // Fuzzy anchor match in prepositional "X of Y" structure
      const ofParts = lower.split(/\bof\b/);
      beforeText = ofParts[0] || '';
      afterText = ofParts.slice(2).join(' ') || '';
    } else {
      const idx = lower.indexOf(anchorCanon);
      if (idx !== -1) {
        beforeText = lower.slice(0, idx);
        afterText = lower.slice(idx + anchorCanon.length);
      } else {
        beforeText = lower;
      }
    }

    const afterWords = this._extractSyntacticTokens(afterText);

    // Prepositional relational phrase detection (e.g. "father of...", "capital of...")
    const hasPrepositionalHop = /\b(?:of|in|at|to|from|for|by|under|with)\b/i.test(beforeText);
    const cleanTargetType = this._clean(targetType);

    // Split beforeText by preposition boundaries and reverse clause order (keeping intra-clause words in natural order)
    const beforeClauses = beforeText.split(/\b(?:of|in|at|to|from|for|by|under|with|where)\b/i).filter(Boolean);
    const orderedBeforeWords = [];

    // Extract interrogative head noun if query begins with "which/what [noun] ..."
    let interrogativeHead = null;
    const interMatch = lower.match(/\b(?:which|what)\s+([a-z0-9_]+)\b/i);
    if (interMatch && interMatch[1] && !STOP_WORDS.has(interMatch[1]) && !this.grammarStopWords.has(interMatch[1])) {
      interrogativeHead = interMatch[1].toLowerCase();
    }

    for (const clause of beforeClauses.reverse()) {
      const words = this._extractSyntacticTokens(clause);
      for (const w of words) {
        // Filter out interrogative category head if a distinct target relation exists
        if (interrogativeHead && w === interrogativeHead && cleanTargetType && cleanTargetType !== interrogativeHead) {
          continue;
        }
        if (!hasPrepositionalHop && cleanTargetType && w === cleanTargetType) {
          continue;
        }
        orderedBeforeWords.push(w);
      }
    }

    const anchorWords = new Set((anchorToken?.canonical || '').toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean));

    // Relational traversal order from Anchor: [afterWords (possessive hops), ...orderedBeforeWords (prepositional hops)]
    let rawHints = [...afterWords, ...orderedBeforeWords]
      .filter((w) => !STOP_WORDS.has(w) && !anchorWords.has(w));

    // Expand dynamic composite macros if present
    const relationalHints = [];
    for (const h of rawHints) {
      if (this.dynamicMacros.has(h)) {
        relationalHints.push(...this.dynamicMacros.get(h));
      } else {
        relationalHints.push(h);
      }
    }

    // Also check if any words in utterance match composite macros
    for (const [macroName, macroSeq] of this.dynamicMacros.entries()) {
      if (lower.includes(macroName) && !relationalHints.some((h) => macroSeq.includes(h))) {
        relationalHints.push(...macroSeq);
      }
    }

    const hops = relationalHints.map((r, idx) => ({
      relation: r,
      targetVariable: idx === relationalHints.length - 1 ? '?TARGET' : `?VAR_${idx + 1}`,
    }));

    const isDirectiveRequest = /^(?:can\s+you|could\s+you|would\s+you|please|tell\s+me|give\s+me|show\s+me|name\s+the|list\s+the|find\s+the)\b/i.test(lower);
    const isVerificationQuery = !isDirectiveRequest && /^(?:did|does|do|is|was|are|were|has|had|can|will)\b/i.test(lower);
    let targetEntityToken = null;

    if (isVerificationQuery && this.tokenRegistry) {
      const candidates = this.tokenRegistry.findCandidates(raw, { limit: 20, minScore: 0.15 });
      const otherEntities = candidates.filter((t) => {
        if (!t.canonical || t.id === anchorToken?.id) return false;
        const cLower = t.canonical.toLowerCase();
        return lower.includes(cLower) || (Array.isArray(t.aliases) && t.aliases.some((a) => lower.includes(a.toLowerCase())));
      });

      if (otherEntities.length > 0) {
        targetEntityToken = otherEntities[0];
        if (!targetType && targetEntityToken.type && targetEntityToken.type !== 'concept' && targetEntityToken.type !== 'entity') {
          targetType = targetEntityToken.type;
        }
      }
    }

    const queryType = isVerificationQuery
      ? 'verification_query'
      : (hops.length > 1 ? 'multi_hop_property' : (targetType ? 'multi_hop_target_type' : 'direct_property'));

    return {
      queryType,
      anchorToken,
      rootEntity: anchorToken,
      targetType,
      targetEntityToken,
      relationalHints,
      hops,
      isVerification: isVerificationQuery,
      isVerificationQuery,
      isReverseQuery: /^(who|which|whose|name\s+the)\b/i.test(lower),
      rawUtterance: raw,
    };
  }

  _extractSyntacticTokens(text) {
    if (!text) return [];
    return text
      .split(/[^a-z0-9_]+/)
      .filter((w) => w.length >= 2 && !this.grammarStopWords.has(w))
      .map((w) => this._clean(w));
  }
}

export const defaultSemanticQueryParser = new SemanticQueryParser();
export default defaultSemanticQueryParser;
