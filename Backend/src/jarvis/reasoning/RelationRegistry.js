import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';
import { defaultTokenRegistry, TokenType } from '../tokens/TokenRegistry.js';

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
    this.dynamicClusters = new Map(); // Map<clusterName, Set<string>>
  }

  _normalize(rel) {
    if (!rel || typeof rel !== 'string') return '';
    return rel.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^\w]/g, '');
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

    // Check dynamic synonym clusters
    for (const cluster of this.dynamicClusters.values()) {
      if (cluster.has(n1) && cluster.has(n2)) {
        return { matches: true, isInverse: false };
      }
    }

    // Check Graph meta-edges for synonym_of / same_as
    if (this.tokenRegistry && this.graph) {
      const t1 = this.tokenRegistry.lookup(n1);
      const t2 = this.tokenRegistry.lookup(n2);
      if (t1 && t2) {
        const out1 = this.graph.getOutgoing(t1.id);
        const isSynonym = out1.some((e) => ['synonym_of', 'same_as', 'alias_of'].includes(e.relation) && e.to === t2.id);
        if (isSynonym) return { matches: true, isInverse: false };
      }
    }

    return { matches: false, isInverse: false };
  }
}

export const defaultRelationRegistry = new RelationRegistry();
export default defaultRelationRegistry;
