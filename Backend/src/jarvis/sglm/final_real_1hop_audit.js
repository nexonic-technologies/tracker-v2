/**
 * final_real_1hop_audit.js
 *
 * Final Real 1-Hop Audit:
 * - NO modification to SGLM code.
 * - NO deterministic benchmark generator.
 * - Uses the REAL SGLM execution/inference path with manually authored
 *   natural-language facts and queries.
 * - Tests diverse real entities, varied relationships, distractors,
 *   different fact positions, and different query relations.
 */

import { TransparentInspectableTokenizer } from './kernel/TransparentInspectableTokenizer.js';
import { MultiHeadCopyTransformer } from './kernel/MultiHeadCopyTransformer.js';

// 32-bit deterministic Mulberry32 PRNG for model weights initialization
function createRng(seed) {
  let a = (seed ^ 0x9E3779B9) >>> 0;
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  console.log('========================================================================================');
  console.log('  FINAL REAL 1-HOP AUDIT (MANUALLY DEFINED NATURAL LANGUAGE CASES)');
  console.log('========================================================================================\n');

  const seedVal = 101;
  const tokenizer = new TransparentInspectableTokenizer();

  // Register syntax and relations
  const syntaxTokens = ['Who', 'is', 'of', '?', '.', 'What', 'brother', 'father', 'mother', 'friend', 'sister', 'mentor', 'capital'];
  for (const s of syntaxTokens) tokenizer.resolveOrRegister(s);

  // Register all entities appearing in test cases
  const entities = [
    'Arun', 'Bala', 'Kumar', 'Ravi', 'Priya', 'Sita', 'John', 'David',
    'Vikram', 'Deepak', 'Kavita', 'Neha', 'Meera', 'Amit', 'Rohan',
    'Sam', 'Raj', 'Alex', 'Lucas', 'Maya', 'Elena', 'Rahul', 'Sneha',
    'Ananya', 'Kiran', 'Pooja', 'Gita', 'Suresh'
  ];
  for (const e of entities) tokenizer.resolveOrRegister(e);

  // Initialize SGLM Model with existing architecture and parameters
  const model = new MultiHeadCopyTransformer({
    vocabSize: tokenizer.vocabSize + 30,
    dModel: 64,
    nLayers: 2,
    nHeads: 4,
    nCopyHeads: 2,
    maxSeqLen: 256,
    copyWeight: 1.0,
    positionEncoding: 'rope',
    rng: createRng(seedVal ^ 0xABCD9876),
    tokenizer,
  });

  // Manually defined test cases with varying lengths, positions, distractors, and relations
  const testCases = [
    {
      id: 1,
      name: 'Arun / Bala (Early, Pos 1/3)',
      context: 'Arun is brother of Bala . Vikram is mentor of Deepak . Priya is sister of Kavita .',
      query: 'Who is brother of Arun ?',
      expectedAnswer: 'Bala',
      targetPos: 'Fact 1 of 3 (Early)',
    },
    {
      id: 2,
      name: 'Kumar / Ravi (Middle, Pos 2/3)',
      context: 'Neha is friend of Meera . Kumar is father of Ravi . Amit is brother of Rohan .',
      query: 'Who is father of Kumar ?',
      expectedAnswer: 'Ravi',
      targetPos: 'Fact 2 of 3 (Middle)',
    },
    {
      id: 3,
      name: 'Priya / Sita (Late, Pos 3/3)',
      context: 'John is mentor of Sam . Suresh is brother of Raj . Priya is mother of Sita .',
      query: 'Who is mother of Priya ?',
      expectedAnswer: 'Sita',
      targetPos: 'Fact 3 of 3 (Late)',
    },
    {
      id: 4,
      name: 'John / David (Early, Pos 1/3)',
      context: 'John is friend of David . Alex is father of Lucas . Elena is sister of Maya .',
      query: 'Who is friend of John ?',
      expectedAnswer: 'David',
      targetPos: 'Fact 1 of 3 (Early)',
    },
    {
      id: 5,
      name: 'Kiran / Pooja (Middle, Pos 3/5)',
      context: 'Rahul is brother of Sneha . Vikram is father of Ananya . Kiran is mentor of Pooja . Amit is friend of Raj . Suresh is brother of Gita .',
      query: 'Who is mentor of Kiran ?',
      expectedAnswer: 'Pooja',
      targetPos: 'Fact 3 of 5 (Middle)',
    },
    {
      id: 6,
      name: 'Vikram / Ananya (Late, Pos 5/5)',
      context: 'Arun is friend of Bala . Kumar is mentor of Ravi . Deepak is brother of Kavita . Sam is father of Alex . Vikram is brother of Ananya .',
      query: 'Who is brother of Vikram ?',
      expectedAnswer: 'Ananya',
      targetPos: 'Fact 5 of 5 (Late)',
    },
    {
      id: 7,
      name: 'Priya / Sita (Early, Pos 1/6)',
      context: 'Priya is sister of Sita . John is friend of David . Kumar is father of Ravi . Arun is brother of Bala . Alex is mentor of Lucas . Neha is mother of Meera .',
      query: 'Who is sister of Priya ?',
      expectedAnswer: 'Sita',
      targetPos: 'Fact 1 of 6 (Early)',
    },
    {
      id: 8,
      name: 'Deepak / Amit (Father Distractors, Pos 3/4)',
      context: 'Kumar is father of Ravi . Alex is father of Lucas . Deepak is father of Amit . Suresh is father of Gita .',
      query: 'Who is father of Deepak ?',
      expectedAnswer: 'Amit',
      targetPos: 'Fact 3 of 4 (Middle)',
    },
    {
      id: 9,
      name: 'Rahul / Vikram (Subject Distractor, Pos 1/3)',
      context: 'Rahul is friend of Vikram . Kumar is mentor of Deepak . Priya is mother of Sita .',
      query: 'Who is friend of Rahul ?',
      expectedAnswer: 'Vikram',
      targetPos: 'Fact 1 of 3 (Early)',
    },
    {
      id: 10,
      name: 'Vikram / Ananya (8 Facts Distractors, Pos 5/8)',
      context: 'John is brother of David . Arun is mentor of Bala . Kumar is friend of Ravi . Priya is mother of Sita . Vikram is father of Ananya . Suresh is brother of Gita . Alex is sister of Elena . Deepak is friend of Amit .',
      query: 'Who is father of Vikram ?',
      expectedAnswer: 'Ananya',
      targetPos: 'Fact 5 of 8 (Middle)',
    },
    {
      id: 11,
      name: 'Suresh / Gita (8 Facts Distractors, Pos 7/8)',
      context: 'Neha is sister of Meera . Sam is brother of Lucas . Amit is mentor of Rohan . Rahul is friend of Sneha . Kavita is mother of Pooja . Arun is brother of Bala . Suresh is father of Gita . Kiran is friend of Raj .',
      query: 'Who is father of Suresh ?',
      expectedAnswer: 'Gita',
      targetPos: 'Fact 7 of 8 (Late)',
    },
    {
      id: 12,
      name: 'Rahul / Sneha (10 Facts Distractors, Pos 7/10)',
      context: 'Alex is friend of Sam . Kumar is brother of Ravi . Vikram is mentor of Deepak . Priya is sister of Sita . John is father of David . Neha is mother of Meera . Rahul is brother of Sneha . Suresh is friend of Gita . Amit is father of Rohan . Kiran is mentor of Pooja .',
      query: 'Who is brother of Rahul ?',
      expectedAnswer: 'Sneha',
      targetPos: 'Fact 7 of 10 (Middle-Late)',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const fullPrompt = `${tc.context} ${tc.query}`;
    const tokenIds = tokenizer.encode(fullPrompt, { addBos: true });
    const contextTokens = tokenizer.encode(tc.context, { addBos: true });
    const querySpan = [contextTokens.length, tokenIds.length - 1];

    const forwardRes = model.forward(tokenIds, true, true, true, 20.0, querySpan);
    const { tokenProbs } = forwardRes;
    const T = tokenIds.length;
    const qPos = T - 1;

    let maxP = -Infinity, predId = 0;
    for (let c = 0; c < model.vocabSize; c++) {
      const p = tokenProbs[qPos * model.vocabSize + c];
      if (p > maxP) {
        maxP = p;
        predId = c;
      }
    }
    const predWord = tokenizer.decode([predId]).trim();
    const isPass = (predWord === tc.expectedAnswer);

    if (isPass) {
      passed++;
    } else {
      failed++;
    }

    console.log(`----------------------------------------------------------------------------------------`);
    console.log(`Case ${tc.id}: ${tc.name} [${tc.targetPos}]`);
    console.log(`Context : "${tc.context}"`);
    console.log(`Query   : "${tc.query}"`);
    console.log(`Expected: "${tc.expectedAnswer}"`);
    console.log(`Predicted: "${predWord}"`);
    console.log(`Result  : ${isPass ? 'PASS' : 'FAIL'}`);
  }

  const accuracy = ((passed / testCases.length) * 100).toFixed(2);

  console.log('\n========================================================================================');
  console.log('  FINAL 1-HOP AUDIT SUMMARY');
  console.log('========================================================================================');
  console.log(`  Total Cases Tested : ${testCases.length}`);
  console.log(`  Passed             : ${passed}`);
  console.log(`  Failed             : ${failed}`);
  console.log(`  Total Accuracy     : ${accuracy}%`);
  console.log('========================================================================================\n');
}

main().catch(console.error);
