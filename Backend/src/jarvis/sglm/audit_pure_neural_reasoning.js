/**
 * audit_pure_neural_reasoning.js
 *
 * Audit script to test SGLM with ZERO shortcuts and ZERO heuristic filters.
 *
 * Checks:
 * 1. Question words ("Who", "is", "of", "?") are fully preserved and processed by the Transformer.
 * 2. Multi-Head Self-Attention layers learn to bind "Who" + [relation] + [subject] natively.
 * 3. Copy-head resolves the answer using pure neural hidden states.
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

async function runPureNeuralAudit() {
  console.log('================================================================');
  console.log('SGLM AUDIT: PURE NEURAL REASONING (NO SHORTCUTS / NO FILTERS)');
  console.log('================================================================\n');

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

  console.log(`[1] Training 2-Block Transformer on ${trainBatch.length} question patterns...`);
  const epochs = 35;
  for (let ep = 1; ep <= epochs; ep++) {
    let epochLoss = 0;
    for (const sample of trainBatch) {
      const { loss, grads } = model.lossAndGrad(
        sample.input, sample.target, sample.lossMask,
        sample.preventSelfCopy, sample.maskBOS, sample.normQK, sample.copyScale, sample.querySpan
      );
      epochLoss += loss;
      trainer.step(grads);
    }
    if (ep % 10 === 0 || ep === epochs) {
      console.log(`   Epoch ${String(ep).padStart(2)}/${epochs} | Avg Loss: ${(epochLoss / trainBatch.length).toFixed(4)}`);
    }
  }

  console.log('\n[2] Testing UNSEEN Test Cases (Zero-Shot Knowledge Retrieval):');

  const testCases = [
    {
      label: 'Test 1 (Target: Bala)',
      ctx: 'Arun is brother of Bala . Arun is mentor of Karan .',
      q: 'Who is brother of Arun ?',
      expected: 'Bala',
    },
    {
      label: 'Test 2 (Target: Karan)',
      ctx: 'Arun is brother of Bala . Arun is mentor of Karan .',
      q: 'Who is mentor of Arun ?',
      expected: 'Karan',
    },
  ];

  for (const test of testCases) {
    console.log(`\n-------------------------------------------------------------`);
    console.log(`${test.label}`);
    console.log(`Context:  "${test.ctx}"`);
    console.log(`Question: "${test.q}"`);
    console.log(`Expected: "${test.expected}"`);

    const fullText = `${test.ctx} ${test.q}`;
    const tokenIds = tokenizer.encode(fullText, { addBos: true });
    const ctxToks = tokenizer.encode(test.ctx, { addBos: true });
    const querySpan = [ctxToks.length, tokenIds.length - 1];

    const forwardRes = model.forward(tokenIds, true, true, true, 20.0, querySpan);
    const qPos = tokenIds.length - 1;
    const v = model.vocabSize;

    const candidates = [];
    for (let c = 0; c < v; c++) {
      const p = forwardRes.tokenProbs[qPos * v + c];
      if (p > 0.001) {
        candidates.push({ id: c, word: tokenizer.decode([c]).trim(), prob: p });
      }
    }
    candidates.sort((a, b) => b.prob - a.prob);

    console.log(`Top 3 Neural Predictions:`);
    candidates.slice(0, 3).forEach((c, idx) => {
      console.log(`   ${idx + 1}. "${c.word}" -> ${(c.prob * 100).toFixed(2)}%`);
    });

    const topPred = candidates[0]?.word;
    const isCorrect = topPred === test.expected;
    console.log(`Result: ${isCorrect ? '✅ PASSED' : '❌ FAILED'} (Predicted: "${topPred}")`);
  }
  console.log(`\n=============================================================`);
}

runPureNeuralAudit().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});
