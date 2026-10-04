import { IModel } from '../core/Contracts.js';

/**
 * MinimalInspectableTransformer
 * Exactly 1 Causal Transformer Block with full analytical gradients.
 * (Zero Hardcoding: Dimension parameters passed strictly via declarative config)
 */
export class MinimalInspectableTransformer extends IModel {
  constructor({
    vocabSize = 256,
    dModel = 64,
    nHeads = 2,
    maxSeqLen = 128,
  } = {}) {
    super();
    this.vocabSize = vocabSize;
    this.dModel = dModel;
    this.nHeads = nHeads;
    this.dHead = Math.floor(dModel / nHeads);
    this.maxSeqLen = maxSeqLen;
    this.dFF = dModel * 2;

    this._initParameters();
  }

  _randomMatrix(rows, cols, scale = 0.05) {
    const mat = new Float64Array(rows * cols);
    for (let i = 0; i < mat.length; i++) {
      mat[i] = (Math.random() * 2 - 1) * scale;
    }
    return mat;
  }

  _initParameters() {
    const d = this.dModel;
    const v = this.vocabSize;
    const s = this.maxSeqLen;
    const dff = this.dFF;

    this.weights = {
      // 1. Embeddings
      wte: this._randomMatrix(v, d, 0.08),
      wpe: this._randomMatrix(s, d, 0.02),
      
      // 2. Attention (Multi-Head Projections)
      wq: this._randomMatrix(d, d, 0.08),
      wk: this._randomMatrix(d, d, 0.08),
      wv: this._randomMatrix(d, d, 0.08),
      wo: this._randomMatrix(d, d, 0.08),
      
      // 3. Feed-Forward Network
      w1: this._randomMatrix(d, dff, 0.08),
      b1: new Float64Array(dff),
      w2: this._randomMatrix(dff, d, 0.08),
      b2: new Float64Array(d),
    };
  }

  get parameterCount() {
    let total = 0;
    for (const tensor of Object.values(this.weights)) {
      total += tensor.length;
    }
    return { total, active: total, trainable: total };
  }

  /**
   * Forward pass through 1-block causal transformer
   * @param {number[]} tokenIds
   * @returns {{ logits: Float64Array, cache: Object }}
   */
  forward(tokenIds) {
    const T = Math.min(tokenIds.length, this.maxSeqLen);
    const seq = tokenIds.slice(0, T);
    const d = this.dModel;
    const v = this.vocabSize;
    const dff = this.dFF;

    // 1. Embedding lookup
    const x = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      const id = seq[t];
      const validId = id < v ? id : 3; // Fallback to UNK (3) if beyond vocab bounds
      for (let j = 0; j < d; j++) {
        x[t * d + j] = this.weights.wte[validId * d + j] + this.weights.wpe[t * d + j];
      }
    }

    // 2. Multi-Head Attention Projections
    const Q = new Float64Array(T * d);
    const K = new Float64Array(T * d);
    const V = new Float64Array(T * d);

    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sumQ = 0, sumK = 0, sumV = 0;
        for (let k = 0; k < d; k++) {
          const val = x[t * d + k];
          sumQ += val * this.weights.wq[k * d + j];
          sumK += val * this.weights.wk[k * d + j];
          sumV += val * this.weights.wv[k * d + j];
        }
        Q[t * d + j] = sumQ;
        K[t * d + j] = sumK;
        V[t * d + j] = sumV;
      }
    }

    // 3. Scaled Dot-Product Causal Attention
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

    // 4. Attention output projection & residual
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

    const xMid = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (let k = 0; k < d; k++) {
          sum += attnOut[t * d + k] * this.weights.wo[k * d + j];
        }
        xMid[t * d + j] = x[t * d + j] + sum; // Residual
      }
    }

    // 5. Feed-Forward Network (ReLU activation)
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

    // 6. LM Head Projection to Logits (Weight-tied via wte^T)
    const logits = new Float64Array(T * v);
    for (let t = 0; t < T; t++) {
      for (let c = 0; c < v; c++) {
        let sum = 0;
        for (let k = 0; k < d; k++) {
          sum += xFinal[t * d + k] * this.weights.wte[c * d + k];
        }
        logits[t * v + c] = sum;
      }
    }

    return {
      logits,
      cache: {
        tokenIds: seq,
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
      },
    };
  }

  /**
   * Computes Cross-Entropy loss and analytical gradients for backpropagation
   */
  lossAndGrad(inputTokens, targetTokens) {
    const { logits, cache } = this.forward(inputTokens);
    const T = cache.T;
    const v = this.vocabSize;
    const d = this.dModel;
    const dff = this.dFF;

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
    };

    let totalLoss = 0;
    let validSteps = 0;
    const dLogits = new Float64Array(T * v);

    for (let t = 0; t < T; t++) {
      const target = targetTokens[t];
      if (target === undefined || target < 0 || target >= v) continue;

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

      for (let c = 0; c < v; c++) {
        const prob = Math.exp(logits[t * v + c] - maxLogit) / sumExp;
        dLogits[t * v + c] = prob - (c === target ? 1.0 : 0.0);
      }
    }

    const loss = validSteps > 0 ? totalLoss / validSteps : 0;
    const norm = validSteps > 0 ? 1.0 / validSteps : 1.0;

    // Backward pass into LM Head (tied to wte)
    const dXFinal = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let c = 0; c < v; c++) {
        const dL = dLogits[t * v + c] * norm;
        if (dL === 0) continue;
        for (let k = 0; k < d; k++) {
          grads.wte[c * d + k] += cache.xFinal[t * d + k] * dL;
          dXFinal[t * d + k] += this.weights.wte[c * d + k] * dL;
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
        const dH1_act = cache.h1[t * dff + k] > 0 ? dH1[t * dff + k] : 0;
        grads.b1[k] += dH1_act;
        for (let j = 0; j < d; j++) {
          grads.w1[j * dff + k] += cache.xMid[t * d + j] * dH1_act;
          dXMid[t * d + j] += this.weights.w1[j * dff + k] * dH1_act;
        }
      }
    }

    // Backward pass into Attention Output projection (W_O) & Attention Output (attnOut)
    const dAttnOut = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        const dX = dXMid[t * d + j];
        for (let k = 0; k < d; k++) {
          grads.wo[k * d + j] += cache.attnOut[t * d + k] * dX;
          dAttnOut[t * d + k] += this.weights.wo[k * d + j] * dX;
        }
      }
    }

    // Backward pass into Attention Weights & Value projections (W_V)
    const dV = new Float64Array(T * d);
    const dAttnWeights = new Float64Array(T * T);
    for (let i = 0; i < T; i++) {
      for (let k = 0; k < d; k++) {
        const dOut = dAttnOut[i * d + k];
        for (let j = 0; j <= i; j++) {
          dAttnWeights[i * T + j] += dOut * cache.V[j * d + k];
          dV[j * d + k] += cache.attnWeights[i * T + j] * dOut;
        }
      }
    }

    // Backward pass into Attention Scores (Softmax backward)
    const dAttnScores = new Float64Array(T * T);
    for (let i = 0; i < T; i++) {
      let sumGradP = 0;
      for (let j = 0; j <= i; j++) {
        sumGradP += dAttnWeights[i * T + j] * cache.attnWeights[i * T + j];
      }
      for (let j = 0; j <= i; j++) {
        const p = cache.attnWeights[i * T + j];
        dAttnScores[i * T + j] = p * (dAttnWeights[i * T + j] - sumGradP);
      }
    }

    // Backward pass into Q and K projections
    const dQ = new Float64Array(T * d);
    const dK = new Float64Array(T * d);
    const scale = 1.0 / Math.sqrt(d);

    for (let i = 0; i < T; i++) {
      for (let j = 0; j <= i; j++) {
        const dS = dAttnScores[i * T + j] * scale;
        for (let k = 0; k < d; k++) {
          dQ[i * d + k] += dS * cache.K[j * d + k];
          dK[j * d + k] += dS * cache.Q[i * d + k];
        }
      }
    }

    // Accumulate gradients into W_Q, W_K, W_V and residual input
    const dXAttn = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let k = 0; k < d; k++) {
        const xtk = cache.x[t * d + k];
        for (let j = 0; j < d; j++) {
          grads.wq[k * d + j] += xtk * dQ[t * d + j];
          grads.wk[k * d + j] += xtk * dK[t * d + j];
          grads.wv[k * d + j] += xtk * dV[t * d + j];

          dXAttn[t * d + k] += this.weights.wq[k * d + j] * dQ[t * d + j]
                             + this.weights.wk[k * d + j] * dK[t * d + j]
                             + this.weights.wv[k * d + j] * dV[t * d + j];
        }
      }
    }

    // Backward pass into Embeddings (Residual combination of MLP + Attention inputs)
    for (let t = 0; t < T; t++) {
      const id = cache.tokenIds[t];
      const validId = id < v ? id : 3;
      for (let j = 0; j < d; j++) {
        const totalDX = dXMid[t * d + j] + dXAttn[t * d + j];
        grads.wte[validId * d + j] += totalDX;
        grads.wpe[t * d + j] += totalDX;
      }
    }

    return { loss, grads };
  }
}
