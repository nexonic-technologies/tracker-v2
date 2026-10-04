import { IModel } from '../core/Contracts.js';

/**
 * TwoLayerInspectableTransformer
 * Exactly 2 Causal Transformer Blocks with full analytical backpropagation.
 * Keeps every hyperparameter, embedding dimension, and optimizer contract identical to 1-block.
 */
export class TwoLayerInspectableTransformer extends IModel {
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
    this.nLayers = 2;

    this._initParameters();
  }

  _randomMatrix(rows, cols, scale = 0.08) {
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
      // Embeddings
      wte: this._randomMatrix(v, d, 0.08),
      wpe: this._randomMatrix(s, d, 0.02),

      // Block 0
      wq0: this._randomMatrix(d, d, 0.08),
      wk0: this._randomMatrix(d, d, 0.08),
      wv0: this._randomMatrix(d, d, 0.08),
      wo0: this._randomMatrix(d, d, 0.08),
      w10: this._randomMatrix(d, dff, 0.08),
      b10: new Float64Array(dff),
      w20: this._randomMatrix(dff, d, 0.08),
      b20: new Float64Array(d),

      // Block 1
      wq1: this._randomMatrix(d, d, 0.08),
      wk1: this._randomMatrix(d, d, 0.08),
      wv1: this._randomMatrix(d, d, 0.08),
      wo1: this._randomMatrix(d, d, 0.08),
      w11: this._randomMatrix(d, dff, 0.08),
      b11: new Float64Array(dff),
      w21: this._randomMatrix(dff, d, 0.08),
      b21: new Float64Array(d),
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
   * Forward pass through Block i
   */
  _forwardBlock(xIn, layerIdx) {
    const T = xIn.length / this.dModel;
    const d = this.dModel;
    const dff = this.dFF;
    const scale = 1.0 / Math.sqrt(d);

    const wq = this.weights[`wq${layerIdx}`];
    const wk = this.weights[`wk${layerIdx}`];
    const wv = this.weights[`wv${layerIdx}`];
    const wo = this.weights[`wo${layerIdx}`];
    const w1 = this.weights[`w1${layerIdx}`];
    const b1 = this.weights[`b1${layerIdx}`];
    const w2 = this.weights[`w2${layerIdx}`];
    const b2 = this.weights[`b2${layerIdx}`];

    // Q, K, V
    const Q = new Float64Array(T * d);
    const K = new Float64Array(T * d);
    const V = new Float64Array(T * d);

    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sumQ = 0, sumK = 0, sumV = 0;
        for (let k = 0; k < d; k++) {
          const val = xIn[t * d + k];
          sumQ += val * wq[k * d + j];
          sumK += val * wk[k * d + j];
          sumV += val * wv[k * d + j];
        }
        Q[t * d + j] = sumQ;
        K[t * d + j] = sumK;
        V[t * d + j] = sumV;
      }
    }

    // Causal Attention Matrix
    const attnScores = new Float64Array(T * T);
    const attnWeights = new Float64Array(T * T);

    for (let i = 0; i < T; i++) {
      let maxScore = -Infinity;
      for (let j = 0; j <= i; j++) {
        let dot = 0;
        for (let k = 0; k < d; k++) {
          dot += Q[i * d + k] * K[j * d + k];
        }
        const s = dot * scale;
        attnScores[i * T + j] = s;
        if (s > maxScore) maxScore = s;
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

    // Attention Output + Residual
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
          sum += attnOut[t * d + k] * wo[k * d + j];
        }
        xMid[t * d + j] = xIn[t * d + j] + sum; // Residual 1
      }
    }

    // MLP + Residual
    const h1 = new Float64Array(T * dff);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < dff; j++) {
        let sum = b1[j];
        for (let k = 0; k < d; k++) {
          sum += xMid[t * d + k] * w1[k * dff + j];
        }
        h1[t * dff + j] = sum > 0 ? sum : 0;
      }
    }

    const xOut = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sum = b2[j];
        for (let k = 0; k < dff; k++) {
          sum += h1[t * dff + k] * w2[k * d + j];
        }
        xOut[t * d + j] = xMid[t * d + j] + sum; // Residual 2
      }
    }

    return {
      xOut,
      blockCache: { xIn, Q, K, V, attnWeights, attnOut, xMid, h1, xOut },
    };
  }

  /**
   * Forward pass through 2-block transformer
   */
  forward(tokenIds) {
    const T = Math.min(tokenIds.length, this.maxSeqLen);
    const seq = tokenIds.slice(0, T);
    const d = this.dModel;
    const v = this.vocabSize;

    // Embedding
    const x0 = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      const id = seq[t] < v ? seq[t] : 3;
      for (let j = 0; j < d; j++) {
        x0[t * d + j] = this.weights.wte[id * d + j] + this.weights.wpe[t * d + j];
      }
    }

    // Block 0
    const { xOut: x1, blockCache: b0Cache } = this._forwardBlock(x0, 0);

    // Block 1
    const { xOut: xFinal, blockCache: b1Cache } = this._forwardBlock(x1, 1);

    // LM Head tied to wte^T
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
        x0,
        b0Cache,
        x1,
        b1Cache,
        xFinal,
        logits,
      },
    };
  }

  /**
   * Backward pass through Block i
   */
  _backwardBlock(dXOut, blockCache, layerIdx, grads) {
    const T = blockCache.xIn.length / this.dModel;
    const d = this.dModel;
    const dff = this.dFF;
    const scale = 1.0 / Math.sqrt(d);

    const wq = this.weights[`wq${layerIdx}`];
    const wk = this.weights[`wk${layerIdx}`];
    const wv = this.weights[`wv${layerIdx}`];
    const wo = this.weights[`wo${layerIdx}`];
    const w1 = this.weights[`w1${layerIdx}`];
    const w2 = this.weights[`w2${layerIdx}`];

    const gwq = grads[`wq${layerIdx}`];
    const gwk = grads[`wk${layerIdx}`];
    const gwv = grads[`wv${layerIdx}`];
    const gwo = grads[`wo${layerIdx}`];
    const gw1 = grads[`w1${layerIdx}`];
    const gb1 = grads[`b1${layerIdx}`];
    const gw2 = grads[`w2${layerIdx}`];
    const gb2 = grads[`b2${layerIdx}`];

    // Backward into MLP
    const dH1 = new Float64Array(T * dff);
    const dXMid = new Float64Array(T * d);

    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        const dXF = dXOut[t * d + j];
        dXMid[t * d + j] += dXF; // Residual pass-through
        gb2[j] += dXF;
        for (let k = 0; k < dff; k++) {
          gw2[k * d + j] += blockCache.h1[t * dff + k] * dXF;
          dH1[t * dff + k] += w2[k * d + j] * dXF;
        }
      }

      for (let k = 0; k < dff; k++) {
        const dH1_act = blockCache.h1[t * dff + k] > 0 ? dH1[t * dff + k] : 0;
        gb1[k] += dH1_act;
        for (let j = 0; j < d; j++) {
          gw1[j * dff + k] += blockCache.xMid[t * d + j] * dH1_act;
          dXMid[t * d + j] += w1[j * dff + k] * dH1_act;
        }
      }
    }

    // Backward into Attention Output
    const dAttnOut = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        const dX = dXMid[t * d + j];
        for (let k = 0; k < d; k++) {
          gwo[k * d + j] += blockCache.attnOut[t * d + k] * dX;
          dAttnOut[t * d + k] += wo[k * d + j] * dX;
        }
      }
    }

    // Backward into V and Attention Weights
    const dV = new Float64Array(T * d);
    const dAttnWeights = new Float64Array(T * T);
    for (let i = 0; i < T; i++) {
      for (let k = 0; k < d; k++) {
        const dOut = dAttnOut[i * d + k];
        for (let j = 0; j <= i; j++) {
          dAttnWeights[i * T + j] += dOut * blockCache.V[j * d + k];
          dV[j * d + k] += blockCache.attnWeights[i * T + j] * dOut;
        }
      }
    }

    // Backward into Attention Scores
    const dAttnScores = new Float64Array(T * T);
    for (let i = 0; i < T; i++) {
      let sumGradP = 0;
      for (let j = 0; j <= i; j++) {
        sumGradP += dAttnWeights[i * T + j] * blockCache.attnWeights[i * T + j];
      }
      for (let j = 0; j <= i; j++) {
        const p = blockCache.attnWeights[i * T + j];
        dAttnScores[i * T + j] = p * (dAttnWeights[i * T + j] - sumGradP);
      }
    }

    // Backward into Q and K
    const dQ = new Float64Array(T * d);
    const dK = new Float64Array(T * d);
    for (let i = 0; i < T; i++) {
      for (let j = 0; j <= i; j++) {
        const dS = dAttnScores[i * T + j] * scale;
        for (let k = 0; k < d; k++) {
          dQ[i * d + k] += dS * blockCache.K[j * d + k];
          dK[j * d + k] += dS * blockCache.Q[i * d + k];
        }
      }
    }

    // Accumulate into W_Q, W_K, W_V and dXIn
    const dXIn = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      // Residual pass-through from xMid
      for (let j = 0; j < d; j++) {
        dXIn[t * d + j] += dXMid[t * d + j];
      }

      for (let k = 0; k < d; k++) {
        const xtk = blockCache.xIn[t * d + k];
        for (let j = 0; j < d; j++) {
          gwq[k * d + j] += xtk * dQ[t * d + j];
          gwk[k * d + j] += xtk * dK[t * d + j];
          gwv[k * d + j] += xtk * dV[t * d + j];

          dXIn[t * d + k] += wq[k * d + j] * dQ[t * d + j]
                           + wk[k * d + j] * dK[t * d + j]
                           + wv[k * d + j] * dV[t * d + j];
        }
      }
    }

    return dXIn;
  }

  /**
   * Analytical loss and gradients for 2-block transformer
   * @param {number[]} inputTokens
   * @param {number[]} targetTokens
   * @param {number[]} [lossMask] - Optional binary mask [0, 1] per token position
   */
  lossAndGrad(inputTokens, targetTokens, lossMask = null) {
    const { logits, cache } = this.forward(inputTokens);
    const T = cache.T;
    const v = this.vocabSize;
    const d = this.dModel;

    const grads = {};
    for (const k of Object.keys(this.weights)) {
      grads[k] = new Float64Array(this.weights[k].length);
    }

    let totalLoss = 0;
    let validSteps = 0;
    const dLogits = new Float64Array(T * v);

    for (let t = 0; t < T; t++) {
      if (lossMask && lossMask[t] === 0) continue; // Masked position: zero loss, zero gradient

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

    // Backward pass through Block 1
    const dX1 = this._backwardBlock(dXFinal, cache.b1Cache, 1, grads);

    // Backward pass through Block 0
    const dX0 = this._backwardBlock(dX1, cache.b0Cache, 0, grads);

    // Backward pass into Embeddings
    for (let t = 0; t < T; t++) {
      const id = cache.tokenIds[t] < v ? cache.tokenIds[t] : 3;
      for (let j = 0; j < d; j++) {
        grads.wte[id * d + j] += dX0[t * d + j];
        grads.wpe[t * d + j] += dX0[t * d + j];
      }
    }

    return { loss, grads };
  }
}
