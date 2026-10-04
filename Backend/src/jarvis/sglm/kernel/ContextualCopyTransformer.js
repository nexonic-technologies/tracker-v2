import { IModel } from '../core/Contracts.js';

/**
 * ContextualCopyTransformer
 * A 2-Block Transformer equipped with an explicit, differentiable Contextual Copy Head.
 *
 * Mathematical Formulation:
 * 1. Standard Transformer backbone outputs final hidden representations xFinal: [T × d]
 * 2. Standard Vocabulary Head produces logits over global vocabulary:
 *      logits_vocab = xFinal · W_te^T  [T × v]
 * 3. Contextual Copy Head computes attention from query token (at position t) to all prior context positions i <= t:
 *      score_i = (xFinal_t · W_cq) · (xFinal_i · W_ck)^T / sqrt(d)
 *      alpha_i = softmax(score_0 ... score_t)
 * 4. Contextual probability is aggregated into output token distribution:
 *      For each token c present in prompt context:
 *        P_copy(c) = sum_{i: token_i == c} alpha_i
 * 5. Combined probability distribution:
 *      P_final = (1 - lambda) * softmax(logits_vocab) + lambda * P_copy
 *
 * For pure copying (E9 baseline), lambda = 1.0 (pure contextual selection),
 * allowing the model to emit arbitrary unseen tokens without relying on W_te[unseen].
 */
export class ContextualCopyTransformer extends IModel {
  constructor({
    vocabSize = 256,
    dModel = 64,
    nHeads = 2,
    maxSeqLen = 64,
    copyWeight = 1.0, // lambda: 1.0 = pure contextual copying, 0.0 = pure vocabulary
  } = {}) {
    super();
    this.vocabSize = vocabSize;
    this.dModel = dModel;
    this.nHeads = nHeads;
    this.dHead = Math.floor(dModel / nHeads);
    this.maxSeqLen = maxSeqLen;
    this.dFF = dModel * 2;
    this.copyWeight = copyWeight;

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

      // Differentiable Context Copy Head projections
      wcq: this._randomMatrix(d, d, 0.08),
      wck: this._randomMatrix(d, d, 0.08),
    };
  }

  get parameterCount() {
    let total = 0;
    for (const tensor of Object.values(this.weights)) total += tensor.length;
    return { total, active: total, trainable: total };
  }

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

    const attnScores = new Float64Array(T * T);
    const attnWeights = new Float64Array(T * T);

    for (let i = 0; i < T; i++) {
      let maxScore = -Infinity;
      for (let j = 0; j <= i; j++) {
        let dot = 0;
        for (let k = 0; k < d; k++) dot += Q[i * d + k] * K[j * d + k];
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
      for (let j = 0; j <= i; j++) attnWeights[i * T + j] /= sumExp;
    }

    const attnOut = new Float64Array(T * d);
    for (let i = 0; i < T; i++) {
      for (let k = 0; k < d; k++) {
        let sum = 0;
        for (let j = 0; j <= i; j++) sum += attnWeights[i * T + j] * V[j * d + k];
        attnOut[i * d + k] = sum;
      }
    }

    const xMid = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (let k = 0; k < d; k++) sum += attnOut[t * d + k] * wo[k * d + j];
        xMid[t * d + j] = xIn[t * d + j] + sum;
      }
    }

    const h1 = new Float64Array(T * dff);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < dff; j++) {
        let sum = b1[j];
        for (let k = 0; k < d; k++) sum += xMid[t * d + k] * w1[k * dff + j];
        h1[t * dff + j] = sum > 0 ? sum : 0;
      }
    }

    const xOut = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sum = b2[j];
        for (let k = 0; k < dff; k++) sum += h1[t * dff + k] * w2[k * d + j];
        xOut[t * d + j] = xMid[t * d + j] + sum;
      }
    }

    return { xOut, blockCache: { xIn, Q, K, V, attnWeights, attnOut, xMid, h1, xOut } };
  }

  /**
   * Forward pass with Differentiable Context Copy Head
   * @param {number[]} tokenIds
   * @param {boolean} [preventSelfCopy=false] - If true, candidate pos i cannot copy from itself (pos < i)
   * @param {boolean} [maskBOS=false] - If true, candidate pos 0 (BOS) is excluded from copy candidates (pos >= 1)
   * @param {boolean} [normQK=false] - If true, CQ and CK vectors are L2-normalized to prevent dot-product explosion
   * @param {number} [copyScale=1.0] - Temperature multiplier gamma applied to QK dot products
   */
  forward(tokenIds, preventSelfCopy = false, maskBOS = false, normQK = false, copyScale = 1.0) {
    const T = Math.min(tokenIds.length, this.maxSeqLen);
    const seq = tokenIds.slice(0, T);
    const d = this.dModel;
    const v = this.vocabSize;
    const scale = (copyScale / Math.sqrt(d));

    // 1. Embeddings
    const x0 = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      const id = seq[t] < v ? seq[t] : 3;
      for (let j = 0; j < d; j++) x0[t * d + j] = this.weights.wte[id * d + j] + this.weights.wpe[t * d + j];
    }

    // 2. Transformer Blocks
    const { xOut: x1, blockCache: b0Cache } = this._forwardBlock(x0, 0);
    const { xOut: xFinal, blockCache: b1Cache } = this._forwardBlock(x1, 1);

    // 3. Context Copy Head Attention
    const CQ = new Float64Array(T * d);
    const CK = new Float64Array(T * d);
    const CQ_raw = new Float64Array(T * d);
    const CK_raw = new Float64Array(T * d);
    const CQ_norm = new Float64Array(T);
    const CK_norm = new Float64Array(T);

    for (let t = 0; t < T; t++) {
      let normSqQ = 0, normSqK = 0;
      for (let j = 0; j < d; j++) {
        let sumQ = 0, sumK = 0;
        for (let k = 0; k < d; k++) {
          sumQ += xFinal[t * d + k] * this.weights.wcq[k * d + j];
          sumK += xFinal[t * d + k] * this.weights.wck[k * d + j];
        }
        CQ_raw[t * d + j] = sumQ;
        CK_raw[t * d + j] = sumK;
        normSqQ += sumQ * sumQ;
        normSqK += sumK * sumK;
      }
      CQ_norm[t] = Math.sqrt(normSqQ) + 1e-12;
      CK_norm[t] = Math.sqrt(normSqK) + 1e-12;

      for (let j = 0; j < d; j++) {
        CQ[t * d + j] = normQK ? CQ_raw[t * d + j] / CQ_norm[t] : CQ_raw[t * d + j];
        CK[t * d + j] = normQK ? CK_raw[t * d + j] / CK_norm[t] : CK_raw[t * d + j];
      }
    }

    // Compute causal copy attention scores
    const copyScores = new Float64Array(T * T);
    const copyWeights = new Float64Array(T * T);

    for (let i = 0; i < T; i++) {
      let maxS = -Infinity;
      const minJ = (maskBOS && i > 0) ? 1 : 0;
      const maxJ = (preventSelfCopy && i > minJ) ? i - 1 : i;

      for (let j = minJ; j <= maxJ; j++) {
        let dot = 0;
        for (let k = 0; k < d; k++) dot += CQ[i * d + k] * CK[j * d + k];
        const s = dot * scale;
        copyScores[i * T + j] = s;
        if (s > maxS) maxS = s;
      }

      let sumExp = 0;
      for (let j = minJ; j <= maxJ; j++) {
        const expVal = Math.exp(copyScores[i * T + j] - maxS);
        copyWeights[i * T + j] = expVal;
        sumExp += expVal;
      }
      for (let j = minJ; j <= maxJ; j++) copyWeights[i * T + j] /= sumExp;
    }

    // 4. Aggregate Copy Weights into Token-Level Probability Distribution
    const tokenProbs = new Float64Array(T * v);
    for (let t = 0; t < T; t++) {
      const minJ = (maskBOS && t > 0) ? 1 : 0;
      const maxJ = (preventSelfCopy && t > minJ) ? t - 1 : t;
      for (let pos = minJ; pos <= maxJ; pos++) {
        const tok = seq[pos];
        if (tok < v) {
          tokenProbs[t * v + tok] += copyWeights[t * T + pos];
        }
      }
    }

    // Convert probability to pseudo-logits for standard evaluation interface
    const logits = new Float64Array(T * v);
    for (let idx = 0; idx < logits.length; idx++) {
      logits[idx] = Math.log(Math.max(tokenProbs[idx], 1e-12));
    }

    return {
      logits,
      tokenProbs,
      copyWeights,
      cache: {
        tokenIds: seq,
        T,
        x0,
        b0Cache,
        x1,
        b1Cache,
        xFinal,
        CQ,
        CK,
        CQ_raw,
        CK_raw,
        CQ_norm,
        CK_norm,
        normQK,
        maskBOS,
        preventSelfCopy,
        copyScores,
        copyWeights,
        tokenProbs,
        logits,
      },
    };
  }

  /**
   * Analytical loss and gradients for Context Copy Head
   * @param {number[]} inputTokens
   * @param {number[]} targetTokens
   * @param {number[]} [lossMask=null]
   * @param {boolean} [preventSelfCopy=false]
   * @param {boolean} [maskBOS=false]
   * @param {boolean} [normQK=false]
   * @param {number} [copyScale=1.0]
   */
  lossAndGrad(inputTokens, targetTokens, lossMask = null, preventSelfCopy = false, maskBOS = false, normQK = false, copyScale = 1.0) {
    const { tokenProbs, copyWeights, cache } = this.forward(inputTokens, preventSelfCopy, maskBOS, normQK, copyScale);
    const T = cache.T;
    const v = this.vocabSize;
    const d = this.dModel;
    const scale = copyScale / Math.sqrt(d);

    const grads = {};
    for (const k of Object.keys(this.weights)) grads[k] = new Float64Array(this.weights[k].length);

    let totalLoss = 0;
    let validSteps = 0;

    const dCopyWeights = new Float64Array(T * T);

    for (let t = 0; t < T; t++) {
      if (lossMask && lossMask[t] === 0) continue;

      const target = targetTokens[t];
      if (target === undefined || target < 0 || target >= v) continue;

      const pTarget = Math.max(tokenProbs[t * v + target], 1e-12);
      totalLoss += -Math.log(pTarget);
      validSteps++;

      const gradP = -1.0 / pTarget;
      const minJ = (maskBOS && t > 0) ? 1 : 0;
      const maxJ = (preventSelfCopy && t > minJ) ? t - 1 : t;
      for (let pos = minJ; pos <= maxJ; pos++) {
        if (cache.tokenIds[pos] === target) {
          dCopyWeights[t * T + pos] = gradP;
        }
      }
    }

    const loss = validSteps > 0 ? totalLoss / validSteps : 0;
    const norm = validSteps > 0 ? 1.0 / validSteps : 1.0;

    // Backward pass through Softmax into copyScores
    const dCopyScores = new Float64Array(T * T);
    for (let i = 0; i < T; i++) {
      let sumGradW = 0;
      const minJ = (maskBOS && i > 0) ? 1 : 0;
      const maxJ = (preventSelfCopy && i > minJ) ? i - 1 : i;
      for (let j = minJ; j <= maxJ; j++) {
        const dW = dCopyWeights[i * T + j] * norm;
        sumGradW += dW * copyWeights[i * T + j];
      }
      for (let j = minJ; j <= maxJ; j++) {
        const dW = dCopyWeights[i * T + j] * norm;
        const w = copyWeights[i * T + j];
        dCopyScores[i * T + j] = w * (dW - sumGradW);
      }
    }

    // Backward into CQ and CK
    const dCQ = new Float64Array(T * d);
    const dCK = new Float64Array(T * d);

    for (let i = 0; i < T; i++) {
      const minJ = (maskBOS && i > 0) ? 1 : 0;
      const maxJ = (preventSelfCopy && i > minJ) ? i - 1 : i;
      for (let j = minJ; j <= maxJ; j++) {
        const dS = dCopyScores[i * T + j] * scale;
        for (let k = 0; k < d; k++) {
          dCQ[i * d + k] += dS * cache.CK[j * d + k];
          dCK[j * d + k] += dS * cache.CQ[i * d + k];
        }
      }
    }

    // Backpropagation through L2 Normalization into CQ_raw and CK_raw if normQK is true
    // If y = x / ||x||, then dy/dx = (I - y y^T) / ||x||
    const dCQ_raw = new Float64Array(T * d);
    const dCK_raw = new Float64Array(T * d);

    if (normQK) {
      for (let t = 0; t < T; t++) {
        const invNormQ = 1.0 / cache.CQ_norm[t];
        const invNormK = 1.0 / cache.CK_norm[t];

        let dotQ = 0, dotK = 0;
        for (let k = 0; k < d; k++) {
          dotQ += dCQ[t * d + k] * cache.CQ[t * d + k];
          dotK += dCK[t * d + k] * cache.CK[t * d + k];
        }

        for (let k = 0; k < d; k++) {
          dCQ_raw[t * d + k] = (dCQ[t * d + k] - dotQ * cache.CQ[t * d + k]) * invNormQ;
          dCK_raw[t * d + k] = (dCK[t * d + k] - dotK * cache.CK[t * d + k]) * invNormK;
        }
      }
    } else {
      dCQ_raw.set(dCQ);
      dCK_raw.set(dCK);
    }

    // Gradients into wcq, wck and xFinal
    const dXFinal = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let k = 0; k < d; k++) {
        const xF = cache.xFinal[t * d + k];
        for (let j = 0; j < d; j++) {
          grads.wcq[k * d + j] += xF * dCQ_raw[t * d + j];
          grads.wck[k * d + j] += xF * dCK_raw[t * d + j];

          dXFinal[t * d + k] += this.weights.wcq[k * d + j] * dCQ_raw[t * d + j]
                              + this.weights.wck[k * d + j] * dCK_raw[t * d + j];
        }
      }
    }

    // Backward through Block 1 and Block 0
    const dX1 = this._backwardBlock(dXFinal, cache.b1Cache, 1, grads);
    const dX0 = this._backwardBlock(dX1, cache.b0Cache, 0, grads);

    // Backward into Embeddings
    for (let t = 0; t < T; t++) {
      const id = cache.tokenIds[t] < v ? cache.tokenIds[t] : 3;
      for (let j = 0; j < d; j++) {
        grads.wte[id * d + j] += dX0[t * d + j];
        grads.wpe[t * d + j] += dX0[t * d + j];
      }
    }

    return { loss, grads };
  }

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

    const dH1 = new Float64Array(T * dff);
    const dXMid = new Float64Array(T * d);

    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        const dXF = dXOut[t * d + j];
        dXMid[t * d + j] += dXF;
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

    const dAttnScores = new Float64Array(T * T);
    for (let i = 0; i < T; i++) {
      let sumGradP = 0;
      for (let j = 0; j <= i; j++) sumGradP += dAttnWeights[i * T + j] * blockCache.attnWeights[i * T + j];
      for (let j = 0; j <= i; j++) {
        const p = blockCache.attnWeights[i * T + j];
        dAttnScores[i * T + j] = p * (dAttnWeights[i * T + j] - sumGradP);
      }
    }

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

    const dXIn = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) dXIn[t * d + j] += dXMid[t * d + j];
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
}
