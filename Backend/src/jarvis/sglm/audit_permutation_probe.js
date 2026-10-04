/**
 * audit_permutation_probe.js
 *
 * Confirmatory Diagnostic Probe:
 * Tests whether First-Position Bias is purely an ordinal shortcut (H_0)
 * or a deeper content-binding deficit (H_1).
 *
 * Compares:
 * 1. Un-jittered Baseline (Static ordinal slots during training)
 * 2. Permutation Jittered Probe (I(p(y); y) = 0 by construction during training)
 *
 * Evaluated on an Invariance Matrix with N_eval = 24 (12 Order A, 12 Order B).
 * Significance assessed via two-tailed Fisher's Exact Test.
 */

import { TransparentInspectableTokenizer } from './kernel/TransparentInspectableTokenizer.js';
import { MultiHeadCopyTransformer } from './kernel/MultiHeadCopyTransformer.js';
import { AnalyticalAdamWTrainer } from './kernel/AnalyticalAdamWTrainer.js';

function createRng(seed) {
  let a = (seed ^ 0x9e3779b9) >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Log-factorial helper for exact hypergeometric calculation
const logFactCache = [0];
function logFact(n) {
  while (logFactCache.length <= n) {
    const idx = logFactCache.length;
    logFactCache.push(logFactCache[idx - 1] + Math.log(idx));
  }
  return logFactCache[n];
}

function logComb(n, k) {
  if (k < 0 || k > n) return -Infinity;
  return logFact(n) - logFact(k) - logFact(n - k);
}

// Exact Two-Tailed Fisher's Exact Test for 2x2 contingency table
function fishersExactTest(a, b, c, d) {
  const n1 = a + b; // Order A total (12)
  const n2 = c + d; // Order B total (12)
  const k = a + c;  // Total hits

  const pObs = Math.exp(logComb(n1, a) + logComb(n2, c) - logComb(n1 + n2, k));

  const minX = Math.max(0, k - n2);
  const maxX = Math.min(n1, k);

  let pVal = 0;
  for (let x = minX; x <= maxX; x++) {
    const y = k - x;
    const pX = Math.exp(logComb(n1, x) + logComb(n2, y) - logComb(n1 + n2, k));
    if (pX <= pObs + 1e-12) {
      pVal += pX;
    }
  }
  return Math.min(1.0, pVal);
}

function buildTrainingPairs() {
  return [
    { f1: 'Neha is friend of Meera .', f2: 'Neha is mentor of Pooja .', q1: 'Who is friend of Neha ?', a1: 'Meera', q2: 'Who is mentor of Neha ?', a2: 'Pooja' },
    { f1: 'Kumar is father of Ravi .', f2: 'Kumar is friend of Rohan .', q1: 'Who is father of Kumar ?', a1: 'Ravi', q2: 'Who is friend of Kumar ?', a2: 'Rohan' },
    { f1: 'Tarun is brother of Varun .', f2: 'Tarun is mentor of Tanya .', q1: 'Who is brother of Tarun ?', a1: 'Varun', q2: 'Who is mentor of Tarun ?', a2: 'Tanya' },
    { f1: 'Amit is father of Rohan .', f2: 'Amit is brother of Meera .', q1: 'Who is father of Amit ?', a1: 'Rohan', q2: 'Who is brother of Amit ?', a2: 'Meera' },
    { f1: 'Sneha is mentor of Pooja .', f2: 'Sneha is sister of Tanya .', q1: 'Who is mentor of Sneha ?', a1: 'Pooja', q2: 'Who is sister of Sneha ?', a2: 'Tanya' },
    { f1: 'Vikram is father of Deepak .', f2: 'Vikram is mentor of Karan .', q1: 'Who is father of Vikram ?', a1: 'Deepak', q2: 'Who is mentor of Vikram ?', a2: 'Karan' },
    { f1: 'Rohan is friend of Tanya .', f2: 'Rohan is brother of Ravi .', q1: 'Who is friend of Rohan ?', a1: 'Tanya', q2: 'Who is brother of Rohan ?', a2: 'Ravi' },
    { f1: 'Meera is sister of Pooja .', f2: 'Meera is mentor of Varun .', q1: 'Who is sister of Meera ?', a1: 'Pooja', q2: 'Who is mentor of Meera ?', a2: 'Varun' },
  ];
}

function buildEvalSuite() {
  // N_eval = 24 balanced test cases across unseen combinations
  // 12 in Order A (F1 then F2), 12 in Order B (F2 then F1)
  const unseenPairs = [
    { f1: 'Arun is brother of Bala .', f2: 'Arun is mentor of Karan .', q1: 'Who is brother of Arun ?', a1: 'Bala', q2: 'Who is mentor of Arun ?', a2: 'Karan' },
    { f1: 'Deepak is father of Ravi .', f2: 'Deepak is brother of Varun .', q1: 'Who is father of Deepak ?', a1: 'Ravi', q2: 'Who is brother of Deepak ?', a2: 'Varun' },
    { f1: 'Tanya is sister of Neha .', f2: 'Tanya is friend of Pooja .', q1: 'Who is sister of Tanya ?', a1: 'Neha', q2: 'Who is friend of Tanya ?', a2: 'Pooja' },
    { f1: 'Kumar is mentor of Bala .', f2: 'Kumar is father of Amit .', q1: 'Who is mentor of Kumar ?', a1: 'Bala', q2: 'Who is father of Kumar ?', a2: 'Amit' },
    { f1: 'Rohan is brother of Karan .', f2: 'Rohan is mentor of Meera .', q1: 'Who is brother of Rohan ?', a1: 'Karan', q2: 'Who is mentor of Rohan ?', a2: 'Meera' },
    { f1: 'Varun is friend of Deepak .', f2: 'Varun is father of Pooja .', q1: 'Who is friend of Varun ?', a1: 'Deepak', q2: 'Who is father of Varun ?', a2: 'Pooja' },
  ];

  const evalCases = [];

  // 12 Order A queries
  for (const pair of unseenPairs) {
    evalCases.push({
      order: 'A',
      ctx: `${pair.f1} ${pair.f2}`,
      slot1Obj: pair.a1,
      slot2Obj: pair.a2,
      q: pair.q1,
      exp: pair.a1,
      targetSlot: 1,
    });
    evalCases.push({
      order: 'A',
      ctx: `${pair.f1} ${pair.f2}`,
      slot1Obj: pair.a1,
      slot2Obj: pair.a2,
      q: pair.q2,
      exp: pair.a2,
      targetSlot: 2,
    });
  }

  // 12 Order B queries (F2 first, then F1)
  for (const pair of unseenPairs) {
    evalCases.push({
      order: 'B',
      ctx: `${pair.f2} ${pair.f1}`,
      slot1Obj: pair.a2,
      slot2Obj: pair.a1,
      q: pair.q1,
      exp: pair.a1,
      targetSlot: 2, // a1 is now in slot 2!
    });
    evalCases.push({
      order: 'B',
      ctx: `${pair.f2} ${pair.f1}`,
      slot1Obj: pair.a2,
      slot2Obj: pair.a1,
      q: pair.q2,
      exp: pair.a2,
      targetSlot: 1, // a2 is now in slot 1!
    });
  }

  return evalCases;
}

function trainCondition(isJittered, seed = 42) {
  const vocabWords = [
    'Arun', 'is', 'brother', 'of', 'Bala', '.',
    'Vikram', 'Deepak', 'Who', '?', 'mentor', 'Karan',
    'Neha', 'friend', 'Meera', 'Kumar', 'father', 'Ravi',
    'Amit', 'Rohan', 'Sneha', 'Pooja', 'Tanya', 'Tarun', 'Varun', 'sister', 'mother'
  ];
  const tokenizer = new TransparentInspectableTokenizer({ initialTokens: vocabWords });
  const rng = createRng(seed);

  const model = new MultiHeadCopyTransformer({
    dModel: 64,
    nLayers: 2,
    nHeads: 4,
    dHead: 16,
    dFF: 128,
    maxSeqLen: 64,
    vocabSize: 64,
    nCopyHeads: 2,
    dCopyHead: 32,
    positionEncoding: 'rope',
    dropout: 0.0,
    rng,
    tokenizer,
  });

  const trainer = new AnalyticalAdamWTrainer({
    model,
    learningRate: 0.005,
    beta1: 0.9,
    beta2: 0.98,
    weightDecay: 0.01,
  });

  const rawPairs = buildTrainingPairs();
  const epochs = 40;

  for (let ep = 1; ep <= epochs; ep++) {
    for (const item of rawPairs) {
      // Query 1 and Query 2 for each fact pair
      const queries = [
        { q: item.q1, ans: item.a1 },
        { q: item.q2, ans: item.a2 },
      ];

      for (const qItem of queries) {
        let ctxStr = '';
        if (isJittered) {
          // Uniform random permutation pi ~ Bernoulli(0.5)
          // Ensures I(p(y); y) = 0 population independence
          const permute = rng() >= 0.5;
          ctxStr = permute ? `${item.f2} ${item.f1}` : `${item.f1} ${item.f2}`;
        } else {
          // Static un-jittered baseline: Fact 1 is always Slot 1
          ctxStr = `${item.f1} ${item.f2}`;
        }

        const fullText = `${ctxStr} ${qItem.q}`;
        const tokenIds = tokenizer.encode(fullText, { addBos: true });
        const ctxToks = tokenizer.encode(ctxStr, { addBos: true });
        const ansToks = tokenizer.encode(qItem.ans, { addBos: false });

        const targetTokens = new Int32Array(tokenIds.length);
        const lossMask = new Float64Array(tokenIds.length);
        const qPos = tokenIds.length - 1;
        targetTokens[qPos] = ansToks[0];
        lossMask[qPos] = 1.0;

        const { grads } = model.lossAndGrad(
          tokenIds, targetTokens, lossMask,
          true, true, true, 20.0, [ctxToks.length, tokenIds.length - 1]
        );
        trainer.step(grads);
      }
    }
  }

  return { model, tokenizer };
}

function evaluateModel(model, tokenizer, evalCases) {
  let orderAHits = 0, orderAMisses = 0;
  let orderBHits = 0, orderBMisses = 0;
  let slot1Picks = 0, slot2Picks = 0;
  let totalLoss = 0;

  for (const c of evalCases) {
    const fullText = `${c.ctx} ${c.q}`;
    const tokenIds = tokenizer.encode(fullText, { addBos: true });
    const ctxToks = tokenizer.encode(c.ctx, { addBos: true });
    const ansToks = tokenizer.encode(c.exp, { addBos: false });
    const targetId = ansToks[0];

    const fwd = model.forward(tokenIds, true, true, true, 20.0, [ctxToks.length, tokenIds.length - 1]);
    const qPos = tokenIds.length - 1;
    const v = model.vocabSize;

    let maxP = -1, predId = -1;
    for (let i = 0; i < v; i++) {
      const p = fwd.tokenProbs[qPos * v + i];
      if (p > maxP) {
        maxP = p;
        predId = i;
      }
    }

    const targetP = Math.max(1e-12, fwd.tokenProbs[qPos * v + targetId] || 0);
    totalLoss += -Math.log(targetP);

    const predWord = tokenizer.decode([predId]).trim();
    const isHit = (predWord === c.exp);

    // Check which slot was selected
    if (predWord === c.slot1Obj) slot1Picks++;
    if (predWord === c.slot2Obj) slot2Picks++;

    if (c.order === 'A') {
      if (isHit) orderAHits++; else orderAMisses++;
    } else {
      if (isHit) orderBHits++; else orderBMisses++;
    }
  }

  const avgLoss = totalLoss / evalCases.length;
  const accA = (orderAHits / 12) * 100;
  const accB = (orderBHits / 12) * 100;
  const overallAcc = ((orderAHits + orderBHits) / 24) * 100;
  const pVal = fishersExactTest(orderAHits, orderAMisses, orderBHits, orderBMisses);

  return {
    orderAHits, orderAMisses, accA,
    orderBHits, orderBMisses, accB,
    overallAcc, avgLoss,
    slot1Picks, slot2Picks,
    pVal,
  };
}

async function runProbe() {
  console.log('========================================================================================');
  console.log('  CONFIRMATORY PROBE: ORDINAL SHORTCUT (H0) VS CONTENT BINDING DEFICIT (H1)');
  console.log('  N_eval = 24 (12 Order A, 12 Order B) | Chance = 50.0% (ln 2 = 0.6931)');
  console.log('========================================================================================\n');

  const evalCases = buildEvalSuite();

  // 1. Un-jittered Baseline
  console.log('[1/2] Training Un-jittered Baseline (Static slot ordering)...');
  const baseline = trainCondition(false, 42);
  const baseRes = evaluateModel(baseline.model, baseline.tokenizer, evalCases);
  console.log('   Baseline Evaluation Complete.\n');

  // 2. Permutation Jittered Probe
  console.log('[2/2] Training Jittered Probe (I(p(y); y) = 0 by construction)...');
  const jittered = trainCondition(true, 42);
  const jitRes = evaluateModel(jittered.model, jittered.tokenizer, evalCases);
  console.log('   Jittered Probe Evaluation Complete.\n');

  // Display Contingency Table & Comparative Metrics
  console.log('========================================================================================');
  console.log('  PROBE RESULTS MATRIX');
  console.log('========================================================================================');
  console.log(`Condition            | L_eval  | Order A (Hit/12) | Order B (Hit/12) | Overall % | Slot 1/Slot 2 Picks | Fisher p-value`);
  console.log(`---------------------+---------+------------------+------------------+-----------+---------------------+---------------`);
  console.log(`Baseline (Static)    | ${baseRes.avgLoss.toFixed(4).padEnd(7)} | ${String(baseRes.orderAHits).padStart(2)}/12 (${baseRes.accA.toFixed(1)}%) | ${String(baseRes.orderBHits).padStart(2)}/12 (${baseRes.accB.toFixed(1)}%) | ${baseRes.overallAcc.toFixed(1).padEnd(9)} | Slot 1: ${String(baseRes.slot1Picks).padStart(2)} / Slot 2: ${String(baseRes.slot2Picks).padStart(2)} | p = ${baseRes.pVal.toFixed(4)}`);
  console.log(`Probe (Jittered)     | ${jitRes.avgLoss.toFixed(4).padEnd(7)} | ${String(jitRes.orderAHits).padStart(2)}/12 (${jitRes.accA.toFixed(1)}%) | ${String(jitRes.orderBHits).padStart(2)}/12 (${jitRes.accB.toFixed(1)}%) | ${jitRes.overallAcc.toFixed(1).padEnd(9)} | Slot 1: ${String(jitRes.slot1Picks).padStart(2)} / Slot 2: ${String(jitRes.slot2Picks).padStart(2)} | p = ${jitRes.pVal.toFixed(4)}`);
  console.log('========================================================================================\n');

  // Formal Verdict
  console.log('DECISION VERDICT:');
  console.log('-----------------');
  if (jitRes.avgLoss <= 0.15 && jitRes.accA >= 91.6 && jitRes.accB >= 91.6 && jitRes.pVal > 0.05) {
    console.log('✅ CASE 1 CONFIRMED: H_0 IS ACCEPTED.');
    console.log('   The ordinal shortcut was the sole confound. Jittering restored exchangeability (Acc >= 91.7% across both orders).');
    console.log('   Conclusion: The 2-layer backbone HAS content-binding capacity; ordinal position was simply an adversarial shortcut.');
    console.log('   Next Action: Formulate structural Layer A (fact-slot exchangeable geometry).');
  } else if (jitRes.avgLoss >= 0.60 || (jitRes.accA <= 60 && jitRes.accB <= 60)) {
    console.log('❌ CASE 2 CONFIRMED: H_1 IS ACCEPTED.');
    console.log('   Destroying the positional shortcut collapsed accuracy to chance level (~50%) with loss near ln(2).');
    console.log('   Conclusion: The 2-layer backbone has an intrinsic content-binding deficit and cannot resolve (S ∩ R) on its own.');
    console.log('   Next Action: Investigate representation capacity, attention routing, or Layer B disentanglement.');
  } else if (jitRes.pVal < 0.05) {
    console.log('⚠️ CASE 3 CONFIRMED: RESIDUAL ASYMMETRY.');
    console.log(`   Order A vs Order B divergence is statistically significant (Fisher exact p = ${jitRes.pVal.toFixed(4)} < 0.05).`);
    console.log('   Conclusion: Residual positional leakage persists despite I(p(y); y) = 0.');
  } else {
    console.log(`ℹ️ INTERMEDIATE OUTCOME: Loss = ${jitRes.avgLoss.toFixed(4)}, Overall Acc = ${jitRes.overallAcc.toFixed(1)}%. Inspect table counts.`);
  }
  console.log('');
}

runProbe().catch(err => {
  console.error('Probe error:', err);
  process.exit(1);
});
