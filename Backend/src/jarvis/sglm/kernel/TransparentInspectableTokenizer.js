import { ITokenizer } from '../core/Contracts.js';

/**
 * TransparentInspectableTokenizer
 * Implements ITokenizer with dynamic vocabulary registration.
 * (Zero Hardcoding: Dynamic vocabulary discovery with special token offsets)
 */
export class TransparentInspectableTokenizer extends ITokenizer {
  constructor({ initialTokens = [] } = {}) {
    super();
    this.tokenToId = new Map();
    this.idToToken = new Map();
    this.nextId = 0;

    // Invariant Special Tokens
    this.PAD = this._registerToken('<|pad|>');
    this.BOS = this._registerToken('<|bos|>');
    this.EOS = this._registerToken('<|eos|>');
    this.UNK = this._registerToken('<|unk|>');

    // Seed initial tokens if provided
    for (const t of initialTokens) {
      this._registerToken(t);
    }
  }

  _registerToken(tokenStr) {
    if (!tokenStr || typeof tokenStr !== 'string') return this.UNK;
    const clean = tokenStr.trim();
    if (this.tokenToId.has(clean)) {
      return this.tokenToId.get(clean);
    }
    const id = this.nextId++;
    this.tokenToId.set(clean, id);
    this.idToToken.set(id, clean);
    return id;
  }

  /**
   * Dynamically registers or resolves token ID
   * @param {string} tokenStr
   * @returns {number}
   */
  resolveOrRegister(tokenStr) {
    return this._registerToken(tokenStr);
  }

  /**
   * Imports an exact vocabulary mapping from an array of [token, id] entries
   * @param {Array<[string, number]>} entries
   */
  importVocab(entries) {
    if (!Array.isArray(entries)) return;
    this.tokenToId.clear();
    this.idToToken.clear();
    let maxId = 0;
    for (const [tok, id] of entries) {
      this.tokenToId.set(tok, id);
      this.idToToken.set(id, tok);
      if (id >= maxId) maxId = id + 1;
    }
    this.nextId = maxId;
  }

  get vocabSize() {
    return this.tokenToId.size;
  }

  /**
   * Encodes text into token IDs using whitespace & punctuation boundaries
   * @param {string} text
   * @param {Object} options
   * @returns {number[]}
   */
  encode(text, { addBos = false, addEos = false } = {}) {
    if (!text || typeof text !== 'string') return [];
    
    // Normalize punctuation boundaries
    const normalized = text
      .replace(/([.,!?;:()"])/g, ' $1 ')
      .trim();

    const words = normalized.split(/\s+/).filter(Boolean);
    const ids = [];

    if (addBos) ids.push(this.BOS);

    for (const w of words) {
      if (this.tokenToId.has(w)) {
        ids.push(this.tokenToId.get(w));
      } else {
        // Dynamic discovery: register unseen word dynamically
        ids.push(this._registerToken(w));
      }
    }

    if (addEos) ids.push(this.EOS);
    return ids;
  }

  /**
   * Decodes token IDs back to human-readable string
   * @param {number[]} tokenIds
   * @returns {string}
   */
  decode(tokenIds) {
    if (!Array.isArray(tokenIds)) return '';
    const words = [];
    for (const id of tokenIds) {
      if (id === this.BOS || id === this.EOS || id === this.PAD) continue;
      const word = this.idToToken.get(id) || '<|unk|>';
      words.push(word);
    }
    return words.join(' ').replace(/\s+([.,!?;:])/g, '$1');
  }
}
