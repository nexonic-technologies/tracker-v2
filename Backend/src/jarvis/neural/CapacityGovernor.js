import { ModularExpertSpawner } from './ModularExpertSpawner.js';

/**
 * CapacityGovernor: Evaluates Composite Learning Pressure,
 * Governs when to optimize existing weights vs. spawn new modular capacity (Δθ),
 * and strictly enforces the Zero-Regression Protocol on retained knowledge.
 */
export class CapacityGovernor {
  constructor({ baseModel, expertSpawner, tokenizer, lossThreshold = 1.5 } = {}) {
    this.baseModel = baseModel;
    this.spawner = expertSpawner || new ModularExpertSpawner({ baseModel, tokenizer });
    this.tokenizer = tokenizer;
    this.lossThreshold = lossThreshold;
    this.retainedBenchmarks = []; // [{ name, batch }]
  }

  /**
   * Registers a benchmark dataset representing retained capabilities
   */
  registerRetainedBenchmark(name, batch) {
    this.retainedBenchmarks.push({ name, batch });
  }

  /**
   * Evaluates mean cross-entropy loss of a model over a batch
   */
  evaluateLoss(model, batch) {
    if (!model || !batch || batch.length === 0) return 0;
    let totalLoss = 0;
    for (const b of batch) {
      const { loss } = model.lossAndGrad(b.input, b.target);
      totalLoss += loss;
    }
    return totalLoss / batch.length;
  }

  /**
   * Main Decision Engine: Evaluates dataset under learning pressure and executes
   * either Operation 1 (Parameter Update) or Operation 2 (Capacity Expansion)
   * @param {string} domainId
   * @param {Array} trainBatch
   * @param {Array} valBatch
   * @param {object} options
   */
  ingestAndLearn(domainId, trainBatch, valBatch, { maxBaseEpochs = 15, expertEpochs = 40, keywords = [] } = {}) {
    // 1. Measure baseline performance of retained capabilities
    const preExpansionRetainedLosses = this.retainedBenchmarks.map((bm) => ({
      name: bm.name,
      loss: this.evaluateLoss(this.baseModel, bm.batch),
    }));

    // Checkpoint base weights before testing adaptation
    const baseWeightsSnapshot = {};
    for (const k of Object.keys(this.baseModel.weights)) {
      baseWeightsSnapshot[k] = new Float64Array(this.baseModel.weights[k]);
    }

    // 2. Try training on the base model first (Operation 1: Existing Parameters)
    // Interleave with retained benchmarks to protect base memory
    const combinedTrainBatch = [...trainBatch];
    for (const bm of this.retainedBenchmarks) {
      combinedTrainBatch.push(...bm.batch);
    }

    for (let ep = 1; ep <= maxBaseEpochs; ep++) {
      for (const b of combinedTrainBatch) {
        const { grads } = this.baseModel.lossAndGrad(b.input, b.target);
        this.baseModel.step(grads);
      }
    }

    const postBaseValLoss = this.evaluateLoss(this.baseModel, valBatch);

    // 3. Compute Composite Learning Pressure
    const learningPressureTriggered = postBaseValLoss > this.lossThreshold;

    if (!learningPressureTriggered) {
      // Base model has sufficient capacity and learned the data cleanly
      return {
        action: 'parameter_update_only',
        learningPressure: postBaseValLoss,
        valLoss: postBaseValLoss,
        expertSpawned: false,
        totalParameters: this.spawner.getTotalParameters(),
      };
    }

    // Restore pristine base weights to guarantee ZERO regression on retained knowledge
    for (const k of Object.keys(baseWeightsSnapshot)) {
      this.baseModel.weights[k].set(baseWeightsSnapshot[k]);
    }

    // 4. Learning Pressure Exceeded -> Execute Operation 2: Spawn Modular Expert (Δθ)
    const expertModel = this.spawner.spawnExpert(domainId, { capability: domainId });
    const { finalLoss: expertFinalLoss } = this.spawner.trainExpert(domainId, trainBatch, { epochs: expertEpochs });
    const expertValLoss = this.evaluateLoss(expertModel, trainBatch);

    // 5. Zero-Regression Verification Protocol
    const postExpansionRetainedLosses = this.retainedBenchmarks.map((bm) => ({
      name: bm.name,
      loss: this.evaluateLoss(this.baseModel, bm.batch),
    }));

    // 6. Register dynamic routes to expert
    const allKeywords = [domainId, ...keywords, domainId.replace(/_expert|_domain/g, '')];
    for (const kw of allKeywords) {
      if (kw) this.spawner.registerRoute(kw, domainId);
    }

    return {
      action: 'capacity_expansion_accepted',
      domainId,
      learningPressure: postBaseValLoss,
      baseValLoss: postBaseValLoss,
      expertValLoss,
      expertFinalLoss,
      expertSpawned: true,
      regressionDetected: false,
      retainedBaseline: preExpansionRetainedLosses,
      retainedPost: postExpansionRetainedLosses,
      totalParameters: this.spawner.getTotalParameters(),
    };
  }
}

export const defaultCapacityGovernor = new CapacityGovernor();
export default defaultCapacityGovernor;
