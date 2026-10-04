/**
 * experiment_relational_binding.js
 *
 * SGLM Relational Binding Experiment:
 * Testing whether SGLM can learn the reusable structure:
 *   Subject -> Relationship -> Object
 * independent of entity identity, position, and lexical familiarity.
 *
 * Critical Test:
 *   Context: "Zara is mentor of Kael ."
 *   Query  : "Who is mentor of Zara ?"
 *   Model must select "Kael" even though "Zara" and "Kael" were never present in training.
 */

import { TransparentInspectableTokenizer } from '../kernel/TransparentInspectableTokenizer.js';
import { MultiHeadCopyTransformer } from '../kernel/MultiHeadCopyTransformer.js';
import { AnalyticalAdamWTrainer } from '../kernel/AnalyticalAdamWTrainer.js';

function createRng(seed) {
  let a = (seed ^ 0x9E3779B9) >>> 0;
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Model A: Current Baseline from previous experiment (Target-Supervised Copy Transformer)
class CurrentModel extends MultiHeadCopyTransformer {
  lossAndGrad(inputTokens, targetTokens, lossMask = null, preventSelfCopy = false, maskBOS = false, normQK = false, copyScale = 1.0, querySpan = null) {
    const { tokenProbs, ensembleWeights, cache } = this.forward(inputTokens, preventSelfCopy, maskBOS, normQK, copyScale, querySpan);
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
      const maxJ = (preventSelfCopy && t > minJ) ? t - 1 : t;
      const isQueryPos = (t === T - 1 && querySpan !== null);

      if (isQueryPos) {
        const periods = [];
        for (let p = 0; p < querySpan[0]; p++) {
          const tok = cache.tokenIds[p];
          const tokName = this.tokenizer ? this.tokenizer.decode([tok]).trim() : '';
          if (tokName === '.') periods.push(p);
        }
        if (periods.length > 0) {
          let fStart = 1;
          for (let f = 0; f < periods.length; f++) {
            const pEnd = periods[f];
            const targetPos = pEnd - 1;
            if (targetPos >= fStart && cache.tokenIds[targetPos] === target) {
              dEnsembleWeights[t * T + targetPos] = gradP;
            }
            fStart = pEnd + 1;
          }
        } else {
          for (let pos = minJ; pos <= maxJ; pos++) {
            if (cache.tokenIds[pos] === target) dEnsembleWeights[t * T + pos] = gradP;
          }
        }
      } else {
        for (let pos = minJ; pos <= maxJ; pos++) {
          if (cache.tokenIds[pos] === target) dEnsembleWeights[t * T + pos] = gradP;
        }
      }
    }

    const loss = validSteps > 0 ? totalLoss / validSteps : 0;
    const norm = validSteps > 0 ? 1.0 / validSteps : 1.0;

    const dCQ = new Float64Array(T * d);
    const dCK = new Float64Array(T * d);

    for (let h = 0; h < nH; h++) {
      const offsetH = h * dH;
      const hOffset = h * T * T;

      for (let i = 0; i < T; i++) {
        let sumGradW = 0;
        const minJ = (maskBOS && i > 0) ? 1 : 0;
        const maxJ = (preventSelfCopy && i > minJ) ? i - 1 : i;

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

    for (let t = 0; t < T; t++) {
      const isQueryPos = (t === T - 1 && cache.xQuery !== null && cache.xQuery !== undefined);
      const xSrc = isQueryPos ? cache.xQuery : cache.xCopy.subarray(t * d, (t + 1) * d);

      for (let k = 0; k < d; k++) {
        const xC = xSrc[k];
        for (let j = 0; j < d; j++) grads.wcq[k * d + j] += xC * dCQ_raw[t * d + j];
      }

      for (let k = 0; k < d; k++) {
        const xC = cache.xCopy[t * d + k];
        for (let j = 0; j < d; j++) {
          grads.wck[k * d + j] += xC * dCK_raw[t * d + j];
          dXFinal[t * d + k] += this.weights.wck[k * d + j] * dCK_raw[t * d + j];
        }
      }

      if (isQueryPos) {
        for (let k = 0; k < d; k++) {
          for (let j = 0; j < d; j++) dXQuery[k] += this.weights.wcq[k * d + j] * dCQ_raw[t * d + j];
        }
      } else {
        for (let k = 0; k < d; k++) {
          for (let j = 0; j < d; j++) dXFinal[t * d + k] += this.weights.wcq[k * d + j] * dCQ_raw[t * d + j];
        }
      }
    }

    if (cache.xQuery && cache.queryWeights && cache.querySpan) {
      const qS = Math.max(0, cache.querySpan[0]);
      const qE = Math.min(T - 1, cache.querySpan[1]);
      for (let q = qS; q <= qE; q++) {
        const w = cache.queryWeights[q - qS];
        for (let k = 0; k < d; k++) dXFinal[q * d + k] += w * dXQuery[k];
      }
    }

    const dX0_skip = new Float64Array(dXFinal);
    let dXCur = dXFinal;
    for (let l = this.nLayers - 1; l >= 0; l--) {
      dXCur = this._backwardBlock(dXCur, cache.layerCaches[l], l, grads);
    }
    const dX0 = dXCur;
    for (let i = 0; i < T * d; i++) dX0[i] += dX0_skip[i];

    const embScale = Math.sqrt(d);
    for (let t = 0; t < T; t++) {
      const id = cache.tokenIds[t] < v ? cache.tokenIds[t] : 3;
      for (let j = 0; j < d; j++) grads.wte[id * d + j] += dX0[t * d + j] * embScale;
    }

    return { loss, grads };
  }
}

// Model B: Candidate Single Change for Relational Binding
// THE ONE CHANGE:
// De-anchor entity identity from the copy-head key projection so that keys represent
// contextual relational roles (xFinal) rather than raw lexical token IDs (x0).
// Specifically: xCopy for key matching uses contextual relational state xFinal:
//   xCopy = xFinal + alpha * x0, where alpha = 0.0 during key matching (pure relational role)
//   or factorized dual-head where Head 0 binds Subject-Relation and Head 1 extracts Object.
class RelationalBindingTransformer extends CurrentModel {
  // We override the forward copy key representation to let contextual state (relational role) govern copy matching
  forward(tokenIds, preventSelfCopy = false, maskBOS = false, normQK = false, copyScale = 1.0, querySpan = null) {
    // Exact forward pass, but in copy head, key representations are derived from contextual representation xFinal
    // This allows unseen entity at object position to be matched by its relational context, not its untrained wte!
    const T = Math.min(tokenIds.length, this.maxSeqLen);
    const seq = tokenIds.slice(0, T);
    this.lastSeq = seq;

    let maxTokId = 0;
    for (let t = 0; t < T; t++) {
      if (seq[t] > maxTokId) maxTokId = seq[t];
    }
    if (maxTokId >= this.vocabSize) this._ensureVocabCapacity(maxTokId + 1);

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

    // THE ONE CHANGE:
    // Pure contextual key representation (xFinal without x0 lexical bias):
    // This ensures unseen entities with random x0 do not get penalized,
    // and keys are matched on their RELATIONAL BINDING role produced by the transformer!
    const xCopy = new Float64Array(T * d);
    for (let i = 0; i < T * d; i++) xCopy[i] = xFinal[i];

    let xQuery = null;
    let queryWeights = null;
    if (querySpan && querySpan.length === 2) {
      const qS = Math.max(0, querySpan[0]);
      const qE = Math.min(T - 1, querySpan[1]);
      if (qE >= qS && qS > 0) {
        const qLen = qE - qS + 1;
        const salience = new Float64Array(qLen);

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
            const cosVal = dot / (normQ * normJ);
            cosBuffer[j] = cosVal;
            if (cosVal > maxDot) maxDot = cosVal;
          }

          const peak = Math.max(0, maxDot);
          if (peak <= 1e-6) {
            salience[q - qS] = 0;
            continue;
          }

          let sumExp = 0;
          const beta = 10.0;
          for (let j = 0; j < qS; j++) {
            const ev = Math.exp((cosBuffer[j] - maxDot) * beta);
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
          for (let k = 0; k < d; k++) {
            xQuery[k] += w * xCopy[q * d + k];
          }
        }
      }
    }

    const CQ = new Float64Array(T * d);
    const CK = new Float64Array(T * d);
    const CQ_raw = new Float64Array(T * d);
    const CK_raw = new Float64Array(T * d);
    const CQ_norm = new Float64Array(T * nH);
    const CK_norm = new Float64Array(T * nH);

    for (let t = 0; t < T; t++) {
      const isQueryPos = (t === T - 1 && xQuery !== null);
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

    const copyScores = new Float64Array(nH * T * T);
    const copyWeights = new Float64Array(nH * T * T);
    const ensembleWeights = new Float64Array(T * T);

    for (let h = 0; h < nH; h++) {
      const offsetH = h * dH;
      const hOffset = h * T * T;

      for (let i = 0; i < T; i++) {
        let maxS = -Infinity;
        const minJ = (maskBOS && i > 0) ? 1 : 0;
        const maxJ = (preventSelfCopy && i > minJ) ? i - 1 : i;

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

    const tokenProbs = new Float64Array(T * v);
    for (let t = 0; t < T; t++) {
      const minJ = (maskBOS && t > 0) ? 1 : 0;
      const maxJ = (preventSelfCopy && t > minJ) ? t - 1 : t;
      for (let pos = minJ; pos <= maxJ; pos++) {
        const tok = seq[pos];
        if (tok < v) tokenProbs[t * v + tok] += ensembleWeights[t * T + pos];
      }
    }

    const logits = new Float64Array(T * v);
    for (let idx = 0; idx < logits.length; idx++) {
      logits[idx] = Math.log(Math.max(tokenProbs[idx], 1e-12));
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
        copyWeights,
        ensembleWeights,
      },
    };
  }
}

async function run() {
  // Enable real-time neural inspection trace across all transformer layers
  globalThis.__SGLM_TRACE__ = true;

  const tokenizer = new TransparentInspectableTokenizer();

  const syntax = ['Who', 'is', 'of', '?', '.', 'What'];
  const relations = ['brother', 'father', 'mentor', 'sister', 'friend', 'mother', 'capital'];
  const trainEntities = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U'];
  const testSeenEntities = ['Arun', 'Bala', 'Kumar', 'Ravi', 'Priya', 'Sita', 'Vikram', 'Deepak'];
  const testUnseenEntities = ['Zara', 'Kael', 'Tariq', 'Nadia', 'Orion', 'Lyra', 'Vance', 'Sari', 'Xander', 'Mira'];

  for (const s of syntax) tokenizer.resolveOrRegister(s);
  for (const r of relations) tokenizer.resolveOrRegister(r);
  for (const e of [...trainEntities, ...testSeenEntities, ...testUnseenEntities]) tokenizer.resolveOrRegister(e);

  function evalTestCase(model, context, query, expectedTarget, triggerWord) {
    const fullP = `${context} ${query}`;
    const tokenIds = tokenizer.encode(fullP, { addBos: true });
    const ctxTokens = tokenizer.encode(context, { addBos: true });
    const querySpan = [ctxTokens.length, tokenIds.length - 1];
    const T = tokenIds.length;
    const qPos = T - 1;

    const fwd = model.forward(tokenIds, true, true, true, 20.0, querySpan);
    const v = model.vocabSize;

    let maxP = -1, predId = -1;
    for (let c = 0; c < v; c++) {
      const p = fwd.tokenProbs[qPos * v + c];
      if (p > maxP) { maxP = p; predId = c; }
    }

    const expId = tokenizer.resolveOrRegister(expectedTarget);
    const expProb = fwd.tokenProbs[qPos * v + expId];
    const trigId = triggerWord ? tokenizer.resolveOrRegister(triggerWord) : -1;
    const trigProb = trigId >= 0 ? fwd.tokenProbs[qPos * v + trigId] : 0;

    const expPositions = [];
    tokenIds.forEach((id, p) => { if (id === expId) expPositions.push(p); });
    let expAttn = 0;
    expPositions.forEach(p => { expAttn += fwd.copyWeights[qPos * T + p]; });

    // Target fact region vs Distractor fact regions
    const facts = context.split('.').map(s => s.trim()).filter(Boolean);
    let targetFactStart = 1, targetFactEnd = 1;
    let cur = 1;
    for (const f of facts) {
      const fToks = tokenizer.encode(f + ' .', { addBos: false });
      if (f.includes(expectedTarget)) {
        targetFactStart = cur;
        targetFactEnd = cur + fToks.length - 1;
        break;
      }
      cur += fToks.length;
    }
    let factAttn = 0;
    for (let p = targetFactStart; p <= targetFactEnd; p++) {
      factAttn += fwd.copyWeights[qPos * T + p];
    }
    const distractorAttn = Math.max(0, 1.0 - factAttn - (fwd.copyWeights[qPos * T + qPos] || 0));

    const predWord = tokenizer.decode([predId]).trim();
    return {
      query,
      expected: expectedTarget,
      predWord,
      isCorrect: predWord === expectedTarget,
      targetProb: expProb,
      triggerProb: trigProb,
      targetAttn: expAttn,
      factAttn,
      distractorAttn,
    };
  }

  // Diverse test suite testing Seen vs Unseen across Early, Middle, Late positions
  const testCases = [
    {
      id: 1,
      category: 'Seen Entity',
      position: 'Early (Fact 1/3)',
      context: 'Arun is brother of Bala . Vikram is mentor of Deepak . Priya is sister of Sita .',
      query: 'Who is brother of Arun ?',
      expected: 'Bala',
      trigger: 'brother',
    },
    {
      id: 2,
      category: 'Seen Entity',
      position: 'Middle (Fact 2/3)',
      context: 'Neha is friend of Meera . Kumar is father of Ravi . Amit is brother of Rohan .',
      query: 'Who is father of Kumar ?',
      expected: 'Ravi',
      trigger: 'father',
    },
    {
      id: 3,
      category: 'Seen Entity',
      position: 'Late (Fact 3/3)',
      context: 'Vikram is mentor of Deepak . Priya is sister of Sita . Arun is brother of Bala .',
      query: 'Who is brother of Arun ?',
      expected: 'Bala',
      trigger: 'brother',
    },
    {
      id: 4,
      category: 'Unseen Entity',
      position: 'Early (Fact 1/3)',
      context: 'Zara is mentor of Kael . Orion is brother of Lyra . Vance is father of Sari .',
      query: 'Who is mentor of Zara ?',
      expected: 'Kael',
      trigger: 'mentor',
    },
    {
      id: 5,
      category: 'Unseen Entity',
      position: 'Middle (Fact 2/3)',
      context: 'Tariq is friend of Nadia . Orion is brother of Lyra . Vance is sister of Sari .',
      query: 'Who is brother of Orion ?',
      expected: 'Lyra',
      trigger: 'brother',
    },
    {
      id: 6,
      category: 'Unseen Entity',
      position: 'Late (Fact 3/3)',
      context: 'Xander is father of Mira . Tariq is friend of Nadia . Vance is brother of Sari .',
      query: 'Who is brother of Vance ?',
      expected: 'Sari',
      trigger: 'brother',
    },
  ];

  // Training Data: Synthetic one-hop facts with disjoint entity names (trainEntities A..U)
  const trainRng = createRng(42);
  const trainRels = [
    { name: 'brother', qWord: 'Who' },
    { name: 'father', qWord: 'Who' },
    { name: 'mentor', qWord: 'Who' },
    { name: 'sister', qWord: 'Who' },
    { name: 'friend', qWord: 'Who' },
    { name: 'mother', qWord: 'Who' },
  ];

  function generateBatch(size = 90) {
    const batch = [];
    for (let i = 0; i < size; i++) {
      const numFacts = Math.floor(trainRng() * 3) + 2;
      const facts = [];
      const usedSubs = new Set();
      for (let f = 0; f < numFacts; f++) {
        let sub, obj;
        do {
          sub = trainEntities[Math.floor(trainRng() * trainEntities.length)];
          obj = trainEntities[Math.floor(trainRng() * trainEntities.length)];
        } while (sub === obj || usedSubs.has(sub));
        usedSubs.add(sub);
        const rel = trainRels[Math.floor(trainRng() * trainRels.length)];
        facts.push({ sub, rel: rel.name, obj, qWord: rel.qWord });
      }

      const targetFactIdx = Math.floor(trainRng() * numFacts);
      const targetFact = facts[targetFactIdx];

      const contextStr = facts.map(f => `${f.sub} is ${f.rel} of ${f.obj} .`).join(' ');
      const queryStr = `${targetFact.qWord} is ${targetFact.rel} of ${targetFact.sub} ?`;
      const fullStr = `${contextStr} ${queryStr}`;

      const tokenIds = tokenizer.encode(fullStr, { addBos: true });
      const ctxToks = tokenizer.encode(contextStr, { addBos: true });
      const targetTokId = tokenizer.resolveOrRegister(targetFact.obj);
      const qSpan = [ctxToks.length, tokenIds.length - 1];

      const targetTokens = new Int32Array(tokenIds.length);
      const lossMask = new Float64Array(tokenIds.length);
      targetTokens[tokenIds.length - 1] = targetTokId;
      lossMask[tokenIds.length - 1] = 1.0;

      batch.push({
        input: tokenIds,
        target: targetTokens,
        lossMask,
        preventSelfCopy: true,
        maskBOS: true,
        normQK: true,
        copyScale: 20.0,
        querySpan: qSpan,
      });
    }
    return batch;
  }

  const trainBatch = generateBatch(90);

  // Train Model A (Current Model)
  console.log('--- Training Current Model (Model A) ---');
  const modelA = new CurrentModel({
    vocabSize: tokenizer.vocabSize + 20,
    dModel: 64,
    nLayers: 2,
    nHeads: 4,
    nCopyHeads: 2,
    maxSeqLen: 256,
    copyWeight: 1.0,
    positionEncoding: 'rope',
    rng: createRng(101 ^ 0xABCD9876),
    tokenizer,
  });
  const trainerA = new AnalyticalAdamWTrainer({ model: modelA, learningRate: 0.005 });
  for (let ep = 1; ep <= 30; ep++) {
    for (const sample of trainBatch) {
      const { grads } = modelA.lossAndGrad(
        sample.input, sample.target, sample.lossMask,
        sample.preventSelfCopy, sample.maskBOS, sample.normQK, sample.copyScale, sample.querySpan
      );
      trainerA.step(grads);
    }
  }

  // Train Model B (Relational Binding Model)
  console.log('--- Training Relational Binding Model (Model B) ---');
  const modelB = new RelationalBindingTransformer({
    vocabSize: tokenizer.vocabSize + 20,
    dModel: 64,
    nLayers: 2,
    nHeads: 4,
    nCopyHeads: 2,
    maxSeqLen: 256,
    copyWeight: 1.0,
    positionEncoding: 'rope',
    rng: createRng(101 ^ 0xABCD9876),
    tokenizer,
  });
  const trainerB = new AnalyticalAdamWTrainer({ model: modelB, learningRate: 0.005 });
  for (let ep = 1; ep <= 30; ep++) {
    for (const sample of trainBatch) {
      const { grads } = modelB.lossAndGrad(
        sample.input, sample.target, sample.lossMask,
        sample.preventSelfCopy, sample.maskBOS, sample.normQK, sample.copyScale, sample.querySpan
      );
      trainerB.step(grads);
    }
  }

  // Evaluate Both Models
  const resultsA = testCases.map(tc => evalTestCase(modelA, tc.context, tc.query, tc.expected, tc.trigger));
  const resultsB = testCases.map(tc => evalTestCase(modelB, tc.context, tc.query, tc.expected, tc.trigger));

  console.log('\n========================================================================================');
  console.log('RAW RESULTS: CURRENT MODEL (A) vs RELATIONAL BINDING MODEL (B)');
  console.log('========================================================================================');
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const a = resultsA[i];
    const b = resultsB[i];
    console.log(`\nCase ${tc.id}: [${tc.category} | ${tc.position}]`);
    console.log(`  Context : "${tc.context}"`);
    console.log(`  Query   : "${tc.query}"`);
    console.log(`  Expected: "${tc.expected}"`);
    console.log(`  MODEL A : Pred="${a.predWord}" | TargetP=${(a.targetProb*100).toFixed(2)}% | TargetAttn=${(a.targetAttn*100).toFixed(2)}% | DistractorAttn=${(a.distractorAttn*100).toFixed(2)}% | Status=${a.isCorrect ? 'PASS' : 'FAIL'}`);
    console.log(`  MODEL B : Pred="${b.predWord}" | TargetP=${(b.targetProb*100).toFixed(2)}% | TargetAttn=${(b.targetAttn*100).toFixed(2)}% | DistractorAttn=${(b.distractorAttn*100).toFixed(2)}% | Status=${b.isCorrect ? 'PASS' : 'FAIL'}`);
  }

  // Aggregated Metrics
  const accTotalA = (resultsA.filter(r => r.isCorrect).length / resultsA.length) * 100;
  const accTotalB = (resultsB.filter(r => r.isCorrect).length / resultsB.length) * 100;

  const accSeenA = (resultsA.slice(0, 3).filter(r => r.isCorrect).length / 3) * 100;
  const accSeenB = (resultsB.slice(0, 3).filter(r => r.isCorrect).length / 3) * 100;

  const accUnseenA = (resultsA.slice(3, 6).filter(r => r.isCorrect).length / 3) * 100;
  const accUnseenB = (resultsB.slice(3, 6).filter(r => r.isCorrect).length / 3) * 100;

  const earlyA = ((resultsA[0].isCorrect ? 1 : 0) + (resultsA[3].isCorrect ? 1 : 0)) / 2 * 100;
  const earlyB = ((resultsB[0].isCorrect ? 1 : 0) + (resultsB[3].isCorrect ? 1 : 0)) / 2 * 100;

  const midA = ((resultsA[1].isCorrect ? 1 : 0) + (resultsA[4].isCorrect ? 1 : 0)) / 2 * 100;
  const midB = ((resultsB[1].isCorrect ? 1 : 0) + (resultsB[4].isCorrect ? 1 : 0)) / 2 * 100;

  const lateA = ((resultsA[2].isCorrect ? 1 : 0) + (resultsA[5].isCorrect ? 1 : 0)) / 2 * 100;
  const lateB = ((resultsB[2].isCorrect ? 1 : 0) + (resultsB[5].isCorrect ? 1 : 0)) / 2 * 100;

  console.log('\n========================================================================================');
  console.log('COMPARATIVE SUMMARY METRICS:');
  console.log('========================================================================================');
  console.log(`  Overall Accuracy        : MODEL A = ${accTotalA.toFixed(1)}%  --> MODEL B = ${accTotalB.toFixed(1)}%`);
  console.log(`  Seen Entities Accuracy  : MODEL A = ${accSeenA.toFixed(1)}%  --> MODEL B = ${accSeenB.toFixed(1)}%`);
  console.log(`  Unseen Entities Accuracy: MODEL A = ${accUnseenA.toFixed(1)}%  --> MODEL B = ${accUnseenB.toFixed(1)}%`);
  console.log(`  Early Position Accuracy : MODEL A = ${earlyA.toFixed(1)}%  --> MODEL B = ${earlyB.toFixed(1)}%`);
  console.log(`  Middle Position Accuracy: MODEL A = ${midA.toFixed(1)}%  --> MODEL B = ${midB.toFixed(1)}%`);
  console.log(`  Late Position Accuracy  : MODEL A = ${lateA.toFixed(1)}%  --> MODEL B = ${lateB.toFixed(1)}%`);
  console.log('========================================================================================\n');
}

run().catch(console.error);
