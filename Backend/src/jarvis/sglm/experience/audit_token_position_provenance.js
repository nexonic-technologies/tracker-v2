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

function l2Norm(vec, offset = 0, len = vec.length) {
  let sum = 0;
  for (let i = 0; i < len; i++) sum += vec[offset + i] * vec[offset + i];
  return Math.sqrt(sum);
}

function diffNorm(v1, o1, v2, o2, len) {
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const d = v1[o1 + i] - v2[o2 + i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function cosineSim(v1, o1, v2, o2, len) {
  let dot = 0, n1 = 0, n2 = 0;
  for (let i = 0; i < len; i++) {
    const a = v1[o1 + i];
    const b = v2[o2 + i];
    dot += a * b;
    n1 += a * a;
    n2 += b * b;
  }
  return dot / (Math.sqrt(n1) * Math.sqrt(n2) + 1e-12);
}

async function runProvenanceAudit() {
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
    { id: 'C', ctx: 'Arun is brother of Bala . Arun is mentor of Karan .', q: 'Who is brother of Arun ?', exp: 'Bala' },
    { id: 'D', ctx: 'Arun is brother of Bala . Arun is mentor of Karan .', q: 'Who is mentor of Arun ?', exp: 'Karan' },
  ];

  const caseData = {};

  for (const c of cases) {
    const fullText = `${c.ctx} ${c.q}`;
    const tokenIds = tokenizer.encode(fullText, { addBos: true });
    const ctxToks = tokenizer.encode(c.ctx, { addBos: true });
    const querySpan = [ctxToks.length, tokenIds.length - 1];
    const T = tokenIds.length;
    const d = model.dModel;

    // Run forward with tracer off so we control structured provenance capture
    globalThis.__SGLM_TRACE__ = false;
    const fwd = model.forward(tokenIds, true, true, true, 20.0, querySpan);
    const cache = fwd.cache;

    caseData[c.id] = {
      c,
      fullText,
      tokenIds,
      ctxToks,
      querySpan,
      T,
      d,
      fwd,
      cache,
    };
  }

  console.log('========================================================================================');
  console.log('  PROVENANCE AUDIT: CASE C & CASE D TOKEN PROVENANCE TABLE');
  console.log('========================================================================================\n');

  for (const id of ['C', 'D']) {
    const data = caseData[id];
    console.log(`### Case ${id}: Context="${data.c.ctx}" | Question="${data.c.q}"`);
    console.log(`| Pos | Token | Token ID | Tokenizer Output | Embedding Src | Positional Src | Pos Value Used | Norm (Before Pos) | Norm (After Pos/Emb) |`);
    console.log(`|---|---|---|---|---|---|---|---|---|`);

    for (let t = 0; t < data.T; t++) {
      const tokId = data.tokenIds[t];
      const tokStr = tokenizer.decode([tokId]).trim() || '<bos>';
      const rawWteNorm = l2Norm(model.weights.wte, tokId * data.d, data.d);
      const x0Norm = l2Norm(data.cache.x0, t * data.d, data.d);

      console.log(`| ${String(t).padStart(2)} | ${tokStr.padEnd(7)} | ${String(tokId).padStart(8)} | "${tokStr}" | wte[${tokId}]*sqrt(d) | RoPE on Q,K in layers | ${t} | ${rawWteNorm.toFixed(4)} | ${x0Norm.toFixed(4)} |`);
    }
    console.log();
  }

  console.log('========================================================================================');
  console.log('  CAUSAL COMPARISON ACROSS STAGES (CASE C vs CASE D)');
  console.log('========================================================================================\n');

  const C = caseData['C'];
  const D = caseData['D'];
  const d = C.d;
  const T = C.T;

  const trackedTokens = [
    { name: 'Arun (context 1)', pos: 1 },
    { name: 'brother (context 1)', pos: 3 },
    { name: 'Bala (context 1)', pos: 5 },
    { name: 'Arun (context 2)', pos: 7 },
    { name: 'mentor (context 2)', pos: 9 },
    { name: 'Karan (context 2)', pos: 11 },
    { name: 'brother/mentor (query relation)', pos: 15 },
    { name: 'Arun (query subject)', pos: 17 },
    { name: '? (query generation token)', pos: 18 },
  ];

  const stages = [
    { name: '1. x0 (Initial Input Embedding)', getVec: (data, p) => data.cache.x0.subarray(p * d, (p + 1) * d) },
    { name: '2. Layer 0 AttnOut', getVec: (data, p) => data.cache.layerCaches[0].multiHeadOut.subarray(p * d, (p + 1) * d) },
    { name: '3. Layer 0 Out (xOut0)', getVec: (data, p) => data.cache.layerOutputs[1].subarray(p * d, (p + 1) * d) },
    { name: '4. Layer 1 AttnOut', getVec: (data, p) => data.cache.layerCaches[1].multiHeadOut.subarray(p * d, (p + 1) * d) },
    { name: '5. Layer 1 Out (xFinal)', getVec: (data, p) => data.cache.xFinal.subarray(p * d, (p + 1) * d) },
    { name: '6. xCopy (xFinal + x0)', getVec: (data, p) => data.cache.xCopy.subarray(p * d, (p + 1) * d) },
  ];

  for (const item of trackedTokens) {
    console.log(`--- Token: "${item.name}" (pos ${item.pos}) ---`);
    for (const st of stages) {
      const vC = st.getVec(C, item.pos);
      const vD = st.getVec(D, item.pos);
      const diff = diffNorm(vC, 0, vD, 0, d);
      const cos = cosineSim(vC, 0, vD, 0, d);
      const normC = l2Norm(vC);
      const normD = l2Norm(vD);
      console.log(`  ${st.name.padEnd(30)} | Norm C: ${normC.toFixed(2).padStart(7)} | Norm D: ${normD.toFixed(2).padStart(7)} | L2 Diff: ${diff.toFixed(6).padStart(10)} | Cosine: ${cos.toFixed(6)}`);
    }
    console.log();
  }

  console.log('========================================================================================');
  console.log('  QUERYBUILDER & COPY HEAD CAUSAL COMPARISON');
  console.log('========================================================================================\n');

  const xQ_C = C.cache.xQuery;
  const xQ_D = D.cache.xQuery;
  console.log(`xQuery (QueryBuilder output):`);
  console.log(`  Norm C: ${l2Norm(xQ_C).toFixed(4)} | Norm D: ${l2Norm(xQ_D).toFixed(4)}`);
  console.log(`  L2 Diff C vs D: ${diffNorm(xQ_C, 0, xQ_D, 0, d).toFixed(6)} | Cosine: ${cosineSim(xQ_C, 0, xQ_D, 0, d).toFixed(6)}`);
  console.log();

  const CQ_raw_C = C.cache.CQ_raw.subarray(18 * d, 19 * d);
  const CQ_raw_D = D.cache.CQ_raw.subarray(18 * d, 19 * d);
  console.log(`CQ_raw[18] (BEFORE Normalization):`);
  console.log(`  Norm C: ${l2Norm(CQ_raw_C).toFixed(4)} | Norm D: ${l2Norm(CQ_raw_D).toFixed(4)}`);
  console.log(`  L2 Diff C vs D: ${diffNorm(CQ_raw_C, 0, CQ_raw_D, 0, d).toFixed(6)} | Cosine: ${cosineSim(CQ_raw_C, 0, CQ_raw_D, 0, d).toFixed(6)}`);
  console.log();

  const CQ_norm_C = C.cache.CQ.subarray(18 * d, 19 * d);
  const CQ_norm_D = D.cache.CQ.subarray(18 * d, 19 * d);
  console.log(`CQ[18] (AFTER Normalization):`);
  console.log(`  Norm C: ${l2Norm(CQ_norm_C).toFixed(4)} | Norm D: ${l2Norm(CQ_norm_D).toFixed(4)}`);
  console.log(`  L2 Diff C vs D: ${diffNorm(CQ_norm_C, 0, CQ_norm_D, 0, d).toFixed(6)} | Cosine: ${cosineSim(CQ_norm_C, 0, CQ_norm_D, 0, d).toFixed(6)}`);
  console.log();

  console.log('========================================================================================');
  console.log('  ATTENTION PROVENANCE FROM QUERY POSITION [18] ("?")');
  console.log('========================================================================================\n');

  for (const id of ['C', 'D']) {
    const data = caseData[id];
    console.log(`--- CASE ${id}: Context="${data.c.ctx}" | Question="${data.c.q}" ---`);
    for (let l = 0; l < model.nLayers; l++) {
      console.log(`  Layer ${l}:`);
      for (let h = 0; h < model.nHeads; h++) {
        const weights = [];
        for (let j = 0; j <= 18; j++) {
          const w = data.cache.layerCaches[l].attnWeights[h * T * T + 18 * T + j];
          const tokStr = tokenizer.decode([data.tokenIds[j]]).trim() || '<bos>';
          weights.push({ pos: j, tok: tokStr, w });
        }
        weights.sort((a, b) => b.w - a.w);
        const topAttended = weights.slice(0, 4).map(a => `pos ${a.pos} "${a.tok}": ${(a.w * 100).toFixed(1)}%`).join(' | ');
        console.log(`    Head ${h}: ${topAttended}`);
      }
    }
    console.log();
  }
}

runProvenanceAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
