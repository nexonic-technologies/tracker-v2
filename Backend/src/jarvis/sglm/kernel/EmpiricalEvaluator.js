import { IEvaluator } from '../core/Contracts.js';

/**
 * EmpiricalEvaluator
 * Evaluates generalization, perplexity, and relational accuracy against benchmarks.
 * (Zero Hardcoding: Operates strictly over arbitrary benchmark arrays)
 */
export class EmpiricalEvaluator extends IEvaluator {
  constructor({ tokenizer } = {}) {
    super();
    this.tokenizer = tokenizer;
  }

  /**
   * Evaluates model on benchmark dataset
   * @param {IModel} model
   * @param {Array<{ input: number[], target: number[], expectedTokenId?: number }>} benchmark
   * @returns {{ accuracy: number, perplexity: number, meanLoss: number, totalSamples: number }}
   */
  evaluate(model, benchmark) {
    if (!model || !Array.isArray(benchmark) || benchmark.length === 0) {
      return { accuracy: 0, perplexity: Infinity, meanLoss: Infinity, totalSamples: 0 };
    }

    let correct = 0;
    let totalLoss = 0;

    for (const item of benchmark) {
      const { logits } = model.forward(item.input);
      const T = item.input.length;
      const v = model.vocabSize;
      const lastOffset = (T - 1) * v;

      // Extract greedy prediction
      let maxLogit = -Infinity;
      let predictedToken = 0;
      for (let c = 0; c < v; c++) {
        if (logits[lastOffset + c] > maxLogit) {
          maxLogit = logits[lastOffset + c];
          predictedToken = c;
        }
      }

      // Target token at final position
      const expected = item.expectedTokenId !== undefined
        ? item.expectedTokenId
        : (item.target ? item.target[item.target.length - 1] : -1);

      if (predictedToken === expected) {
        correct++;
      }

      // Calculate cross-entropy for sequence
      const { loss } = model.lossAndGrad(item.input, item.target);
      totalLoss += loss;
    }

    const meanLoss = totalLoss / benchmark.length;
    const accuracy = correct / benchmark.length;
    const perplexity = Math.exp(Math.min(meanLoss, 20));

    return {
      accuracy,
      perplexity,
      meanLoss,
      totalSamples: benchmark.length,
    };
  }
}
