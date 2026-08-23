import { JarvisNeuralCore } from './JarvisNeuralCore.js';

/**
 * ModularExpertSpawner: Dynamically instantiates, initializes, and trains
 * capability-specific modular expert networks (Δθ) attached to the base neural core.
 * (Sacred Law Compliant: Zero hardcoding, preserves base knowledge via isolated delta parameters)
 */
export class ModularExpertSpawner {
  constructor({ baseModel, tokenizer } = {}) {
    this.baseModel = baseModel;
    this.tokenizer = tokenizer;
    this.experts = new Map(); // Map<expertId, { model, capability, metadata }>
    this.routingTable = new Map(); // Map<keyword/pattern, expertId>
  }

  /**
   * Spawns a new modular expert network (Δθ)
   * @param {string} expertId
   * @param {object} options
   * @returns {JarvisNeuralCore}
   */
  spawnExpert(expertId, { capability = 'general', dModel = 32, maxSeqLen = 256, learningRate = 0.005 } = {}) {
    const id = (expertId || `expert_${Date.now()}`).toLowerCase().trim();

    if (this.experts.has(id)) {
      return this.experts.get(id).model;
    }

    const expertModel = new JarvisNeuralCore({
      vocabSize: this.tokenizer ? this.tokenizer.vocabSize : 260,
      dModel,
      maxSeqLen,
      learningRate,
    });

    this.experts.set(id, {
      id,
      capability,
      model: expertModel,
      createdAt: new Date().toISOString(),
      trainingLossHistory: [],
    });

    return expertModel;
  }

  /**
   * Registers routing patterns/capabilities to a specific expert
   */
  registerRoute(pattern, expertId) {
    const p = (pattern || '').toLowerCase().trim();
    const id = (expertId || '').toLowerCase().trim();
    if (p && this.experts.has(id)) {
      this.routingTable.set(p, id);
    }
  }

  /**
   * Resolves the best expert for a given prompt (or falls back to base model)
   */
  route(promptText) {
    if (!promptText) return this.baseModel;

    const lower = promptText.toLowerCase();
    for (const [pattern, expertId] of this.routingTable.entries()) {
      if (lower.includes(pattern)) {
        const expert = this.experts.get(expertId);
        if (expert) return expert.model;
      }
    }

    return this.baseModel;
  }

  /**
   * Trains a specific expert on its domain dataset (Base model remains frozen)
   */
  trainExpert(expertId, trainBatch, { epochs = 40 } = {}) {
    const expert = this.experts.get(expertId.toLowerCase().trim());
    if (!expert) throw new Error(`Expert ${expertId} not found`);

    const model = expert.model;
    for (let ep = 1; ep <= epochs; ep++) {
      for (const b of trainBatch) {
        const { grads } = model.lossAndGrad(b.input, b.target);
        model.step(grads);
      }
    }

    let finalLoss = 0;
    for (const b of trainBatch) {
      const { loss } = model.lossAndGrad(b.input, b.target);
      finalLoss += loss;
    }
    finalLoss /= trainBatch.length;
    expert.trainingLossHistory.push(finalLoss);

    return { expertId, finalLoss };
  }

  /**
   * Calculates total parameters across base model + all spawned modular experts
   */
  getTotalParameters() {
    let total = 0;
    const countParams = (model) => {
      if (!model || !model.weights) return 0;
      return Object.values(model.weights).reduce((acc, tensor) => acc + tensor.length, 0);
    };

    if (this.baseModel) {
      total += countParams(this.baseModel);
    }

    for (const expert of this.experts.values()) {
      total += countParams(expert.model);
    }

    return total;
  }
}

export const defaultModularExpertSpawner = new ModularExpertSpawner();
export default defaultModularExpertSpawner;
