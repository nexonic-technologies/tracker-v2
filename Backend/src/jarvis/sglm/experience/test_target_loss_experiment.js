/**
 * test_target_loss_experiment.js
 *
 * SGLM Target-Selection Experiment:
 * Testing whether SGLM can learn: identified relationship -> target entity
 *
 * One Change:
 * Replace whole-clause gradient spreading with pure Target-Entity Supervised Loss:
 *   BEFORE: dEnsembleWeights spread to all tokens in fact clause (trigger word, subject, period, object)
 *   AFTER : dEnsembleWeights assigned strictly to target entity token position (dEnsembleWeights[t * T + targetPos] = gradP)
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

class TargetSupervisedCopyTransformer extends MultiHeadCopyTransformer {
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
        // Find exact target entity token position
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
            // THE ONE CHANGE: Gradient ONLY to target entity position, NOT the whole clause!
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
        for (let j = 0; j < d; j++) {
          grads.wcq[k * d + j] += xC * dCQ_raw[t * d + j];
        }
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

    if (cache.xQuery && cache.queryWeights && cache.querySpan) {
      const qS = Math.max(0, cache.querySpan[0]);
      const qE = Math.min(T - 1, cache.querySpan[1]);
      for (let q = qS; q <= qE; q++) {
        const w = cache.queryWeights[q - qS];
        for (let k = 0; k < d; k++) {
          dXFinal[q * d + k] += w * dXQuery[k];
        }
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
      for (let j = 0; j < d; j++) {
        grads.wte[id * d + j] += dX0[t * d + j] * embScale;
      }
    }

    return { loss, grads };
  }
}

async function run() {
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
    };
  }

  const testCases = [
    {
      type: 'Seen Entity / Early Pos',
      context: 'Arun is brother of Bala . Vikram is mentor of Deepak . Priya is sister of Sita .',
      query: 'Who is brother of Arun ?',
      expected: 'Bala',
      trigger: 'brother',
    },
    {
      type: 'Seen Entity / Middle Pos',
      context: 'Neha is friend of Meera . Kumar is father of Ravi . Amit is brother of Rohan .',
      query: 'Who is father of Kumar ?',
      expected: 'Ravi',
      trigger: 'father',
    },
    {
      type: 'Seen Entity / Late Pos',
      context: 'Vikram is mentor of Deepak . Priya is sister of Sita . Arun is brother of Bala .',
      query: 'Who is brother of Arun ?',
      expected: 'Bala',
      trigger: 'brother',
    },
    {
      type: 'Unseen Entity / Early Pos',
      context: 'Zara is mentor of Kael . Orion is brother of Lyra . Vance is father of Sari .',
      query: 'Who is mentor of Zara ?',
      expected: 'Kael',
      trigger: 'mentor',
    },
    {
      type: 'Unseen Entity / Middle Pos',
      context: 'Tariq is friend of Nadia . Orion is brother of Lyra . Vance is sister of Sari .',
      query: 'Who is brother of Orion ?',
      expected: 'Lyra',
      trigger: 'brother',
    },
    {
      type: 'Unseen Entity / Late Pos',
      context: 'Xander is father of Mira . Tariq is friend of Nadia . Vance is brother of Sari .',
      query: 'Who is brother of Vance ?',
      expected: 'Sari',
      trigger: 'brother',
    },
  ];

  // 1. BEFORE MODEL (Trained with Fact-Clause Loss)
  console.log('--- Training BEFORE Model (Fact-Clause Spread Loss) ---');
  const beforeModel = new MultiHeadCopyTransformer({
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
  const beforeTrainer = new AnalyticalAdamWTrainer({ model: beforeModel, learningRate: 0.005 });

  // Generate training batch on trainEntities [A..U]
  const trainRng = createRng(42);
  const trainRels = [
    { name: 'brother', qWord: 'Who' },
    { name: 'father', qWord: 'Who' },
    { name: 'mentor', qWord: 'Who' },
    { name: 'sister', qWord: 'Who' },
    { name: 'friend', qWord: 'Who' },
    { name: 'mother', qWord: 'Who' },
  ];

  function generateBatch(size = 80) {
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

  const trainBatch = generateBatch(80);
  for (let ep = 1; ep <= 30; ep++) {
    for (const sample of trainBatch) {
      const { grads } = beforeModel.lossAndGrad(
        sample.input, sample.target, sample.lossMask,
        sample.preventSelfCopy, sample.maskBOS, sample.normQK, sample.copyScale, sample.querySpan
      );
      beforeTrainer.step(grads);
    }
  }

  // 2. AFTER MODEL (Trained with Target-Entity Loss)
  console.log('--- Training AFTER Model (Target-Entity Supervised Loss) ---');
  const afterModel = new TargetSupervisedCopyTransformer({
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
  const afterTrainer = new AnalyticalAdamWTrainer({ model: afterModel, learningRate: 0.005 });

  for (let ep = 1; ep <= 30; ep++) {
    for (const sample of trainBatch) {
      const { grads } = afterModel.lossAndGrad(
        sample.input, sample.target, sample.lossMask,
        sample.preventSelfCopy, sample.maskBOS, sample.normQK, sample.copyScale, sample.querySpan
      );
      afterTrainer.step(grads);
    }
  }

  // Evaluate Both
  const beforeRes = testCases.map(tc => evalTestCase(beforeModel, tc.context, tc.query, tc.expected, tc.trigger));
  const afterRes = testCases.map(tc => evalTestCase(afterModel, tc.context, tc.query, tc.expected, tc.trigger));

  console.log('\n========================================================================================');
  console.log('RAW EXPERIMENT RESULTS: BEFORE vs AFTER');
  console.log('========================================================================================');
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const b = beforeRes[i];
    const a = afterRes[i];
    console.log(`\nCase ${i+1}: [${tc.type}]`);
    console.log(`  Context : "${tc.context}"`);
    console.log(`  Query   : "${tc.query}"`);
    console.log(`  Expected: "${tc.expected}"`);
    console.log(`  BEFORE  : Pred="${b.predWord}" | TargetP=${(b.targetProb*100).toFixed(2)}% | TriggerP=${(b.triggerProb*100).toFixed(2)}% | TargetAttn=${(b.targetAttn*100).toFixed(2)}% | FactAttn=${(b.factAttn*100).toFixed(2)}%`);
    console.log(`  AFTER   : Pred="${a.predWord}" | TargetP=${(a.targetProb*100).toFixed(2)}% | TriggerP=${(a.triggerProb*100).toFixed(2)}% | TargetAttn=${(a.targetAttn*100).toFixed(2)}% | FactAttn=${(a.factAttn*100).toFixed(2)}%`);
  }

  // Summary Metrics
  const beforeSeenAcc = (beforeRes.slice(0, 3).filter(r => r.isCorrect).length / 3) * 100;
  const afterSeenAcc = (afterRes.slice(0, 3).filter(r => r.isCorrect).length / 3) * 100;
  const beforeUnseenAcc = (beforeRes.slice(3, 6).filter(r => r.isCorrect).length / 3) * 100;
  const afterUnseenAcc = (afterRes.slice(3, 6).filter(r => r.isCorrect).length / 3) * 100;

  console.log('\n========================================================================================');
  console.log('ACCURACY SUMMARY:');
  console.log(`  Seen Entities Accuracy   : BEFORE = ${beforeSeenAcc.toFixed(1)}%  --> AFTER = ${afterSeenAcc.toFixed(1)}%`);
  console.log(`  Unseen Entities Accuracy : BEFORE = ${beforeUnseenAcc.toFixed(1)}%  --> AFTER = ${afterUnseenAcc.toFixed(1)}%`);
  console.log('========================================================================================\n');
}

run().catch(console.error);
