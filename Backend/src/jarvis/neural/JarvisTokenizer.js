/**
 * JarvisTokenizer: Compact Subword / Byte-Level Tokenizer for J.A.R.V.I.S.
 * (Sacred Law Compliant: Fixed compact vocabulary, decoupled from BrainDB entity counts)
 */
export class JarvisTokenizer {
  constructor() {
    this.specialTokens = {
      '<|pad|>': 0,
      '<|bos|>': 1,
      '<|eos|>': 2,
      '<|sep|>': 3,
    };

    this.vocabSize = 256 + Object.keys(this.specialTokens).length;
    this.byteOffset = Object.keys(this.specialTokens).length;
  }

  /**
   * Encodes a string into an Int32Array of token IDs
   * @param {string} text
   * @param {object} options
   * @returns {Int32Array}
   */
  encode(text, { addBos = false, addEos = false } = {}) {
    if (!text || typeof text !== 'string') return new Int32Array(0);

    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    const len = bytes.length + (addBos ? 1 : 0) + (addEos ? 1 : 0);
    const tokens = new Int32Array(len);

    let offset = 0;
    if (addBos) {
      tokens[offset++] = this.specialTokens['<|bos|>'];
    }

    for (let i = 0; i < bytes.length; i++) {
      tokens[offset++] = bytes[i] + this.byteOffset;
    }

    if (addEos) {
      tokens[offset++] = this.specialTokens['<|eos|>'];
    }

    return tokens;
  }

  /**
   * Decodes an array of token IDs back into a string
   * @param {Int32Array|Array<number>} tokenIds
   * @returns {string}
   */
  decode(tokenIds) {
    if (!tokenIds || tokenIds.length === 0) return '';

    const validBytes = [];
    for (let i = 0; i < tokenIds.length; i++) {
      const id = tokenIds[i];
      if (id >= this.byteOffset && id < this.vocabSize) {
        validBytes.push(id - this.byteOffset);
      }
    }

    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(new Uint8Array(validBytes));
  }
}

export const defaultJarvisTokenizer = new JarvisTokenizer();
export default defaultJarvisTokenizer;
