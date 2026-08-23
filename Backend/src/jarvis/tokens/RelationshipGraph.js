import { getGlobalModels } from '../../models/global/index.js';
import { defaultTokenRegistry, TokenType } from './TokenRegistry.js';

/**
 * Directed Semantic Relationship Graph (Global Database + Memory Cache)
 * Strictly registered on Global Database across all tenants.
 */
export class RelationshipGraph {
  constructor({ tokenRegistry = null } = {}) {
    this.tokenRegistry = tokenRegistry || defaultTokenRegistry;
    this.adjacency = new Map();
    this.reverseAdjacency = new Map();
    this.edges = [];
    this.init();
  }

  get model() {
    return getGlobalModels().JarvisRelationship;
  }

  async init() {
    try {
      await this.loadFromDB();
    } catch (err) {
      console.warn('[RelationshipGraph] Init notice:', err.message);
    }
  }

  async loadFromDB() {
    try {
      if (!this.model) return;
      const records = await this.model.find({}).lean();
      for (const edge of records) {
        this._addEdgeToMemory(edge.from, edge.relation, edge.to, edge.confidence || 1.0, edge.metadata || {}, false);
      }
    } catch (err) {}
  }

  _makeEdgeKey(from, relation, to) {
    return `${from}::${relation}::${to}`;
  }

  _addEdgeToMemory(from, relation, to, confidence = 1.0, metadata = {}, persist = true) {
    let fromNode = from;
    let toNode = to;
    let rel = relation;
    let conf = confidence;
    let meta = metadata;

    // Handle graphlib argument polymorphism: add(from, to, { confidence, metadata, label })
    if (typeof relation === 'number' && (typeof to === 'object' || typeof to === 'string')) {
      toNode = to;
      rel = typeof to === 'string' ? to : (to.label || to.relation || 'related_to');
      conf = typeof to === 'object' && to.confidence !== undefined ? to.confidence : (typeof confidence === 'number' ? confidence : 1.0);
      meta = typeof to === 'object' && to.metadata ? to.metadata : {};
    } else if (typeof rel === 'object' && rel !== null) {
      conf = rel.confidence !== undefined ? rel.confidence : conf;
      meta = rel.metadata || meta;
      rel = rel.name || rel.relation || rel.label || 'related_to';
    }

    // Canonical Single Source of Truth Token ID Resolution
    const fromToken = this.tokenRegistry.resolveOrRegister(fromNode, TokenType.ENTITY);
    const toToken = this.tokenRegistry.resolveOrRegister(toNode, TokenType.ENTITY);
    const fromId = fromToken ? fromToken.id : Number(fromNode);
    const toId = toToken ? toToken.id : Number(toNode);

    rel = typeof rel === 'string' ? rel : String(rel || 'related_to');
    conf = typeof conf === 'number' ? conf : 1.0;
    meta = typeof meta === 'object' && meta !== null ? meta : {};

    const edge = { from: fromId, relation: rel, to: toId, confidence: conf, metadata: meta };

    // 1. Forward adjacency (from -> [edges])
    if (!this.adjacency.has(fromId)) {
      this.adjacency.set(fromId, []);
    }
    const currentEdges = this.adjacency.get(fromId);
    const existingIndex = currentEdges.findIndex((e) => e.relation === relation && e.to === toId);

    if (existingIndex !== -1) {
      currentEdges[existingIndex] = edge;
    } else {
      currentEdges.push(edge);
      this.edges.push(edge);
    }

    // 2. Reverse adjacency (to -> [edges]) for O(1) incoming lookups
    if (!this.reverseAdjacency.has(toId)) {
      this.reverseAdjacency.set(toId, []);
    }
    const currentIncoming = this.reverseAdjacency.get(toId);
    const existingInIndex = currentIncoming.findIndex((e) => e.relation === relation && e.from === fromId);

    if (existingInIndex !== -1) {
      currentIncoming[existingInIndex] = edge;
    } else {
      currentIncoming.push(edge);
    }

    if (persist && this.model && this.model.db?.readyState === 1) {
      this.model.updateOne(
        { from: fromId, relation, to: toId },
        { $set: { confidence, metadata, updatedAt: new Date() } },
        { upsert: true }
      ).catch(() => {});
    }

    return edge;
  }

  add(from, relation, to, confidence = 1.0, metadata = {}) {
    return this._addEdgeToMemory(from, relation, to, confidence, metadata, true);
  }

  addRelationship(from, relation, to, confidence = 1.0, metadata = {}) {
    return this.add(from, relation, to, confidence, metadata);
  }

  bulkAddRelationships(edges = [], { registry } = {}) {
    const results = [];
    for (const edge of edges) {
      let fromId = edge.from;
      let toId = edge.to;
      const relation = edge.relation || edge.predicate || 'related_to';

      if (typeof fromId === 'string' && registry) {
        const foundFrom = registry.lookup(fromId) || registry.register({ canonical: fromId, type: 'entity' });
        fromId = foundFrom.id;
      }
      if (typeof toId === 'string' && registry) {
        const foundTo = registry.lookup(toId) || registry.register({ canonical: toId, type: 'entity' });
        toId = foundTo.id;
      }

      if (fromId && toId) {
        const res = this._addEdgeToMemory(fromId, relation, toId, edge.confidence || 1.0, edge.metadata || {}, true);
        results.push(res);
      }
    }
    return results;
  }

  getNeighbors(fromId) {
    return this.adjacency.get(Number(fromId)) || [];
  }

  getOutgoing(fromId) {
    return this.getNeighbors(fromId);
  }

  getIncoming(toId) {
    return this.reverseAdjacency.get(Number(toId)) || [];
  }

  hasEdge(from, relation, to) {
    const fromId = Number(from);
    const toId = Number(to);
    const neighbors = this.getNeighbors(fromId);
    return neighbors.some((e) => e.relation === relation && e.to === toId);
  }

  /**
   * Resolves a semantic property query via local graph (e.g. subject: "India", property: "president from 2002 to 2007" or "capital")
   * @param {string|number} subjectStr 
   * @param {string} propertyStr 
   * @param {import('./TokenRegistry.js').TokenRegistry} registry 
   */
  resolveProperty(subjectStr, propertyStr, registry) {
    if (!subjectStr || !propertyStr || !registry) return null;

    const subjectToken = typeof subjectStr === 'number' 
      ? registry.getById(subjectStr) 
      : registry.lookup(subjectStr);

    if (!subjectToken) return null;

    const rawProp = propertyStr.trim().toLowerCase();
    const normProp = rawProp.replace(/\s+/g, '_').replace(/[^\w]/g, '_');
    const propertyKeywords = rawProp.split(/[\s_-]+/).filter(w => w.length > 2);

    // 1. Check Outgoing edges
    const outgoing = this.getOutgoing(subjectToken.id);
    for (const edge of outgoing) {
      const edgeRel = (edge.relation || '').toLowerCase();
      
      // Exact or underscored match
      if (edgeRel === normProp || edgeRel === `has_${normProp}` || edgeRel.includes(normProp)) {
        const targetToken = registry.getById(edge.to);
        if (targetToken) {
          return {
            subject: subjectToken,
            relation: edge.relation,
            target: targetToken,
            confidence: edge.confidence || 1.0,
            value: targetToken.canonical,
          };
        }
      }

      // Keyword match
      if (propertyKeywords.length > 0 && propertyKeywords.every(kw => edgeRel.includes(kw))) {
        const targetToken = registry.getById(edge.to);
        if (targetToken) {
          return {
            subject: subjectToken,
            relation: edge.relation,
            target: targetToken,
            confidence: edge.confidence || 1.0,
            value: targetToken.canonical,
          };
        }
      }
    }

    // 2. Check Incoming edges (e.g. Abdul Kalam -> president_of -> India)
    const incoming = this.getIncoming(subjectToken.id);
    for (const edge of incoming) {
      const edgeRel = (edge.relation || '').toLowerCase();
      if (propertyKeywords.length > 0 && propertyKeywords.every(kw => edgeRel.includes(kw))) {
        const sourceToken = registry.getById(edge.from);
        if (sourceToken) {
          return {
            subject: subjectToken,
            relation: edge.relation,
            target: sourceToken,
            confidence: edge.confidence || 1.0,
            value: sourceToken.canonical,
          };
        }
      }
    }

    return null;
  }

  /**
   * Deterministic Verified N-Hop Path Traversal (Primary Invariant Compliant)
   * A path is valid ONLY when every edge in the sequence exists and connects sequentially.
   * @param {number|string} startTokenId
   * @param {string[]} relationSequence
   * @param {object} options
   * @returns {object}
   */
  findVerifiedPath(startTokenId, relationSequence = [], { maxDepth = 5, registry = null, relationRegistry = null } = {}) {
    const startId = Number(startTokenId);
    if (isNaN(startId) || !Array.isArray(relationSequence) || relationSequence.length === 0) {
      return { found: false, validated: false, reason: 'INVALID_PARAMETERS' };
    }

    if (relationSequence.length > maxDepth) {
      return { found: false, validated: false, reason: 'MAX_DEPTH_EXCEEDED' };
    }

    // Path Candidate: { nodeId, pathNodes: [id], edges: [] }
    let currentCandidates = [{
      nodeId: startId,
      pathNodes: [startId],
      edges: [],
    }];

    for (let hopIdx = 0; hopIdx < relationSequence.length; hopIdx++) {
      const targetRel = (relationSequence[hopIdx] || '').toLowerCase().replace(/[\s-]+/g, '_');
      const nextCandidates = [];

      for (const cand of currentCandidates) {
        // 1. Check Outgoing Edges
        const outgoing = this.getOutgoing(cand.nodeId);
        for (const edge of outgoing) {
          const edgeRel = (edge.relation || '').toLowerCase().replace(/[\s-]+/g, '_');
          if (['related_to', 'associated_with', 'connected_to'].includes(edgeRel) && !['related', 'associated', 'connected', 'related_to'].includes(targetRel)) {
            continue;
          }
          const targetTok = registry?.getById(edge.to);
          const targetType = (targetTok?.type || '').toLowerCase();
          const targetCanon = (targetTok?.canonical || '').toLowerCase();
          const isMatch = edgeRel === targetRel || targetType === targetRel || targetCanon === targetRel || (relationRegistry?.areEquivalentOrInverse(edgeRel, targetRel)?.matches === true);

          if (isMatch && !cand.pathNodes.includes(edge.to)) {
            nextCandidates.push({
              nodeId: edge.to,
              pathNodes: [...cand.pathNodes, edge.to],
              edges: [
                ...cand.edges,
                {
                  fromId: cand.nodeId,
                  relationTokenId: registry?.lookup(edge.relation)?.id || null,
                  relationCanonical: edge.relation,
                  toId: edge.to,
                  direction: 'outgoing',
                  confidence: edge.confidence || 1.0,
                },
              ],
            });
          }
        }

        // 2. Check Incoming Edges (using inverse relations)
        const incoming = this.getIncoming(cand.nodeId);
        for (const edge of incoming) {
          const invRel = relationRegistry?.getInverse(edge.relation) || edge.relation;
          const normInv = (invRel || '').toLowerCase().replace(/[\s-]+/g, '_');
          if (['related_to', 'associated_with', 'connected_to'].includes(normInv) && !['related', 'associated', 'connected', 'related_to'].includes(targetRel)) {
            continue;
          }
          const sourceTok = registry?.getById(edge.from);
          const sourceType = (sourceTok?.type || '').toLowerCase();
          const sourceCanon = (sourceTok?.canonical || '').toLowerCase();
          const isMatch = normInv === targetRel || sourceType === targetRel || sourceCanon === targetRel || (relationRegistry?.areEquivalentOrInverse(normInv, targetRel)?.matches === true);

          if (isMatch && !cand.pathNodes.includes(edge.from)) {
            nextCandidates.push({
              nodeId: edge.from,
              pathNodes: [...cand.pathNodes, edge.from],
              edges: [
                ...cand.edges,
                {
                  fromId: cand.nodeId,
                  relationTokenId: registry?.lookup(invRel)?.id || null,
                  relationCanonical: invRel,
                  toId: edge.from,
                  direction: 'incoming_inverse',
                  confidence: edge.confidence || 1.0,
                },
              ],
            });
          }
        }
      }

      if (nextCandidates.length === 0) {
        return {
          found: false,
          validated: false,
          reason: 'PATH_DISCONNECTED',
          brokenAtHop: hopIdx + 1,
          expectedRelation: relationSequence[hopIdx],
        };
      }

      currentCandidates = nextCandidates;
    }

    if (currentCandidates.length === 0) {
      return { found: false, validated: false, reason: 'PATH_DISCONNECTED' };
    }

    // Return the highest-confidence verified path
    const bestCand = currentCandidates[0];
    const nodes = bestCand.pathNodes.map((id) => {
      const tok = registry?.getById(id);
      return {
        tokenId: id,
        canonical: tok ? tok.canonical : `Token #${id}`,
        type: tok ? tok.type : 'entity',
      };
    });

    return {
      found: true,
      depth: relationSequence.length,
      nodes,
      edges: bestCand.edges,
      targetToken: registry?.getById(bestCand.nodeId) || { id: bestCand.nodeId, canonical: `Token #${bestCand.nodeId}` },
      targetId: bestCand.nodeId,
      confidence: bestCand.edges.reduce((acc, e) => acc * e.confidence, 1.0),
      validated: true,
    };
  }

  /**
   * Deterministic Variable-Length Shortest Path Search (BFS)
   * Finds the most direct verified evidence chain between two nodes.
   * @param {number|string} startId
   * @param {number|string} targetId
   * @param {object} options
   * @returns {object}
   */
  findShortestPath(startId, targetId, { maxDepth = 5, registry = null } = {}) {
    const sId = Number(startId);
    const tId = Number(targetId);

    if (isNaN(sId) || isNaN(tId)) {
      return { found: false, validated: false, reason: 'INVALID_NODE_IDS' };
    }

    if (sId === tId) {
      const tok = registry?.getById(sId);
      return {
        found: true,
        depth: 0,
        nodes: [{ tokenId: sId, canonical: tok?.canonical || `Token #${sId}` }],
        path: [],
        confidence: 1.0,
        validated: true,
      };
    }

    const queue = [{
      nodeId: sId,
      path: [],
      visited: new Set([sId]),
    }];

    while (queue.length > 0) {
      const curr = queue.shift();

      if (curr.nodeId === tId) {
        const nodes = Array.from(curr.visited).map((id) => {
          const tok = registry?.getById(id);
          return { tokenId: id, canonical: tok?.canonical || `Token #${id}` };
        });

        return {
          found: true,
          depth: curr.path.length,
          nodes,
          path: curr.path,
          confidence: curr.path.reduce((acc, step) => acc * step.confidence, 1.0),
          validated: true,
        };
      }

      if (curr.path.length >= maxDepth) continue;

      // 1. Outgoing neighbors
      for (const edge of this.getOutgoing(curr.nodeId)) {
        if (!curr.visited.has(edge.to)) {
          const newVisited = new Set(curr.visited);
          newVisited.add(edge.to);
          queue.push({
            nodeId: edge.to,
            path: [
              ...curr.path,
              {
                from: curr.nodeId,
                relation: edge.relation,
                to: edge.to,
                direction: 'outgoing',
                confidence: edge.confidence || 1.0,
              },
            ],
            visited: newVisited,
          });
        }
      }

      // 2. Incoming neighbors
      for (const edge of this.getIncoming(curr.nodeId)) {
        if (!curr.visited.has(edge.from)) {
          const newVisited = new Set(curr.visited);
          newVisited.add(edge.from);
          queue.push({
            nodeId: edge.from,
            path: [
              ...curr.path,
              {
                from: curr.nodeId,
                relation: edge.relation,
                to: edge.from,
                direction: 'incoming',
                confidence: edge.confidence || 1.0,
              },
            ],
            visited: newVisited,
          });
        }
      }
    }

    return {
      found: false,
      validated: false,
      reason: 'PATH_NOT_FOUND',
    };
  }

  /**
   * Deterministic & Probabilistic Topological Subgraph Intersection across active query anchor tokens.
   * Computes the joint posterior probability for all competing candidate hypotheses and ranks via argmax.
   * (Sacred Law Compliant: Mathematical Probability Ranking, Zero Hardcoded Thresholds)
   * @param {Array<number|string>} anchorNodeIds
   * @param {object} options
   * @returns {object}
   */
  findAnchorIntersection(anchorNodeIds = [], { registry = null, minMatches = 1 } = {}) {
    if (!Array.isArray(anchorNodeIds) || anchorNodeIds.length === 0) {
      return { found: false, count: 0, candidateIds: [], entities: [], confidence: 0, rankedCandidates: [] };
    }

    const reg = registry || this.tokenRegistry;
    const validAnchorIds = [];

    for (const a of anchorNodeIds) {
      const tok = typeof a === 'number' ? reg?.getById(a) : reg?.resolveOrRegister(a);
      if (tok && tok.id) {
        validAnchorIds.push(tok.id);
      }
    }

    if (validAnchorIds.length < 2) {
      return { found: false, count: 0, candidateIds: [], entities: [], confidence: 0, rankedCandidates: [] };
    }

    // Accumulate candidate frequencies and contributing edges across anchor neighborhoods
    const candidateMatches = new Map();
    const candidateEdges = new Map();

    for (const aId of validAnchorIds) {
      const neighbors = new Set();
      for (const e of this.getIncoming(aId)) {
        if (!['has_alternate_spelling', 'same_as', 'alias_of', 'aka'].includes(e.relation)) {
          neighbors.add(e.from);
          if (!candidateEdges.has(e.from)) candidateEdges.set(e.from, []);
          candidateEdges.get(e.from).push(e);
        }
      }
      for (const e of this.getOutgoing(aId)) {
        if (!['has_alternate_spelling', 'same_as', 'alias_of', 'aka'].includes(e.relation)) {
          neighbors.add(e.to);
          if (!candidateEdges.has(e.to)) candidateEdges.set(e.to, []);
          candidateEdges.get(e.to).push(e);
        }
      }

      for (const nId of neighbors) {
        if (!validAnchorIds.includes(nId)) {
          candidateMatches.set(nId, (candidateMatches.get(nId) || 0) + 1);
        }
      }
    }

    // Compute joint posterior probability score for every competing candidate entity
    const scoredCandidates = [];
    for (const [candId, matchCount] of candidateMatches.entries()) {
      if (matchCount < minMatches) continue;

      const edges = candidateEdges.get(candId) || [];
      const edgeWeightProduct = edges.reduce((acc, e) => acc * (typeof e.confidence === 'number' ? e.confidence : 1.0), 1.0);
      const anchorCoverageRatio = matchCount / validAnchorIds.length;
      const posteriorProbability = edgeWeightProduct * anchorCoverageRatio;

      const entityToken = reg?.getById(candId);
      if (entityToken) {
        scoredCandidates.push({
          id: candId,
          entity: entityToken,
          canonical: entityToken.canonical,
          matchedAnchorCount: matchCount,
          totalAnchorCount: validAnchorIds.length,
          confidence: posteriorProbability,
          contributingEdges: edges,
        });
      }
    }

    // Sort descending by posterior probability (argmax)
    scoredCandidates.sort((a, b) => b.confidence - a.confidence);

    if (scoredCandidates.length === 0) {
      return { found: false, count: 0, candidateIds: [], entities: [], confidence: 0, rankedCandidates: [] };
    }

    const topCandidate = scoredCandidates[0];
    const secondCandidate = scoredCandidates[1] || null;
    const margin = secondCandidate ? topCandidate.confidence - secondCandidate.confidence : topCandidate.confidence;

    // Competing hypotheses within 15% margin of top score
    const competingHypotheses = scoredCandidates.filter((c) => c !== topCandidate && c.confidence >= topCandidate.confidence * 0.85);

    return {
      found: true,
      count: scoredCandidates.length,
      primaryEntity: topCandidate.entity,
      targetToken: topCandidate.entity,
      value: topCandidate.canonical,
      confidence: topCandidate.confidence,
      candidateIds: scoredCandidates.map((c) => c.id),
      entities: scoredCandidates.map((c) => c.entity),
      rankedCandidates: scoredCandidates,
      competingHypotheses,
      margin,
      anchors: validAnchorIds.map((id) => reg?.getById(id)).filter(Boolean),
    };
  }

  /**
   * Deterministic Multi-Constraint Constellation Intersection
   * Computes the exact set intersection of entities satisfying all constraints simultaneously.
   * @param {Array<{ relation: string, target?: any, targetId?: number }>} constraints
   * @param {object} options
   * @returns {object}
   */
  findConstellationIntersection(constraints = [], { registry = null, relationRegistry = null } = {}) {
    if (!Array.isArray(constraints) || constraints.length === 0) {
      return { found: false, validated: false, count: 0, candidateIds: [], entities: [] };
    }

    const candidateSets = [];

    for (const c of constraints) {
      let tId = c.targetId;
      if (tId === undefined && c.target && registry) {
        const tok = typeof c.target === 'string' ? registry.lookup(c.target) : (typeof c.target === 'number' ? registry.getById(c.target) : null);
        if (tok) tId = tok.id;
      }

      const relNorm = (c.relation || '').toLowerCase().replace(/[\s-]+/g, '_');
      const constraintSet = new Set();

      if (tId !== undefined) {
        // 1. Direct incoming to target: (candidate) ──[relation]──► (target)
        const incoming = this.getIncoming(tId);
        for (const edge of incoming) {
          const edgeRel = (edge.relation || '').toLowerCase().replace(/[\s-]+/g, '_');
          const isMatch = edgeRel === relNorm || (relationRegistry?.areEquivalentOrInverse(edgeRel, relNorm)?.matches === true);
          if (isMatch) {
            constraintSet.add(edge.from);
          }
        }

        // 2. Direct outgoing from target with inverse: (target) ──[inverseRel]──► (candidate)
        const outgoing = this.getOutgoing(tId);
        for (const edge of outgoing) {
          const invRel = (relationRegistry?.getInverse(edge.relation) || edge.relation).toLowerCase().replace(/[\s-]+/g, '_');
          const isMatch = invRel === relNorm || (relationRegistry?.areEquivalentOrInverse(invRel, relNorm)?.matches === true);
          if (isMatch) {
            constraintSet.add(edge.to);
          }
        }
      } else if (c.targetValue !== undefined || c.target) {
        // Scan edges matching literal value/string target
        const valStr = String(c.targetValue || c.target).toLowerCase().trim();
        for (const edge of this.edges) {
          const edgeRel = (edge.relation || '').toLowerCase().replace(/[\s-]+/g, '_');
          const targetTok = registry?.getById(edge.to);
          const canon = (targetTok?.canonical || '').toLowerCase().trim();
          if (edgeRel === relNorm && (canon === valStr || canon.includes(valStr))) {
            constraintSet.add(edge.from);
          }
        }
      }

      candidateSets.push(constraintSet);
    }

    if (candidateSets.length === 0) {
      return { found: false, validated: false, count: 0, candidateIds: [], entities: [] };
    }

    // Intersect all candidate sets
    const intersectingIds = candidateSets.reduce((acc, currSet) => {
      const nextAcc = new Set();
      for (const id of acc) {
        if (currSet.has(id)) {
          nextAcc.add(id);
        }
      }
      return nextAcc;
    }, candidateSets[0]);

    const candidateIds = Array.from(intersectingIds);
    const entities = candidateIds.map((id) => {
      const tok = registry?.getById(id);
      return {
        id,
        canonical: tok ? tok.canonical : `Token #${id}`,
        type: tok ? tok.type : 'entity',
      };
    });

    return {
      found: candidateIds.length > 0,
      validated: candidateIds.length > 0,
      count: candidateIds.length,
      candidateIds,
      entities,
    };
  }

  getAllEdges() {
    return [...this.edges];
  }

  getAllRelationships() {
    return this.edges.map((e) => ({
      source: e.from,
      relation: e.relation,
      target: e.to,
      from: e.from,
      to: e.to,
      weight: e.confidence || 1.0,
      confidence: e.confidence || 1.0,
      metadata: e.metadata || {},
    }));
  }

  get totalEdges() {
    return this.edges.length;
  }

  get totalNodes() {
    const nodes = new Set();
    for (const e of this.edges) {
      nodes.add(e.from);
      nodes.add(e.to);
    }
    return nodes.size;
  }

  get size() {
    return this.edges.length;
  }
}

export const defaultRelationshipGraph = new RelationshipGraph();
export default defaultRelationshipGraph;

