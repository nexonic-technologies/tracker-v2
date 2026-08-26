import { getGlobalModels } from '../../models/global/index.js';
import { defaultEntityCanonicalizer } from './EntityCanonicalizer.js';

export const TokenType = {
  CONCEPT: 'concept',
  ENTITY: 'entity',
  ACTION: 'action',
  PROPERTY: 'property',
  TECHNICAL_TERM: 'technical_term',
  PHRASE: 'phrase',
};

export const TokenStatus = {
  ACTIVE: 'active',
  CANDIDATE: 'candidate',
  UNCERTAIN: 'uncertain',
  MERGED: 'merged',
};

export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from',
  'up', 'down', 'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'and', 'but', 'or', 'nor', 'so', 'yet',
  'i', 'me', 'we', 'us', 'you', 'he', 'him', 'she', 'they', 'them',
  'what', 'which', 'who', 'whom', 'whose', 'why', 'how', 'when', 'where',
  'do', 'does', 'did', 'doing', 'have', 'has', 'had', 'having',
  'can', 'could', 'shall', 'should', 'will', 'would', 'may', 'might', 'must',
  'am', 'if', 'as', 'until', 'while', 'because', 'tell', 'know', 'give', 'show'
]);

/**
 * Self-Growing Token Registry (MongoDB Primary + Memory Cache)
 * Strictly registered on Global Database across all tenants.
 */
export class TokenRegistry {
  constructor({ startingId = 10001 } = {}) {
    this.startingId = startingId;
    this.tokensById = new Map();
    this.canonicalToId = new Map();
    this.aliases = new Map();
    this.wordToTokenIds = new Map();
    this.stemToTokenIds = new Map();
    this.ngramToTokenIds = new Map();
    this.highestId = this.startingId - 1;
    this.isLoaded = false;
    this.init();
  }

  get model() {
    return getGlobalModels().JarvisToken;
  }

  async init() {
    try {
      await this.loadFromDB();
    } catch (err) {
      console.warn('[TokenRegistry] Init notice:', err.message);
    }
  }

  _normalize(str) {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  async loadFromDB() {
    try {
      if (!this.model) return;
      const tokens = await this.model.find({}).lean();
      for (const record of tokens) {
        this._indexRecord(record, false);
      }
      this.isLoaded = true;
    } catch (err) {
      // In-memory fallback if DB not ready
    }
  }

  _extractIndexTerms(text, { filterStopWords = false } = {}) {
    if (!text || typeof text !== 'string') return { words: [], stems: [], ngrams: [] };
    const norm = this._normalize(text);
    let rawWords = norm.split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
    if (filterStopWords) {
      rawWords = rawWords.filter((w) => !STOP_WORDS.has(w));
    }
    const words = rawWords;
    const stems = new Set();
    const ngrams = new Set();

    for (const word of words) {
      if (word.length >= 3) {
        stems.add(word.slice(0, 3));
        if (word.length >= 4) {
          stems.add(word.slice(0, 4));
        }
      }
      if (word.length >= 3) {
        for (let i = 0; i <= word.length - 3; i++) {
          ngrams.add(word.slice(i, i + 3));
        }
      }
    }

    return { words, stems: Array.from(stems), ngrams: Array.from(ngrams) };
  }

  _addIndexTerms(text, id) {
    const { words, stems, ngrams } = this._extractIndexTerms(text);
    for (const word of words) {
      if (!this.wordToTokenIds.has(word)) {
        this.wordToTokenIds.set(word, new Set());
      }
      this.wordToTokenIds.get(word).add(id);
    }
    for (const stem of stems) {
      if (!this.stemToTokenIds.has(stem)) {
        this.stemToTokenIds.set(stem, new Set());
      }
      this.stemToTokenIds.get(stem).add(id);
    }
    for (const ng of ngrams) {
      if (!this.ngramToTokenIds.has(ng)) {
        this.ngramToTokenIds.set(ng, new Set());
      }
      this.ngramToTokenIds.get(ng).add(id);
    }
  }

  _removeIndexTerms(text, id) {
    const { words, stems, ngrams } = this._extractIndexTerms(text);
    for (const word of words) {
      const set = this.wordToTokenIds.get(word);
      if (set) set.delete(id);
    }
    for (const stem of stems) {
      const set = this.stemToTokenIds.get(stem);
      if (set) set.delete(id);
    }
    for (const ng of ngrams) {
      const set = this.ngramToTokenIds.get(ng);
      if (set) set.delete(id);
    }
  }

  _indexRecord(record, persist = true) {
    const id = Number(record.id);
    if (isNaN(id)) return;

    this.tokensById.set(id, record);
    if (id > this.highestId) {
      this.highestId = id;
    }

    const normCanonical = this._normalize(record.canonical);
    const targetId = record.aliasOf ? Number(record.aliasOf) : id;

    if (record.aliasOf) {
      this.aliases.set(normCanonical, targetId);
      this.canonicalToId.set(normCanonical, targetId);
    } else if (normCanonical) {
      this.canonicalToId.set(normCanonical, id);
    }

    // Index canonical terms
    if (record.canonical) {
      this._addIndexTerms(record.canonical, targetId);
    }

    if (Array.isArray(record.aliases)) {
      for (const alias of record.aliases) {
        const normAlias = this._normalize(alias);
        this.aliases.set(normAlias, targetId);
        this._addIndexTerms(alias, targetId);
      }
    }

    if (persist) {
      this._persistRecord(record);
    }
  }

  _persistRecord(record) {
    if (!this.model || this.model.db?.readyState !== 1) return;
    this.model.updateOne(
      { id: record.id },
      {
        $set: {
          canonical: record.canonical,
          aliases: record.aliases || [],
          type: record.type,
          status: record.status,
          aliasOf: record.aliasOf || null,
          confidence: record.confidence || 1.0,
          metadata: record.metadata || {},
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    ).catch((err) => {
      console.warn('[TokenRegistry] Persist error:', err.message);
    });
  }

  getNextId() {
    this.highestId += 1;
    return this.highestId;
  }

  lookup(wordOrPhrase) {
    if (!wordOrPhrase) return null;
    const norm = this._normalize(wordOrPhrase);

    // 1. Direct canonical hit
    if (this.canonicalToId.has(norm)) {
      const id = this.canonicalToId.get(norm);
      return this.tokensById.get(id) || null;
    }

    // 2. Alias hit
    if (this.aliases.has(norm)) {
      const id = this.aliases.get(norm);
      return this.tokensById.get(id) || null;
    }

    return null;
  }

  /**
   * Resolves candidate token records matching an input utterance in O(L) time (L = utterance length)
   * using inverted indices (word, stem, n-gram) rather than scanning all N tokens.
   */
  findCandidates(queryText, { limit = 25, minScore = 0.3 } = {}) {
    if (!queryText || typeof queryText !== 'string') return [];
    const normQuery = this._normalize(queryText);
    if (!normQuery) return [];

    // Direct exact lookup optimization (O(1))
    const direct = this.lookup(normQuery);
    if (direct) {
      return [direct];
    }

    const { words, stems, ngrams } = this._extractIndexTerms(normQuery, { filterStopWords: true });
    if (words.length === 0) return [];

    // Token ID -> Score accumulator
    const scoreMap = new Map();

    // 1. Exact word matches sorted by rarity (most specific first)
    const sortedWords = words
      .map((w) => ({ word: w, matchedIds: this.wordToTokenIds.get(w) }))
      .filter((item) => item.matchedIds && item.matchedIds.size > 0)
      .sort((a, b) => a.matchedIds.size - b.matchedIds.size);

    for (const { matchedIds } of sortedWords) {
      if (scoreMap.size > 0 && matchedIds.size > 200) {
        // Fast intersection: only boost existing candidates
        for (const id of scoreMap.keys()) {
          if (matchedIds.has(id)) {
            scoreMap.set(id, scoreMap.get(id) + 3.0);
          }
        }
      } else {
        let count = 0;
        for (const id of matchedIds) {
          scoreMap.set(id, (scoreMap.get(id) || 0) + 3.0);
          if (++count >= 200) break;
        }
      }
    }

    // 2. Stem matches (most specific first)
    const sortedStems = stems
      .map((s) => ({ stem: s, matchedIds: this.stemToTokenIds.get(s) }))
      .filter((item) => item.matchedIds && item.matchedIds.size > 0)
      .sort((a, b) => a.matchedIds.size - b.matchedIds.size);

    for (const { matchedIds } of sortedStems) {
      if (scoreMap.size > 0 && matchedIds.size > 200) {
        for (const id of scoreMap.keys()) {
          if (matchedIds.has(id)) {
            scoreMap.set(id, scoreMap.get(id) + 1.0);
          }
        }
      } else if (scoreMap.size < 50) {
        let count = 0;
        for (const id of matchedIds) {
          scoreMap.set(id, (scoreMap.get(id) || 0) + 1.0);
          if (++count >= 100) break;
        }
      }
    }

    // 3. For words without exact match (e.g. typos like "flimfare" -> "Filmfare"), query their stems and n-grams
    const unmatchedWords = words.filter((w) => !this.wordToTokenIds.has(w));
    for (const w of unmatchedWords) {
      if (w.length >= 3) {
        const s3 = w.slice(0, 3);
        const stemIds = this.stemToTokenIds.get(s3);
        if (stemIds) {
          let count = 0;
          for (const id of stemIds) {
            scoreMap.set(id, (scoreMap.get(id) || 0) + 1.5);
            if (++count >= 50) break;
          }
        }
      }
      if (w.length >= 4) {
        for (let i = 0; i <= w.length - 3; i++) {
          const ng = w.slice(i, i + 3);
          const ngIds = this.ngramToTokenIds.get(ng);
          if (ngIds) {
            let count = 0;
            for (const id of ngIds) {
              scoreMap.set(id, (scoreMap.get(id) || 0) + 0.8);
              if (++count >= 50) break;
            }
          }
        }
      }
    }

    // Collect and sort matching candidates
    const candidates = [];
    for (const [id, score] of scoreMap.entries()) {
      if (score >= minScore) {
        const token = this.tokensById.get(id);
        if (token && token.status !== TokenStatus.MERGED) {
          candidates.push({ token, score });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit).map((c) => c.token);
  }

  getById(id) {
    return this.tokensById.get(Number(id)) || null;
  }

  has(wordOrPhrase) {
    return this.lookup(wordOrPhrase) !== null;
  }

  hasId(id) {
    return this.tokensById.has(Number(id));
  }

  resolveId(wordOrPhrase) {
    const record = this.lookup(wordOrPhrase);
    return record ? record.id : null;
  }

  /**
   * Resolves an identifier (ID, canonical string, or token object) to a Token record,
   * automatically registering candidate tokens when encountering novel vocabulary.
   * (Sacred Law Compliant: Single Source of Truth for token identity)
   * @param {string|number|object} identifier
   * @param {string} defaultType
   * @returns {object|null}
   */
  resolveOrRegister(identifier, defaultType = TokenType.ENTITY) {
    if (identifier === null || identifier === undefined) return null;
    if (typeof identifier === 'number') {
      return this.tokensById.get(identifier) || { id: identifier, canonical: `Token #${identifier}`, type: defaultType };
    }
    if (typeof identifier === 'object' && identifier.id !== undefined) {
      if (defaultType && defaultType !== TokenType.ENTITY && (identifier.type === TokenType.ENTITY || identifier.type === TokenType.CONCEPT)) {
        identifier.type = defaultType;
      }
      return identifier;
    }
    const str = String(identifier).trim();
    if (!str) return null;

    if (/^\d+$/.test(str)) {
      const numId = Number(str);
      const existing = this.tokensById.get(numId);
      if (existing) {
        if (defaultType && defaultType !== TokenType.ENTITY && (existing.type === TokenType.ENTITY || existing.type === TokenType.CONCEPT)) {
          existing.type = defaultType;
        }
        return existing;
      }
    }

    // 1. Direct canonical / alias lookup
    const direct = this.lookup(str);
    if (direct) {
      if (defaultType && defaultType !== TokenType.ENTITY && (direct.type === TokenType.ENTITY || direct.type === TokenType.CONCEPT)) {
        direct.type = defaultType;
      }
      return direct;
    }

    // 2. Taxonomic Decomposition & Morphological Derivation
    const decomp = defaultEntityCanonicalizer.decomposeTaxonomicPhrase(str, defaultType);
    const candidateCanon = decomp.canonical;
    const targetType = decomp.semanticType || defaultType;

    // 3. Look up by decomposed canonical root
    if (candidateCanon && candidateCanon.toLowerCase() !== str.toLowerCase()) {
      const existingRoot = this.lookup(candidateCanon);
      if (existingRoot) {
        // Validate boundary / semantic equivalence
        if (defaultEntityCanonicalizer.areSemanticallyEquivalent(existingRoot, { canonical: candidateCanon, type: targetType })) {
          if (targetType && targetType !== TokenType.ENTITY && (existingRoot.type === TokenType.ENTITY || existingRoot.type === TokenType.CONCEPT)) {
            existingRoot.type = targetType;
          }
          this._attachAlias(existingRoot, str);
          for (const alias of decomp.aliases) {
            this._attachAlias(existingRoot, alias);
          }
          return existingRoot;
        }
      }
    }

    // 4. Register new canonical entity with proper aliases & type
    return this.register({
      canonical: candidateCanon || str,
      type: targetType,
      aliases: decomp.aliases,
    });
  }

  _attachAlias(token, aliasStr) {
    if (!token || !aliasStr) return;
    const cleanAlias = defaultEntityCanonicalizer.cleanSurfaceForm(aliasStr);
    if (!cleanAlias || cleanAlias.toLowerCase() === (token.canonical || '').toLowerCase()) return;

    if (!Array.isArray(token.aliases)) {
      token.aliases = [];
    }
    const normAlias = this._normalize(cleanAlias);
    if (!token.aliases.some((a) => this._normalize(a) === normAlias)) {
      token.aliases.push(cleanAlias);
      this.aliases.set(normAlias, token.id);
      this._addIndexTerms(cleanAlias, token.id);
      this._persistRecord(token);
    }
  }

  _cleanCanonical(str) {
    return defaultEntityCanonicalizer.cleanSurfaceForm(str) || (str ? str.trim() : '');
  }

  register({
    canonical,
    type = TokenType.CONCEPT,
    status = TokenStatus.ACTIVE,
    aliases = [],
    id: customId = null,
    metadata = {},
  }) {
    if (!canonical || !canonical.trim()) {
      throw new Error('Canonical concept name is required.');
    }

    const decomp = defaultEntityCanonicalizer.decomposeTaxonomicPhrase(canonical, type);
    const cleanCanonical = decomp.canonical || this._cleanCanonical(canonical);
    const finalType = decomp.semanticType || type;

    const existing = this.lookup(cleanCanonical) || this.lookup(canonical);
    if (existing) {
      if (finalType && finalType !== TokenType.ENTITY && (existing.type === TokenType.ENTITY || existing.type === TokenType.CONCEPT)) {
        existing.type = finalType;
      }
      for (const a of [...aliases, ...decomp.aliases, canonical]) {
        this._attachAlias(existing, a);
      }
      return existing;
    }

    let id = customId ? Number(customId) : this.getNextId();
    if (this.tokensById.has(id)) {
      if (customId) {
        throw new Error(`Token ID ${customId} is already in use.`);
      }
      id = this.getNextId();
    }

    const combinedAliases = Array.from(new Set([
      ...aliases.map((a) => this._cleanCanonical(a)),
      ...decomp.aliases.map((a) => this._cleanCanonical(a)),
      this._cleanCanonical(canonical),
    ])).filter((a) => a && a.toLowerCase() !== cleanCanonical.toLowerCase());

    const record = {
      id,
      canonical: cleanCanonical,
      type: finalType,
      status,
      aliases: combinedAliases,
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this._indexRecord(record, true);
    return record;
  }

  merge(sourceId, targetId) {
    const source = this.getById(sourceId);
    const target = this.getById(targetId);

    if (!source || !target) {
      throw new Error(`Cannot merge: Token ${sourceId} or ${targetId} not found.`);
    }
    if (sourceId === targetId) return target;

    // Remove source terms from pointing to old ID
    this._removeIndexTerms(source.canonical, source.id);
    if (Array.isArray(source.aliases)) {
      for (const a of source.aliases) {
        this._removeIndexTerms(a, source.id);
      }
    }

    source.aliasOf = target.id;
    source.status = TokenStatus.MERGED;
    source.updatedAt = new Date().toISOString();

    if (!target.aliases.includes(source.canonical)) {
      target.aliases.push(source.canonical);
      target.updatedAt = new Date().toISOString();
    }

    const normSource = this._normalize(source.canonical);
    this.aliases.set(normSource, target.id);
    this.canonicalToId.set(normSource, target.id);

    // Re-index source terms pointing to new targetId
    this._addIndexTerms(source.canonical, target.id);
    if (Array.isArray(source.aliases)) {
      for (const a of source.aliases) {
        this._addIndexTerms(a, target.id);
      }
    }

    this._persistRecord(source);
    this._persistRecord(target);

    return target;
  }

  /**
   * Records an unverified word/phrase observation as a CANDIDATE token
   */
  recordCandidate(wordOrPhrase, { source = 'llm_observation', type = TokenType.CONCEPT, metadata = {} } = {}) {
    if (!wordOrPhrase || typeof wordOrPhrase !== 'string' || !wordOrPhrase.trim()) {
      return null;
    }
    const clean = wordOrPhrase.trim();
    const existing = this.lookup(clean);
    if (existing) {
      if (existing.status === TokenStatus.CANDIDATE) {
        existing.metadata = existing.metadata || {};
        existing.metadata.observationCount = (existing.metadata.observationCount || 1) + 1;
        existing.metadata.lastObservedAt = new Date().toISOString();
        existing.updatedAt = new Date().toISOString();
        this._persistRecord(existing);
      }
      return existing;
    }

    const token = this.register({
      canonical: clean,
      type,
      status: TokenStatus.CANDIDATE,
      metadata: {
        ...metadata,
        source,
        observationCount: 1,
        firstObservedAt: new Date().toISOString(),
        lastObservedAt: new Date().toISOString(),
      },
    });

    return token;
  }

  /**
   * Promotes a CANDIDATE token to ACTIVE status once evidence threshold is satisfied
   */
  promoteCandidate(wordOrPhrase, { threshold = 3, force = false } = {}) {
    const token = this.lookup(wordOrPhrase);
    if (!token) return null;
    if (token.status === TokenStatus.ACTIVE) return token;

    const count = token.metadata?.observationCount || 1;
    if (force || count >= threshold) {
      token.status = TokenStatus.ACTIVE;
      token.updatedAt = new Date().toISOString();
      token.metadata = token.metadata || {};
      token.metadata.promotedAt = new Date().toISOString();
      this._persistRecord(token);
    }

    return token;
  }

  /**
   * Retrieves all candidate tokens pending promotion
   */
  getCandidates() {
    return Array.from(this.tokensById.values()).filter((t) => t.status === TokenStatus.CANDIDATE);
  }

  getById(id) {
    return this.tokensById.get(Number(id)) || this.tokensById.get(id) || null;
  }

  getAll() {
    return this.getAllTokens();
  }

  getAllTokens() {
    return Array.from(this.tokensById.values());
  }

  get size() {
    return this.tokensById.size;
  }
}

export const defaultTokenRegistry = new TokenRegistry();
export default defaultTokenRegistry;
