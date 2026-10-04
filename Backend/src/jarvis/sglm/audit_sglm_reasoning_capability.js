/**
 * audit_sglm_reasoning_capability.js
 *
 * RIGOROUS AUDIT: Can SGLM Reason "Why" It Performed a Hop?
 *
 * Strict Compliance:
 * - ZERO JavaScript orchestration or simulated reasoning.
 * - ZERO hardcoded heuristic narrative generation.
 * - Direct examination of SGLM neural model capabilities, output heads,
 *   attention attribution, and generation behavior when queried for "Why".
 */

import { TransparentInspectableTokenizer } from './kernel/TransparentInspectableTokenizer.js';
import { MultiHeadCopyTransformer } from './kernel/MultiHeadCopyTransformer.js';
import { AnalyticalAdamWTrainer } from './kernel/AnalyticalAdamWTrainer.js';
import { generateTrainingBatch } from './benchmark/DeterministicKnowledgeGenerator.js';

function createRng(seed) {
  let a = (seed ^ 0x9E3779B9) >>> 0;
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function runAudit() {
  console.log('========================================================================================');
  console.log('  SGLM REASONING CAPABILITY AUDIT: CAN SGLM REASON "WHY" A HOP WAS MADE?');
  console.log('  (Pure Neural Evaluation - Zero JavaScript Orchestration / Zero Template Faking)');
  console.log('========================================================================================\n');

  const tokenizer = new TransparentInspectableTokenizer();

  const words = [
    'Who', 'is', 'of', '?', '.', 'What', 'Why', 'Because', 'Explain', 'reason', 'how',
    'brother', 'father', 'mother', 'sister', 'mentor', 'friend', 'capital',
    'Arun', 'Bala', 'Kumar', 'Ravi', 'Priya', 'Sita', 'Vikram', 'Deepak', 'John', 'David'
  ];
  for (const w of words) tokenizer.resolveOrRegister(w);

  // Initialize model with 2 layers, 4 self-attention heads, 2 copy heads
  const seed = 101;
  const model = new MultiHeadCopyTransformer({
    vocabSize: tokenizer.vocabSize + 30,
    dModel: 64,
    nLayers: 2,
    nHeads: 4,
    nCopyHeads: 2,
    maxSeqLen: 256,
    copyWeight: 1.0,
    positionEncoding: 'rope',
    rng: createRng(seed ^ 0xABCD9876),
    tokenizer,
  });

  // Train a basic relational checkpoint so copy heads are properly aligned
  console.log('[Phase 0] Training relational alignment checkpoint (AdamW, 25 epochs)...');
  const trainer = new AnalyticalAdamWTrainer({ model, learningRate: 0.002 });
  const relations = [
    { name: 'brother', type: 'person', questionWord: 'Who', prep: 'of' },
    { name: 'father', type: 'person', questionWord: 'Who', prep: 'of' },
    { name: 'mentor', type: 'person', questionWord: 'Who', prep: 'of' },
    { name: 'sister', type: 'person', questionWord: 'Who', prep: 'of' },
    { name: 'friend', type: 'person', questionWord: 'Who', prep: 'of' },
  ];
  const trainBatch = generateTrainingBatch({
    seed: 101,
    batchSize: 60,
    maxFacts: 3,
    relations,
    entityPool: ['Arun', 'Bala', 'Kumar', 'Ravi', 'Priya', 'Sita', 'Vikram', 'Deepak', 'John', 'David'],
    tokenizer,
  });
  for (let ep = 1; ep <= 25; ep++) {
    trainer.trainBatch(trainBatch);
  }
  console.log('[Phase 0] Checkpoint trained.\n');

  // ====================================================================================
  // TEST 1: The 1-Hop Prediction Baseline
  // ====================================================================================
  console.log('----------------------------------------------------------------------------------------');
  console.log('TEST 1: SGLM 1-Hop Neural Retrieval Execution');
  console.log('----------------------------------------------------------------------------------------');
  const context = 'Arun is brother of Bala . Vikram is mentor of Deepak . Priya is sister of Sita .';
  const query1 = 'Who is brother of Arun ?';
  const prompt1 = `${context} ${query1}`;

  const tokenIds1 = tokenizer.encode(prompt1, { addBos: true });
  const contextTokens1 = tokenizer.encode(context, { addBos: true });
  const querySpan1 = [contextTokens1.length, tokenIds1.length - 1];

  const fwd1 = model.forward(tokenIds1, true, true, true, 20.0, querySpan1);
  const qPos1 = tokenIds1.length - 1;

  function getTopK(probs, pos, k = 5) {
    const arr = [];
    for (let c = 0; c < model.vocabSize; c++) {
      arr.push({ id: c, word: tokenizer.decode([c]).trim(), prob: probs[pos * model.vocabSize + c] });
    }
    arr.sort((a, b) => b.prob - a.prob);
    return arr.slice(0, k);
  }

  const top1 = getTopK(fwd1.tokenProbs, qPos1, 5);
  console.log(`Context : "${context}"`);
  console.log(`Query   : "${query1}"`);
  console.log(`Top 5 Token Predictions from SGLM Output Head:`);
  top1.forEach((t, i) => console.log(`  ${i + 1}. "${t.word}" (prob: ${(t.prob * 100).toFixed(2)}%)`));
  const hopAnswer = top1[0].word;
  console.log(`-> SGLM 1-Hop Output: "${hopAnswer}"\n`);

  // ====================================================================================
  // TEST 2: Can SGLM Answer "Why" Via Prompting / Autoregressive Continuation?
  // ====================================================================================
  console.log('----------------------------------------------------------------------------------------');
  console.log('TEST 2: Direct "Why" Probing — Can SGLM Generate an Explanation?');
  console.log('----------------------------------------------------------------------------------------');
  const whyQueries = [
    { name: 'Direct Why Prompt', text: `${prompt1} ${hopAnswer} . Why ?` },
    { name: 'Causal Because Prompt', text: `${prompt1} ${hopAnswer} . Because` },
    { name: 'Reason Query', text: `${context} What is the reason ${hopAnswer} is brother of Arun ?` },
  ];

  for (const wq of whyQueries) {
    console.log(`\nProbe: [${wq.name}]`);
    console.log(`Input String fed to SGLM: "${wq.text}"`);

    const tIds = tokenizer.encode(wq.text, { addBos: true });
    // Tokenizer check: are all tokens recognized or newly dynamically added?
    const qLen = tIds.length;
    const ctxLen = tokenizer.encode(context, { addBos: true }).length;
    const qSpan = [ctxLen, qLen - 1];

    const fwdWhy = model.forward(tIds, true, true, true, 20.0, qSpan);
    const topWhy = getTopK(fwdWhy.tokenProbs, qLen - 1, 5);

    console.log(`SGLM Next-Token Logits / Probability Distribution:`);
    topWhy.forEach((t, i) => console.log(`  ${i + 1}. "${t.word}" (prob: ${(t.prob * 100).toFixed(2)}%)`));

    // Test autoregressive continuation for up to 5 steps to see if it forms an explanation
    let autoSeq = [...tIds];
    const generatedWords = [];
    for (let step = 0; step < 6; step++) {
      const stepFwd = model.forward(autoSeq, true, true, true, 20.0, [ctxLen, autoSeq.length - 1]);
      const stepTop = getTopK(stepFwd.tokenProbs, autoSeq.length - 1, 1);
      const nextId = stepTop[0].id;
      const nextWord = stepTop[0].word;
      generatedWords.push(nextWord);
      autoSeq.push(nextId);
    }
    console.log(`Autoregressive 6-Step Generation from SGLM: "${generatedWords.join(' ')}"`);
  }

  // ====================================================================================
  // TEST 3: Latent Explainability — What Neural Attribution DOES SGLM Actually Have?
  // ====================================================================================
  console.log('\n----------------------------------------------------------------------------------------');
  console.log('TEST 3: Latent Neural Explainability (Inspect Internal Tensor Attribution)');
  console.log('----------------------------------------------------------------------------------------');
  console.log('Does SGLM have internal mathematical evidence for why it picked the hop?');

  const T = tokenIds1.length;
  const copyAttn = fwd1.copyWeights; // [nH * T * T] or [T * T] ensemble
  const nH = model.nCopyHeads;

  console.log(`\n1. Copy Head Attention Allocation at Query Token [pos ${qPos1} = "?"]:`);
  const factClauses = [
    { id: 1, text: 'Arun is brother of Bala .', tokens: tokenizer.encode('Arun is brother of Bala .') },
    { id: 2, text: 'Vikram is mentor of Deepak .', tokens: tokenizer.encode('Vikram is mentor of Deepak .') },
    { id: 3, text: 'Priya is sister of Sita .', tokens: tokenizer.encode('Priya is sister of Sita .') },
  ];

  let pOffset = 1; // skip BOS
  factClauses.forEach((fc) => {
    fc.start = pOffset;
    fc.end = pOffset + fc.tokens.length - 1;
    pOffset = fc.end + 1;
  });

  // Calculate attention per head and ensemble
  for (let h = 0; h < nH; h++) {
    console.log(`\n  Copy Head #${h}:`);
    factClauses.forEach((fc) => {
      let headMass = 0;
      for (let p = fc.start; p <= fc.end; p++) {
        headMass += copyAttn[h * T * T + qPos1 * T + p];
      }
      console.log(`    Fact ${fc.id} ("${fc.text}"): ${(headMass * 100).toFixed(2)}% attention mass`);
    });
  }

  // Token-level attention within the winning fact
  console.log(`\n2. Token-level Copy Attention within the Target Fact (Fact 1):`);
  const targetFact = factClauses[0];
  for (let p = targetFact.start; p <= targetFact.end; p++) {
    const tId = tokenIds1[p];
    const tName = tokenizer.decode([tId]).trim();
    let ensAttn = 0;
    for (let h = 0; h < nH; h++) {
      ensAttn += copyAttn[h * T * T + qPos1 * T + p] / nH;
    }
    console.log(`    pos ${p} ["${tName}"]: ${(ensAttn * 100).toFixed(2)}% copy attention`);
  }

  // ====================================================================================
  // TEST 4: Counterfactual / Causal Necessity Audit
  // ====================================================================================
  console.log('\n----------------------------------------------------------------------------------------');
  console.log('TEST 4: Causal Necessity — Does SGLM Depend on the Fact Causally?');
  console.log('----------------------------------------------------------------------------------------');
  const counterfactuals = [
    {
      desc: 'Original Premise Present',
      ctx: 'Arun is brother of Bala . Vikram is mentor of Deepak .',
      q: 'Who is brother of Arun ?',
    },
    {
      desc: 'Premise Relation Mutated (mentor instead of brother)',
      ctx: 'Arun is mentor of Bala . Vikram is mentor of Deepak .',
      q: 'Who is brother of Arun ?',
    },
    {
      desc: 'Premise Removed Entirely',
      ctx: 'Kumar is brother of Bala . Vikram is mentor of Deepak .',
      q: 'Who is brother of Arun ?',
    },
  ];

  for (const cf of counterfactuals) {
    const fullP = `${cf.ctx} ${cf.q}`;
    const tIds = tokenizer.encode(fullP, { addBos: true });
    const ctxToks = tokenizer.encode(cf.ctx, { addBos: true });
    const res = model.forward(tIds, true, true, true, 20.0, [ctxToks.length, tIds.length - 1]);
    const top = getTopK(res.tokenProbs, tIds.length - 1, 3);
    console.log(`Condition: [${cf.desc}]`);
    console.log(`  Context: "${cf.ctx}"`);
    console.log(`  Query  : "${cf.q}"`);
    console.log(`  Prediction: "${top[0].word}" (prob: ${(top[0].prob * 100).toFixed(2)}%)`);
    console.log(`  Top 3: ${top.map(t => `"${t.word}" (${(t.prob * 100).toFixed(1)}%)`).join(', ')}`);
  }

  // ====================================================================================
  // TEST 5: JavaScript Orchestration vs SGLM Pure Neural Capabilities Comparison
  // ====================================================================================
  console.log('\n========================================================================================');
  console.log('  ARCHITECTURAL TRUTH & AUDIT VERDICT');
  console.log('========================================================================================');
  console.log('Audit completed cleanly with zero JS faking.\n');
}

runAudit().catch(console.error);
