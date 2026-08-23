import { defaultMongoBrainMemoryStore } from '../providers/MongoBrainMemoryStore.js';
import { defaultTokenEngine } from '../tokens/TokenEngine.js';

export class MemoryStore {
  constructor({ brainMemory, tokenEngine } = {}) {
    this.brainMemory = brainMemory || defaultMongoBrainMemoryStore;
    this.tokenEngine = tokenEngine || defaultTokenEngine;
  }

  async retrieve(ctx) {
    if (!ctx.utterance) return ctx;

    const query = ctx.utterance.trim();

    // 1. Process tokens via TokenEngine
    const tokenResult = await this.tokenEngine.process(query, { useAI: false });
    ctx.tokens = tokenResult.tokens;

    // 2. Lookup relevant learned procedures/facts from MongoDB Brain
    const facts = await this.brainMemory.search(query, 5);
    ctx.relevantMemory = facts;

    ctx.log('MemoryStore', 'Retrieved relevant memories & tokens', {
      tokens: tokenResult.tokens.length,
      memories: facts.length,
    });

    return ctx;
  }
}

export default MemoryStore;
