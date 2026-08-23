import { getGlobalModels } from '../../models/global/index.js';

export class MongoBrainMemoryStore {
  constructor() {
    this.facts = [];
    this.isLoaded = false;
    this.init();
  }

  get model() {
    return getGlobalModels().JarvisMemory;
  }

  async init() {
    try {
      await this.load();
    } catch (err) {
      console.warn('[MongoBrainMemoryStore] Init notice:', err.message);
    }
  }

  async load() {
    try {
      if (!this.model) return;
      const records = await this.model.find({ status: { $ne: 'deprecated' } }).lean();
      this.facts = records.map((r) => ({
        id: r.id,
        type: r.type,
        content: r.content,
        tags: r.tags || [],
        confidence: r.confidence || 0.8,
        status: r.status || 'active',
      }));
      this.isLoaded = true;
    } catch (err) {}
  }

  async save(fact) {
    const memoryRecord = {
      id: fact.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: fact.type || 'FACT',
      content: fact.content,
      tags: fact.tags || [],
      confidence: fact.confidence || 0.8,
      status: fact.status || 'active',
    };

    // Update in-memory cache
    const existingIndex = this.facts.findIndex((f) => f.id === memoryRecord.id);
    if (existingIndex !== -1) {
      this.facts[existingIndex] = memoryRecord;
    } else {
      this.facts.push(memoryRecord);
    }

    // Persist to Global MongoDB
    if (this.model) {
      this.model.updateOne(
        { id: memoryRecord.id },
        {
          $set: {
            type: memoryRecord.type,
            content: memoryRecord.content,
            tags: memoryRecord.tags,
            confidence: memoryRecord.confidence,
            status: memoryRecord.status,
            lastAccessedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      ).catch((err) => {
        console.warn('[MongoBrainMemoryStore] Persist error:', err.message);
      });
    }

    return memoryRecord;
  }

  async search(query, limit = 5) {
    if (!query) return [];
    const lower = query.toLowerCase();
    const words = lower.split(/\s+/).filter((w) => w.length > 2);

    const scored = this.facts
      .map((fact) => {
        let score = 0;
        const serialized = JSON.stringify(fact.content).toLowerCase();

        for (const word of words) {
          if (fact.tags.some((t) => t.toLowerCase().includes(word))) score += 3;
          if (serialized.includes(word)) score += 1;
        }

        return { fact, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.fact);

    return scored;
  }

  async getById(id) {
    const mem = this.facts.find((f) => f.id === id);
    if (mem) return mem;
    if (this.model) {
      return await this.model.findOne({ id }).lean();
    }
    return null;
  }
}

export const defaultMongoBrainMemoryStore = new MongoBrainMemoryStore();
export default defaultMongoBrainMemoryStore;
