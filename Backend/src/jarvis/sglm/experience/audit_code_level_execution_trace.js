/**
 * audit_code_level_execution_trace.js
 *
 * SGLM Internal Code-Level Execution Trace Audit.
 *
 * Uses the kernel's native real-time neural inspection tracer:
 *   globalThis.__SGLM_TRACE__ = true;
 *
 * Every trace statement is printed DIRECTLY by the internal SGLM implementation:
 *   - [Transformer.forward]                    (MultiHeadCopyTransformer.js:368)
 *   - [Transformer.layer L] Multi-Head Attn   (MultiHeadCopyTransformer.js:261)
 *   - [Transformer.layer L] Hidden State Norm  (MultiHeadCopyTransformer.js:314)
 *   - [QueryBuilder]                           (MultiHeadCopyTransformer.js:479)
 *   - [CopyHead.forward]                       (MultiHeadCopyTransformer.js:578)
 *   - [OutputHead]                             (MultiHeadCopyTransformer.js:617)
 *
 * Target Failing Case:
 *   Context: "Arun is brother of Bala . Vikram is brother of Deepak ."
 *   Query  : "Who is brother of Arun ?"
 *   Expected Target: "Bala"
 *
 * Usage:
 *   node Backend/src/jarvis/sglm/experience/audit_code_level_execution_trace.js
 */

import { TransparentInspectableTokenizer } from '../kernel/TransparentInspectableTokenizer.js';
import { MultiHeadCopyTransformer } from '../kernel/MultiHeadCopyTransformer.js';
import { AnalyticalAdamWTrainer } from '../kernel/AnalyticalAdamWTrainer.js';

function createRng(seed) {
  let a = (seed ^ 0x9e3779b9) >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function computeNorm(vec) {
  let s = 0;
  for (let i = 0; i < vec.length; i++) s += vec[i] * vec[i];
  return Math.sqrt(s);
}

function cosineSimilarity(v1, v2) {
  let dot = 0, n1 = 0, n2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    n1 += v1[i] * v1[i];
    n2 += v2[i] * v2[i];
  }
  return dot / (Math.sqrt(n1) * Math.sqrt(n2) + 1e-12);
}

async function runAudit() {
  console.log('========================================================================================');
  console.log('  SGLM INTERNAL CODE-LEVEL EXECUTION TRACE AUDIT (VIA NATIVE __SGLM_TRACE__)');
  console.log('========================================================================================\n');

  const vocabWords = [
    'Arun', 'is', 'brother', 'of', 'Bala', '.',
    'Vikram', 'Deepak', 'Who', '?',
    'Neha', 'friend', 'Meera', 'Kumar', 'father', 'Ravi',
    'Amit', 'Rohan', 'Sneha', 'mentor', 'Pooja', 'Karan', 'Tanya', 'Tarun', 'Varun'
  ];
  const tokenizer = new TransparentInspectableTokenizer({ initialTokens: vocabWords });

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
    rng: createRng(42),
    tokenizer,
  });

  const trainer = new AnalyticalAdamWTrainer({
    model,
    learningRate: 0.005,
    beta1: 0.9,
    beta2: 0.98,
    weightDecay: 0.01,
  });

  // Train on disjoint entities to establish standard target-selection parameters
  const trainingPairs = [
    { ctx: 'Neha is friend of Meera . Kumar is father of Ravi .', q: 'Who is father of Kumar ?', ans: 'Ravi' },
    { ctx: 'Amit is brother of Rohan . Sneha is mentor of Pooja .', q: 'Who is mentor of Sneha ?', ans: 'Pooja' },
    { ctx: 'Karan is brother of Tanya . Tarun is mentor of Varun .', q: 'Who is brother of Karan ?', ans: 'Tanya' },
    { ctx: 'Rohan is father of Amit . Pooja is friend of Sneha .', q: 'Who is father of Rohan ?', ans: 'Amit' },
  ];

  console.log('[1/3] Pre-training SGLM on disjoint facts to establish target-selection baseline...');
  const trainBatch = [];
  for (const pair of trainingPairs) {
    const fullText = `${pair.ctx} ${pair.q}`;
    const tokenIds = tokenizer.encode(fullText, { addBos: true });
    const ctxToks = tokenizer.encode(pair.ctx, { addBos: true });
    const ansToks = tokenizer.encode(pair.ans, { addBos: false });
    const targetEntityId = ansToks[0];

    const targetTokens = new Int32Array(tokenIds.length);
    const lossMask = new Float64Array(tokenIds.length);
    const qPos = tokenIds.length - 1;
    targetTokens[qPos] = targetEntityId;
    lossMask[qPos] = 1.0;

    trainBatch.push({
      input: tokenIds,
      target: targetTokens,
      lossMask,
      preventSelfCopy: true,
      maskBOS: true,
      normQK: true,
      copyScale: 20.0,
      querySpan: [ctxToks.length, tokenIds.length - 1],
    });
  }

  for (let ep = 1; ep <= 30; ep++) {
    for (const sample of trainBatch) {
      const { grads } = model.lossAndGrad(
        sample.input, sample.target, sample.lossMask,
        sample.preventSelfCopy, sample.maskBOS, sample.normQK, sample.copyScale, sample.querySpan
      );
      trainer.step(grads);
    }
  }
  console.log('      Training complete.\n');

  // TEST SPECIFICATION
  const contextStr = 'Arun is brother of Bala . Vikram is brother of Deepak .';
  const queryStr = 'Who is brother of Arun ?';
  const expectedTarget = 'Bala';
  const fullStr = `${contextStr} ${queryStr}`;

  console.log('[2/3] Preparing Test Case:');
  console.log(`      Context : "${contextStr}"`);
  console.log(`      Query   : "${queryStr}"`);
  console.log(`      Expected: "${expectedTarget}"\n`);

  const tokenIds = tokenizer.encode(fullStr, { addBos: true });
  const ctxTokens = tokenizer.encode(contextStr, { addBos: true });
  const querySpan = [ctxTokens.length, tokenIds.length - 1];

  console.log('========================================================================================');
  console.log('[3/3] ACTIVATING NATIVE SGLM KERNEL TRACER (globalThis.__SGLM_TRACE__ = true)');
  console.log('      Following the actual MultiHeadCopyTransformer.js execution path:');
  console.log('========================================================================================');

  // Turn on the real-time neural tracer embedded inside MultiHeadCopyTransformer.js
  globalThis.__SGLM_TRACE__ = true;

  // Execute forward pass directly through the SGLM kernel
  const fwd = model.forward(
    tokenIds,
    /* preventSelfCopy= */ true,
    /* maskBOS= */ true,
    /* normQK= */ true,
    /* copyScale= */ 20.0,
    /* querySpan= */ querySpan
  );

  // Turn off tracer
  globalThis.__SGLM_TRACE__ = false;

  // ========================================================================================
  // DEEP-DIVE INSPECTION: WHAT INFORMATION IS ACTUALLY ENCODED INSIDE xFinal[18]?
  // ========================================================================================
  const d = model.dModel;
  const qPos = tokenIds.length - 1;
  const xFinal18 = fwd.cache.xFinal.subarray(qPos * d, (qPos + 1) * d);
  const normFinal18 = computeNorm(xFinal18);

  console.log('\n========================================================================================');
  console.log(`DEEP-DIVE: INTERNAL ENCODING OF xFinal[${qPos}] IMMEDIATELY AFTER LAYER 1`);
  console.log('  File: Backend/src/jarvis/sglm/kernel/MultiHeadCopyTransformer.js:385');
  console.log('========================================================================================');
  console.log(`Tensor xFinal[${qPos}] shape: [${d}] | L2 Norm: ${normFinal18.toFixed(4)}`);

  // 1. Cosine similarity of xFinal[18] against every token's static embedding x0[j]
  console.log('\n1. Alignment of xFinal[18] with raw static token identities (x0[j]):');
  console.log('| Pos | Token    | Entity Role             | Cosine Sim with xFinal[18] |');
  console.log('|-----|----------|-------------------------|----------------------------|');
  for (let j = 0; j < tokenIds.length; j++) {
    const word = tokenizer.decode([tokenIds[j]]).trim();
    const x0_j = fwd.cache.x0.subarray(j * d, (j + 1) * d);
    const cos = cosineSimilarity(xFinal18, x0_j);
    let role = 'Syntax';
    if (j === 1) role = 'CONTEXT SUBJECT (Arun)';
    if (j === 3 || j === 9 || j === 15) role = 'RELATION (brother)';
    if (j === 5) role = 'EXPECTED TARGET (Bala)';
    if (j === 7) role = 'DISTRACTOR SUBJ (Vikram)';
    if (j === 11) role = 'DISTRACTOR OBJ (Deepak)';
    if (j === 17) role = 'QUERY SUBJECT (Arun)';
    if (j === 18) role = 'QUERY PROMPT (?)';
    console.log(`| ${String(j).padStart(3)} | ${word.padEnd(8)} | ${role.padEnd(23)} | ${cos.toFixed(4).padStart(26)} |`);
  }

  // 2. Cosine similarity of xFinal[18] with contextual hidden states xFinal[j]
  console.log('\n2. Alignment of xFinal[18] with contextual hidden states (xFinal[j]):');
  console.log('| Pos | Token    | Entity Role             | Cosine Sim with xFinal[j]  |');
  console.log('|-----|----------|-------------------------|----------------------------|');
  for (let j = 0; j < tokenIds.length; j++) {
    const word = tokenizer.decode([tokenIds[j]]).trim();
    const xFinal_j = fwd.cache.xFinal.subarray(j * d, (j + 1) * d);
    const cos = cosineSimilarity(xFinal18, xFinal_j);
    let role = 'Syntax';
    if (j === 1) role = 'CONTEXT SUBJECT (Arun)';
    if (j === 3 || j === 9 || j === 15) role = 'RELATION (brother)';
    if (j === 5) role = 'EXPECTED TARGET (Bala)';
    if (j === 7) role = 'DISTRACTOR SUBJ (Vikram)';
    if (j === 11) role = 'DISTRACTOR OBJ (Deepak)';
    if (j === 17) role = 'QUERY SUBJECT (Arun)';
    if (j === 18) role = 'QUERY PROMPT (?)';
    console.log(`| ${String(j).padStart(3)} | ${word.padEnd(8)} | ${role.padEnd(23)} | ${cos.toFixed(4).padStart(26)} |`);
  }

  // 3. Direct Vocabulary Projection (Unembedding): xFinal[18] @ Wte^T
  console.log('\n3. Direct Vocabulary Unembedding Projection (xFinal[18] @ Wte^T):');
  console.log('   (If xFinal[18] is mapped directly to vocabulary logits without copy head):');
  const vocabLogits = [];
  for (let c = 0; c < model.vocabSize; c++) {
    let dot = 0;
    for (let k = 0; k < d; k++) {
      dot += xFinal18[k] * model.weights.wte[c * d + k];
    }
    const tokStr = tokenizer.decode([c]).trim();
    vocabLogits.push({ id: c, tok: tokStr, dot });
  }
  vocabLogits.sort((a, b) => b.dot - a.dot);
  vocabLogits.slice(0, 10).forEach((vl, rank) => {
    let mark = '';
    if (vl.tok === expectedTarget) mark = ' <-- [EXPECTED TARGET: Bala]';
    if (vl.tok === 'Arun') mark = ' <-- [Query/Context Subject]';
    if (vl.tok === 'brother') mark = ' <-- [Relation Trigger]';
    if (vl.tok === 'Vikram') mark = ' <-- [Distractor Subject]';
    console.log(`   Rank ${String(rank + 1).padStart(2)}: "${vl.tok.padEnd(8)}" (id: ${String(vl.id).padStart(2)}) -> Dot Product Logit = ${vl.dot.toFixed(4)}${mark}`);
  });

  const balaRank = vocabLogits.findIndex(vl => vl.tok === expectedTarget) + 1;
  const arunRank = vocabLogits.findIndex(vl => vl.tok === 'Arun') + 1;
  const brotherRank = vocabLogits.findIndex(vl => vl.tok === 'brother') + 1;
  console.log(`\nVocabulary Unembedding Summary:`);
  console.log(`   - "brother" rank in xFinal[18]: #${brotherRank}`);
  console.log(`   - "Arun"    rank in xFinal[18]: #${arunRank}`);
  console.log(`   - "Bala"    rank in xFinal[18]: #${balaRank} (Expected Target)`);

  console.log('\n========================================================================================');
  console.log('VERIFICATION SUMMARY & FIRST DIVERGENCE POINT');
  console.log('========================================================================================');

  const v = model.vocabSize;
  const expectedTargetId = tokenizer.encode(expectedTarget, { addBos: false })[0];
  const targetProb = fwd.tokenProbs[qPos * v + expectedTargetId];

  // Find winner
  let maxP = -1;
  let winnerTok = '';
  for (let c = 0; c < v; c++) {
    const p = fwd.tokenProbs[qPos * v + c];
    if (p > maxP) {
      maxP = p;
      winnerTok = tokenizer.decode([c]).trim();
    }
  }

  const T = tokenIds.length;

  // Compute Layer 1 Attentions from query position [qPos]
  function getL1Attn(p) {
    let s = 0;
    for (let h = 0; h < model.nHeads; h++) {
      s += fwd.cache.layerCaches[1].attnWeights[h * T * T + qPos * T + p];
    }
    return s / model.nHeads;
  }

  const l1Arun = getL1Attn(1);
  const l1Bala = getL1Attn(5);
  const l1Brother = getL1Attn(3);
  const l1Vikram = getL1Attn(7);
  const l1Deepak = getL1Attn(11);

  // Compute xFinal cosines
  const cosArun = cosineSimilarity(xFinal18, fwd.cache.xFinal.subarray(1 * d, 2 * d));
  const cosBala = cosineSimilarity(xFinal18, fwd.cache.xFinal.subarray(5 * d, 6 * d));
  const cosVikram = cosineSimilarity(xFinal18, fwd.cache.xFinal.subarray(7 * d, 8 * d));
  const cosDeepak = cosineSimilarity(xFinal18, fwd.cache.xFinal.subarray(11 * d, 12 * d));

  // CopyHead ensemble attentions
  const copyArun = fwd.cache.ensembleWeights[qPos * T + 1];
  const copyBala = fwd.cache.ensembleWeights[qPos * T + 5];
  const copyVikram = fwd.cache.ensembleWeights[qPos * T + 7];
  const copyDeepak = fwd.cache.ensembleWeights[qPos * T + 11];

  const isPass = (winnerTok === expectedTarget);
  const verdict = isPass ? 'PASS' : (winnerTok === 'Arun' ? 'FAIL (Subject Dominates)' : 'FAIL (Entity Disambiguation / Shortcut)');

  console.log('\n========================================================================================');
  console.log('# RELATIONAL BINDING — EXPERIMENT RESULT');
  console.log('========================================================================================\n');

  console.log('### Baseline (Before Single Change)');
  console.log('Prediction:             Vikram (33.61%)');
  console.log('Bala probability:       33.14%');
  console.log('Layer 1 Bala attention: 0.00%');
  console.log('xFinal→Bala:           -0.0801');
  console.log('CopyHead Bala:          33.14%\n');

  console.log('### Single Change');
  console.log('File:     Backend/src/jarvis/sglm/kernel/MultiHeadCopyTransformer.js');
  console.log('Function: lossAndGrad()');
  console.log('Lines:    713-715');
  console.log('Original: for (let p = fStart; p <= pEnd; p++) dEnsembleWeights[t * T + p] = gradP; (Clause spread)');
  console.log('New:      dEnsembleWeights[t * T + targetPos] = gradP; (Direct target entity supervision)\n');

  console.log('### After (Live Measured)');
  console.log(`Prediction:             ${winnerTok} (${(maxP * 100).toFixed(2)}%)`);
  console.log(`Bala probability:       ${(targetProb * 100).toFixed(2)}%`);
  console.log(`Layer 1 Bala attention: ${(l1Bala * 100).toFixed(2)}%`);
  console.log(`xFinal→Bala:           ${cosBala.toFixed(4)}`);
  console.log(`CopyHead Bala:          ${(copyBala * 100).toFixed(2)}%\n`);

  console.log('### Detailed Before vs After Comparison');
  console.log('| Metric                          | Baseline (Before) | After Single Change |');
  console.log('|---------------------------------|-------------------|---------------------|');
  console.log(`| Prediction Winner               | Vikram (33.61%)   | ${winnerTok.padEnd(6)} (${(maxP * 100).toFixed(2)}%)      |`);
  console.log(`| Expected Target (Bala) Prob     | 33.14%            | ${(targetProb * 100).toFixed(2)}%              |`);
  console.log(`| L1 Attn to Arun (pos 1)         | 0.00%             | ${(l1Arun * 100).toFixed(2)}%              |`);
  console.log(`| L1 Attn to Bala (pos 5)         | 0.00%             | ${(l1Bala * 100).toFixed(2)}%              |`);
  console.log(`| L1 Attn to brother (pos 3)      | 35.30%            | ${(l1Brother * 100).toFixed(2)}%             |`);
  console.log(`| L1 Attn to Vikram (pos 7)       | 13.03%            | ${(l1Vikram * 100).toFixed(2)}%             |`);
  console.log(`| L1 Attn to Deepak (pos 11)      | 0.00%             | ${(l1Deepak * 100).toFixed(2)}%              |`);
  console.log(`| cos(xFinal18, xFinal[Arun])     | -0.1040           | ${cosArun.toFixed(4).padStart(7)}             |`);
  console.log(`| cos(xFinal18, xFinal[Bala])     | -0.0801           | ${cosBala.toFixed(4).padStart(7)}             |`);
  console.log(`| cos(xFinal18, xFinal[Vikram])   | +0.0092           | ${cosVikram.toFixed(4).padStart(7)}             |`);
  console.log(`| cos(xFinal18, xFinal[Deepak])   | +0.5641           | ${cosDeepak.toFixed(4).padStart(7)}             |`);
  console.log(`| CopyHead Arun (pos 1)           | 32.81%            | ${(copyArun * 100).toFixed(2)}%             |`);
  console.log(`| CopyHead Bala (pos 5)           | 33.14%            | ${(copyBala * 100).toFixed(2)}%             |`);
  console.log(`| CopyHead Vikram (pos 7)         | 33.61%            | ${(copyVikram * 100).toFixed(2)}%             |`);
  console.log(`| CopyHead Deepak (pos 11)        | 0.03%             | ${(copyDeepak * 100).toFixed(2)}%             |\n`);

  console.log(`### Verdict: ${verdict}\n`);
  console.log('========================================================================================\n');
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
