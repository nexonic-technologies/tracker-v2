import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';
import { defaultTokenRegistry, TokenType } from '../tokens/TokenRegistry.js';
import { defaultRelationRegistry } from './RelationRegistry.js';
import { SemanticQueryParser, defaultSemanticQueryParser } from './SemanticQueryParser.js';

/**
 * Declarative Reasoning Engine Configuration
 * (Sacred Law Compliant: Single Source of Truth for Cognitive Hyperparameters)
 */
export const REASONING_CONFIG = Object.freeze({
  MAX_HOPS: Number(process.env.JARVIS_MAX_HOPS) || 8,
  BEAM_WIDTH: Number(process.env.JARVIS_BEAM_WIDTH) || 16,
  MIN_PATH_CONFIDENCE: Number(process.env.JARVIS_MIN_CONFIDENCE) || 0.20,
  HOP_DECAY_FACTOR: Number(process.env.JARVIS_HOP_DECAY) || 0.96,
  TARGET_MATCH_WEIGHT: 2.5,
  TARGET_MISMATCH_WEIGHT: 0.4,
  COHERENCE_BOOST: 0.25,
  UNCONSTRAINED_CONFIDENCE_SCALE: 0.70,
  MAX_UNCONSTRAINED_CONFIDENCE: 0.65,
});

/**
 * GraphReasoner: Universal Multi-Hop Cognitive Reasoning Engine
 * Implements Controlled Multi-Hop Beam Traversal, Direction-Aware Cycle Prevention,
 * Dynamic Target-Type Taxonomy Resolution, and Calibrated Path Confidence Scoring.
 * (Sacred Law Compliant: Zero Hardcoded Dictionaries, 100% Graph & Typology Driven)
 */
export class GraphReasoner {
  constructor({
    graph,
    tokenRegistry,
    relationRegistry,
    queryParser,
    config = {},
  } = {}) {
    this.graph = graph || defaultRelationshipGraph;
    this.tokenRegistry = tokenRegistry || defaultTokenRegistry;
    this.relationRegistry = relationRegistry || defaultRelationRegistry;
    this.queryParser = queryParser || new SemanticQueryParser({
      tokenRegistry: this.tokenRegistry,
      relationRegistry: this.relationRegistry,
      graph: this.graph,
    });
    this.config = { ...REASONING_CONFIG, ...config };
  }

  /**
   * Solves natural language query or structured QueryPlan across the cognitive graph
   * @param {string|object} utteranceOrPlan
   * @returns {object|null} Structured ReasoningResult
   */
  solve(utteranceOrPlan) {
    const plan = typeof utteranceOrPlan === 'string'
      ? this.queryParser.parse(utteranceOrPlan)
      : utteranceOrPlan;

    if (!plan || !plan.anchorToken) {
      return null;
    }

    const { anchorToken, targetType, targetEntityToken, relationalHints = [], isVerification = false } = plan;

    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║ 🔍 J.A.R.V.I.S. Cognitive Multi-Hop Graph Reasoner Traversal Engine          ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║ Query Utterance    : "${plan.rawUtterance || ''}"`);
    console.log(`║ Recognized Anchor  : ${anchorToken.canonical} (ID: ${anchorToken.id}, Type: ${anchorToken.type || 'entity'})`);
    console.log(`║ Target SemanticType: ${targetEntityToken ? `${targetEntityToken.canonical} (${targetType || targetEntityToken.type || 'entity'})` : (targetType || '(unconstrained general query)')}`);
    console.log(`║ Relational Hints   : [${relationalHints.join(', ')}]`);
    console.log(`║ Search Parameters  : Max Hops: ${this.config.MAX_HOPS} | Beam Width: ${this.config.BEAM_WIDTH} | Min Conf: ${this.config.MIN_PATH_CONFIDENCE}`);
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

    // Search multi-hop candidate paths satisfying constraints and target semantic type
    const searchResult = this._searchMultiHopPaths({
      anchorToken,
      targetType,
      targetEntityToken,
      relationalHints,
      maxHops: this.config.MAX_HOPS,
      beamWidth: this.config.BEAM_WIDTH,
      minConfidence: this.config.MIN_PATH_CONFIDENCE,
    });

    if (!searchResult || !searchResult.topPath) {
      console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
      console.log('║ ⚠️ Multi-Hop Reasoning: No Verified Path Reached Goal                         ║');
      console.log(`║ Anchor: ${anchorToken.canonical} | Target: ${targetEntityToken ? targetEntityToken.canonical : (targetType || 'none')} | Hops Explored: ${this.config.MAX_HOPS} ║`);
      console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
      return null;
    }

    const top = searchResult.topPath;
    const explanationParts = top.path.map((e, idx) => {
      const fromName = top.nodes[idx]?.canonical || String(e.fromId);
      const toName = top.nodes[idx + 1]?.canonical || String(e.toId);
      const relName = (e.relationCanonical || e.relation || '').replace(/_/g, ' ');
      return `${fromName} — ${relName}: ${toName}`;
    });

    const targetNode = top.nodes[top.nodes.length - 1];

    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║ ✅ Multi-Hop Reasoning Chain Solved                                           ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║ Destination Token  : ${targetNode.canonical} (ID: ${targetNode.id}, Type: ${targetNode.type || 'entity'})`);
    console.log(`║ Total Traversal Hops: ${top.path.length} Hop(s)`);
    console.log(`║ Reasoning Evidence : ${explanationParts.join(', ')}`);
    console.log(`║ Calibrated Conf    : ${(top.confidence * 100).toFixed(1)}% (Path Score: ${top.score.toFixed(3)})`);
    console.log(`║ Provenance         : local_graph (0 API Tokens)`);
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

    return {
      status: 'verified',
      answer: {
        id: targetNode.id,
        canonical: targetNode.canonical,
        type: targetNode.type,
      },
      rootEntity: anchorToken,
      targetToken: targetNode,
      value: targetNode.canonical,
      path: top.path,
      nodes: top.nodes,
      hopCount: top.path.length,
      targetType: targetType || targetNode.type || 'entity',
      confidence: top.confidence,
      score: top.score,
      provenance: 'local_graph',
      verified: true,
      isVerification: Boolean(isVerification || plan.isVerificationQuery),
      explanation: explanationParts.join(', '),
      competingPaths: searchResult.competingPaths || [],
      rawUtterance: plan.rawUtterance || '',
    };
  }

  /**
   * Controlled Multi-Hop Graph Traversal Engine
   * Explores directional graph trajectories with direction-aware cycle prevention,
   * evaluates candidate destination nodes against targetType or targetEntityToken, and scores competing paths.
   */
  _searchMultiHopPaths({ anchorToken, targetType = null, targetEntityToken = null, relationalHints = [], maxHops = 5, beamWidth = 10, minConfidence = 0.35 }) {
    const rootId = anchorToken.id;
    const initialNode = this.tokenRegistry.getById(rootId) || anchorToken;

    // Initial frontier state
    let beam = [{
      currentNode: initialNode,
      path: [],
      nodes: [initialNode],
      rawConfidence: 1.0,
      visitedKeys: new Set(),
      visitedNodeIds: new Set([rootId]),
    }];

    const goalPaths = [];
    const directFallbackPaths = [];

    for (let hop = 1; hop <= maxHops; hop++) {
      const nextCandidates = [];
      console.log(`➔ [Hop ${hop}/${maxHops}] Frontier Size: ${beam.length} trajectory candidate(s)`);

      for (const state of beam) {
        const u = state.currentNode;
        const outgoing = this.graph.getOutgoing(u.id);
        const incoming = this.graph.getIncoming(u.id);

        const candidateEdges = [];

        // 1. Forward edges: u ──[rel]──► v
        for (const e of outgoing) {
          if (this.relationRegistry.isMeta(e.relation) || this.relationRegistry.isTaxonomic(e.relation)) continue;
          if (this.relationRegistry.isAssociative(e.relation)) continue;
          candidateEdges.push({
            fromId: e.from,
            toId: e.to,
            relation: e.relation,
            confidence: typeof e.confidence === 'number' ? e.confidence : 1.0,
            direction: 'forward',
          });
        }

        // 2. Reverse / Incoming factual edges: v ──[rel]──► u
        for (const e of incoming) {
          if (this.relationRegistry.isMeta(e.relation) || this.relationRegistry.isTaxonomic(e.relation)) continue;
          if (this.relationRegistry.isAssociative(e.relation)) continue;
          const invRel = this.relationRegistry.getInverse(e.relation) || e.relation;
          candidateEdges.push({
            fromId: e.from,
            toId: e.to,
            relation: invRel,
            confidence: (typeof e.confidence === 'number' ? e.confidence : 1.0) * 0.95,
            direction: 'reverse',
          });
        }

        for (const edge of candidateEdges) {
          const nextNodeId = edge.direction === 'forward' ? edge.toId : edge.fromId;
          const nextNode = this.tokenRegistry.getById(nextNodeId);
          if (!nextNode) continue;

          // Direction-Aware Edge Key: fromId:rel:toId:dir
          const edgeKey = `${u.id}:${edge.relation}:${nextNodeId}:${edge.direction}`;
          if (state.visitedKeys.has(edgeKey) || state.visitedNodeIds.has(nextNodeId)) {
            continue; // Prevent cycles and inverse ping-ponging
          }

          const nextRawConfidence = state.rawConfidence * edge.confidence;
          if (nextRawConfidence < minConfidence) continue;

          const nextVisitedKeys = new Set(state.visitedKeys);
          nextVisitedKeys.add(edgeKey);

          const nextVisitedNodes = new Set(state.visitedNodeIds);
          nextVisitedNodes.add(nextNodeId);

          const nextPath = [
            ...state.path,
            {
              fromId: u.id,
              relationCanonical: edge.relation,
              toId: nextNodeId,
              confidence: edge.confidence,
              direction: edge.direction,
            }
          ];

          const nextNodes = [...state.nodes, nextNode];

          const nextState = {
            currentNode: nextNode,
            path: nextPath,
            nodes: nextNodes,
            rawConfidence: nextRawConfidence,
            visitedKeys: nextVisitedKeys,
            visitedNodeIds: nextVisitedNodes,
          };

          // Determine if destination node satisfies the query goal
          let isGoalMatch = false;

          if (targetEntityToken) {
            const isIdMatch = nextNode.id === targetEntityToken.id;
            const isCanonMatch = targetEntityToken.canonical && nextNode.canonical &&
              this.tokenRegistry._normalize(nextNode.canonical) === this.tokenRegistry._normalize(targetEntityToken.canonical);
            const isAliasMatch = Array.isArray(targetEntityToken.aliases) &&
              targetEntityToken.aliases.some((a) => this.tokenRegistry._normalize(a) === this.tokenRegistry._normalize(nextNode.canonical));

            if (isIdMatch || isCanonMatch || isAliasMatch) {
              isGoalMatch = true;
            }
          } else if (targetType) {
            const matchesTarget = this.relationRegistry.matchesTargetType(nextNode, targetType, this.graph, this.tokenRegistry) ||
              (edge && this.relationRegistry.areEquivalentOrInverse(edge.relation, targetType)?.matches === true);

            if (matchesTarget) {
              const edgeSatisfiesFirstHint = relationalHints.length === 0 ||
                (edge && this.relationRegistry.areEquivalentOrInverse(edge.relation, relationalHints[0])?.matches === true) ||
                this.relationRegistry.areEquivalentOrInverse(relationalHints[0], targetType)?.matches === true;

              if (relationalHints.length > 1 && !edgeSatisfiesFirstHint && nextState.path.length < 2) {
                isGoalMatch = false;
              } else {
                isGoalMatch = true;
              }
            }
          } else if (relationalHints.length > 0 && nextState.path.length >= relationalHints.length) {
            // General query without targetType constraint: completes when full relational trajectory is traversed
            isGoalMatch = true;
          }

          if (isGoalMatch) {
            const score = this._calculatePathScore(nextState, targetType, relationalHints, true);
            console.log(`  • [${u.canonical || u.id}] ──(${edge.direction}: ${edge.relation})──► [${nextNode.canonical || nextNode.id}] (Type: ${nextNode.type || 'entity'}, Conf: ${nextRawConfidence.toFixed(3)})`);
            console.log(`    └─ Goal Match [${targetEntityToken ? targetEntityToken.canonical : (targetType || 'relational_trajectory')}]: YES ✓ (GOAL REACHED!)`);

            goalPaths.push({
              ...nextState,
              score,
              confidence: this._calculateCalibratedConfidence(nextState, true),
              targetMatched: true,
            });
          } else {
            const score = this._calculatePathScore(nextState, targetType, relationalHints, false);
            console.log(`  • [${u.canonical || u.id}] ──(${edge.direction}: ${edge.relation})──► [${nextNode.canonical || nextNode.id}] (Type: ${nextNode.type || 'entity'}, Conf: ${nextRawConfidence.toFixed(3)})`);
            console.log(`    └─ Goal Match [${targetType || 'relational_trajectory'}]: NO ✗ (expanding beam...)`);

            if (!targetType) {
              directFallbackPaths.push({
                ...nextState,
                score,
                confidence: this._calculateCalibratedConfidence(nextState, false),
                targetMatched: false,
              });
            }
            nextCandidates.push({ ...nextState, score });
          }
        }
      }

      if (goalPaths.length > 0) {
        break; // Reached valid semantic target! Terminate search.
      }

      // Prune beam to top-K scoring candidate trajectories
      nextCandidates.sort((a, b) => b.score - a.score);
      beam = nextCandidates.slice(0, beamWidth);
      if (beam.length === 0) break;
    }

    // Rank goal paths
    if (goalPaths.length > 0) {
      goalPaths.sort((a, b) => b.score - a.score);
      return {
        topPath: goalPaths[0],
        competingPaths: goalPaths.slice(1),
        allGoalPaths: goalPaths,
      };
    }

    // Fallback for general unconstrained queries
    if (!targetType && directFallbackPaths.length > 0) {
      directFallbackPaths.sort((a, b) => b.score - a.score);
      return {
        topPath: directFallbackPaths[0],
        competingPaths: directFallbackPaths.slice(1),
        allGoalPaths: directFallbackPaths,
      };
    }

    return null;
  }

  /**
   * Multi-Hop Path Scoring Formulation
   * pathScore = prod(edgeConf) * (hopDecay)^(k-1) * typeMatchWeight * relationalCoherence
   */
  _calculatePathScore(state, targetType, relationalHints = [], isTargetMatch = false) {
    const hopCount = state.path.length;
    const decay = Math.pow(this.config.HOP_DECAY_FACTOR, Math.max(0, hopCount - 1));
    const baseConf = state.rawConfidence;

    let typeMatchWeight = 1.0;
    if (targetType) {
      typeMatchWeight = isTargetMatch ? this.config.TARGET_MATCH_WEIGHT : this.config.TARGET_MISMATCH_WEIGHT;
    }

    let coherenceBonus = 1.0;
    if (Array.isArray(relationalHints) && relationalHints.length > 0) {
      const pathRelWords = state.path.map((p) => p.relationCanonical.toLowerCase());
      const destNodeCanon = (state.currentNode?.canonical || '').toLowerCase();
      for (const hint of relationalHints) {
        if (pathRelWords.some((r) => r.includes(hint) || hint.includes(r))) {
          coherenceBonus += this.config.COHERENCE_BOOST;
        }
        if (destNodeCanon.includes(hint)) {
          coherenceBonus += this.config.COHERENCE_BOOST;
        }
      }
    }

    return baseConf * decay * typeMatchWeight * coherenceBonus;
  }

  /**
   * Calibrated Multi-Hop Path Confidence
   */
  _calculateCalibratedConfidence(state, isTargetMatch = false) {
    const hopCount = state.path.length;
    const decay = Math.pow(this.config.HOP_DECAY_FACTOR, Math.max(0, hopCount - 1));
    const base = state.rawConfidence * decay;
    return Math.min(1.0, base);
  }
}

export const defaultGraphReasoner = new GraphReasoner();
export default defaultGraphReasoner;
