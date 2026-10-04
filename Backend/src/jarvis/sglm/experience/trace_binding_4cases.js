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

async function runDiagnostic() {
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
    { ctx: 'Sneha is friend of Pooja . Rohan is friend of Tanya .', q: 'Who is friend of Sneha ?', ans: 'Pooja' },
    { ctx: 'Sneha is friend of Pooja . Rohan is friend of Tanya .', q: 'Who is friend of Rohan ?', ans: 'Tanya' },
    { ctx: 'Kumar is father of Ravi . Amit is father of Tanya .', q: 'Who is father of Kumar ?', ans: 'Ravi' },
    { ctx: 'Kumar is father of Ravi . Amit is father of Tanya .', q: 'Who is father of Amit ?', ans: 'Tanya' },

    { ctx: 'Kumar is mentor of Ravi . Neha is mentor of Meera .', q: 'Who is mentor of Neha ?', ans: 'Meera' },
    { ctx: 'Kumar is mentor of Ravi . Neha is mentor of Meera .', q: 'Who is mentor of Kumar ?', ans: 'Ravi' },
    { ctx: 'Tarun is brother of Varun . Amit is brother of Rohan .', q: 'Who is brother of Amit ?', ans: 'Rohan' },
    { ctx: 'Tarun is brother of Varun . Amit is brother of Rohan .', q: 'Who is brother of Tarun ?', ans: 'Varun' },
    { ctx: 'Neha is mentor of Pooja . Neha is friend of Meera .', q: 'Who is friend of Neha ?', ans: 'Meera' },
    { ctx: 'Neha is mentor of Pooja . Neha is friend of Meera .', q: 'Who is mentor of Neha ?', ans: 'Pooja' },
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

  for (let ep = 1; ep <= 30; ep++) {
    for (const sample of trainBatch) {
      const { grads } = model.lossAndGrad(
        sample.input, sample.target, sample.lossMask,
        sample.preventSelfCopy, sample.maskBOS, sample.normQK, sample.copyScale, sample.querySpan
      );
      trainer.step(grads);
    }
  }

  const cases = [
    { id: 'CASE C', ctx: 'Arun is brother of Bala . Arun is mentor of Karan .', q: 'Who is brother of Arun ?' },
    { id: 'CASE D', ctx: 'Arun is brother of Bala . Arun is mentor of Karan .', q: 'Who is mentor of Arun ?' },
  ];

  globalThis.__SGLM_CQ_HISTORY__ = [];
  globalThis.__SGLM_TRACE__ = true;

  for (const c of cases) {
    const fullText = `${c.ctx} ${c.q}`;
    const tokenIds = tokenizer.encode(fullText, { addBos: true });
    const ctxToks = tokenizer.encode(c.ctx, { addBos: true });
    const querySpan = [ctxToks.length, tokenIds.length - 1];

    model.forward(tokenIds, true, true, true, 20.0, querySpan);
  }

  globalThis.__SGLM_TRACE__ = false;
}

runDiagnostic().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
