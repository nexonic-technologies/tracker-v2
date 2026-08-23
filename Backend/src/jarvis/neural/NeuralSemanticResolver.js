import { defaultJarvisNeuralCore } from './JarvisNeuralCore.js';
import { defaultJarvisTokenizer } from './JarvisTokenizer.js';

/**
 * NeuralSemanticResolver
 * Bridges trained causal Transformer weights (θ) directly into runtime query inference.
 * (Sacred Law Compliant: Zero hardcoded synonym maps, 100% parameter-driven generation & scoring)
 */
export class NeuralSemanticResolver {
  constructor({ neuralCore, tokenizer } = {}) {
    this.neuralCore = neuralCore || defaultJarvisNeuralCore;
    this.tokenizer = tokenizer || defaultJarvisTokenizer;
  }

  /**
   * Evaluates an utterance purely through the trained Transformer parameters θ
   * @param {string} utterance
   * @param {object} options
   * @returns {{ resolved: boolean, answer: string, confidence: number, source: string, trace: object }}
   */
  resolve(utterance, { minConfidence = 0.35, maxNewTokens = 20 } = {}) {
    if (!utterance || typeof utterance !== 'string') {
      return { resolved: false, answer: '', confidence: 0, source: 'none' };
    }

    const promptTokens = this.tokenizer.encode(utterance.trim(), { addBos: true });
    if (promptTokens.length === 0) {
      return { resolved: false, answer: '', confidence: 0, source: 'none' };
    }

    // 1. Forward Pass to assess next-token probability distribution and entropy
    const { logits } = this.neuralCore.forward(promptTokens);
    const T = promptTokens.length;
    const v = this.neuralCore.vocabSize;
    const lastLogitsOffset = (T - 1) * v;

    // Softmax over final token position
    let maxLogit = -Infinity;
    for (let c = 0; c < v; c++) {
      if (logits[lastLogitsOffset + c] > maxLogit) {
        maxLogit = logits[lastLogitsOffset + c];
      }
    }

    let sumExp = 0;
    const probs = new Float64Array(v);
    for (let c = 0; c < v; c++) {
      probs[c] = Math.exp(logits[lastLogitsOffset + c] - maxLogit);
      sumExp += probs[c];
    }
    for (let c = 0; c < v; c++) {
      probs[c] /= sumExp;
    }

    // Top token probability represents initial activation confidence
    let topProb = 0;
    let topToken = 0;
    for (let c = 0; c < v; c++) {
      if (probs[c] > topProb) {
        topProb = probs[c];
        topToken = c;
      }
    }

    // 2. Greedy autoregressive generation from trained weights θ with per-step sequence probability
    const tokens = Array.from(promptTokens);
    const generatedSteps = [];
    const eosToken = this.tokenizer.specialTokens['<|eos|>'];
    let sumStepProbs = 0;

    for (let step = 0; step < maxNewTokens; step++) {
      const { logits: stepLogits } = this.neuralCore.forward(tokens);
      const stepT = tokens.length;
      const stepOffset = (stepT - 1) * v;

      let stepMaxLogit = -Infinity;
      for (let c = 0; c < v; c++) {
        if (stepLogits[stepOffset + c] > stepMaxLogit) {
          stepMaxLogit = stepLogits[stepOffset + c];
        }
      }

      let stepSumExp = 0;
      const stepProbs = new Float64Array(v);
      for (let c = 0; c < v; c++) {
        stepProbs[c] = Math.exp(stepLogits[stepOffset + c] - stepMaxLogit);
        stepSumExp += stepProbs[c];
      }
      for (let c = 0; c < v; c++) {
        stepProbs[c] /= stepSumExp;
      }

      let bestToken = 0;
      let bestTokenProb = 0;
      for (let c = 0; c < v; c++) {
        if (stepProbs[c] > bestTokenProb) {
          bestTokenProb = stepProbs[c];
          bestToken = c;
        }
      }

      if (bestToken === eosToken) break;
      tokens.push(bestToken);
      generatedSteps.push({ token: bestToken, prob: bestTokenProb });
      sumStepProbs += bestTokenProb;
    }

    const fullDecoded = this.tokenizer.decode(tokens);
    const promptDecoded = this.tokenizer.decode(promptTokens);
    
    // Extract newly generated completion
    let completion = fullDecoded.slice(promptDecoded.length).trim();
    completion = completion.replace(/[.\n\r]+$/, '').trim();

    const avgSeqProb = generatedSteps.length > 0 ? (sumStepProbs / generatedSteps.length) : 0;
    const hasRepeatedFragments = /(.)\1{3,}|(\w{2,})\2{2,}/i.test(completion);
    const hasPunctuationSpam = /([.?,\s-]){2,}/.test(completion);
    const isGarbled = completion.length < 3 || hasRepeatedFragments || hasPunctuationSpam || !/^[A-Z0-9]/.test(completion);

    // High bar for neural factual recall without hallucination
    const isConfident = avgSeqProb >= 0.88 && !isGarbled && completion.length >= 3;

    const trace = {
      query: utterance,
      avgSeqProb: avgSeqProb.toFixed(4),
      completion,
      isConfident,
      source: 'neural_core',
    };

    return {
      resolved: isConfident,
      answer: completion,
      confidence: avgSeqProb,
      source: 'neural_core',
      trace,
    };
  }
}

export const defaultNeuralSemanticResolver = new NeuralSemanticResolver();
export default defaultNeuralSemanticResolver;
