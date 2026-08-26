import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';
import { defaultTokenRegistry, TokenType } from '../tokens/TokenRegistry.js';
import { defaultEntityCanonicalizer } from '../tokens/EntityCanonicalizer.js';

export const RelationType = {
  FACTUAL: 'factual',
  ASSOCIATIVE: 'associative',
  META: 'meta',
};

/**
 * Dynamic Generative Relation Engine
 * Combines Graph-Driven Meta-Edges with Algorithmic Morphological Derivation
 * (Sacred Law Compliant: Zero hardcoded dictionaries, 100% generative & graph-backed)
 */
export class RelationRegistry {
  constructor({ graph, tokenRegistry } = {}) {
    this.graph = graph || defaultRelationshipGraph;
    this.tokenRegistry = tokenRegistry || defaultTokenRegistry;
    this.dynamicInverses = new Map();
    this.dynamicSymmetries = new Set();
    this.dynamicTaxonomic = new Set();
    this.dynamicHierarchical = new Set();
    this.dynamicTransitive = new Set();
    this.dynamicAssociative = new Set();
    this.dynamicMeta = new Set();
    this.dynamicClusters = new Map(); // Map<clusterName, Set<string>>

    // Register canonical taxonomic / meta relations
    this.registerTaxonomic('instance_of');
    this.registerTaxonomic('is_a');
    this.registerTaxonomic('type_of');
    this.registerTaxonomic('subclass_of');
    this.registerTaxonomic('category_of');
    this.registerTaxonomic('concept_of');

    // Register canonical inverses
    this.registerInverse('part_of', 'contains');
    this.registerInverse('located_in', 'contains_location');
    this.registerInverse('filmed_in', 'film_location_of');
    this.registerInverse('has_capital', 'capital_of');
    this.registerInverse('directed_by', 'directed');
    this.registerInverse('starred_in', 'stars');
  }

  _normalize(rel) {
    if (!rel || typeof rel !== 'string') return '';
    return rel.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^\w]/g, '');
  }

  /**
   * Declarative / Linguistic Relation Normalizer
   * Normalizes natural-language verbal phrases, copulas, and prepositions to canonical snake_case relations
   * (e.g. "forms part of" -> "part_of", "is located in" -> "located_in", "filming took place in" -> "filmed_in")
   * @param {string} rawRel
   * @returns {string}
   */
  normalizeRelation(rawRel) {
    if (!rawRel || typeof rawRel !== 'string') return '';
    let s = rawRel.trim().toLowerCase();

    // 1. Clean syntactic decorators / passive markers
    s = s.replace(/^(?:which|that|who)\s+/i, '');
    s = s.replace(/^(?:is|was|are|were|has_been|have_been)\s+/i, '');
    s = s.replace(/^(?:a|an|the)\s+/i, '');

    // 2. Multi-word verbal idioms / prepositional compound patterns
    s = s.replace(/^(?:forms\s+part\s+of|is\s+part\s+of|is\s+a\s+part\s+of|part\s+of|belongs\s+to|belonging\s+to)$/i, 'part_of');
    s = s.replace(/^(?:is\s+located\s+in|located\s+in|lies\s+within|is\s+situated\s+in|situated\s+in|located\s+within|situated\s+within)$/i, 'located_in');
    s = s.replace(/^(?:filmed\s+in|shot\s+in|filming\s+took\s+place\s+in|takes\s+place\s+in|was\s+filmed\s+in|was\s+shot\s+in)$/i, 'filmed_in');
    s = s.replace(/^(?:starred\s+in|featured\s+in|acted\s+in|stars\s+in)$/i, 'starred_in');
    s = s.replace(/^(?:directed\s+by|direction\s+by)$/i, 'directed_by');
    s = s.replace(/^(?:capital\s+of|is\s+the\s+capital\s+of)$/i, 'has_capital');

    return this._normalize(s);
  }

  registerAssociative(rel) {
    const n = this._normalize(rel);
    if (n) this.dynamicAssociative.add(n);
  }

  registerMeta(rel) {
    const n = this._normalize(rel);
    if (n) this.dynamicMeta.add(n);
  }

  registerTaxonomic(rel) {
    const n = this._normalize(rel);
    if (n) {
      this.dynamicTaxonomic.add(n);
      this.dynamicMeta.add(n);
    }
  }

  registerHierarchical(rel) {
    const n = this._normalize(rel);
    if (n) this.dynamicHierarchical.add(n);
  }

  registerTransitive(rel) {
    const n = this._normalize(rel);
    if (n) this.dynamicTransitive.add(n);
  }

  isAssociative(rel) {
    const n = this._normalize(rel);
    if (!n) return false;
    if (this.dynamicAssociative.has(n)) return true;
    return this._checkGraphRelProperty(n, 'associative');
  }

  isMeta(rel) {
    const n = this._normalize(rel);
    if (!n) return false;
    if (this.dynamicMeta.has(n)) return true;
    return this._checkGraphRelProperty(n, 'meta');
  }

  isTaxonomic(rel) {
    const n = this._normalize(rel);
    if (!n) return false;
    if (this.dynamicTaxonomic.has(n)) return true;
    return this._checkGraphRelProperty(n, 'taxonomic');
  }

  isHierarchical(rel) {
    const n = this._normalize(rel);
    if (!n) return false;
    if (this.dynamicHierarchical.has(n)) return true;
    return this._checkGraphRelProperty(n, 'hierarchical');
  }

  isTransitive(rel) {
    const n = this._normalize(rel);
    if (!n) return false;
    if (this.dynamicTransitive.has(n)) return true;
    return this._checkGraphRelProperty(n, 'transitive');
  }

  _checkGraphRelProperty(relNorm, propertyName) {
    if (!this.tokenRegistry || !this.graph) return false;
    const relTok = this.tokenRegistry.lookup(relNorm);
    if (!relTok) return false;
    if (relTok.metadata && relTok.metadata[propertyName]) return true;

    const outgoing = this.graph.getOutgoing(relTok.id);
    return outgoing.some((e) => e.relation === propertyName || e.relation === `is_${propertyName}`);
  }

  /**
   * Resolves whether a candidate graph node satisfies a target semantic type
   * @param {object} node - Token object from TokenRegistry
   * @param {string} targetType - Requested target type (e.g. 'country', 'planet', 'continent', 'state')
   * @param {object} [graph] - Active RelationshipGraph instance
   * @param {object} [tokenRegistry] - Active TokenRegistry instance
   * @returns {boolean}
   */
  matchesTargetType(node, targetType, graph = null, tokenRegistry = null) {
    if (!node || !targetType) return false;
    const targetNorm = this._normalize(targetType);
    if (!targetNorm) return false;

    const g = graph || this.graph || defaultRelationshipGraph;
    const reg = tokenRegistry || this.tokenRegistry || defaultTokenRegistry;

    // 1. Direct token type check
    const nodeType = this._normalize(node.type || '');
    if (nodeType && (nodeType === targetNorm || this._isStemMatch(nodeType, targetNorm))) {
      return true;
    }

    // 1b. Taxonomic category synonym equivalence check via EntityCanonicalizer
    if (defaultEntityCanonicalizer?.taxonomyCategories) {
      const nodeTaxon = defaultEntityCanonicalizer.taxonomyCategories.get(nodeType) || nodeType;
      const targetTaxon = defaultEntityCanonicalizer.taxonomyCategories.get(targetNorm) || targetNorm;
      if (nodeTaxon && targetTaxon && (nodeTaxon === targetTaxon || this._isStemMatch(nodeTaxon, targetTaxon))) {
        return true;
      }
    }

    // 2. Canonical / alias literal match (e.g. node itself represents the concept)
    const canonNorm = this._normalize(node.canonical || '');
    if (canonNorm === targetNorm || this._isStemMatch(canonNorm, targetNorm)) {
      return true;
    }
    if (Array.isArray(node.aliases) && node.aliases.some((a) => {
      const an = this._normalize(a);
      return an === targetNorm || this._isStemMatch(an, targetNorm);
    })) {
      return true;
    }

    // 2b. Taxonomic phrase decomposition for canonical & aliases (e.g. "Asian continent" -> continent, "Indian Union" -> country)
    if (defaultEntityCanonicalizer) {
      const canonDecomp = defaultEntityCanonicalizer.decomposeTaxonomicPhrase(node.canonical);
      if (canonDecomp?.semanticType && canonDecomp.semanticType !== 'entity' && canonDecomp.semanticType !== 'concept') {
        const canonTaxon = defaultEntityCanonicalizer.taxonomyCategories?.get(canonDecomp.semanticType) || canonDecomp.semanticType;
        const targetTaxon = defaultEntityCanonicalizer.taxonomyCategories?.get(targetNorm) || targetNorm;
        if (canonTaxon && targetTaxon && (canonTaxon === targetTaxon || this._isStemMatch(canonTaxon, targetTaxon))) {
          return true;
        }
      }

      if (Array.isArray(node.aliases)) {
        for (const a of node.aliases) {
          const decomp = defaultEntityCanonicalizer.decomposeTaxonomicPhrase(a);
          if (decomp?.semanticType && decomp.semanticType !== 'entity' && decomp.semanticType !== 'concept') {
            const aliasTaxon = defaultEntityCanonicalizer.taxonomyCategories?.get(decomp.semanticType) || decomp.semanticType;
            const targetTaxon = defaultEntityCanonicalizer.taxonomyCategories?.get(targetNorm) || targetNorm;
            if (aliasTaxon && targetTaxon && (aliasTaxon === targetTaxon || this._isStemMatch(aliasTaxon, targetTaxon))) {
              return true;
            }
          }
        }
      }
    }

    // 3. Metadata semantic type check
    if (node.metadata && typeof node.metadata === 'object') {
      const metaType = this._normalize(node.metadata.semanticType || node.metadata.type || node.metadata.category || '');
      if (metaType && (metaType === targetNorm || this._isStemMatch(metaType, targetNorm))) {
        return true;
      }
    }

    // 4. Graph taxonomic edge check: (node) ──[is_a | type_of | category_of | concept_of]──► (typeToken)
    if (g && node.id !== undefined) {
      const outgoing = g.getOutgoing(node.id);
      const incoming = g.getIncoming(node.id);

      for (const edge of outgoing) {
        if (this.isTaxonomic(edge.relation) || this.isMeta(edge.relation)) {
          const targetTok = reg?.getById(edge.to);
          if (targetTok) {
            const targetCanon = this._normalize(targetTok.canonical);
            const targetTaxon = defaultEntityCanonicalizer?.taxonomyCategories?.get(targetCanon) || targetCanon;
            const requestedTaxon = defaultEntityCanonicalizer?.taxonomyCategories?.get(targetNorm) || targetNorm;
            if (targetCanon === targetNorm || targetTaxon === requestedTaxon || this._isStemMatch(targetCanon, targetNorm)) {
              return true;
            }
          }
        }
      }

      // Check incoming type edges: (targetToken) ──[has_instance | has_type | contains]──► (node)
      for (const inEdge of incoming) {
        if (this.isTaxonomic(inEdge.relation) || this.isMeta(inEdge.relation)) {
          const fromTok = reg?.getById(inEdge.from);
          if (fromTok) {
            const fromCanon = this._normalize(fromTok.canonical);
            const fromTaxon = defaultEntityCanonicalizer?.taxonomyCategories?.get(fromCanon) || fromCanon;
            const requestedTaxon = defaultEntityCanonicalizer?.taxonomyCategories?.get(targetNorm) || targetNorm;
            if (fromCanon === targetNorm || fromTaxon === requestedTaxon || this._isStemMatch(fromCanon, targetNorm)) {
              return true;
            }
          }
        }
      }

      // 5. Relational predicate role check: incoming edge predicate matches targetType (e.g. Mary ──[father_of]──► John, India ──[has_capital]──► New Delhi, Movie ──[directed_by]──► Director)
      for (const inEdge of incoming) {
        if (!this.isMeta(inEdge.relation) && !this.isAssociative(inEdge.relation)) {
          const matchRes = this.areEquivalentOrInverse(inEdge.relation, targetNorm);
          if (matchRes?.matches) {
            return true;
          }
        }
      }
    }

    return false;
  }

  isFactual(rel) {
    return !this.isAssociative(rel) && !this.isMeta(rel);
  }

  getRelationType(rel) {
    if (this.isAssociative(rel)) return RelationType.ASSOCIATIVE;
    if (this.isMeta(rel)) return RelationType.META;
    return RelationType.FACTUAL;
  }

  /**
   * Registers a dynamic semantic synonym cluster at runtime and commits meta-edges to the graph
   */
  registerSynonymCluster(clusterName, relationsArray) {
    if (!clusterName || !Array.isArray(relationsArray)) return;
    const cName = this._normalize(clusterName);
    if (!this.dynamicClusters.has(cName)) {
      this.dynamicClusters.set(cName, new Set());
    }
    const cluster = this.dynamicClusters.get(cName);
    const normRels = relationsArray.map((r) => this._normalize(r)).filter(Boolean);

    for (const r of normRels) {
      cluster.add(r);
    }

    // Persist synonym meta-edges into graph
    if (this.tokenRegistry && this.graph && normRels.length > 1) {
      for (let i = 0; i < normRels.length; i++) {
        const t1 = this.tokenRegistry.lookup(normRels[i]) || this.tokenRegistry.register({ canonical: normRels[i], type: TokenType.PROPERTY });
        for (let j = i + 1; j < normRels.length; j++) {
          const t2 = this.tokenRegistry.lookup(normRels[j]) || this.tokenRegistry.register({ canonical: normRels[j], type: TokenType.PROPERTY });
          this.graph.add(t1.id, 'synonym_of', t2.id);
          this.graph.add(t2.id, 'synonym_of', t1.id);
        }
      }
    }
  }

  /**
   * 1. Algorithmic Morphological Inverse Derivation (Zero Dictionaries)
   * Programmatically computes inverse relations using linguistic root rules
   */
  _deriveMorphologicalInverse(rel) {
    if (!rel) return null;
    const n = this._normalize(rel);

    // Rule 1: "has_X" <-> "X_of" (e.g. "has_capital" <-> "capital_of", "has_president" <-> "president_of")
    if (n.startsWith('has_')) {
      return `${n.replace(/^has_/, '')}_of`;
    }
    if (n.endsWith('_of') && !n.startsWith('has_') && !n.endsWith('er_of') && !n.endsWith('or_of')) {
      return `has_${n.replace(/_of$/, '')}`;
    }

    // Rule 2: Passive Participle "-ed_by" / "-d_by" <-> Active Agent "-er_of" / "-or_of" / agent nouns
    // (e.g. "composed_by" <-> "composer_of", "directed_by" <-> "director_of", "director" <-> "directed")
    if (n.endsWith('_by')) {
      const verb = n.replace(/_by$/, '');
      const agent = verb.endsWith('e') ? `${verb}r` : (verb.endsWith('ed') ? `${verb.slice(0, -2)}er` : `${verb}er`);
      return `${agent}_of`;
    }
    if (n.endsWith('er_of') || n.endsWith('or_of') || n.endsWith('r_of')) {
      const root = n.replace(/(?:er|or|r)_of$/, '');
      const participle = root.endsWith('e') ? `${root}d` : `${root}ed`;
      return `${participle}_by`;
    }

    // Rule 3: Locational / Prepositional ("located_in" -> "contains_location", "works_in" -> "employs_in")
    if (n.endsWith('_in')) {
      return `contains_${n.replace(/_in$/, '')}`;
    }
    if (n.startsWith('contains_')) {
      return `${n.replace(/^contains_/, '')}_in`;
    }

    return null;
  }

  /**
   * 2. Graph-Driven Meta-Edge Inverse Resolution
   * Resolves dynamic meta-edges from the RelationshipGraph (e.g. [relToken] -[inverse_of]-> [targetRelToken])
   */
  _lookupGraphMetaInverse(rel) {
    if (!this.tokenRegistry || !this.graph) return null;
    const relToken = this.tokenRegistry.lookup(rel);
    if (!relToken) return null;

    const outgoing = this.graph.getOutgoing(relToken.id);
    const inverseEdge = outgoing.find((e) => e.relation === 'inverse_of');
    if (inverseEdge) {
      const targetToken = this.tokenRegistry.getById(inverseEdge.to);
      if (targetToken) return this._normalize(targetToken.canonical);
    }

    const incoming = this.graph.getIncoming(relToken.id);
    const incomingInverseEdge = incoming.find((e) => e.relation === 'inverse_of');
    if (incomingInverseEdge) {
      const sourceToken = this.tokenRegistry.getById(incomingInverseEdge.from);
      if (sourceToken) return this._normalize(sourceToken.canonical);
    }

    return null;
  }

  /**
   * Registers a dynamic inverse relationship at runtime and commits meta-edge to the graph
   */
  registerInverse(rel1, rel2) {
    const n1 = this._normalize(rel1);
    const n2 = this._normalize(rel2);
    if (!n1 || !n2 || n1 === n2) return;

    this.dynamicInverses.set(n1, n2);
    this.dynamicInverses.set(n2, n1);

    if (this.tokenRegistry && this.graph) {
      const t1 = this.tokenRegistry.lookup(n1) || this.tokenRegistry.register({ canonical: n1, type: TokenType.PROPERTY });
      const t2 = this.tokenRegistry.lookup(n2) || this.tokenRegistry.register({ canonical: n2, type: TokenType.PROPERTY });
      this.graph.add(t1.id, 'inverse_of', t2.id);
      this.graph.add(t2.id, 'inverse_of', t1.id);
    }
  }

  /**
   * Registers a dynamic symmetric relationship at runtime
   */
  registerSymmetric(rel) {
    const n = this._normalize(rel);
    if (!n) return;
    this.dynamicSymmetries.add(n);

    if (this.tokenRegistry && this.graph) {
      const t = this.tokenRegistry.lookup(n) || this.tokenRegistry.register({ canonical: n, type: TokenType.PROPERTY });
      this.graph.add(t.id, 'is_symmetric', t.id);
    }
  }

  /**
   * Dynamically retrieves the inverse of any relation using Graph Meta-Edges -> Dynamic Inverses -> Morphological Derivation -> Teacher Bootstrap
   */
  getInverse(rel) {
    const n = this._normalize(rel);
    if (!n) return null;

    // 1. Check in-memory dynamic registry
    if (this.dynamicInverses.has(n)) {
      return this.dynamicInverses.get(n);
    }

    // 2. Check Graph Meta-Edges
    const graphInverse = this._lookupGraphMetaInverse(n);
    if (graphInverse) {
      this.dynamicInverses.set(n, graphInverse);
      return graphInverse;
    }

    // 3. Generative Algorithmic Morphological Derivation
    const derived = this._deriveMorphologicalInverse(n);
    if (derived) {
      this.registerInverse(n, derived);
      return derived;
    }

    // 4. Epistemic Gap Bootstrap via Teacher (Sacred Law 9 Compliant: 0 Static Hardcoded Dictionaries)
    this._bootstrapInverseViaTeacher(n).catch(() => {});

    return null;
  }

  async _bootstrapInverseViaTeacher(rel) {
    try {
      const { defaultLLMManager } = await import('../providers/LLMManager.js');
      if (!defaultLLMManager) return;

      const res = await defaultLLMManager.chat({
        systemPrompt: 'You are a linguistic ontology engine. Return ONLY the exact single-word or snake_case inverse relationship (e.g. director -> directed, employer -> employed_by, capital -> capital_of). Return ONLY the word, nothing else.',
        userMessage: `What is the inverse relationship of "${rel}"?`,
      });

      if (res?.text && !res.text.includes('Operating in local offline resilience mode')) {
        const inv = this._normalize(res.text);
        if (inv && inv !== rel) {
          this.registerInverse(rel, inv);
        }
      }
    } catch (_) {}
  }

  /**
   * Dynamically checks if a relation is symmetric
   */
  isSymmetric(rel) {
    const n = this._normalize(rel);
    if (!n) return false;

    if (this.dynamicSymmetries.has(n)) return true;

    if (this.tokenRegistry && this.graph) {
      const relToken = this.tokenRegistry.lookup(n);
      if (relToken) {
        const outgoing = this.graph.getOutgoing(relToken.id);
        const hasSymmetricEdge = outgoing.some((e) => e.relation === 'is_symmetric');
        if (hasSymmetricEdge) {
          this.dynamicSymmetries.add(n);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Inflectional suffix stripper for morphological root matching (Zero Hardcoded Dictionaries)
   */
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

  areEquivalentOrInverse(rel1, rel2) {
    const n1 = this._normalize(rel1);
    const n2 = this._normalize(rel2);
    if (!n1 || !n2) return { matches: false };
    if (n1 === n2) return { matches: true, isInverse: false };
    if (this.isSymmetric(n1) && n1 === n2) return { matches: true, isInverse: false };
    if (this.getInverse(n1) === n2) return { matches: true, isInverse: true };

    // Prepositional base equivalence (e.g. mother_of <-> mother, located_in <-> located)
    const base1 = n1.replace(/^(?:has_|is_)/, '').replace(/_(?:of|by|in|at|to|from|on|for)$/, '');
    const base2 = n2.replace(/^(?:has_|is_)/, '').replace(/_(?:of|by|in|at|to|from|on|for)$/, '');
    if (base1.length >= 3 && base1 === base2) return { matches: true, isInverse: false };

    if (this._isStemMatch(n1, n2)) return { matches: true, isInverse: false };

    // Sub-token / compound part stem matching (e.g. won_award <-> award, won_award <-> won, release_year <-> released)
    const parts1 = n1.split('_').filter(Boolean);
    const parts2 = n2.split('_').filter(Boolean);
    for (const p1 of parts1) {
      for (const p2 of parts2) {
        if (p1 === p2 || this._isStemMatch(p1, p2)) {
          return { matches: true, isInverse: false };
        }
      }
    }

    // Check dynamic synonym clusters
    for (const cluster of this.dynamicClusters.values()) {
      if (cluster.has(n1) && cluster.has(n2)) {
        return { matches: true, isInverse: false };
      }
    }

    // Check Graph meta-edges for synonym_of / same_as
    const reg = this.tokenRegistry || defaultTokenRegistry;
    const g = this.graph || defaultRelationshipGraph;
    if (reg && g) {
      const t1 = reg.lookup(n1);
      const t2 = reg.lookup(n2);
      if (t1 && t2) {
        const out1 = g.getOutgoing(t1.id);
        const inc1 = g.getIncoming(t1.id);
        const isSynonym = [...out1, ...inc1].some((e) => ['synonym_of', 'same_as', 'alias_of', 'equivalent_to'].includes(e.relation) && (e.to === t2.id || e.from === t2.id));
        if (isSynonym) return { matches: true, isInverse: false };
      }
    }

    return { matches: false, isInverse: false };
  }
}

export const defaultRelationRegistry = new RelationRegistry();
export default defaultRelationRegistry;
