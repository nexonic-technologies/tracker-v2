import { IModel } from '../core/Contracts.js';

/**
 * MultiHeadCopyTransformer
 * Normalized 2-Block Transformer with multi-head factorization in the Contextual Copy Head:
 * nCopyHeads in {1, 2, 4}.
 *
 * Mathematical Formulation:
 * Each copy head h in [0, nCopyHeads-1] with dHead = dModel / nCopyHeads computes its own attention:
 *   score_{h, i, j} = scale * (CQ_h[i] · CK_h[j])
 *   copyWeights_{h, i, j} = softmax_j(score_{h, i, j})
 *
 * The heads are averaged (or factorized) to produce the ensemble contextual copy probability:
 *   copyWeights_{i, j} = (1 / nCopyHeads) * sum_{h} copyWeights_{h, i, j}
 *
 * This allows Head 1 to specialize in Subject matching and Head 2 to specialize in Relation matching!
 */
export class MultiHeadCopyTransformer extends IModel {
  constructor({
    vocabSize = 256,
    dModel = 64,
    nLayers = 2,
    nHeads = 2,
    nCopyHeads = 1,
    maxSeqLen = 64,
    copyWeight = 1.0,
    positionEncoding = 'absolute', // 'absolute' | 'rope'
    rng = null,
    tokenizer = null,
  } = {}) {
    super();
    this.tokenizer = tokenizer;
    this.vocabSize = vocabSize;
    this.dModel = dModel;
    this.nLayers = nLayers;
    this.nHeads = nHeads;
    this.nCopyHeads = nCopyHeads;
    this.dHead = Math.floor(dModel / nHeads);
    this.dCopyHead = Math.floor(dModel / nCopyHeads);
    this.maxSeqLen = maxSeqLen;
    this.dFF = dModel * 2;
    this.copyWeight = copyWeight;
    this.positionEncoding = positionEncoding;

    if (!rng) {
      let seed = 42;
      this.rng = function() {
        var t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    } else {
      this.rng = rng;
    }

    this._initParameters();
  }

  _randomMatrix(rows, cols, scale = 0.08) {
    const mat = new Float64Array(rows * cols);
    for (let i = 0; i < mat.length; i++) {
      mat[i] = (this.rng() * 2 - 1) * scale;
    }
    return mat;
  }

  _ensureVocabCapacity(requiredSize) {
    if (requiredSize <= this.vocabSize) return;
    const newVocabSize = Math.max(requiredSize + 32, this.vocabSize * 2);
    const oldWte = this.weights.wte;
    const d = this.dModel;
    const newWte = this._randomMatrix(newVocabSize, d, 0.08);
    newWte.set(oldWte);
    this.weights.wte = newWte;
    this.vocabSize = newVocabSize;
  }

  _initParameters() {
    const d = this.dModel;
    const v = this.vocabSize;
    const s = this.maxSeqLen;
    const dff = this.dFF;

    const wcq = this._randomMatrix(d, d, 0.02);
    const wck = this._randomMatrix(d, d, 0.02);
    for (let i = 0; i < d; i++) {
      wcq[i * d + i] += 1.0;
      wck[i * d + i] += 1.0;
    }

    this.weights = {
      wte: this._randomMatrix(v, d, 0.08),

      // Multi-Head Copy Projections (Identity initialized for content matching)
      wcq,
      wck,
    };

    if (this.positionEncoding === 'absolute') {
      this.weights.wpe = this._randomMatrix(s, d, 0.02);
    }

    for (let l = 0; l < this.nLayers; l++) {
      this.weights[`wq${l}`] = this._randomMatrix(d, d, 0.08);
      this.weights[`wk${l}`] = this._randomMatrix(d, d, 0.08);
      this.weights[`wv${l}`] = this._randomMatrix(d, d, 0.08);
      this.weights[`wo${l}`] = this._randomMatrix(d, d, 0.08);
      this.weights[`w1${l}`] = this._randomMatrix(d, dff, 0.08);
      this.weights[`b1${l}`] = new Float64Array(dff);
      this.weights[`w2${l}`] = this._randomMatrix(dff, d, 0.08);
      this.weights[`b2${l}`] = new Float64Array(d);
    }
  }

  get parameterCount() {
    let total = 0;
    for (const tensor of Object.values(this.weights)) total += tensor.length;
    return { total, active: total, trainable: total };
  }

  _computeVectorNorm(vec, offset, len) {
    let s = 0;
    for (let i = 0; i < len; i++) s += vec[offset + i] * vec[offset + i];
    return Math.sqrt(s);
  }

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

  _applyRoPE(vec, T, dHead, inverse = false) {
    const out = new Float64Array(vec.length);
    const halfD = Math.floor(dHead / 2);
    const nHeadsTotal = Math.floor(vec.length / (T * dHead));

    let pos = 0;
    for (let t = 0; t < T; t++) {
      const p = (this.positionEncoding === 'segment_rope' && this.lastSeq) ? pos : t;
      for (let h = 0; h < nHeadsTotal; h++) {
        const offset = (t * nHeadsTotal + h) * dHead;
        for (let k = 0; k < halfD; k++) {
          const theta = Math.pow(10000.0, -2.0 * k / dHead);
          const angle = (inverse ? -1.0 : 1.0) * p * theta;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);

          const v0 = vec[offset + 2 * k];
          const v1 = vec[offset + 2 * k + 1];

          out[offset + 2 * k] = v0 * cosA - v1 * sinA;
          out[offset + 2 * k + 1] = v0 * sinA + v1 * cosA;
        }
      }
      if (this.positionEncoding === 'segment_rope' && this.lastSeq) {
        const id = this.lastSeq[t];
        const isPeriod = this.tokenizer && this.tokenizer.decode([id]).trim() === '.';
        if (isPeriod) {
          pos = 0;
        } else {
          pos++;
        }
      }
    }
    return out;
  }

  _forwardBlock(xIn, layerIdx) {
    const T = xIn.length / this.dModel;
    const d = this.dModel;
    const dff = this.dFF;

    const wq = this.weights[`wq${layerIdx}`];
    const wk = this.weights[`wk${layerIdx}`];
    const wv = this.weights[`wv${layerIdx}`];
    const wo = this.weights[`wo${layerIdx}`];
    const w1 = this.weights[`w1${layerIdx}`];
    const b1 = this.weights[`b1${layerIdx}`];
    const w2 = this.weights[`w2${layerIdx}`];
    const b2 = this.weights[`b2${layerIdx}`];

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

    const nH = this.nHeads;
    const dH = this.dHead;
    const scale = 1.0 / Math.sqrt(dH);

    let Q_rot = Q;
    let K_rot = K;
    if (this.positionEncoding === 'rope' || this.positionEncoding === 'segment_rope') {
      Q_rot = this._applyRoPE(Q, T, dH, false);
      K_rot = this._applyRoPE(K, T, dH, false);
    }

    const attnScores = new Float64Array(nH * T * T);
    const attnWeights = new Float64Array(nH * T * T);
    const multiHeadOut = new Float64Array(T * d);

    for (let h = 0; h < nH; h++) {
      const offsetH = h * dH;
      const hOffset = h * T * T;

      for (let i = 0; i < T; i++) {
        let maxScore = -Infinity;
        for (let j = 0; j <= i; j++) {
          let dot = 0;
          for (let k = 0; k < dH; k++) {
            dot += Q_rot[i * d + offsetH + k] * K_rot[j * d + offsetH + k];
          }
          const s = dot * scale;
          attnScores[hOffset + i * T + j] = s;
          if (s > maxScore) maxScore = s;
        }
        let sumExp = 0;
        for (let j = 0; j <= i; j++) {
          const expVal = Math.exp(attnScores[hOffset + i * T + j] - maxScore);
          attnWeights[hOffset + i * T + j] = expVal;
          sumExp += expVal;
        }
        for (let j = 0; j <= i; j++) attnWeights[hOffset + i * T + j] /= sumExp;
      }

      for (let i = 0; i < T; i++) {
        for (let k = 0; k < dH; k++) {
          let sum = 0;
          for (let j = 0; j <= i; j++) {
            sum += attnWeights[hOffset + i * T + j] * V[j * d + offsetH + k];
          }
          multiHeadOut[i * d + offsetH + k] = sum;
        }
      }
    }

    if (globalThis.__SGLM_TRACE__) {
      const qPos = T - 1;
      console.log(`\n[Transformer.layer ${layerIdx}] Multi-Head Self-Attention`);
      console.log(`  * Input tensor xIn shape: [${T}, ${d}]`);
      console.log(`  * Query/Output position:  [${qPos}]`);
      console.log(`  * Attention configuration: Heads = ${nH}, DimPerHead = ${dH}, Scale = ${scale.toFixed(4)}`);
      const headAttn = [];
      for (let j = 0; j <= qPos; j++) {
        let avgW = 0;
        for (let h = 0; h < nH; h++) avgW += attnWeights[h * T * T + qPos * T + j];
        avgW /= nH;
        const id = this.lastSeq ? this.lastSeq[j] : j;
        const tokName = this.tokenizer ? this.tokenizer.decode([id]).trim() : `pos_${j}`;
        headAttn.push({ pos: j, tok: tokName, w: avgW });
      }
      headAttn.sort((a, b) => b.w - a.w);
      console.log(`  * Top 5 Attended tokens from query position [${qPos}]:`);
      for (let i = 0; i < Math.min(5, headAttn.length); i++) {
        console.log(`     pos ${String(headAttn[i].pos).padStart(3)}: "${headAttn[i].tok}" -> ${(headAttn[i].w * 100).toFixed(2)}% attention`);
      }
    }

    const xMid = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (let k = 0; k < d; k++) sum += multiHeadOut[t * d + k] * wo[k * d + j];
        xMid[t * d + j] = xIn[t * d + j] + sum;
      }
    }

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
    const xRes = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        let sum = b2[j];
        for (let k = 0; k < dff; k++) sum += h1[t * dff + k] * w2[k * d + j];
        ffnOut[t * d + j] = sum;
        xRes[t * d + j] = xMid[t * d + j] + sum;
      }
    }

    const xOut = xRes;

    if (globalThis.__SGLM_TRACE__) {
      const qPos = T - 1;
      let sIn = 0, sOut = 0;
      for (let j = 0; j < d; j++) {
        sIn += xIn[qPos * d + j] * xIn[qPos * d + j];
        sOut += xOut[qPos * d + j] * xOut[qPos * d + j];
      }
      const id = this.lastSeq ? this.lastSeq[qPos] : qPos;
      const tokName = this.tokenizer ? this.tokenizer.decode([id]).trim() : `pos_${qPos}`;
      console.log(`[Layer ${layerIdx}] qPos [${qPos}] "${tokName}" | Norm before: ${Math.sqrt(sIn).toFixed(4)} | Norm after: ${Math.sqrt(sOut).toFixed(4)}`);
    }

    return {
      xOut,
      blockCache: { xIn, xNorm1, rmsInv1, Q, K, V, Q_rot, K_rot, attnWeights, multiHeadOut, xMid, xNorm2, rmsInv2, h1, ffnOut, xRes, xOut },
    };
  }

  forward(tokenIds, preventSelfCopy = false, maskBOS = false, normQK = false, copyScale = 1.0, querySpan = null) {
    const T = Math.min(tokenIds.length, this.maxSeqLen);
    const seq = tokenIds.slice(0, T);
    this.lastSeq = seq;

    let maxTokId = 0;
    for (let t = 0; t < T; t++) {
      if (seq[t] > maxTokId) maxTokId = seq[t];
    }
    if (maxTokId >= this.vocabSize) {
      this._ensureVocabCapacity(maxTokId + 1);
    }

    const d = this.dModel;
    const v = this.vocabSize;
    const nH = this.nCopyHeads;
    const dH = this.dCopyHead;
    const scale = copyScale / Math.sqrt(dH);

    const x0 = new Float64Array(T * d);
    const embScale = Math.sqrt(d);
    for (let t = 0; t < T; t++) {
      const id = seq[t];
      for (let j = 0; j < d; j++) {
        const peVal = (this.positionEncoding === 'absolute' && this.weights.wpe) ? this.weights.wpe[t * d + j] : 0;
        x0[t * d + j] = (this.weights.wte[id * d + j] + peVal) * embScale;
      }
    }

    if (globalThis.__SGLM_TRACE__) {
      console.log(`\n[Transformer.forward]`);
      console.log(`  * Input sequence length T = ${T}, dModel = ${d}, vocabSize = ${v}`);
      console.log(`  * Input embedding tensor x0 shape: [${T}, ${d}]`);
      console.log(`  * Number of Transformer layers: ${this.nLayers}`);
      console.log(`  * Query / Output position: [${T - 1}]`);
    }

    let xCur = x0;
    const layerCaches = [];
    const layerOutputs = [x0];
    for (let l = 0; l < this.nLayers; l++) {
      const { xOut, blockCache } = this._forwardBlock(xCur, l);
      layerCaches.push(blockCache);
      layerOutputs.push(xOut);
      xCur = xOut;
    }
    const xFinal = xCur;

    // Copy head input: xFinal + x0 skip connection (preserves raw token identity for unseen entities)
    const xCopy = new Float64Array(T * d);
    for (let i = 0; i < T * d; i++) xCopy[i] = xFinal[i] + x0[i];

    // Phase 5: Content Salience QueryBuilder via Continuous Inverse Participation Ratio (IPR)
    const qPos = T - 1;
    let xQuery = null;
    let queryWeights = null;
    let salience = null;

    if (querySpan && querySpan.length === 2 && querySpan[1] >= querySpan[0]) {
      const qS = querySpan[0];
      const qE = querySpan[1];
      const qLen = qE - qS + 1;
      salience = new Float64Array(qLen);
      const cosBuffer = new Float64Array(qS);

      for (let q = qS; q <= qE; q++) {
        let maxDot = -Infinity;
        let normQ = 0;
        for (let k = 0; k < d; k++) normQ += x0[q * d + k] * x0[q * d + k];
        normQ = Math.sqrt(normQ) + 1e-12;

        for (let j = 0; j < qS; j++) {
          let dot = 0, normJ = 0;
          for (let k = 0; k < d; k++) {
            dot += x0[q * d + k] * x0[j * d + k];
            normJ += x0[j * d + k] * x0[j * d + k];
          }
          normJ = Math.sqrt(normJ) + 1e-12;
          const cVal = dot / (normQ * normJ);
          cosBuffer[j] = cVal;
          if (cVal > maxDot) maxDot = cVal;
        }

        const peak = Math.max(0, maxDot);
        if (peak <= 1e-6) {
          salience[q - qS] = 0;
          continue;
        }
        let sumExp = 0;
        for (let j = 0; j < qS; j++) {
          const ev = Math.exp((cosBuffer[j] - maxDot) * 10.0);
          cosBuffer[j] = ev;
          sumExp += ev;
        }
        const invSum = 1.0 / (sumExp + 1e-12);
        let ipr = 0;
        for (let j = 0; j < qS; j++) {
          const p = cosBuffer[j] * invSum;
          ipr += p * p;
        }
        salience[q - qS] = peak * ipr;
      }

      queryWeights = new Float64Array(qLen);
      let sumPower = 0;
      for (let q = 0; q < qLen; q++) {
        const val = Math.pow(Math.max(0, salience[q]), 2.0);
        queryWeights[q] = val;
        sumPower += val;
      }
      if (sumPower > 1e-12) {
        for (let q = 0; q < qLen; q++) queryWeights[q] /= sumPower;
      } else {
        queryWeights.fill(1.0 / qLen);
      }

      xQuery = new Float64Array(d);
      for (let q = qS; q <= qE; q++) {
        const w = queryWeights[q - qS];
        for (let k = 0; k < d; k++) xQuery[k] += w * xCopy[q * d + k];
      }
    }

    // Phase 6: Multi-Head Copy Projections
    const CQ = new Float64Array(T * d);
    const CK = new Float64Array(T * d);
    const CQ_raw = new Float64Array(T * d);
    const CK_raw = new Float64Array(T * d);
    const CQ_norm = new Float64Array(T * nH);
    const CK_norm = new Float64Array(T * nH);

    for (let t = 0; t < T; t++) {
      const isQueryPos = (t === qPos && xQuery !== null);
      const xSrc = isQueryPos ? xQuery : xCopy.subarray(t * d, (t + 1) * d);

      for (let j = 0; j < d; j++) {
        let sumQ = 0, sumK = 0;
        for (let k = 0; k < d; k++) {
          sumQ += xSrc[k] * this.weights.wcq[k * d + j];
          sumK += xCopy[t * d + k] * this.weights.wck[k * d + j];
        }
        CQ_raw[t * d + j] = sumQ;
        CK_raw[t * d + j] = sumK;
      }

      // Per-head normalization
      for (let h = 0; h < nH; h++) {
        let normSqQ = 0, normSqK = 0;
        const offsetH = h * dH;
        for (let k = 0; k < dH; k++) {
          const qVal = CQ_raw[t * d + offsetH + k];
          const kVal = CK_raw[t * d + offsetH + k];
          normSqQ += qVal * qVal;
          normSqK += kVal * kVal;
        }
        const nQ = Math.sqrt(normSqQ) + 1e-12;
        const nK = Math.sqrt(normSqK) + 1e-12;
        CQ_norm[t * nH + h] = nQ;
        CK_norm[t * nH + h] = nK;

        for (let k = 0; k < dH; k++) {
          CQ[t * d + offsetH + k] = normQK ? CQ_raw[t * d + offsetH + k] / nQ : CQ_raw[t * d + offsetH + k];
          CK[t * d + offsetH + k] = normQK ? CK_raw[t * d + offsetH + k] / nK : CK_raw[t * d + offsetH + k];
        }
      }
    }

    // Content-based dot product without positional rotation on copy head
    const copyScores = new Float64Array(nH * T * T);
    const copyWeights = new Float64Array(nH * T * T);
    const ensembleWeights = new Float64Array(T * T);

    for (let h = 0; h < nH; h++) {
      const offsetH = h * dH;
      const hOffset = h * T * T;

      for (let i = 0; i < T; i++) {
        let maxS = -Infinity;
        const minJ = (maskBOS && i > 0) ? 1 : 0;
        const maxJ = (querySpan && i === T - 1) ? querySpan[0] - 1 : ((preventSelfCopy && i > minJ) ? i - 1 : i);

        for (let j = minJ; j <= maxJ; j++) {
          let dot = 0;
          for (let k = 0; k < dH; k++) {
            dot += CQ[i * d + offsetH + k] * CK[j * d + offsetH + k];
          }
          const s = dot * scale;
          copyScores[hOffset + i * T + j] = s;
          if (s > maxS) maxS = s;
        }

        let sumExp = 0;
        for (let j = minJ; j <= maxJ; j++) {
          const expVal = Math.exp(copyScores[hOffset + i * T + j] - maxS);
          copyWeights[hOffset + i * T + j] = expVal;
          sumExp += expVal;
        }
        for (let j = minJ; j <= maxJ; j++) {
          copyWeights[hOffset + i * T + j] /= sumExp;
          ensembleWeights[i * T + j] += copyWeights[hOffset + i * T + j] / nH;
        }
      }
    }

    if (globalThis.__SGLM_TRACE__) {
      const qPos = T - 1;
      const memEnd = (querySpan ? querySpan[0] : qPos);

      // Dynamic vocabulary tokens present in sequence for diagnostic measurement
      const keyMap = {};
      if (this.tokenizer) {
        const seen = new Set(seq);
        for (const id of seen) {
          const w = this.tokenizer.decode([id]).trim();
          if (w && !['', '<|bos|>', '<|pad|>'].includes(w)) keyMap[w] = id;
        }
      }

      console.log(`\n========================================================================`);
      console.log(`[SGLM NATIVE EXECUTION PATH TRACE] Sequence Length T=${T}`);
      console.log(`========================================================================`);

      // 1. Trace position 18 (?) progression across layers
      console.log(`\n--- POSITION [${qPos}] ("?") REPRESENTATION PROGRESSION ---`);
      const vecStages = [
        { name: 'x0 (Input Embedding)', vec: x0 },
        { name: 'Layer 0 Norm1', vec: layerCaches[0].xNorm1 },
        { name: 'Layer 0 AttnOut', vec: layerCaches[0].multiHeadOut },
        { name: 'Layer 0 Residual', vec: layerCaches[0].xMid },
        { name: 'Layer 0 Out (xOut0)', vec: layerOutputs[1] },
        { name: 'Layer 1 Norm1', vec: layerCaches[1].xNorm1 },
        { name: 'Layer 1 AttnOut', vec: layerCaches[1].multiHeadOut },
        { name: 'Layer 1 Residual', vec: layerCaches[1].xMid },
        { name: 'Layer 1 Out (xFinal)', vec: xFinal },
        { name: 'xCopy (xFinal + x0)', vec: xCopy },
      ];

      for (const st of vecStages) {
        let norm = 0;
        for (let k = 0; k < d; k++) norm += st.vec[qPos * d + k] * st.vec[qPos * d + k];
        norm = Math.sqrt(norm);
        
        // Alignment with key token embeddings in x0
        const sims = [];
        for (const [kw, kid] of Object.entries(keyMap)) {
          let dot = 0, nEmb = 0;
          for (let k = 0; k < d; k++) {
            const vK = st.vec[qPos * d + k];
            const eK = this.weights.wte[kid * d + k];
            dot += vK * eK;
            nEmb += eK * eK;
          }
          const cos = dot / (norm * Math.sqrt(nEmb) + 1e-12);
          sims.push(`${kw}:${cos.toFixed(3)}`);
        }
        console.log(`  ${st.name.padEnd(24)} | Norm: ${norm.toFixed(2).padStart(7)} | Sim(x0): [${sims.join(', ')}]`);
      }

      // 2. Attention from position 18 across layers & heads
      for (let l = 0; l < this.nLayers; l++) {
        console.log(`\n--- LAYER ${l} ATTENTION FROM POSITION [${qPos}] ("?") ---`);
        for (let h = 0; h < this.nHeads; h++) {
          const headScores = [];
          for (let j = 0; j <= qPos; j++) {
            const w = layerCaches[l].attnWeights[h * T * T + qPos * T + j];
            const id = seq[j];
            const tokName = this.tokenizer ? this.tokenizer.decode([id]).trim() : `pos_${j}`;
            headScores.push({ pos: j, tok: tokName, w });
          }
          headScores.sort((a, b) => b.w - a.w);
          const top3 = headScores.slice(0, 4).map(s => `pos ${s.pos} "${s.tok}": ${(s.w * 100).toFixed(1)}%`).join(' | ');
          console.log(`  Head ${h}: ${top3}`);
        }
      }

      // 3. CopyHead CQ Pipeline & Dot Products
      console.log(`\n--- COPY HEAD CQ PIPELINE & ATTENTION FROM POSITION [${qPos}] ("?") ---`);

      const rawQ = CQ_raw.subarray(qPos * d, (qPos + 1) * d);
      const normQ = CQ.subarray(qPos * d, (qPos + 1) * d);
      const xSrcQ = xCopy.subarray(qPos * d, (qPos + 1) * d);

      const normXSrc = this._computeVectorNorm(xSrcQ, 0, d);
      const normRawCQ = this._computeVectorNorm(rawQ, 0, d);
      const normNormCQ = this._computeVectorNorm(normQ, 0, d);

      let minX = Infinity, maxX = -Infinity;
      for (let k = 0; k < d; k++) {
        if (xSrcQ[k] < minX) minX = xSrcQ[k];
        if (xSrcQ[k] > maxX) maxX = xSrcQ[k];
      }

      console.log(`  * 1. Query Source (xCopy[${qPos}]) norm: ${normXSrc.toFixed(6)} [min: ${minX.toFixed(4)}, max: ${maxX.toFixed(4)}]`);
      console.log(`       - First 5 values: [${Array.from(xSrcQ.subarray(0, 5)).map(v => v.toFixed(4)).join(', ')}]`);
      console.log(`  * 2. Raw Wcq(xSrc) [CQ_raw] norm (BEFORE normalization): ${normRawCQ.toFixed(6)}`);
      for (let h = 0; h < nH; h++) {
        const nQ_h = this._computeVectorNorm(rawQ, h * dH, dH);
        console.log(`       - Head ${h} Raw Norm: ${nQ_h.toFixed(6)}`);
      }
      console.log(`  * 3. Normalized CQ norm (AFTER normalization): ${normNormCQ.toFixed(6)}`);

      if (queryWeights && querySpan) {
        console.log(`\n--- CONTINUOUS IPR QUERY SALIENCE (querySpan: [${querySpan[0]} .. ${querySpan[1]}]) ---`);
        for (let q = querySpan[0]; q <= querySpan[1]; q++) {
          const id = seq[q];
          const tokName = this.tokenizer ? this.tokenizer.decode([id]).trim() : `pos_${q}`;
          const w = queryWeights[q - querySpan[0]];
          console.log(`     pos ${q.toString().padStart(2)}: "${tokName.padEnd(10)}" -> ${(w * 100).toFixed(2).padStart(6)}% weight`);
        }
      }

      // Comparative pipeline trace against previous execution if history exists
      if (!globalThis.__SGLM_CQ_HISTORY__) globalThis.__SGLM_CQ_HISTORY__ = [];
      const history = globalThis.__SGLM_CQ_HISTORY__;
      const currentEntry = {
        x0: new Float64Array(x0.subarray(qPos * d, (qPos + 1) * d)),
        xOut0: new Float64Array(layerOutputs[1].subarray(qPos * d, (qPos + 1) * d)),
        xFinal: new Float64Array(xFinal.subarray(qPos * d, (qPos + 1) * d)),
        xCopy: new Float64Array(xSrcQ),
        xQuery: xQuery ? new Float64Array(xQuery) : null,
        rawCQ: new Float64Array(rawQ),
        normCQ: new Float64Array(normQ),
      };
      history.push(currentEntry);

      if (history.length >= 2) {
        const prev = history[history.length - 2];
        const curr = currentEntry;

        const calcDiff = (v1, v2) => {
          let sum = 0;
          for (let i = 0; i < v1.length; i++) {
            const diff = v1[i] - v2[i];
            sum += diff * diff;
          }
          return Math.sqrt(sum);
        };
        const calcCos = (v1, v2) => {
          let dot = 0, n1 = 0, n2 = 0;
          for (let i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            n1 += v1[i] * v1[i];
            n2 += v2[i] * v2[i];
          }
          return dot / (Math.sqrt(n1) * Math.sqrt(n2) + 1e-12);
        };

        console.log(`\n  ========================================================================================`);
        console.log(`  [SGLM_CQ_PIPELINE: COMPARATIVE STAGE-BY-STAGE DIVERGENCE (CASE A vs CASE B)]`);
        console.log(`  ========================================================================================`);
        console.log(`  Stage              | Cosine Sim | L2 Difference | Prev Norm  | Curr Norm`);
        console.log(`  -------------------+------------+---------------+------------+-----------`);
        console.log(`  x0[qPos]           | ${calcCos(prev.x0, curr.x0).toFixed(6).padEnd(10)} | ${calcDiff(prev.x0, curr.x0).toFixed(6).padEnd(13)} | ${this._computeVectorNorm(prev.x0, 0, d).toFixed(4).padEnd(10)} | ${this._computeVectorNorm(curr.x0, 0, d).toFixed(4)}`);
        console.log(`  Layer 0 Out (xOut0)| ${calcCos(prev.xOut0, curr.xOut0).toFixed(6).padEnd(10)} | ${calcDiff(prev.xOut0, curr.xOut0).toFixed(6).padEnd(13)} | ${this._computeVectorNorm(prev.xOut0, 0, d).toFixed(4).padEnd(10)} | ${this._computeVectorNorm(curr.xOut0, 0, d).toFixed(4)}`);
        console.log(`  Layer 1 Out(xFinal)| ${calcCos(prev.xFinal, curr.xFinal).toFixed(6).padEnd(10)} | ${calcDiff(prev.xFinal, curr.xFinal).toFixed(6).padEnd(13)} | ${this._computeVectorNorm(prev.xFinal, 0, d).toFixed(4).padEnd(10)} | ${this._computeVectorNorm(curr.xFinal, 0, d).toFixed(4)}`);
        console.log(`  xCopy[qPos]        | ${calcCos(prev.xCopy, curr.xCopy).toFixed(6).padEnd(10)} | ${calcDiff(prev.xCopy, curr.xCopy).toFixed(6).padEnd(13)} | ${this._computeVectorNorm(prev.xCopy, 0, d).toFixed(4).padEnd(10)} | ${this._computeVectorNorm(curr.xCopy, 0, d).toFixed(4)}`);
        if (prev.xQuery && curr.xQuery) {
          console.log(`  xQuery (IPR Salience)| ${calcCos(prev.xQuery, curr.xQuery).toFixed(6).padEnd(10)} | ${calcDiff(prev.xQuery, curr.xQuery).toFixed(6).padEnd(13)} | ${this._computeVectorNorm(prev.xQuery, 0, d).toFixed(4).padEnd(10)} | ${this._computeVectorNorm(curr.xQuery, 0, d).toFixed(4)}`);
        }
        console.log(`  raw CQ[qPos]       | ${calcCos(prev.rawCQ, curr.rawCQ).toFixed(6).padEnd(10)} | ${calcDiff(prev.rawCQ, curr.rawCQ).toFixed(6).padEnd(13)} | ${this._computeVectorNorm(prev.rawCQ, 0, d).toFixed(4).padEnd(10)} | ${this._computeVectorNorm(curr.rawCQ, 0, d).toFixed(4)}`);
        console.log(`  normalized CQ[qPos]| ${calcCos(prev.normCQ, curr.normCQ).toFixed(6).padEnd(10)} | ${calcDiff(prev.normCQ, curr.normCQ).toFixed(6).padEnd(13)} | ${this._computeVectorNorm(prev.normCQ, 0, d).toFixed(4).padEnd(10)} | ${this._computeVectorNorm(curr.normCQ, 0, d).toFixed(4)}`);
        console.log(`  ========================================================================================\n`);
      }

      // Dynamic CQ Dot Products against Top Attended Memory Tokens
      console.log(`  * CQ Dot Products against Top Attended Memory Tokens (Raw vs. Normalized):`);
      const memTokens = [];
      for (let p = 0; p < memEnd; p++) {
        memTokens.push({ p, w: ensembleWeights[qPos * T + p] });
      }
      memTokens.sort((a, b) => b.w - a.w);
      for (const item of memTokens.slice(0, 5)) {
        const p = item.p;
        const id = seq[p];
        const tokName = this.tokenizer ? this.tokenizer.decode([id]).trim() : `pos_${p}`;
        console.log(`     Token: "${tokName}" at pos ${p}:`);
        for (let h = 0; h < nH; h++) {
          const offsetH = h * dH;
          let rawDot = 0, normDot = 0;
          for (let k = 0; k < dH; k++) {
            rawDot += rawQ[offsetH + k] * CK_raw[p * d + offsetH + k];
            normDot += normQ[offsetH + k] * CK[p * d + offsetH + k];
          }
          const s = copyScores[h * T * T + qPos * T + p];
          console.log(`       Head ${h} -> raw CQ dot: ${rawDot.toFixed(6)} | normalized CQ dot: ${normDot.toFixed(6)} | Scaled Score: ${s.toFixed(4)}`);
        }
        console.log(`       -> Ensemble Probability: ${(item.w * 100).toFixed(2)}%`);
      }
    }

    const tokenProbs = new Float64Array(T * v);
    for (let t = 0; t < T; t++) {
      const minJ = (maskBOS && t > 0) ? 1 : 0;
      const maxJ = (querySpan && t === T - 1) ? querySpan[0] - 1 : ((preventSelfCopy && t > minJ) ? t - 1 : t);
      for (let pos = minJ; pos <= maxJ; pos++) {
        const tok = seq[pos];
        if (tok < v) tokenProbs[t * v + tok] += ensembleWeights[t * T + pos];
      }
    }

    const logits = new Float64Array(T * v);
    for (let idx = 0; idx < logits.length; idx++) {
      logits[idx] = Math.log(Math.max(tokenProbs[idx], 1e-12));
    }

    if (globalThis.__SGLM_TRACE__) {
      const qPos = T - 1;
      console.log(`\n[OutputHead]`);
      console.log(`  * Logits source: log(tokenProbs)`);
      console.log(`  * Probability calculation: P(tok) = sum_{pos: seq[pos] == tok} copyWeight(qPos, pos)`);
      console.log(`  * Probabilities accumulated across repeated token positions: YES`);
      const cand = [];
      for (let c = 0; c < v; c++) {
        const p = tokenProbs[qPos * v + c];
        if (p > 1e-6) cand.push({ id: c, tok: this.tokenizer ? this.tokenizer.decode([c]).trim() : `tok_${c}`, p });
      }
      cand.sort((a, b) => b.p - a.p);
      console.log(`  * Top 5 token probabilities at output position [${qPos}]:`);
      cand.slice(0, 5).forEach((c, i) => {
        console.log(`     ${i + 1}. "${c.tok}" -> ${(c.p * 100).toFixed(2)}%`);
      });
    }

    return {
      logits,
      tokenProbs,
      copyWeights: ensembleWeights,
      headWeights: copyWeights,
      cache: {
        tokenIds: seq,
        T,
        x0,
        layerCaches,
        layerOutputs,
        xFinal,
        xCopy,
        xQuery,
        queryWeights,
        querySpan,
        qPos,
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
        ensembleWeights,
        tokenProbs,
        logits,
      },
    };
  }

  lossAndGrad(inputTokens, targetTokens, lossMask = null, preventSelfCopy = false, maskBOS = false, normQK = false, copyScale = 1.0, querySpan = null) {
    const { tokenProbs, cache } = this.forward(inputTokens, preventSelfCopy, maskBOS, normQK, copyScale, querySpan);
    const ensembleWeights = cache.ensembleWeights;
    const T = cache.T;
    const v = this.vocabSize;
    const d = this.dModel;
    const nH = this.nCopyHeads;
    const dH = this.dCopyHead;
    const scale = copyScale / Math.sqrt(dH);

    const grads = {};
    for (const k of Object.keys(this.weights)) grads[k] = new Float64Array(this.weights[k].length);

    let totalLoss = 0;
    let validSteps = 0;
    const dEnsembleWeights = new Float64Array(T * T);

    for (let t = 0; t < T; t++) {
      if (lossMask && lossMask[t] === 0) continue;

      const target = targetTokens[t];
      if (target === undefined || target < 0 || target >= v) continue;

      const pTarget = Math.max(tokenProbs[t * v + target], 1e-12);
      totalLoss += -Math.log(pTarget);
      validSteps++;

      const gradP = -1.0 / pTarget;
      const minJ = (maskBOS && t > 0) ? 1 : 0;
      const maxJ = (querySpan && t === T - 1) ? querySpan[0] - 1 : ((preventSelfCopy && t > minJ) ? t - 1 : t);
      // Generic cross-entropy gradient accumulation for target token positions
      for (let pos = minJ; pos <= maxJ; pos++) {
        if (cache.tokenIds[pos] === target) {
          dEnsembleWeights[t * T + pos] = gradP;
        }
      }
    }

    const loss = validSteps > 0 ? totalLoss / validSteps : 0;
    const norm = validSteps > 0 ? 1.0 / validSteps : 1.0;

    if (globalThis.__SGLM_TRACE__) {
      console.log(`[FILE: MultiHeadCopyTransformer.js]`);
      console.log(`[LINE: 680]`);
      console.log(`[FUNCTION: lossAndGrad()]`);
      console.log(`[ACTION: LOSS]\n`);
      for (let t = 0; t < T; t++) {
        if (lossMask && lossMask[t] === 1) {
          const target = targetTokens[t];
          const targetWord = this.tokenizer ? this.tokenizer.decode([target]).trim() : `tok_${target}`;
          const pTarget = tokenProbs[t * v + target];
          let maxP = -1, predC = -1;
          for (let c = 0; c < v; c++) {
            if (tokenProbs[t * v + c] > maxP) { maxP = tokenProbs[t * v + c]; predC = c; }
          }
          const predWord = this.tokenizer ? this.tokenizer.decode([predC]).trim() : `tok_${predC}`;
          console.log(`Target position:    [${t}]`);
          console.log(`Target token:       "${targetWord}" (ID: ${target})`);
          console.log(`Target probability: ${(pTarget * 100).toFixed(2)}%`);
          console.log(`Prediction:         "${predWord}" (${(maxP * 100).toFixed(2)}%)`);
          console.log(`Loss:               ${loss.toFixed(6)} (-log(pTarget))\n`);
        }
      }
    }

    const dCQ = new Float64Array(T * d);
    const dCK = new Float64Array(T * d);

    for (let h = 0; h < nH; h++) {
      const offsetH = h * dH;
      const hOffset = h * T * T;

      for (let i = 0; i < T; i++) {
        let sumGradW = 0;
        const minJ = (maskBOS && i > 0) ? 1 : 0;
        const maxJ = (querySpan && i === T - 1) ? querySpan[0] - 1 : ((preventSelfCopy && i > minJ) ? i - 1 : i);

        for (let j = minJ; j <= maxJ; j++) {
          const dW = (dEnsembleWeights[i * T + j] / nH) * norm;
          sumGradW += dW * cache.copyWeights[hOffset + i * T + j];
        }

        for (let j = minJ; j <= maxJ; j++) {
          const dW = (dEnsembleWeights[i * T + j] / nH) * norm;
          const w = cache.copyWeights[hOffset + i * T + j];
          const dS = (w * (dW - sumGradW)) * scale;

          for (let k = 0; k < dH; k++) {
            dCQ[i * d + offsetH + k] += dS * cache.CK[j * d + offsetH + k];
            dCK[j * d + offsetH + k] += dS * cache.CQ[i * d + offsetH + k];
          }
        }
      }
    }

    const dCQ_raw = new Float64Array(T * d);
    const dCK_raw = new Float64Array(T * d);

    if (normQK) {
      for (let t = 0; t < T; t++) {
        for (let h = 0; h < nH; h++) {
          const offsetH = h * dH;
          const invQ = 1.0 / cache.CQ_norm[t * nH + h];
          const invK = 1.0 / cache.CK_norm[t * nH + h];

          let dotQ = 0, dotK = 0;
          for (let k = 0; k < dH; k++) {
            dotQ += dCQ[t * d + offsetH + k] * cache.CQ[t * d + offsetH + k];
            dotK += dCK[t * d + offsetH + k] * cache.CK[t * d + offsetH + k];
          }

          for (let k = 0; k < dH; k++) {
            dCQ_raw[t * d + offsetH + k] = (dCQ[t * d + offsetH + k] - dotQ * cache.CQ[t * d + offsetH + k]) * invQ;
            dCK_raw[t * d + offsetH + k] = (dCK[t * d + offsetH + k] - dotK * cache.CK[t * d + offsetH + k]) * invK;
          }
        }
      }
    } else {
      dCQ_raw.set(dCQ);
      dCK_raw.set(dCK);
    }

    const dXFinal = new Float64Array(T * d);
    const dXQuery = new Float64Array(d);
    const qPos = cache.qPos;

    for (let t = 0; t < T; t++) {
      const isQueryPos = (t === qPos && cache.xQuery);
      const xSrc = isQueryPos ? cache.xQuery : cache.xCopy.subarray(t * d, (t + 1) * d);

      // Wcq weight gradient
      for (let k = 0; k < d; k++) {
        const xC = xSrc[k];
        for (let j = 0; j < d; j++) {
          grads.wcq[k * d + j] += xC * dCQ_raw[t * d + j];
        }
      }

      // Wck weight gradient + dXFinal accumulation
      for (let k = 0; k < d; k++) {
        const xC = cache.xCopy[t * d + k];
        for (let j = 0; j < d; j++) {
          grads.wck[k * d + j] += xC * dCK_raw[t * d + j];
          dXFinal[t * d + k] += this.weights.wck[k * d + j] * dCK_raw[t * d + j];
        }
      }

      // dX from Wcq^T
      if (isQueryPos) {
        for (let k = 0; k < d; k++) {
          for (let j = 0; j < d; j++) {
            dXQuery[k] += this.weights.wcq[k * d + j] * dCQ_raw[t * d + j];
          }
        }
      } else {
        for (let k = 0; k < d; k++) {
          for (let j = 0; j < d; j++) {
            dXFinal[t * d + k] += this.weights.wcq[k * d + j] * dCQ_raw[t * d + j];
          }
        }
      }
    }

    // Distribute dXQuery gradient back across question tokens using queryWeights
    if (cache.xQuery && cache.querySpan && cache.querySpan.length === 2 && cache.querySpan[1] >= cache.querySpan[0]) {
      const qS = cache.querySpan[0];
      const qE = cache.querySpan[1];
      const queryWeights = cache.queryWeights;
      const qLen = qE - qS + 1;
      for (let q = qS; q <= qE; q++) {
        const w = queryWeights ? queryWeights[q - qS] : 1.0 / qLen;
        for (let k = 0; k < d; k++) {
          dXFinal[q * d + k] += w * dXQuery[k];
        }
      }
    }

    // Save copy head gradient for x0 skip connection before layer backprop
    const dX0_skip = new Float64Array(dXFinal);

    let dXCur = dXFinal;
    for (let l = this.nLayers - 1; l >= 0; l--) {
      dXCur = this._backwardBlock(dXCur, cache.layerCaches[l], l, grads);
    }
    const dX0 = dXCur;

    // Add skip connection gradient: dL/dx0 = dX0_from_layers + dX0_from_copy_skip
    for (let i = 0; i < T * d; i++) dX0[i] += dX0_skip[i];

    // Embedding gradients with chain rule through embedding scale
    const embScale = Math.sqrt(d);
    for (let t = 0; t < T; t++) {
      const id = cache.tokenIds[t] < v ? cache.tokenIds[t] : 3;
      for (let j = 0; j < d; j++) {
        grads.wte[id * d + j] += dX0[t * d + j] * embScale;
        if (this.positionEncoding === 'absolute' && grads.wpe) {
          grads.wpe[t * d + j] += dX0[t * d + j] * embScale;
        }
      }
    }

    if (globalThis.__SGLM_TRACE__) {
      console.log(`[FILE: MultiHeadCopyTransformer.js]`);
      console.log(`[LINE: 840]`);
      console.log(`[FUNCTION: lossAndGrad()]`);
      console.log(`[ACTION: BACKPROPAGATION]\n`);
      let embNorm = 0;
      for (let i = 0; i < grads.wte.length; i++) embNorm += grads.wte[i] * grads.wte[i];
      embNorm = Math.sqrt(embNorm);

      let copyNorm = 0;
      for (const k of ['wcq', 'wck']) {
        if (grads[k]) { for (let i = 0; i < grads[k].length; i++) copyNorm += grads[k][i] * grads[k][i]; }
      }
      copyNorm = Math.sqrt(copyNorm);

      let attnNorm = 0;
      for (let l = 0; l < this.nLayers; l++) {
        for (const k of ['wq', 'wk', 'wv', 'wo']) {
          const g = grads[`${k}${l}`];
          if (g) { for (let i = 0; i < g.length; i++) attnNorm += g[i] * g[i]; }
        }
      }
      attnNorm = Math.sqrt(attnNorm);

      let ffnNorm = 0;
      for (let l = 0; l < this.nLayers; l++) {
        for (const k of ['w1', 'b1', 'w2', 'b2']) {
          const g = grads[`${k}${l}`];
          if (g) { for (let i = 0; i < g.length; i++) ffnNorm += g[i] * g[i]; }
        }
      }
      ffnNorm = Math.sqrt(ffnNorm);

      console.log(`Embedding gradient norm: ${embNorm.toFixed(6)}`);
      console.log(`Attention gradient norm: ${attnNorm.toFixed(6)}`);
      console.log(`FFN gradient norm:       ${ffnNorm.toFixed(6)}`);
      console.log(`Copy-head gradient norm: ${copyNorm.toFixed(6)}`);
      console.log(`Output gradient norm:    ${copyNorm.toFixed(6)}\n`);
    }

    return { loss, grads, dXFinal, dX0, cache };
  }

  _backwardBlock(dXOut, blockCache, layerIdx, grads) {
    const T = blockCache.xIn.length / this.dModel;
    const d = this.dModel;
    const dff = this.dFF;

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

    const dXRes = dXOut;
    const dXMid = new Float64Array(T * d);
    const dFfnOut = new Float64Array(T * d);
    for (let i = 0; i < T * d; i++) {
      dXMid[i] = dXRes[i];
      dFfnOut[i] = dXRes[i];
    }

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

    const dXMid_from_ffn = this._backwardRmsNorm(dXNorm2, blockCache.xMid, blockCache.rmsInv2, T, d);
    for (let i = 0; i < T * d; i++) dXMid[i] += dXMid_from_ffn[i];

    const nH = this.nHeads;
    const dH = this.dHead;
    const scale = 1.0 / Math.sqrt(dH);

    const dXIn = new Float64Array(T * d);
    const dMultiHeadOut = new Float64Array(T * d);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < d; j++) {
        const dM = dXMid[t * d + j];
        dXIn[t * d + j] += dM;
        for (let k = 0; k < d; k++) {
          gwo[k * d + j] += blockCache.multiHeadOut[t * d + k] * dM;
          dMultiHeadOut[t * d + k] += wo[k * d + j] * dM;
        }
      }
    }

    const dV = new Float64Array(T * d);
    const dAttnWeights = new Float64Array(nH * T * T);
    const dAttnScores = new Float64Array(nH * T * T);
    const dQ_rot = new Float64Array(T * d);
    const dK_rot = new Float64Array(T * d);

    for (let h = 0; h < nH; h++) {
      const offsetH = h * dH;
      const hOffset = h * T * T;

      for (let i = 0; i < T; i++) {
        for (let k = 0; k < dH; k++) {
          const dOut = dMultiHeadOut[i * d + offsetH + k];
          for (let j = 0; j <= i; j++) {
            dAttnWeights[hOffset + i * T + j] += dOut * blockCache.V[j * d + offsetH + k];
            dV[j * d + offsetH + k] += blockCache.attnWeights[hOffset + i * T + j] * dOut;
          }
        }
      }

      for (let i = 0; i < T; i++) {
        let sumGradP = 0;
        for (let j = 0; j <= i; j++) {
          sumGradP += dAttnWeights[hOffset + i * T + j] * blockCache.attnWeights[hOffset + i * T + j];
        }
        for (let j = 0; j <= i; j++) {
          const p = blockCache.attnWeights[hOffset + i * T + j];
          dAttnScores[hOffset + i * T + j] = p * (dAttnWeights[hOffset + i * T + j] - sumGradP);
        }
      }

      for (let i = 0; i < T; i++) {
        for (let j = 0; j <= i; j++) {
          const dS = dAttnScores[hOffset + i * T + j] * scale;
          for (let k = 0; k < dH; k++) {
            dQ_rot[i * d + offsetH + k] += dS * blockCache.K_rot[j * d + offsetH + k];
            dK_rot[j * d + offsetH + k] += dS * blockCache.Q_rot[i * d + offsetH + k];
          }
        }
      }
    }

    const dQ = (this.positionEncoding === 'rope' || this.positionEncoding === 'segment_rope') ? this._applyRoPE(dQ_rot, T, dH, true) : dQ_rot;
    const dK = (this.positionEncoding === 'rope' || this.positionEncoding === 'segment_rope') ? this._applyRoPE(dK_rot, T, dH, true) : dK_rot;

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

    const dXIn_from_attn = this._backwardRmsNorm(dXNorm1, blockCache.xIn, blockCache.rmsInv1, T, d);
    for (let i = 0; i < T * d; i++) dXIn[i] += dXIn_from_attn[i];

    if (globalThis.__SGLM_TRACE__) {
      let normEntering = 0, normLeaving = 0;
      for (let i = 0; i < dXOut.length; i++) normEntering += dXOut[i] * dXOut[i];
      for (let i = 0; i < dXIn.length; i++) normLeaving += dXIn[i] * dXIn[i];
      console.log(`[FILE: MultiHeadCopyTransformer.js]`);
      console.log(`[LINE: 1020]`);
      console.log(`[FUNCTION: _backwardBlock()]`);
      console.log(`[ACTION: BACKPROPAGATION]\n`);
      console.log(`Layer: ${layerIdx}`);
      console.log(`Gradient entering: norm = ${Math.sqrt(normEntering).toFixed(6)}`);
      console.log(`Gradient leaving:  norm = ${Math.sqrt(normLeaving).toFixed(6)}\n`);
    }

    return dXIn;
  }

  /**
   * Fact-Targeting Loss & Analytical Gradients for W_cq and W_ck.
   * L_fact = -log(A_target)
   * where A_target = sum_{j in targetSpan} ensembleWeights[qPos * T + j]
   *
   * Trains ONLY W_cq and W_ck. Leaves all Transformer weights (W_Q, W_K, W_V, W_O, FFN) frozen.
   *
   * @param {number[]} inputTokens - Full prompt sequence IDs
   * @param {[number, number]} targetSpan - [startIndex, endIndex] of the target fact in the sequence
   * @param {[number, number]} querySpan - [startIndex, endIndex] of the query in the sequence
   * @param {Object} [options={}]
   * @returns {{ loss: number, targetAttn: number, grads: Object }}
   */
  lossAndGradFactTargeting(inputTokens, targetSpan, querySpan, { copyScale = 20.0, preventSelfCopy = true, maskBOS = true, normQK = true } = {}) {
    const fwd = this.forward(inputTokens, preventSelfCopy, maskBOS, normQK, copyScale, querySpan);
    const cache = fwd.cache;
    const ensembleWeights = cache.ensembleWeights;
    const headWeights = cache.copyWeights;
    const T = cache.T;
    const d = this.dModel;
    const nH = this.nCopyHeads;
    const dH = this.dCopyHead;
    const scale = copyScale / Math.sqrt(dH);
    const qPos = T - 1;

    // 1. Calculate Target Fact Attention Mass A_target
    const [tStart, tEnd] = targetSpan;
    let aTarget = 0;
    for (let j = tStart; j <= tEnd; j++) {
      aTarget += ensembleWeights[qPos * T + j];
    }
    aTarget = Math.max(aTarget, 1e-12);
    const loss = -Math.log(aTarget);

    if (globalThis.__SGLM_TRACE__) {
      console.log(`\n[FactTargeting.loss]`);
      console.log(`  * Target Fact Span: [${tStart} .. ${tEnd}]`);
      console.log(`  * A_target (Attn mass on target fact): ${(aTarget * 100).toFixed(4)}%`);
      console.log(`  * L_fact = -log(A_target):              ${loss.toFixed(6)}`);
    }

    // 2. Gradients w.r.t. ensembleWeights[qPos, j]
    // dL / d(alpha_j) = -1 / A_target for j in targetSpan, and 0 for j outside
    const dEnsembleWeights = new Float64Array(T * T);
    const gradVal = -1.0 / aTarget;
    for (let j = tStart; j <= tEnd; j++) {
      dEnsembleWeights[qPos * T + j] = gradVal;
    }

    // 3. Backprop through multi-head copy attention into CQ and CK
    const dCQ = new Float64Array(T * d);
    const dCK = new Float64Array(T * d);

    for (let h = 0; h < nH; h++) {
      const offsetH = h * dH;
      const hOffset = h * T * T;

      let sumGradW = 0;
      const minJ = (maskBOS && qPos > 0) ? 1 : 0;
      const maxJ = (preventSelfCopy && qPos > minJ) ? qPos - 1 : qPos;

      for (let j = minJ; j <= maxJ; j++) {
        const dW = dEnsembleWeights[qPos * T + j] / nH;
        sumGradW += dW * headWeights[hOffset + qPos * T + j];
      }

      for (let j = minJ; j <= maxJ; j++) {
        const dW = dEnsembleWeights[qPos * T + j] / nH;
        const w = headWeights[hOffset + qPos * T + j];
        const dS = (w * (dW - sumGradW)) * scale;

        for (let k = 0; k < dH; k++) {
          dCQ[qPos * d + offsetH + k] += dS * cache.CK[j * d + offsetH + k];
          dCK[j * d + offsetH + k] += dS * cache.CQ[qPos * d + offsetH + k];
        }
      }
    }

    // 4. Backprop through per-head normalization if normQK is true
    const dCQ_raw = new Float64Array(T * d);
    const dCK_raw = new Float64Array(T * d);

    if (normQK) {
      for (let h = 0; h < nH; h++) {
        const offsetH = h * dH;
        const invQ = 1.0 / cache.CQ_norm[qPos * nH + h];
        let dotQ = 0;
        for (let k = 0; k < dH; k++) {
          dotQ += dCQ[qPos * d + offsetH + k] * cache.CQ[qPos * d + offsetH + k];
        }
        for (let k = 0; k < dH; k++) {
          dCQ_raw[qPos * d + offsetH + k] = (dCQ[qPos * d + offsetH + k] - dotQ * cache.CQ[qPos * d + offsetH + k]) * invQ;
        }
      }

      const memEnd = (querySpan ? querySpan[0] : qPos);
      for (let t = 0; t < memEnd; t++) {
        for (let h = 0; h < nH; h++) {
          const offsetH = h * dH;
          const invK = 1.0 / cache.CK_norm[t * nH + h];
          let dotK = 0;
          for (let k = 0; k < dH; k++) {
            dotK += dCK[t * d + offsetH + k] * cache.CK[t * d + offsetH + k];
          }
          for (let k = 0; k < dH; k++) {
            dCK_raw[t * d + offsetH + k] = (dCK[t * d + offsetH + k] - dotK * cache.CK[t * d + offsetH + k]) * invK;
          }
        }
      }
    } else {
      dCQ_raw.set(dCQ);
      dCK_raw.set(dCK);
    }

    // 5. Gradients for W_cq and W_ck (Transformer layers remain frozen)
    const grads = {};
    for (const k of Object.keys(this.weights)) {
      grads[k] = new Float64Array(this.weights[k].length);
    }

    const xSrc = cache.xQuery !== null ? cache.xQuery : cache.xCopy.subarray(qPos * d, (qPos + 1) * d);
    for (let k = 0; k < d; k++) {
      const xC = xSrc[k];
      for (let j = 0; j < d; j++) {
        grads.wcq[k * d + j] += xC * dCQ_raw[qPos * d + j];
      }
    }

    const memEnd = (querySpan ? querySpan[0] : qPos);
    for (let t = 0; t < memEnd; t++) {
      for (let k = 0; k < d; k++) {
        const xC = cache.xCopy[t * d + k];
        for (let j = 0; j < d; j++) {
          grads.wck[k * d + j] += xC * dCK_raw[t * d + j];
        }
      }
    }

    if (globalThis.__SGLM_TRACE__) {
      let normCQ = 0, normCK = 0;
      for (let i = 0; i < grads.wcq.length; i++) normCQ += grads.wcq[i] * grads.wcq[i];
      for (let i = 0; i < grads.wck.length; i++) normCK += grads.wck[i] * grads.wck[i];
      console.log(`[FactTargeting.gradients]`);
      console.log(`  * ||grad(W_cq)|| = ${Math.sqrt(normCQ).toFixed(6)}`);
      console.log(`  * ||grad(W_ck)|| = ${Math.sqrt(normCK).toFixed(6)}`);
      console.log(`  * Transformer layers (W_Q, W_K, W_V, W_O): FROZEN (gradient = 0)`);
    }

    return { loss, targetAttn: aTarget, grads };
  }

  /**
   * Exports model weights as a plain JSON-serializable object
   */
  exportWeights() {
    const exported = {};
    for (const [key, tensor] of Object.entries(this.weights)) {
      exported[key] = Array.from(tensor);
    }
    return exported;
  }

  /**
   * Loads model weights from a JSON object
   */
  loadWeights(weightsObj) {
    if (!weightsObj || typeof weightsObj !== 'object') return false;
    for (const [key, arr] of Object.entries(weightsObj)) {
      if (this.weights[key] && Array.isArray(arr)) {
        if (this.weights[key].length === arr.length) {
          this.weights[key].set(arr);
        } else {
          // Adapt capacity if vocabulary or dimensions expanded
          this.weights[key] = new Float64Array(arr);
        }
      }
    }
    return true;
  }
}

