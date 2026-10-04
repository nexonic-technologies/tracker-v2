import { IModel } from '../core/Contracts.js';

/**
 * NormalizedContextualCopyTransformer
 * 2-Block Transformer with Pre-RMSNorm residual stabilization and Contextual Copy Head.
 *
 * Architecture:
 * - Pre-RMSNorm on Attention input: xNorm1 = RMSNorm(xIn)
 * - Attention residual:             xMid   = xIn + Attn(xNorm1)
 * - Pre-RMSNorm on FFN input:       xNorm2 = RMSNorm(xMid)
 * - FFN residual:                   xOut   = xMid + FFN(xNorm2)
 *
 * Sublayer tracing:
 * Captures intermediate representations at every sublayer for mechanistic norm inspection:
 * [x0, xNorm1_0, attnOut_0, xMid_0, xNorm2_0, ffnOut_0, xOut_0, xNorm1_1, ...]
 */
export class NormalizedContextualCopyTransformer extends IModel {
  constructor({
    vocabSize = 256,
    dModel = 64,
    nHeads = 2,
    maxSeqLen = 64,
    copyWeight = 1.0,
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

      // Copy Head Projections
      wcq: this._randomMatrix(d, d, 0.08),
      wck: this._randomMatrix(d, d, 0.08),
    };
  }

  get parameterCount() {
    let total = 0;
    for (const tensor of Object.values(this.weights)) total += tensor.length;
    return { total, active: total, trainable: total };
  }

  /**
   * Vector RMS Normalization helper: y = x / sqrt(mean(x^2) + eps)
   */
  _rmsNorm(x, T, d) {
    const out = new Float64Array(T * d);
    const rmsInv = new Float64Array(T);
    const eps = 1e-6;

    for (let t = 0; t < T; t++) {
      let sumSq = 0;
      for (let j = 0; j < d; j++) sumSq += x[t * d + j] * x[t * d + j];
      const inv = 1.0 / Math.sqrt(sumSq / d + eps);
      rmsInv[t] = inv;
      for (let j = 0; j < d; j++) out[t * d + j] = x[t * d + j] * inv;
    }
    return { out, rmsInv };
  }

  _backwardRmsNorm(dOut, xIn, rmsInv, T, d) {
    const dIn = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      const inv = rmsInv[t];
      let dot = 0;
      for (let j = 0; j < d; j++) dot += dOut[t * d + j] * xIn[t * d + j];
      const factor = (dot * inv * inv) / d;
      for (let j = 0; j < d; j++) {
        dIn[t * d + j] = dOut[t * d + j] * inv - xIn[t * d + j] * factor * inv;
      }
    }
    return dIn;
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

    // Sublayer 1: Pre-RMSNorm Attention
    const { out: xNorm1, rmsInv: rmsInv1 } = this._rmsNorm(xIn, T, d);

    const Q = new Float64Array(T * d);
    const K = new Float64Array(T * d);
    const V = new Float64Array(T * d);

    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sumQ = 0, sumK = 0, sumV = 0;
        for (let k = 0; k < d; k++) {
          const val = xNorm1[t * d + k];
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
        xMid[t * d + j] = xIn[t * d + j] + sum; // Residual connection
      }
    }

    // Sublayer 2: Pre-RMSNorm FeedForward
    const { out: xNorm2, rmsInv: rmsInv2 } = this._rmsNorm(xMid, T, d);

    const h1 = new Float64Array(T * dff);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < dff; j++) {
        let sum = b1[j];
        for (let k = 0; k < d; k++) sum += xNorm2[t * d + k] * w1[k * dff + j];
        h1[t * dff + j] = sum > 0 ? sum : 0;
      }
    }

    const ffnOut = new Float64Array(T * d);
    const xOut = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sum = b2[j];
        for (let k = 0; k < dff; k++) sum += h1[t * dff + k] * w2[k * d + j];
        ffnOut[t * d + j] = sum;
        xOut[t * d + j] = xMid[t * d + j] + sum; // Residual connection
      }
    }

    return {
      xOut,
      blockCache: { xIn, xNorm1, rmsInv1, Q, K, V, attnWeights, attnOut, xMid, xNorm2, rmsInv2, h1, ffnOut, xOut },
    };
  }

  forward(tokenIds, preventSelfCopy = false, maskBOS = false, normQK = false, copyScale = 1.0) {
    const T = Math.min(tokenIds.length, this.maxSeqLen);
    const seq = tokenIds.slice(0, T);
    const d = this.dModel;
    const v = this.vocabSize;
    const scale = copyScale / Math.sqrt(d);

    const x0 = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      const id = seq[t] < v ? seq[t] : 3;
      for (let j = 0; j < d; j++) x0[t * d + j] = this.weights.wte[id * d + j] + this.weights.wpe[t * d + j];
    }

    const { xOut: x1, blockCache: b0Cache } = this._forwardBlock(x0, 0);
    const { xOut: xFinal, blockCache: b1Cache } = this._forwardBlock(x1, 1);

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
        copyScale,
        copyScores,
        copyWeights,
        tokenProbs,
        logits,
      },
    };
  }

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

    const dX1 = this._backwardBlock(dXFinal, cache.b1Cache, 1, grads);
    const dX0 = this._backwardBlock(dX1, cache.b0Cache, 0, grads);

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

    // Backward from xOut = xMid + ffnOut
    const dXMid = new Float64Array(T * d);
    const dFfnOut = new Float64Array(T * d);
    for (let i = 0; i < T * d; i++) {
      dXMid[i] = dXOut[i];
      dFfnOut[i] = dXOut[i];
    }

    // FFN Backward
    const dH1 = new Float64Array(T * dff);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        const dFO = dFfnOut[t * d + j];
        gb2[j] += dFO;
        for (let k = 0; k < dff; k++) {
          gw2[k * d + j] += blockCache.h1[t * dff + k] * dFO;
          dH1[t * dff + k] += w2[k * d + j] * dFO;
        }
      }
    }

    const dXNorm2 = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let k = 0; k < dff; k++) {
        const dH1_act = blockCache.h1[t * dff + k] > 0 ? dH1[t * dff + k] : 0;
        gb1[k] += dH1_act;
        for (let j = 0; j < d; j++) {
          gw1[j * dff + k] += blockCache.xNorm2[t * d + j] * dH1_act;
          dXNorm2[t * d + j] += w1[j * dff + k] * dH1_act;
        }
      }
    }

    // Backward through Pre-RMSNorm 2 into xMid
    const dXMid_from_ffn = this._backwardRmsNorm(dXNorm2, blockCache.xMid, blockCache.rmsInv2, T, d);
    for (let i = 0; i < T * d; i++) dXMid[i] += dXMid_from_ffn[i];

    // Backward from xMid = xIn + attnOut * wo
    const dXIn = new Float64Array(T * d);
    const dAttnOut = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        const dM = dXMid[t * d + j];
        dXIn[t * d + j] += dM; // Residual skip
        for (let k = 0; k < d; k++) {
          gwo[k * d + j] += blockCache.attnOut[t * d + k] * dM;
          dAttnOut[t * d + k] += wo[k * d + j] * dM;
        }
      }
    }

    // Attention Backward
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

    const dXNorm1 = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let k = 0; k < d; k++) {
        const val = blockCache.xNorm1[t * d + k];
        for (let j = 0; j < d; j++) {
          gwq[k * d + j] += val * dQ[t * d + j];
          gwk[k * d + j] += val * dK[t * d + j];
          gwv[k * d + j] += val * dV[t * d + j];

          dXNorm1[t * d + k] += wq[k * d + j] * dQ[t * d + j]
                              + wk[k * d + j] * dK[t * d + j]
                              + wv[k * d + j] * dV[t * d + j];
        }
      }
    }

    // Backward through Pre-RMSNorm 1 into xIn
    const dXIn_from_attn = this._backwardRmsNorm(dXNorm1, blockCache.xIn, blockCache.rmsInv1, T, d);
    for (let i = 0; i < T * d; i++) dXIn[i] += dXIn_from_attn[i];

    return dXIn;
  }
}
