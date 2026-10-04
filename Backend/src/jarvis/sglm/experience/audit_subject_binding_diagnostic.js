/**
 * audit_subject_binding_diagnostic.js
 *
 * Comprehensive Subject-Binding Diagnostic Audit for SGLM.
 *
 * STRICT RULE: ZERO MODEL CHANGES.
 * Evaluates the model as-is after the target-entity supervision change in lossAndGrad().
 *
 * Evaluates 7 Critical Test Configurations:
 *   Test 1: Baseline Subject Binding ("Who is brother of Arun ?" -> "Bala")
 *   Test 2: Change Only Query Subject ("Who is brother of Vikram ?" -> "Deepak")
 *   Test 3: Swapped Subjects ("Vikram is brother of Bala . Arun is brother of Deepak ." -> "Deepak")
 *   Test 4: Swapped Objects ("Arun is brother of Deepak . Vikram is brother of Bala ." -> "Deepak")
 *   Test 5a: Subject Collision: Same Subject, Different Relation ("Who is brother of Arun ?" -> "Bala")
 *   Test 5b: Subject Collision: Same Subject, Different Relation ("Who is mentor of Arun ?" -> "Karan")
 *   Test 6a: Same Subject, Swapped Objects ("Who is brother of Arun ?" -> "Karan")
 *   Test 6b: Same Subject, Swapped Objects ("Who is mentor of Arun ?" -> "Bala")
 *   Test 7: Cross-Clause Distractor with Same Subject ("Arun is mentor of Karan . Vikram is brother of Deepak ." -> None)
 *
 * Usage:
 *   node Backend/src/jarvis/sglm/experience/audit_subject_binding_diagnostic.js
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

async function runDiagnostic() {
  console.log('========================================================================================');
  console.log('  SGLM SUBJECT-BINDING DIAGNOSTIC AUDIT (ZERO MODEL CHANGES)');
  console.log('========================================================================================\n');

  const vocabWords = [
    'Arun', 'is', 'brother', 'of', 'Bala', '.',
    'Vikram', 'Deepak', 'Who', '?', 'mentor', 'Karan',
    'Neha', 'friend', 'Meera', 'Kumar', 'father', 'Ravi',
    'Amit', 'Rohan', 'Sneha', 'Pooja', 'Tanya', 'Tarun', 'Varun', 'sister', 'mother'
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

  // Train on disjoint entities with deliberate relational collisions:
  // 1. Same subject + different relation -> different object (forces relation sensitivity)
  // 2. Same relation + different subject -> different object (forces subject sensitivity)
  // 3. Permuted clause positions (forces position invariance)
  // Disjoint entities: Neha, Meera, Kumar, Ravi, Amit, Rohan, Sneha, Pooja, Tarun, Varun, Tanya
  // Test entities (HELD OUT): Arun, Bala, Vikram, Deepak, Karan
  const trainingPairs = [
    // --- COLLISION TYPE 1: SAME SUBJECT, DIFFERENT RELATION ---
    { ctx: 'Neha is friend of Meera . Neha is mentor of Pooja .', q: 'Who is friend of Neha ?', ans: 'Meera' },
    { ctx: 'Neha is friend of Meera . Neha is mentor of Pooja .', q: 'Who is mentor of Neha ?', ans: 'Pooja' },
    { ctx: 'Kumar is father of Ravi . Kumar is friend of Rohan .', q: 'Who is father of Kumar ?', ans: 'Ravi' },
    { ctx: 'Kumar is father of Ravi . Kumar is friend of Rohan .', q: 'Who is friend of Kumar ?', ans: 'Rohan' },
    { ctx: 'Tarun is brother of Varun . Tarun is mentor of Tanya .', q: 'Who is brother of Tarun ?', ans: 'Varun' },
    { ctx: 'Tarun is brother of Varun . Tarun is mentor of Tanya .', q: 'Who is mentor of Tarun ?', ans: 'Tanya' },
    { ctx: 'Amit is father of Rohan . Amit is brother of Meera .', q: 'Who is father of Amit ?', ans: 'Rohan' },
    { ctx: 'Amit is father of Rohan . Amit is brother of Meera .', q: 'Who is brother of Amit ?', ans: 'Meera' },
    { ctx: 'Sneha is mentor of Pooja . Sneha is sister of Tanya .', q: 'Who is mentor of Sneha ?', ans: 'Pooja' },
    { ctx: 'Sneha is mentor of Pooja . Sneha is sister of Tanya .', q: 'Who is sister of Sneha ?', ans: 'Tanya' },

    // --- COLLISION TYPE 2: SAME RELATION, DIFFERENT SUBJECT ---
    { ctx: 'Neha is mentor of Meera . Kumar is mentor of Ravi .', q: 'Who is mentor of Neha ?', ans: 'Meera' },
    { ctx: 'Neha is mentor of Meera . Kumar is mentor of Ravi .', q: 'Who is mentor of Kumar ?', ans: 'Ravi' },
    { ctx: 'Amit is brother of Rohan . Tarun is brother of Varun .', q: 'Who is brother of Amit ?', ans: 'Rohan' },
    { ctx: 'Amit is brother of Rohan . Tarun is brother of Varun .', q: 'Who is brother of Tarun ?', ans: 'Varun' },
    { ctx: 'Sneha is friend of Pooja . Rohan is friend of Tanya .', q: 'Who is friend of Sneha ?', ans: 'Pooja' },
    { ctx: 'Sneha is friend of Pooja . Rohan is friend of Tanya .', q: 'Who is friend of Rohan ?', ans: 'Tanya' },
    { ctx: 'Kumar is father of Ravi . Amit is father of Tanya .', q: 'Who is father of Kumar ?', ans: 'Ravi' },
    { ctx: 'Kumar is father of Ravi . Amit is father of Tanya .', q: 'Who is father of Amit ?', ans: 'Tanya' },

    // --- COLLISION TYPE 3: PERMUTED CLAUSE POSITIONS ---
    { ctx: 'Kumar is mentor of Ravi . Neha is mentor of Meera .', q: 'Who is mentor of Neha ?', ans: 'Meera' },
    { ctx: 'Kumar is mentor of Ravi . Neha is mentor of Meera .', q: 'Who is mentor of Kumar ?', ans: 'Ravi' },
    { ctx: 'Tarun is brother of Varun . Amit is brother of Rohan .', q: 'Who is brother of Amit ?', ans: 'Rohan' },
    { ctx: 'Tarun is brother of Varun . Amit is brother of Rohan .', q: 'Who is brother of Tarun ?', ans: 'Varun' },
    { ctx: 'Neha is mentor of Pooja . Neha is friend of Meera .', q: 'Who is friend of Neha ?', ans: 'Meera' },
    { ctx: 'Neha is mentor of Pooja . Neha is friend of Meera .', q: 'Who is mentor of Neha ?', ans: 'Pooja' },
  ];

  console.log('[Setup] Training SGLM on disjoint facts (30 epochs)...');
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
  console.log('[Setup] Training complete.\n');

  // TEST CASES SPECIFICATION
  const testMatrix = [
    {
      id: 'Test 1 (Arun→Bala)',
      name: 'Baseline Subject Binding',
      ctx: 'Arun is brother of Bala . Vikram is brother of Deepak .',
      q: 'Who is brother of Arun ?',
      expected: 'Bala',
      subject: 'Arun',
      relation: 'brother',
      correctFactSubj: 'Arun',
      correctFactObj: 'Bala',
      distractorSubj: 'Vikram',
      distractorObj: 'Deepak',
    },
    {
      id: 'Test 2 (Vikram→Deepak)',
      name: 'Change Only Query Subject',
      ctx: 'Arun is brother of Bala . Vikram is brother of Deepak .',
      q: 'Who is brother of Vikram ?',
      expected: 'Deepak',
      subject: 'Vikram',
      relation: 'brother',
      correctFactSubj: 'Vikram',
      correctFactObj: 'Deepak',
      distractorSubj: 'Arun',
      distractorObj: 'Bala',
    },
    {
      id: 'Test 3 (Swapped subjects)',
      name: 'Swapped Subjects',
      ctx: 'Vikram is brother of Bala . Arun is brother of Deepak .',
      q: 'Who is brother of Arun ?',
      expected: 'Deepak',
      subject: 'Arun',
      relation: 'brother',
      correctFactSubj: 'Arun',
      correctFactObj: 'Deepak',
      distractorSubj: 'Vikram',
      distractorObj: 'Bala',
    },
    {
      id: 'Test 4 (Swapped objects)',
      name: 'Swapped Objects',
      ctx: 'Arun is brother of Deepak . Vikram is brother of Bala .',
      q: 'Who is brother of Arun ?',
      expected: 'Deepak',
      subject: 'Arun',
      relation: 'brother',
      correctFactSubj: 'Arun',
      correctFactObj: 'Deepak',
      distractorSubj: 'Vikram',
      distractorObj: 'Bala',
    },
    {
      id: 'Test 5a (Arun+brother)',
      name: 'Subject Collision: Arun+brother',
      ctx: 'Arun is brother of Bala . Arun is mentor of Karan .',
      q: 'Who is brother of Arun ?',
      expected: 'Bala',
      subject: 'Arun',
      relation: 'brother',
      correctFactSubj: 'Arun',
      correctFactObj: 'Bala',
      distractorSubj: 'Arun',
      distractorObj: 'Karan',
    },
    {
      id: 'Test 5b (Arun+mentor)',
      name: 'Subject Collision: Arun+mentor',
      ctx: 'Arun is brother of Bala . Arun is mentor of Karan .',
      q: 'Who is mentor of Arun ?',
      expected: 'Karan',
      subject: 'Arun',
      relation: 'mentor',
      correctFactSubj: 'Arun',
      correctFactObj: 'Karan',
      distractorSubj: 'Arun',
      distractorObj: 'Bala',
    },
    {
      id: 'Test 6a (Arun+brother swap)',
      name: 'Swapped Objects: Arun+brother',
      ctx: 'Arun is brother of Karan . Arun is mentor of Bala .',
      q: 'Who is brother of Arun ?',
      expected: 'Karan',
      subject: 'Arun',
      relation: 'brother',
      correctFactSubj: 'Arun',
      correctFactObj: 'Karan',
      distractorSubj: 'Arun',
      distractorObj: 'Bala',
    },
    {
      id: 'Test 6b (Arun+mentor swap)',
      name: 'Swapped Objects: Arun+mentor',
      ctx: 'Arun is brother of Karan . Arun is mentor of Bala .',
      q: 'Who is mentor of Arun ?',
      expected: 'Bala',
      subject: 'Arun',
      relation: 'mentor',
      correctFactSubj: 'Arun',
      correctFactObj: 'Bala',
      distractorSubj: 'Arun',
      distractorObj: 'Karan',
    },
    {
      id: 'Test 7 (No matching rel)',
      name: 'Cross-Clause Distractor (No match)',
      ctx: 'Arun is mentor of Karan . Vikram is brother of Deepak .',
      q: 'Who is brother of Arun ?',
      expected: 'None',
      subject: 'Arun',
      relation: 'brother',
      correctFactSubj: 'None',
      correctFactObj: 'None',
      distractorSubj: 'Vikram',
      distractorObj: 'Deepak',
    },
  ];

  const scorecard = [];

  for (const tcase of testMatrix) {
    console.log('========================================================================================');
    console.log(`RUNNING: ${tcase.id} — ${tcase.name}`);
    console.log(`Context : "${tcase.ctx}"`);
    console.log(`Query   : "${tcase.q}"`);
    console.log(`Expected: "${tcase.expected}"`);
    console.log('========================================================================================');

    const fullStr = `${tcase.ctx} ${tcase.q}`;
    const tokenIds = tokenizer.encode(fullStr, { addBos: true });
    const ctxTokens = tokenizer.encode(tcase.ctx, { addBos: true });
    const T = tokenIds.length;
    const d = model.dModel;
    const v = model.vocabSize;
    const querySpan = [ctxTokens.length, T - 1];
    const qPos = T - 1;

    // Enable real-time neural inspection trace across all transformer layers
    globalThis.__SGLM_TRACE__ = true;

    // Run forward pass
    const fwd = model.forward(tokenIds, true, true, true, 20.0, querySpan);

    // Disable tracer for subsequent test formatting
    globalThis.__SGLM_TRACE__ = false;

    const tokenWords = [];
    for (let t = 0; t < T; t++) {
      tokenWords.push(tokenizer.decode([tokenIds[t]]).trim());
    }

    // Top predicted winner
    let maxP = -1;
    let winnerTok = '';
    for (let c = 0; c < v; c++) {
      const p = fwd.tokenProbs[qPos * v + c];
      if (p > maxP) {
        maxP = p;
        winnerTok = tokenizer.decode([c]).trim();
      }
    }

    const expectedId = tcase.expected !== 'None' ? tokenizer.encode(tcase.expected, { addBos: false })[0] : -1;
    const targetProb = expectedId >= 0 ? fwd.tokenProbs[qPos * v + expectedId] : 0;

    // Layer 1 attention from qPos
    function getL1Attn(p) {
      if (p < 0 || p >= T) return 0;
      let s = 0;
      for (let h = 0; h < model.nHeads; h++) {
        s += fwd.cache.layerCaches[1].attnWeights[h * T * T + qPos * T + p];
      }
      return s / model.nHeads;
    }

    // Positions of entities in context
    const correctObjPos = tokenWords.findIndex((w, idx) => idx < querySpan[0] && w === tcase.correctFactObj);
    const distractorObjPos = tokenWords.findIndex((w, idx) => idx < querySpan[0] && w === tcase.distractorObj && idx !== correctObjPos);
    const correctSubjPos = tokenWords.findIndex((w, idx) => idx < querySpan[0] && w === tcase.correctFactSubj);
    const distractorSubjPos = tokenWords.findIndex((w, idx) => idx < querySpan[0] && w === tcase.distractorSubj && idx !== correctSubjPos);

    const xFinal18 = fwd.cache.xFinal.subarray(qPos * d, (qPos + 1) * d);
    const cosCorrectObj = correctObjPos >= 0 ? cosineSimilarity(xFinal18, fwd.cache.xFinal.subarray(correctObjPos * d, (correctObjPos + 1) * d)) : 0;
    const cosDistractorObj = distractorObjPos >= 0 ? cosineSimilarity(xFinal18, fwd.cache.xFinal.subarray(distractorObjPos * d, (distractorObjPos + 1) * d)) : 0;

    const copyAttnCorrectObj = correctObjPos >= 0 ? fwd.cache.ensembleWeights[qPos * T + correctObjPos] : 0;
    const copyAttnDistractorObj = distractorObjPos >= 0 ? fwd.cache.ensembleWeights[qPos * T + distractorObjPos] : 0;

    const isCorrect = (tcase.expected === 'None') ? (winnerTok !== 'Deepak' && winnerTok !== 'Bala' && winnerTok !== 'Karan') : (winnerTok === tcase.expected);

    let correctFactSelected = 'NO';
    if (tcase.expected === 'None') {
      correctFactSelected = isCorrect ? 'YES (Rejected)' : 'NO (Hallucinated)';
    } else if (copyAttnCorrectObj > copyAttnDistractorObj) {
      correctFactSelected = 'YES';
    }

    let evidence = '';
    if (tcase.expected === 'None') {
      evidence = isCorrect ? 'Query cleanly rejected' : `False-match to ${winnerTok}`;
    } else if (isCorrect) {
      evidence = `Attended target ${tcase.expected} (${(copyAttnCorrectObj * 100).toFixed(1)}% vs ${(copyAttnDistractorObj * 100).toFixed(1)}%)`;
    } else {
      evidence = `Selected distractor ${winnerTok} (${(maxP * 100).toFixed(1)}%)`;
    }

    console.log(`Prediction       : "${winnerTok}" (${(maxP * 100).toFixed(2)}%)`);
    console.log(`Expected         : "${tcase.expected}" (${(targetProb * 100).toFixed(2)}%)`);
    console.log(`Correct?         : ${isCorrect ? 'YES' : 'NO'}`);
    console.log(`CopyHead Target  : ${(copyAttnCorrectObj * 100).toFixed(2)}% | Distractor: ${(copyAttnDistractorObj * 100).toFixed(2)}%`);
    console.log(`cos(xFinal18, Obj): Target=${cosCorrectObj.toFixed(4)}, Distractor=${cosDistractorObj.toFixed(4)}\n`);

    scorecard.push({
      test: tcase.id,
      expected: tcase.expected,
      prediction: `${winnerTok} (${(maxP * 100).toFixed(1)}%)`,
      correct: isCorrect ? 'YES' : 'NO',
      correctFactSelected,
      evidence,
    });
  }

  // ========================================================================================
  // FINAL REPORT: SUBJECT-BINDING SCORECARD & VERDICT
  // ========================================================================================
  console.log('========================================================================================');
  console.log('# SUBJECT-BINDING AUDIT RESULT');
  console.log('========================================================================================\n');

  console.log('### Subject-Binding Scorecard Table:');
  console.log('| Test                       | Expected | Prediction       | Correct? | Correct Fact? | Subject Binding Evidence |');
  console.log('|----------------------------|----------|------------------|----------|---------------|--------------------------|');
  scorecard.forEach(r => {
    console.log(`| ${r.test.padEnd(26)} | ${r.expected.padEnd(8)} | ${r.prediction.padEnd(16)} | ${r.correct.padEnd(8)} | ${r.correctFactSelected.padEnd(13)} | ${r.evidence.padEnd(24)} |`);
  });

  const totalPassed = scorecard.filter(s => s.correct === 'YES').length;
  const overallVerdict = totalPassed === scorecard.length ? 'PASS' : (totalPassed >= 5 ? 'PARTIAL' : 'FAIL');

  console.log(`\n### Overall Verdict: ${overallVerdict} (${totalPassed} / ${scorecard.length} passed)\n`);

  console.log('### Diagnostic Questions:');
  console.log(`1. Does the model follow the queried subject?`);
  console.log(`   - Test 1 (Arun) -> ${scorecard[0].prediction}`);
  console.log(`   - Test 2 (Vikram) -> ${scorecard[1].prediction}`);
  console.log(`   - Test 3 (Swapped) -> ${scorecard[2].prediction}`);
  console.log(`   - Test 4 (Swapped) -> ${scorecard[3].prediction}`);

  console.log(`\n2. Does it distinguish two facts with the same relationship but different subjects?`);
  console.log(`   - Tests 1 vs 2: ${scorecard[0].correct === 'YES' && scorecard[1].correct === 'YES' ? 'YES' : 'NO'}`);

  console.log(`\n3. Does it distinguish two facts with the same subject but different relationships? (Test 5 & 6)`);
  console.log(`   - 5a (Arun+brother) -> ${scorecard[4].prediction} [Expected: Bala]`);
  console.log(`   - 5b (Arun+mentor)  -> ${scorecard[5].prediction} [Expected: Karan]`);
  console.log(`   - 6a (Arun+brother) -> ${scorecard[6].prediction} [Expected: Karan]`);
  console.log(`   - 6b (Arun+mentor)  -> ${scorecard[7].prediction} [Expected: Bala]`);

  console.log(`\n4. Does it reject a query when the subject + relationship pair does not exist? (Test 7)`);
  console.log(`   - Query "brother of Arun" when Arun is only mentor -> ${scorecard[8].prediction} [Expected: None]`);

  console.log('\n========================================================================================\n');
}

runDiagnostic().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
