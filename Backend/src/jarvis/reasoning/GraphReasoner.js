import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';
import { defaultTokenRegistry } from '../tokens/TokenRegistry.js';
import { defaultRelationRegistry } from './RelationRegistry.js';
import { defaultSemanticQueryParser } from './SemanticQueryParser.js';

/**
 * GraphReasoner: Multi-Hop Variable-Binding Cognitive Graph Reasoning Engine
 * (Sacred Law Compliant: Zero hardcoding, deterministic graph traversal with formal provenance)
 */
export class GraphReasoner {
  constructor({ graph, tokenRegistry, relationRegistry, queryParser } = {}) {
    this.graph = graph || defaultRelationshipGraph;
    this.tokenRegistry = tokenRegistry || defaultTokenRegistry;
    this.relationRegistry = relationRegistry || defaultRelationRegistry;
    this.queryParser = queryParser || defaultSemanticQueryParser;
  }

  _isRelationMatch(edgeRel, queryRel, targetNode = null) {
    if (!edgeRel || !queryRel) return false;
    const e = edgeRel.toLowerCase().replace(/[\s-]+/g, '_');
    const q = queryRel.toLowerCase().replace(/[\s-]+/g, '_');

    // Generic associative edges should not satisfy specific property queries
    if (['related_to', 'associated_with', 'connected_to'].includes(e) && !['related', 'associated', 'connected'].includes(q)) {
      return false;
    }

    if (e === q) return true;
    if (e === `has_${q}` || e === `${q}_of` || q === `has_${e}` || q === `${e}_of`) return true;

    // Prepositional base stripping (e.g. located_in <-> located, head_of <-> head, father_of <-> father)
    const eBase = e.replace(/^(?:has_|is_)/, '').replace(/_(?:in|of|by|at|to|from|on|for)$/, '');
    const qBase = q.replace(/^(?:has_|is_)/, '').replace(/_(?:in|of|by|at|to|from|on|for)$/, '');
    if (eBase.length >= 3 && eBase === qBase) return true;

    // Delegate equivalence and inverse checking to RelationRegistry
    if (this.relationRegistry) {
      const eq = this.relationRegistry.areEquivalentOrInverse(e, q);
      if (eq.matches) return true;
    }

    // Target node concept/type/alias matching (e.g. query specifies "department" -> node is "Engineering")
    if (targetNode) {
      const canon = (targetNode.canonical || '').toLowerCase();
      const type = (targetNode.type || '').toLowerCase();
      if (canon === q || type === q || (Array.isArray(targetNode.aliases) && targetNode.aliases.some((a) => a.toLowerCase() === q))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Solves a multi-hop or single-hop natural language query over the cognitive graph
   * @param {string|object} utteranceOrAST
   * @returns {object|null}
   */
  solve(utteranceOrAST) {
    const ast = typeof utteranceOrAST === 'string'
      ? this.queryParser.parse(utteranceOrAST)
      : utteranceOrAST;

    if (!ast || !ast.rootEntity || !Array.isArray(ast.hops) || ast.hops.length === 0) {
      return null;
    }

    const rootId = ast.rootEntity.id;
    const relationSeq = ast.hops.map((h) => h.relation);
    const verified = this.graph.findVerifiedPath(rootId, relationSeq, {
      maxDepth: 10,
      registry: this.tokenRegistry,
      relationRegistry: this.relationRegistry,
    });

    if (!verified.found || !verified.validated) {
      return null; // Path disconnected or relation mismatch
    }

    const explanationParts = verified.edges.map((e, idx) => {
      const fromName = verified.nodes[idx]?.canonical || String(e.fromId);
      const toName = verified.nodes[idx + 1]?.canonical || String(e.toId);
      return `${fromName} — ${e.relationCanonical.replace(/_/g, ' ')}: ${toName}`;
    });

    return {
      success: true,
      queryType: ast.queryType,
      rootEntity: ast.rootEntity,
      targetToken: verified.targetToken,
      value: verified.targetToken?.canonical || String(verified.targetId),
      path: verified.edges,
      nodes: verified.nodes,
      explanation: explanationParts.join(', '),
      confidence: verified.confidence || 1.0,
      validated: true,
    };
  }

  /**
   * Resolves multi-constraint constellation intersection over the graph
   * @param {Array<{ relation: string, target?: any, targetId?: number }>} constraints
   * @returns {object}
   */
  resolveConstellation(constraints = []) {
    const res = this.graph.findConstellationIntersection(constraints, {
      registry: this.tokenRegistry,
      relationRegistry: this.relationRegistry,
    });

    if (!res.found || res.count === 0) {
      return { success: false, found: false, reason: 'CONSTELLATION_NOT_FOUND' };
    }

    return {
      success: true,
      found: true,
      count: res.count,
      entities: res.entities,
      targetToken: res.entities[0],
      value: res.entities.map((e) => e.canonical).join(', '),
      explanation: `Verified intersection: ${res.entities.map((e) => e.canonical).join(', ')}`,
      validated: true,
    };
  }

  /**
   * Automatically extracts and solves multi-constraint constellation from utterance
   * (Sacred Law Compliant: Zero hardcoding, 100% graph topology and token-driven)
   * @param {string} utterance
   * @returns {object|null}
   */
  solveConstellationFromUtterance(utterance) {
    if (!utterance || typeof utterance !== 'string') return null;

    const lower = utterance.toLowerCase();
    const utteranceWords = new Set(lower.split(/[^a-z0-9]+/).filter((w) => w.length >= 2));

    // 1. Extract candidate tokens recognized in the utterance
    const candidates = this.tokenRegistry.findCandidates(utterance, { limit: 25, minScore: 0.2 });
    if (candidates.length < 2) return null;

    // 2. Select distinct entity & literal anchors (excluding target concept categories like 'movie')
    const entityAnchors = [];
    const targetConcepts = [];
    const coveredWords = new Set();

    // Sort by canonical word length descending
    const sortedCandidates = [...candidates]
      .filter((c) => c.type !== 'property' && c.type !== 'action')
      .sort((a, b) => (b.canonical?.length || 0) - (a.canonical?.length || 0));

    for (const cand of sortedCandidates) {
      const canon = (cand.canonical || '').toLowerCase().trim();
      const canonWords = canon.split(/[^a-z0-9]+/).filter((w) => w.length >= 2);

      // Check if canonical words are present in utterance
      const matchesUtterance = canonWords.length > 0 && canonWords.every((w) => utteranceWords.has(w));
      const hasUncoveredWord = canonWords.some((w) => !coveredWords.has(w));

      if (matchesUtterance && hasUncoveredWord) {
        const inc = this.graph.getIncoming(cand.id);
        const out = this.graph.getOutgoing(cand.id);
        const hasConnectivity = inc.length > 0 || out.length > 0;

        if (hasConnectivity) {
          if (cand.type === 'entity' || /^\d+$/.test(canon)) {
            entityAnchors.push(cand);
            for (const w of canonWords) coveredWords.add(w);
          } else if (cand.type === 'concept') {
            targetConcepts.push(cand);
          }
        }
      }
    }

    if (entityAnchors.length < 2) return null;

    // 3. Deterministic Topological Intersection across active entity anchors
    const anchorIds = entityAnchors.map((a) => a.id);
    const intersection = this.graph.findAnchorIntersection(anchorIds, { registry: this.tokenRegistry });

    if (intersection && intersection.found && intersection.primaryEntity) {
      const entity = intersection.primaryEntity;
      return {
        found: true,
        count: intersection.count,
        targetToken: entity,
        value: entity.canonical,
        candidateIds: intersection.candidateIds,
        entities: intersection.entities,
        anchors: intersection.anchors,
        targetConcepts,
        confidence: intersection.confidence,
        rankedCandidates: intersection.rankedCandidates || [],
        competingHypotheses: intersection.competingHypotheses || [],
        margin: intersection.margin !== undefined ? intersection.margin : intersection.confidence,
      };
    }

    return null;
  }
}

export const defaultGraphReasoner = new GraphReasoner();
export default defaultGraphReasoner;
