/**
 * final_eval_retrieval.js
 *
 * FINAL SGLM EXPERIMENT — CONTENT-ADDRESSED FACT RETRIEVAL
 *
 * Evaluates the learned query-conditioned context retrieval layer on:
 * - Test 1: Relationship binding (brother -> Bala, mentor -> Karan)
 * - Test 2: Reverse fact order (Order B)
 * - Test 3: Subject collision (Deepak vs Bala)
 * - Test 4: Unseen entities (Zara, Kael, Mohan, Tara)
 *
 * Uses native SGLM execution and native tracer (globalThis.__SGLM_TRACE__ = true).
 * Strictly adheres to frozen tokenizer, dataset, optimizer, loss, and copy head.
 */

import { TransparentInspectableTokenizer } from './kernel/TransparentInspectableTokenizer.js';
import { MultiHeadCopyTransformer } from './kernel/MultiHeadCopyTransformer.js';
import { AnalyticalAdamWTrainer } from './kernel/AnalyticalAdamWTrainer.js';

function trainModel() {
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
    tokenizer,
  });

  const trainer = new AnalyticalAdamWTrainer({
    model,
    learningRate: 0.005,
    beta1: 0.9,
    beta2: 0.98,
    weightDecay: 0.01,
  });

  const trainingPairs = [
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
    { ctx: 'Neha is mentor of Meera . Kumar is mentor of Ravi .', q: 'Who is mentor of Neha ?', ans: 'Meera' },
    { ctx: 'Neha is mentor of Meera . Kumar is mentor of Ravi .', q: 'Who is mentor of Kumar ?', ans: 'Ravi' },
    { ctx: 'Amit is brother of Rohan . Tarun is brother of Varun .', q: 'Who is brother of Amit ?', ans: 'Rohan' },
    { ctx: 'Amit is brother of Rohan . Tarun is brother of Varun .', q: 'Who is brother of Tarun ?', ans: 'Varun' },
  ];

  console.log('========================================================================');
  console.log('  TRAINING SGLM MultiHeadCopyTransformer (35 epochs)...');
  console.log('  Single architectural change: Learned Query-Conditioned Context Retrieval');
  console.log('========================================================================');

  for (let ep = 1; ep <= 35; ep++) {
    for (const pair of trainingPairs) {
      const fullText = `${pair.ctx} ${pair.q}`;
      const tokenIds = tokenizer.encode(fullText, { addBos: true });
      const ctxToks = tokenizer.encode(pair.ctx, { addBos: true });
      const ansToks = tokenizer.encode(pair.ans, { addBos: false });

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
  console.log('  [Training Complete]\n');

  return { model, tokenizer };
}

function evaluateQuery(model, tokenizer, ctx, q, expected, trace = false) {
  const fullText = `${ctx} ${q}`;
  const tokenIds = tokenizer.encode(fullText, { addBos: true });
  const ctxToks = tokenizer.encode(ctx, { addBos: true });
  const querySpan = [ctxToks.length, tokenIds.length - 1];
  const qPos = tokenIds.length - 1;

  if (trace) {
    globalThis.__SGLM_TRACE__ = true;
  }

  const { tokenProbs, copyWeights, cache } = model.forward(
    tokenIds, true, true, true, 20.0, querySpan
  );

  if (trace) {
    globalThis.__SGLM_TRACE__ = false;
  }

  let bestProb = -1;
  let bestTokId = -1;
  const v = model.vocabSize;

  for (let c = 0; c < v; c++) {
    const p = tokenProbs[qPos * v + c];
    if (p > bestProb) {
      bestProb = p;
      bestTokId = c;
    }
  }

  const predicted = tokenizer.decode([bestTokId]).trim();
  const pass = (predicted === expected);

  // Collect specific probabilities for Bala and Karan if present
  let pBala = 0, pKaran = 0;
  if (tokenizer.tokenToId.has('Bala')) {
    const idBala = tokenizer.tokenToId.get('Bala');
    pBala = tokenProbs[qPos * v + idBala] || 0;
  }
  if (tokenizer.tokenToId.has('Karan')) {
    const idKaran = tokenizer.tokenToId.get('Karan');
    pKaran = tokenProbs[qPos * v + idKaran] || 0;
  }

  return {
    predicted,
    expected,
    pass,
    bestProb,
    pBala,
    pKaran,
    retWeights: cache.retWeights,
    ctxToks,
    tokenIds
  };
}

async function runAllTests() {
  const { model, tokenizer } = trainModel();

  const testSuites = [
    {
      name: 'Test 1 — Relationship binding',
      ctx: 'Arun is brother of Bala . Arun is mentor of Karan .',
      queries: [
        { q: 'Who is brother of Arun ?', expected: 'Bala' },
        { q: 'Who is mentor of Arun ?',  expected: 'Karan' },
      ],
      trace: true,
    },
    {
      name: 'Test 2 — Reverse fact order',
      ctx: 'Arun is mentor of Karan . Arun is brother of Bala .',
      queries: [
        { q: 'Who is brother of Arun ?', expected: 'Bala' },
        { q: 'Who is mentor of Arun ?',  expected: 'Karan' },
      ],
      trace: true,
    },
    {
      name: 'Test 3 — Subject collision',
      ctx: 'Arun is brother of Bala . Vikram is brother of Deepak .',
      queries: [
        { q: 'Who is brother of Vikram ?', expected: 'Deepak' },
      ],
      trace: false,
    },
    {
      name: 'Test 4 — Unseen entities',
      ctx: 'Zara is brother of Kael . Mohan is mentor of Tara .',
      queries: [
        { q: 'Who is brother of Zara ?', expected: 'Kael' },
      ],
      trace: false,
    },
  ];

  console.log('========================================================================');
  console.log('  EXECUTING REQUIRED TEST SUITES WITH NATIVE SGLM TRACE');
  console.log('========================================================================');

  const results = [];

  for (const suite of testSuites) {
    console.log(`\n========================================================================`);
    console.log(`## ${suite.name.toUpperCase()}`);
    console.log(`## Context: "${suite.ctx}"`);
    console.log(`========================================================================`);

    // Reset CQ history for each suite trace
    globalThis.__SGLM_CQ_HISTORY__ = [];

    for (const item of suite.queries) {
      console.log(`\n------------------------------------------------------------------------`);
      console.log(`  Query: "${item.q}" -> Expected: "${item.expected}"`);
      console.log(`------------------------------------------------------------------------`);

      const res = evaluateQuery(model, tokenizer, suite.ctx, item.q, item.expected, suite.trace);

      console.log(`\n  >>> Prediction: "${res.predicted}" (Prob: ${(res.bestProb * 100).toFixed(2)}%) | Expected: "${res.expected}" | Status: ${res.pass ? 'PASS ✓' : 'FAIL ✗'}`);
      if (suite.ctx.includes('Bala') && suite.ctx.includes('Karan')) {
        console.log(`      P(Bala) = ${(res.pBala * 100).toFixed(2)}% | P(Karan) = ${(res.pKaran * 100).toFixed(2)}%`);
      }

      results.push({
        suite: suite.name,
        query: item.q,
        expected: item.expected,
        predicted: res.predicted,
        bestProb: res.bestProb,
        pBala: res.pBala,
        pKaran: res.pKaran,
        pass: res.pass,
      });
    }
  }

  console.log(`\n========================================================================`);
  console.log(`  FINAL VERIFICATION SCORECARD`);
  console.log(`========================================================================`);
  console.log(`Suite                           | Query                       | Expected | Predicted | Score | Status`);
  console.log(`--------------------------------+-----------------------------+----------+-----------+-------+-------`);
  let allPass = true;
  for (const r of results) {
    if (!r.pass) allPass = false;
    const sName = r.suite.padEnd(31).substring(0, 31);
    const qText = r.query.padEnd(27).substring(0, 27);
    const exp = r.expected.padEnd(8);
    const pred = r.predicted.padEnd(9);
    const prob = `${(r.bestProb * 100).toFixed(1)}%`.padEnd(5);
    const status = r.pass ? 'PASS ✓' : 'FAIL ✗';
    console.log(`${sName} | ${qText} | ${exp} | ${pred} | ${prob} | ${status}`);
  }
  console.log(`========================================================================`);
  console.log(`  OVERALL OUTCOME: ${allPass ? 'ALL TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`);
  console.log(`========================================================================\n`);
}

runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
