/**
 * SGLMBrain.js
 *
 * SGLM Cognitive Brain.
 *
 * Encapsulates the neural transformer model and its native memory interface.
 * External callers (J.A.R.V.I.S. / test runners) interact ONLY with SGLM directly.
 * SGLM autonomously manages its memory contact, retrieval, attention, and storage.
 *
 * Flow:
 * Caller -> SGLM.query(question) -> SGLM accesses Memory -> SGLM Attention -> Result
 *
 * Zero external orchestration. Zero JS if-clause patches.
 */

import { MultiHeadCopyTransformer } from '../kernel/MultiHeadCopyTransformer.js';
import { TransparentInspectableTokenizer } from '../kernel/TransparentInspectableTokenizer.js';
import { defaultMongoBrainMemoryStore } from '../../providers/MongoBrainMemoryStore.js';

export class SGLMBrain {
  /**
   * @param {Object} [options={}]
   * @param {Object} [options.model] - The SGLM neural transformer model
   * @param {Object} [options.tokenizer] - Tokenizer instance
   * @param {Object} [options.memoryStore] - Memory store interface (defaults to defaultMongoBrainMemoryStore)
   * @param {number} [options.seed=101] - Deterministic PRNG seed
   */
  constructor({ model = null, tokenizer = null, memoryStore = null, seed = 101 } = {}) {
    this.tokenizer = tokenizer || new TransparentInspectableTokenizer();

    if (!model) {
      function createRng(s) {
        let a = (s ^ 0x9E3779B9) >>> 0;
        return function () {
          let t = (a += 0x6D2B79F5);
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }

      this.model = new MultiHeadCopyTransformer({
        vocabSize: 256,
        dModel: 64,
        nLayers: 2,
        nHeads: 4,
        nCopyHeads: 2,
        maxSeqLen: 256,
        copyWeight: 1.0,
        positionEncoding: 'rope',
        rng: createRng(seed ^ 0xABCD9876),
        tokenizer: this.tokenizer,
      });
    } else {
      this.model = model;
    }

    this.memoryStore = memoryStore || defaultMongoBrainMemoryStore;
  }

  /**
   * Stores a fact into SGLM's memory.
   * @param {string} factText
   * @param {Object} [metadata={}]
   */
  async store(factText, metadata = {}) {
    if (!this.memoryStore) {
      throw new Error('SGLM Brain: No memory interface available.');
    }
    const record = {
      id: metadata.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: metadata.type || 'FACT',
      content: factText.trim(),
      tags: metadata.tags || [],
      confidence: metadata.confidence || 1.0,
      status: 'active',
    };
    if (typeof this.memoryStore.save === 'function') {
      return await this.memoryStore.save(record);
    }
    if (Array.isArray(this.memoryStore.facts)) {
      this.memoryStore.facts.push(record);
      return record;
    }
    throw new Error('SGLM Brain: Memory store does not support save.');
  }

  /**
   * SGLM internal memory retrieval.
   * SGLM directly queries its memory store for all active knowledge.
   * @returns {Promise<any[]>}
   */
  async retrieveFromMemory() {
    if (globalThis.__SGLM_TRACE__) {
      console.log(`\n[SGLMBrain.retrieveMemory]`);
      console.log(`  * Action: Requesting all active memories from memory store`);
      console.log(`  * Store Type: ${this.memoryStore?.constructor?.name || 'Unknown'}`);
    }
    if (!this.memoryStore) {
      throw new Error('SGLM Brain: No memory interface available.');
    }
    if (typeof this.memoryStore.load === 'function' && !this.memoryStore.isLoaded) {
      await this.memoryStore.load();
    }
    let records = [];
    if (typeof this.memoryStore.getAll === 'function') {
      records = await this.memoryStore.getAll();
    } else if (Array.isArray(this.memoryStore.facts)) {
      records = this.memoryStore.facts;
    }
    if (globalThis.__SGLM_TRACE__) {
      console.log(`  * Memory returned: ${records.length} raw records from database`);
      if (records.length > 0) {
        console.log(`  * First raw record sample: ${JSON.stringify(records[0]?.content || records[0])}`);
      }
    }
    return records;
  }

  /**
   * Converts a raw stored memory record into a compact semantic memory representation.
   * Strips triggers envelopes, response boilerplate, learnedAt, and MongoDB metadata.
   * Keeps strictly the knowledge relevant for reasoning.
   */
  toCompactSemanticFact(item) {
    if (!item) return null;
    let content = item.content !== undefined ? item.content : item;

    // 1. If stored content is a string
    if (typeof content === 'string') {
      let text = content.trim();
      if (text.startsWith('{') && text.endsWith('}')) {
        try {
          content = JSON.parse(text);
        } catch {
          return this._cleanFactString(text);
        }
      } else {
        return this._cleanFactString(text);
      }
    }

    // 2. If stored content is an object (J.A.R.V.I.S. memory record or structured fact)
    if (typeof content === 'object' && content !== null) {
      // Structured triple: { subject, relation, object }
      if (content.subject && content.relation && content.object) {
        return `${content.subject} is ${content.relation} of ${content.object} .`;
      }
      // Explicit fact / text / statement field
      if (content.fact && typeof content.fact === 'string') {
        return this._cleanFactString(content.fact);
      }
      if (content.text && typeof content.text === 'string') {
        return this._cleanFactString(content.text);
      }
      if (content.statement && typeof content.statement === 'string') {
        return this._cleanFactString(content.statement);
      }
      // J.A.R.V.I.S. trigger envelope: { triggers: ["remember this: <fact>"], response: "...", learnedAt: "..." }
      if (Array.isArray(content.triggers) && content.triggers.length > 0) {
        const rawTrigger = content.triggers[0];
        if (typeof rawTrigger === 'string') {
          return this._cleanFactString(rawTrigger);
        }
      }
    }

    return null;
  }

  _cleanFactString(str) {
    if (!str || typeof str !== 'string') return '';
    let cleaned = str.trim();
    // Strip system trigger prefixes and boilerplate
    cleaned = cleaned.replace(/^(remember\s+(this|that)\s*:\s*)/i, '');
    cleaned = cleaned.replace(/^(system\s*:\s*)/i, '');
    cleaned = cleaned.replace(/^(note\s*:\s*)/i, '');
    cleaned = cleaned.trim();
    if (!cleaned) return '';
    // Standardize fact terminal delimiter
    if (!cleaned.endsWith('.')) {
      cleaned += ' .';
    } else if (!cleaned.endsWith(' .')) {
      cleaned = cleaned.slice(0, -1).trim() + ' .';
    }
    return cleaned;
  }

  /**
   * SGLM Direct Query Interface.
   * Caller provides ONLY the raw question.
   * SGLM autonomously contacts its memory, converts to compact semantic knowledge, runs neural attention, and answers.
   *
   * @param {string} questionText - Raw natural-language question
   * @param {Object} [options={}]
   * @returns {Promise<Object>}
   */
  async query(questionText, options = {}) {
    if (globalThis.__SGLM_TRACE__) {
      console.log(`\n[SGLMBrain.query]`);
      console.log(`  * Question entering SGLM: "${questionText}"`);
    }

    // 1. SGLM contacts its memory interface directly (MongoDB)
    const rawMemory = await this.retrieveFromMemory();

    // 2. Measure raw memory token count (all documents with raw metadata)
    const rawMemoryStr = rawMemory
      .map((item) => (typeof item === 'string' ? item : JSON.stringify(item.content || item)))
      .join(' ');
    const rawMemoryTokenCount = this.tokenizer.encode(rawMemoryStr).length;

    // 3. Convert stored memories into compact semantic memory representation
    // Excludes triggers, response boilerplate, learnedAt, MongoDB metadata, system messages
    const compactFacts = rawMemory
      .map((item) => this.toCompactSemanticFact(item))
      .filter(Boolean);

    if (globalThis.__SGLM_TRACE__) {
      console.log(`\n[SGLMBrain.query -> Semantic Memory Representation]`);
      console.log(`  * Raw Memory Documents:   ${rawMemory.length} (Total raw tokens: ${rawMemoryTokenCount})`);
      console.log(`  * Compact Semantic Facts: ${compactFacts.length} facts derived`);
      console.log(`  * Exact memory representation passed onward:`);
      compactFacts.forEach((f, idx) => console.log(`     [Fact ${String(idx + 1).padStart(2)}] ${f}`));
    }

    if (compactFacts.length === 0) {
      return {
        query: questionText,
        rawMemoryTokenCount,
        compactMemoryTokenCount: 0,
        memoryFactsCount: 0,
        predictedAnswer: null,
        confidence: 0,
        truncated: false,
        notice: 'Memory is empty. SGLM found no stored memories.',
      };
    }

    // 4. Construct compact semantic memory context
    const compactMemoryText = compactFacts.join(' ');
    const contextTokens = this.tokenizer.encode(compactMemoryText, { addBos: true });
    const compactMemoryTokenCount = contextTokens.length;

    // 5. Construct full prompt: [compact semantic memory] + [question]
    const fullPrompt = `${compactMemoryText} ${questionText}`;
    const tokenIds = this.tokenizer.encode(fullPrompt, { addBos: true });
    const querySpan = [contextTokens.length, tokenIds.length - 1];
    const totalTokens = tokenIds.length;
    const truncated = totalTokens > this.model.maxSeqLen;
    const questionSpan = [contextTokens.length, tokenIds.length - 1];

    if (globalThis.__SGLM_TRACE__) {
      console.log(`\n[Tokenizer.encode]`);
      console.log(`  * Sequence length: ${totalTokens} tokens (Window limit: ${this.model.maxSeqLen})`);
      console.log(`  * Context Span:    [0 .. ${contextTokens.length - 1}] (${contextTokens.length} tokens)`);
      console.log(`  * Question Span:   [${querySpan[0]} .. ${querySpan[1]}] (${querySpan[1] - querySpan[0] + 1} tokens)`);
      console.log(`  * Question Tokens with Positions:`);
      for (let pos = querySpan[0]; pos <= querySpan[1]; pos++) {
        const id = tokenIds[pos];
        const tok = this.tokenizer.decode([id]).trim();
        console.log(`     pos ${pos}: "${tok}" (token_id: ${id})`);
      }
    }

    // 6. Strict Truncation Boundary: If truncation occurs, FAIL immediately. Do not truncate the question.
    if (truncated) {
      return {
        query: questionText,
        rawMemoryTokenCount,
        compactMemoryTokenCount,
        questionSpan,
        totalTokens,
        maxSeqLen: this.model.maxSeqLen,
        truncated: true,
        failed: true,
        error: `TRUNCATION DETECTED: Sequence length (${totalTokens}) exceeds model limit (${this.model.maxSeqLen}). Question would be truncated.`,
        predictedAnswer: null,
        confidence: 0,
        topCandidates: [],
        compactFacts,
      };
    }

    // 7. Calculate token spans and map fact positions
    const factSpans = [];
    let currentTokPos = 1; // start after BOS
    for (let fIdx = 0; fIdx < compactFacts.length; fIdx++) {
      const fStr = compactFacts[fIdx];
      const fToks = this.tokenizer.encode(fStr); // without BOS
      const start = currentTokPos;
      const end = currentTokPos + fToks.length - 1;
      factSpans.push({ index: fIdx + 1, fact: fStr, start, end });
      currentTokPos = end + 1;
    }

    // 8. Neural forward pass: SGLM copy attention resolves the query over compact memory
    const forwardRes = this.model.forward(tokenIds, true, true, true, 20.0, querySpan);
    const { tokenProbs, copyWeights } = forwardRes;
    const T = tokenIds.length;
    const qPos = T - 1;

    // 9. Collect candidate token probabilities (pure neural copy attention)
    const candidates = [];
    for (let c = 0; c < this.model.vocabSize; c++) {
      const p = tokenProbs[qPos * this.model.vocabSize + c];
      candidates.push({ id: c, word: this.tokenizer.decode([c]).trim(), prob: p });
    }
    candidates.sort((a, b) => b.prob - a.prob);

    const predictedAnswer = candidates[0].word;

    if (globalThis.__SGLM_TRACE__) {
      console.log(`\n[AnswerSelection]`);
      console.log(`  * Output position: [${qPos}]`);
      console.log(`  * Top 5 Candidate Tokens from Neural Forward Pass:`);
      candidates.slice(0, 5).forEach((cand, idx) => {
        console.log(`     ${idx + 1}. "${cand.word}" (P = ${(cand.prob * 100).toFixed(2)}%)`);
      });
      console.log(`  * Exact value passed to final answer selection: "${predictedAnswer}" (confidence: ${(candidates[0].prob * 100).toFixed(2)}%)`);
    }

    // 10. Compute attention distribution across individual facts
    const factsWithAttention = factSpans.map((fs) => {
      let factAttentionMass = 0;
      for (let p = fs.start; p <= fs.end; p++) {
        factAttentionMass += copyWeights[qPos * T + p];
      }
      return {
        position: fs.index,
        fact: fs.fact,
        span: [fs.start, fs.end],
        attention: factAttentionMass,
      };
    });

    if (globalThis.__SGLM_TRACE__) {
      const sortedFacts = [...factsWithAttention].sort((a, b) => b.attention - a.attention);
      console.log(`\n[SGLMBrain.query -> Neural Fact Targeting Result]`);
      console.log(`  * Dominant Attended Fact: Fact #${sortedFacts[0]?.position} ("${sortedFacts[0]?.fact}") with ${(sortedFacts[0]?.attention * 100).toFixed(2)}% attention mass`);
      console.log(`  * Top 5 Attended Memory Facts:`);
      sortedFacts.slice(0, 5).forEach((f, i) => {
        console.log(`     ${i + 1}. Fact #${String(f.position).padStart(2)}: "${f.fact}" -> ${(f.attention * 100).toFixed(2)}% attention`);
      });
    }

    return {
      query: questionText,
      rawMemoryTokenCount,
      compactMemoryTokenCount,
      memoryFactsCount: compactFacts.length,
      compactFacts,
      questionSpan,
      totalTokens,
      maxSeqLen: this.model.maxSeqLen,
      truncated: false,
      predictedAnswer,
      confidence: candidates[0].prob,
      topCandidates: candidates.slice(0, 5),
      factsWithAttention,
      tokenProbs,
      copyWeights,
      cache: forwardRes.cache,
    };
  }
}

export default SGLMBrain;
