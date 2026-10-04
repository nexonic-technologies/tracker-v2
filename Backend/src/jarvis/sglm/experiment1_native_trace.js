/**
 * experiment1_native_trace.js
 *
 * EXPERIMENT 1 — Native Information-Flow Trace
 *
 * Pure SGLM Execution. Zero external audit math.
 * Uses SGLM's built-in native execution tracer: globalThis.__SGLM_TRACE__ = true.
 *
 * Compares:
 * - CASE A: "Who is brother of Arun ?" (Target: Bala)
 * - CASE B: "Who is mentor of Arun ?"  (Target: Karan)
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

  console.log('[Training SGLM MultiHeadCopyTransformer (35 epochs)]...');
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
  console.log('[Training Complete]\n');

  return { model, tokenizer };
}

async function runNativeTrace() {
  const { model, tokenizer } = trainModel();

  const ctx = 'Arun is brother of Bala . Arun is mentor of Karan .';

  const cases = [
    { id: 'CASE A', q: 'Who is brother of Arun ?', expected: 'Bala' },
    { id: 'CASE B', q: 'Who is mentor of Arun ?',  expected: 'Karan' },
  ];

  // Enable SGLM's built-in native execution path tracer
  globalThis.__SGLM_CQ_HISTORY__ = [];
  globalThis.__SGLM_TRACE__ = true;

  for (const c of cases) {
    console.log(`\n########################################################################`);
    console.log(`## RUNNING NATIVE SGLM QUERY: ${c.id}`);
    console.log(`## Context:  "${ctx}"`);
    console.log(`## Question: "${c.q}" -> Expected Answer: "${c.expected}"`);
    console.log(`########################################################################`);

    const fullText = `${ctx} ${c.q}`;
    const tokenIds = tokenizer.encode(fullText, { addBos: true });
    const ctxToks = tokenizer.encode(ctx, { addBos: true });
    const querySpan = [ctxToks.length, tokenIds.length - 1];

    // Native forward pass with built-in SGLM tracer active
    model.forward(tokenIds, true, true, true, 20.0, querySpan);
  }

  globalThis.__SGLM_TRACE__ = false;
}

runNativeTrace().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
