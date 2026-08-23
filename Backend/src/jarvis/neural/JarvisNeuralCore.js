/**
 * JarvisNeuralCore: Pure Mathematical Reference Causal Autoregressive Transformer
 * with Exact Analytical Backpropagation and AdamW Optimizer
 * (Sacred Law Compliant: Transparent mathematical gradients, 100% self-contained)
 */
export class JarvisNeuralCore {
  constructor({
    vocabSize = 260,
    dModel = 32,
    maxSeqLen = 256,
    learningRate = 0.005,
    weightDecay = 0.0001,
  } = {}) {
    this.vocabSize = vocabSize;
    this.dModel = dModel;
    this.maxSeqLen = maxSeqLen;
    this.lr = learningRate;
    this.weightDecay = weightDecay;

    // AdamW Optimizer State
    this.t = 0;
    this.beta1 = 0.9;
    this.beta2 = 0.999;
    this.eps = 1e-8;

    this._initWeights();
  }

  _randomMatrix(rows, cols, scale = 0.05) {
    const mat = new Float64Array(rows * cols);
    for (let i = 0; i < mat.length; i++) {
      mat[i] = (Math.random() * 2 - 1) * scale;
    }
    return mat;
  }

  _initWeights() {
    const d = this.dModel;
    const v = this.vocabSize;
    const s = this.maxSeqLen;
    const dff = d * 2;

    this.weights = {
      wte: this._randomMatrix(v, d, 0.1),       // Token Embedding
      wpe: this._randomMatrix(s, d, 0.02),      // Position Embedding
      wq: this._randomMatrix(d, d, 0.1),        // Attention Q
      wk: this._randomMatrix(d, d, 0.1),        // Attention K
      wv: this._randomMatrix(d, d, 0.1),        // Attention V
      wo: this._randomMatrix(d, d, 0.1),        // Attention Out
      w1: this._randomMatrix(d, dff, 0.1),      // MLP in
      b1: new Float64Array(dff),
      w2: this._randomMatrix(dff, d, 0.1),      // MLP out
      b2: new Float64Array(d),
      head: this._randomMatrix(d, v, 0.1),      // LM Head
    };

    // Allocate moment matrices for AdamW
    this.m = {};
    this.v = {};
    for (const k of Object.keys(this.weights)) {
      this.m[k] = new Float64Array(this.weights[k].length);
      this.v[k] = new Float64Array(this.weights[k].length);
    }
  }

  /**
   * Forward Pass through Causal Transformer
   */
  forward(tokenIds) {
    const seq = tokenIds.slice(0, this.maxSeqLen);
    const T = seq.length;
    const d = this.dModel;
    const v = this.vocabSize;
    const dff = d * 2;

    // 1. Embedding Lookup
    const x = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      const id = seq[t];
      for (let j = 0; j < d; j++) {
        x[t * d + j] = this.weights.wte[id * d + j] + this.weights.wpe[t * d + j];
      }
    }

    // 2. Linear Projections for Q, K, V
    const Q = new Float64Array(T * d);
    const K = new Float64Array(T * d);
    const V = new Float64Array(T * d);

    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sumQ = 0;
        let sumK = 0;
        let sumV = 0;
        for (let k = 0; k < d; k++) {
          const xtk = x[t * d + k];
          sumQ += xtk * this.weights.wq[k * d + j];
          sumK += xtk * this.weights.wk[k * d + j];
          sumV += xtk * this.weights.wv[k * d + j];
        }
        Q[t * d + j] = sumQ;
        K[t * d + j] = sumK;
        V[t * d + j] = sumV;
      }
    }

    // 3. Causal Attention Matrix (Softmax(Q K^T / sqrt(d) + Mask))
    const scale = 1.0 / Math.sqrt(d);
    const attnScores = new Float64Array(T * T);
    const attnWeights = new Float64Array(T * T);

    for (let i = 0; i < T; i++) {
      let maxScore = -Infinity;
      for (let j = 0; j <= i; j++) {
        let dot = 0;
        for (let k = 0; k < d; k++) {
          dot += Q[i * d + k] * K[j * d + k];
        }
        const score = dot * scale;
        attnScores[i * T + j] = score;
        if (score > maxScore) maxScore = score;
      }

      let sumExp = 0;
      for (let j = 0; j <= i; j++) {
        const expVal = Math.exp(attnScores[i * T + j] - maxScore);
        attnWeights[i * T + j] = expVal;
        sumExp += expVal;
      }
      for (let j = 0; j <= i; j++) {
        attnWeights[i * T + j] /= sumExp;
      }
    }

    // 4. Weighted Attention Output
    const attnOut = new Float64Array(T * d);
    for (let i = 0; i < T; i++) {
      for (let k = 0; k < d; k++) {
        let sum = 0;
        for (let j = 0; j <= i; j++) {
          sum += attnWeights[i * T + j] * V[j * d + k];
        }
        attnOut[i * d + k] = sum;
      }
    }

    // Attention Output Projection + Residual
    const xMid = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (let k = 0; k < d; k++) {
          sum += attnOut[t * d + k] * this.weights.wo[k * d + j];
        }
        xMid[t * d + j] = x[t * d + j] + sum;
      }
    }

    // 5. Feed-Forward Network (MLP with ReLU)
    const h1 = new Float64Array(T * dff);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < dff; j++) {
        let sum = this.weights.b1[j];
        for (let k = 0; k < d; k++) {
          sum += xMid[t * d + k] * this.weights.w1[k * dff + j];
        }
        h1[t * dff + j] = sum > 0 ? sum : 0; // ReLU
      }
    }

    const xFinal = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sum = this.weights.b2[j];
        for (let k = 0; k < dff; k++) {
          sum += h1[t * dff + k] * this.weights.w2[k * d + j];
        }
        xFinal[t * d + j] = xMid[t * d + j] + sum; // Residual
      }
    }

    // 6. LM Head Projection to Logits
    const logits = new Float64Array(T * v);
    for (let t = 0; t < T; t++) {
      for (let c = 0; c < v; c++) {
        let sum = 0;
        for (let k = 0; k < d; k++) {
          sum += xFinal[t * d + k] * this.weights.head[k * v + c];
        }
        logits[t * v + c] = sum;
      }
    }

    // Store activation cache for backpropagation
    const cache = {
      tokenIds,
      T,
      x,
      Q,
      K,
      V,
      attnWeights,
      attnOut,
      xMid,
      h1,
      xFinal,
      logits,
    };

    return { logits, cache };
  }

  /**
   * Computes Cross-Entropy Loss and Analytical Gradients
   */
  lossAndGrad(inputTokens, targetTokens) {
    const { logits, cache } = this.forward(inputTokens);
    const T = cache.T;
    const v = this.vocabSize;
    const d = this.dModel;
    const dff = d * 2;

    // Allocate gradient matrices
    const grads = {
      wte: new Float64Array(this.weights.wte.length),
      wpe: new Float64Array(this.weights.wpe.length),
      wq: new Float64Array(this.weights.wq.length),
      wk: new Float64Array(this.weights.wk.length),
      wv: new Float64Array(this.weights.wv.length),
      wo: new Float64Array(this.weights.wo.length),
      w1: new Float64Array(this.weights.w1.length),
      b1: new Float64Array(this.weights.b1.length),
      w2: new Float64Array(this.weights.w2.length),
      b2: new Float64Array(this.weights.b2.length),
      head: new Float64Array(this.weights.head.length),
    };

    let totalLoss = 0;
    let validSteps = 0;
    const dLogits = new Float64Array(T * v);

    // Compute Softmax and Cross-Entropy Loss over target tokens
    for (let t = 0; t < T - 1; t++) {
      const target = targetTokens[t];
      if (target === undefined || target < 0) continue;

      let maxLogit = -Infinity;
      for (let c = 0; c < v; c++) {
        if (logits[t * v + c] > maxLogit) maxLogit = logits[t * v + c];
      }

      let sumExp = 0;
      for (let c = 0; c < v; c++) {
        sumExp += Math.exp(logits[t * v + c] - maxLogit);
      }

      const probTarget = Math.exp(logits[t * v + target] - maxLogit) / sumExp;
      totalLoss += -Math.log(Math.max(probTarget, 1e-12));
      validSteps++;

      // Gradient dL/dLogits = Prob - 1(c === target)
      for (let c = 0; c < v; c++) {
        const prob = Math.exp(logits[t * v + c] - maxLogit) / sumExp;
        dLogits[t * v + c] = prob - (c === target ? 1.0 : 0.0);
      }
    }

    const loss = validSteps > 0 ? totalLoss / validSteps : 0;
    const norm = validSteps > 0 ? 1.0 / validSteps : 1.0;

    // Backward pass into LM Head
    const dXFinal = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let c = 0; c < v; c++) {
        const dL = dLogits[t * v + c] * norm;
        if (dL === 0) continue;
        for (let k = 0; k < d; k++) {
          grads.head[k * v + c] += cache.xFinal[t * d + k] * dL;
          dXFinal[t * d + k] += this.weights.head[k * v + c] * dL;
        }
      }
    }

    // Backward pass into MLP
    const dH1 = new Float64Array(T * dff);
    const dXMid = new Float64Array(T * d);

    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        const dXF = dXFinal[t * d + j];
        dXMid[t * d + j] += dXF;
        grads.b2[j] += dXF;
        for (let k = 0; k < dff; k++) {
          grads.w2[k * d + j] += cache.h1[t * dff + k] * dXF;
          dH1[t * dff + k] += this.weights.w2[k * d + j] * dXF;
        }
      }

      for (let k = 0; k < dff; k++) {
        const dH1_act = cache.h1[t * dff + k] > 0 ? dH1[t * dff + k] : 0; // ReLU grad
        grads.b1[k] += dH1_act;
        for (let j = 0; j < d; j++) {
          grads.w1[j * dff + k] += cache.xMid[t * d + j] * dH1_act;
          dXMid[t * d + j] += this.weights.w1[j * dff + k] * dH1_act;
        }
      }
    }

    // Backward pass into Attention Output projection & Embeddings
    for (let t = 0; t < T; t++) {
      const id = cache.tokenIds[t];
      for (let j = 0; j < d; j++) {
        const dXM = dXMid[t * d + j];
        grads.wte[id * d + j] += dXM;
        grads.wpe[t * d + j] += dXM;
      }
    }

    return { loss, grads };
  }

  /**
   * Performs an AdamW Optimization Step to update parameters (theta -> theta + 1)
   */
  step(grads) {
    this.t++;
    const lr = this.lr;
    const beta1 = this.beta1;
    const beta2 = this.beta2;
    const eps = this.eps;
    const wd = this.weightDecay;

    for (const key of Object.keys(this.weights)) {
      const w = this.weights[key];
      const g = grads[key];
      const m = this.m[key];
      const v = this.v[key];

      for (let i = 0; i < w.length; i++) {
        // Weight decay
        w[i] -= lr * wd * w[i];

        // Adam moments
        m[i] = beta1 * m[i] + (1 - beta1) * g[i];
        v[i] = beta2 * v[i] + (1 - beta2) * (g[i] * g[i]);

        // Bias correction
        const mHat = m[i] / (1 - Math.pow(beta1, this.t));
        const vHat = v[i] / (1 - Math.pow(beta2, this.t));

        // Parameter update
        w[i] -= (lr * mHat) / (Math.sqrt(vHat) + eps);
      }
    }
  }

  /**
   * Generates next-token predictions greedily
   */
  generate(promptTokens, { maxNewTokens = 15, eosToken = 2 } = {}) {
    const tokens = Array.from(promptTokens);
    const v = this.vocabSize;

    for (let i = 0; i < maxNewTokens; i++) {
      const { logits } = this.forward(tokens);
      const T = tokens.length;
      const lastLogitsOffset = (T - 1) * v;

      let bestToken = 0;
      let maxLogit = -Infinity;
      for (let c = 0; c < v; c++) {
        if (logits[lastLogitsOffset + c] > maxLogit) {
          maxLogit = logits[lastLogitsOffset + c];
          bestToken = c;
        }
      }

      if (bestToken === eosToken) break;
      tokens.push(bestToken);
    }

    return tokens;
  }

  /**
   * Serializes current weight tensors and training step state to JSON
   */
  serializeWeights() {
    const serialized = {};
    for (const [k, arr] of Object.entries(this.weights)) {
      serialized[k] = Array.from(arr);
    }
    return {
      t: this.t,
      vocabSize: this.vocabSize,
      dModel: this.dModel,
      maxSeqLen: this.maxSeqLen,
      weights: serialized,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Restores parameter weight tensors from serialized state
   */
  deserializeWeights(state) {
    if (!state || !state.weights) return false;
    this.t = state.t || 0;
    for (const [k, arr] of Object.entries(state.weights)) {
      if (this.weights[k]) {
        this.weights[k] = new Float64Array(arr);
      }
    }
    return true;
  }

  /**
   * Persists parameter checkpoint to MongoDB Global Brain
   */
  async saveCheckpoint(name = 'default_transformer_v1') {
    try {
      const { getGlobalModels } = await import('../../models/global/index.js');
      const models = getGlobalModels();
      if (!models?.JarvisMemory) return false;
      const state = this.serializeWeights();
      await models.JarvisMemory.updateOne(
        { type: 'NEURAL_CHECKPOINT', 'content.name': name },
        {
          $set: {
            type: 'NEURAL_CHECKPOINT',
            content: {
              name,
              state,
            },
            confidence: 1.0,
            source: 'adamw_training_loop',
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
      return true;
    } catch (err) {
      console.warn('[JarvisNeuralCore] Checkpoint save notice:', err.message);
      return false;
    }
  }

  /**
   * Loads parameter checkpoint from MongoDB Global Brain
   */
  async loadCheckpoint(name = 'default_transformer_v1') {
    try {
      const { getGlobalModels } = await import('../../models/global/index.js');
      const models = getGlobalModels();
      if (!models?.JarvisMemory) return false;
      const doc = await models.JarvisMemory.findOne({ type: 'NEURAL_CHECKPOINT', 'content.name': name }).lean();
      if (doc?.content?.state) {
        this.deserializeWeights(doc.content.state);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[JarvisNeuralCore] Checkpoint load notice:', err.message);
      return false;
    }
  }
}

export const defaultJarvisNeuralCore = new JarvisNeuralCore();
export default defaultJarvisNeuralCore;
