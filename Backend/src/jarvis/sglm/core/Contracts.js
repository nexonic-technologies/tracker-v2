/**
 * SGLM Core Contracts (Zero Conceptual Debt)
 * Invariant scientific interfaces for the Self-Growing Language Model.
 * Implementation engines may evolve, but these typed contracts remain permanent.
 */

/**
 * @typedef {Object} TokenizerOptions
 * @property {boolean} [addBos]
 * @property {boolean} [addEos]
 */

/**
 * 1. ITokenizer Contract
 * Deterministic string <-> token sequence mapping.
 */
export class ITokenizer {
  /**
   * Encodes raw text into token IDs
   * @param {string} text
   * @param {TokenizerOptions} [options]
   * @returns {number[]}
   */
  encode(text, options = {}) {
    throw new Error('ITokenizer.encode must be implemented');
  }

  /**
   * Decodes token IDs back into string
   * @param {number[]} tokenIds
   * @returns {string}
   */
  decode(tokenIds) {
    throw new Error('ITokenizer.decode must be implemented');
  }

  /**
   * @returns {number}
   */
  get vocabSize() {
    throw new Error('ITokenizer.vocabSize getter must be implemented');
  }
}

/**
 * 2. IModel Contract
 * Forward inference and analytical loss/gradient computation.
 */
export class IModel {
  /**
   * Forward pass through network
   * @param {number[]} tokenIds
   * @returns {{ logits: Float64Array, cache: Object }}
   */
  forward(tokenIds) {
    throw new Error('IModel.forward must be implemented');
  }

  /**
   * Evaluates loss and computes analytical gradients
   * @param {number[]} inputTokens
   * @param {number[]} targetTokens
   * @returns {{ loss: number, grads: Object }}
   */
  lossAndGrad(inputTokens, targetTokens) {
    throw new Error('IModel.lossAndGrad must be implemented');
  }

  /**
   * @returns {{ total: number, active: number, trainable: number }}
   */
  get parameterCount() {
    throw new Error('IModel.parameterCount getter must be implemented');
  }
}

/**
 * 3. ITrainer Contract
 * Step-level parameter optimization and momentum management.
 */
export class ITrainer {
  /**
   * Performs optimization step using analytical gradients
   * @param {Object} grads
   */
  step(grads) {
    throw new Error('ITrainer.step must be implemented');
  }

  /**
   * Trains a batch of input/target pairs
   * @param {{ input: number[], target: number[] }[]} batch
   * @returns {{ meanLoss: number }}
   */
  trainBatch(batch) {
    throw new Error('ITrainer.trainBatch must be implemented');
  }

  /**
   * @returns {number}
   */
  get currentStep() {
    throw new Error('ITrainer.currentStep getter must be implemented');
  }
}

/**
 * 4. IEvaluator Contract
 * Multi-dimensional capability and retention measurement.
 */
export class IEvaluator {
  /**
   * Evaluates model against a benchmark dataset
   * @param {IModel} model
   * @param {Array<{ input: number[], target: number[] }>} benchmark
   * @returns {{ accuracy: number, perplexity: number, meanLoss: number }}
   */
  evaluate(model, benchmark) {
    throw new Error('IEvaluator.evaluate must be implemented');
  }
}

/**
 * 5. IGrowthGovernor Contract
 * Evidence-based capacity expansion.
 */
export class IGrowthGovernor {
  /**
   * Evaluates composite learning pressure Φ
   * @param {Object} history
   * @returns {{ shouldGrow: boolean, strategy?: string, pressure: number }}
   */
  evaluateLearningPressure(history) {
    throw new Error('IGrowthGovernor.evaluateLearningPressure must be implemented');
  }

  /**
   * Expands capacity under Functional Preservation Initialization
   * @param {IModel} model
   * @param {string} strategy
   * @returns {{ newModel: IModel, deltaParameters: number }}
   */
  expandCapacity(model, strategy) {
    throw new Error('IGrowthGovernor.expandCapacity must be implemented');
  }
}
