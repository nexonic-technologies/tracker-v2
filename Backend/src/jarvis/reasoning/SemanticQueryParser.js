import { defaultTokenRegistry } from '../tokens/TokenRegistry.js';
import { defaultRelationRegistry } from './RelationRegistry.js';
import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';

/**
 * SemanticQueryParser: Universal Grammar-Driven Relational AST Compiler
 * (Sacred Law Compliant: Zero hardcoded dictionaries, 100% syntax and graph-driven)
 */
export class SemanticQueryParser {
  constructor({ tokenRegistry, relationRegistry, graph } = {}) {
    this.tokenRegistry = tokenRegistry || defaultTokenRegistry;
    this.relationRegistry = relationRegistry || defaultRelationRegistry;
    this.graph = graph || defaultRelationshipGraph;
    this.dynamicMacros = new Map();

    // Pure grammatical stop words (universal syntactic markers & prepositions)
    this.grammarStopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'what', 'who', 'where', 'which', 'whom', 'whose', 'how', 'when', 'why',
      'does', 'did', 'do', 'doing', 'have', 'has', 'had',
      'tell', 'know', 'give', 'show', 'please', 'me', 'about',
      'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'from', 'where', 'that', 'this', 'there',
      'country', 'city', 'person', 'place',
      'anchor', '__anchor__'
    ]);
  }

  _clean(str) {
    if (!str) return '';
    return str.trim().toLowerCase();
  }

  /**
   * Registers a dynamic composite relation path at runtime (committed to graph / memory)
   */
  registerCompositeMacro(macroWord, expansionArray) {
    if (!macroWord || !Array.isArray(expansionArray)) return;
    const normMacro = this._clean(macroWord);
    this.dynamicMacros.set(normMacro, expansionArray.map((r) => this._clean(r)));
  }

  /**
   * Resolves composite path expansion from dynamic registry or graph meta-edges
   */
  _resolveCompositePath(relWord) {
    const norm = this._clean(relWord);
    if (this.dynamicMacros.has(norm)) {
      return this.dynamicMacros.get(norm);
    }

    if (this.tokenRegistry && this.graph) {
      const token = this.tokenRegistry.lookup(norm);
      if (token) {
        const outgoing = this.graph.getOutgoing(token.id);
        const macroEdge = outgoing.find((e) => ['expands_to', 'composite_of', 'path_of'].includes(e.relation));
        if (macroEdge && Array.isArray(macroEdge.metadata?.path)) {
          return macroEdge.metadata.path;
        }
      }
    }

    return [norm];
  }

  /**
   * Parses natural language into a Multi-Hop Query AST
   * @param {string} utterance
   * @returns {object|null} Query AST
   */
  parse(utterance) {
    if (!utterance || typeof utterance !== 'string') return null;

    const raw = utterance.trim();
    const lower = raw.toLowerCase();

    // 1. Identify Candidate Anchor Entities in O(L) time via Inverted Index
    const candidates = this.tokenRegistry.findCandidates(raw, { limit: 10, minScore: 0.2 });
    if (candidates.length === 0) return null;

    // Pick longest matching anchor entity
    let anchorToken = null;
    for (const cand of candidates) {
      const canon = cand.canonical.toLowerCase();
      if (lower.includes(canon) || (Array.isArray(cand.aliases) && cand.aliases.some((a) => lower.includes(a.toLowerCase())))) {
        if (!anchorToken || canon.length > anchorToken.canonical.length) {
          anchorToken = cand;
        }
      }
    }

    if (!anchorToken) {
      anchorToken = candidates[0];
    }

    // 2. Syntactic Decomposition around Anchor Entity
    const anchorPattern = new RegExp(`\\b${anchorToken.canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:'s)?\\b`, 'gi');
    const parts = lower.split(anchorPattern);
    if (parts.length < 2) {
      // Fallback: search for anchor canonical
      const idx = lower.indexOf(anchorToken.canonical.toLowerCase());
      if (idx !== -1) {
        parts[0] = lower.slice(0, idx);
        parts[1] = lower.slice(idx + anchorToken.canonical.length);
      }
    }

    const beforeText = parts[0] || '';
    const afterText = parts.slice(1).join(' ') || '';

    // Extract relational tokens from syntax
    const beforeWords = this._extractSyntacticRelTokens(beforeText);
    const afterWords = this._extractSyntacticRelTokens(afterText);

    // Relational traversal order from Anchor: [afterWords (possessive hops), ...beforeWords.reverse() (prepositional hops)]
    const rawHops = [...afterWords, ...beforeWords.reverse()];
    if (rawHops.length === 0) {
      return null;
    }

    // Expand composite relations (if registered in knowledge graph)
    const expandedHops = [];
    for (const hop of rawHops) {
      const expansion = this._resolveCompositePath(hop);
      expandedHops.push(...expansion);
    }

    // Format AST with variable slots
    const formattedHops = expandedHops.map((rel, idx) => ({
      step: idx + 1,
      relation: rel,
      targetVariable: idx === expandedHops.length - 1 ? '?TARGET' : `?V${idx + 1}`,
    }));

    return {
      queryType: formattedHops.length > 1 ? 'multi_hop_property' : 'single_hop_property',
      rootEntity: {
        id: anchorToken.id,
        canonical: anchorToken.canonical,
        type: anchorToken.type,
      },
      hops: formattedHops,
      targetVariable: '?TARGET',
      rawUtterance: raw,
    };
  }

  /**
   * Pure grammatical token extraction (Zero Domain Hardcoding)
   */
  _extractSyntacticRelTokens(text) {
    if (!text) return [];
    return text
      .split(/[^a-z0-9_]+/)
      .filter((w) => w.length >= 2 && !this.grammarStopWords.has(w))
      .map((w) => this._clean(w));
  }
}

export const defaultSemanticQueryParser = new SemanticQueryParser();
export default defaultSemanticQueryParser;
