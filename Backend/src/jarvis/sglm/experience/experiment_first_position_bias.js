import { SGLMBrain } from '../core/SGLMBrain.js';
import { trainRelationBinding } from './train_relation_binding.js';

async function run() {
  console.log('========================================================================================');
  console.log('SGLM RELATIONAL BINDING EXPERIMENT');
  console.log('========================================================================================');

  // 1. Initialize SGLM Brain with empty memory store
  const sglm = new SGLMBrain({ memoryStore: { facts: [] } });

  // 2. Train SGLM neural parameters on relation pairs
  globalThis.__SGLM_TRACE__ = false;
  await trainRelationBinding(sglm.model, sglm.tokenizer, { epochs: 50, learningRate: 0.005 });

  // 3. Store canonical memory facts directly into SGLM
  console.log('\n--- SGLM Storing Memory ---');
  await sglm.store('Arun is brother of Bala .');
  await sglm.store('Arun is mentor of Karan .');

  // 4. Primary Queries: SGLM autonomously retrieves, attends, and answers
  console.log('\n========================================================================================');
  console.log('PRIMARY CANONICAL TEST');
  console.log('========================================================================================');

  const q1 = await sglm.query('Who is brother of Arun ?');
  console.log(`\nQuery: "Who is brother of Arun ?" [Expected: Bala]`);
  console.log(`  Prediction:     "${q1.predictedAnswer}" (confidence: ${(q1.confidence * 100).toFixed(2)}%)`);
  console.log(`  Top Candidates: ${q1.topCandidates.map(c => `"${c.word}": ${(c.prob * 100).toFixed(1)}%`).join(' | ')}`);
  console.log(`  Dominant Fact:  Fact #${q1.factsWithAttention[0]?.position} ("${q1.factsWithAttention[0]?.fact}") -> ${(q1.factsWithAttention[0]?.attention * 100).toFixed(2)}% attention`);

  const q2 = await sglm.query('Who is mentor of Arun ?');
  console.log(`\nQuery: "Who is mentor of Arun ?" [Expected: Karan]`);
  console.log(`  Prediction:     "${q2.predictedAnswer}" (confidence: ${(q2.confidence * 100).toFixed(2)}%)`);
  console.log(`  Top Candidates: ${q2.topCandidates.map(c => `"${c.word}": ${(c.prob * 100).toFixed(1)}%`).join(' | ')}`);
  console.log(`  Dominant Fact:  Fact #${q2.factsWithAttention[0]?.position} ("${q2.factsWithAttention[0]?.fact}") -> ${(q2.factsWithAttention[0]?.attention * 100).toFixed(2)}% attention`);

  // 5. Secondary Reversed-Order Test: Different fact order in memory
  console.log('\n========================================================================================');
  console.log('SECONDARY REVERSED-ORDER TEST');
  console.log('========================================================================================');

  const sglmRev = new SGLMBrain({ model: sglm.model, tokenizer: sglm.tokenizer, memoryStore: { facts: [] } });
  await sglmRev.store('Arun is mentor of Karan .');
  await sglmRev.store('Arun is brother of Bala .');

  const qRev1 = await sglmRev.query('Who is brother of Arun ?');
  console.log(`\nQuery: "Who is brother of Arun ?" [Expected: Bala]`);
  console.log(`  Prediction:     "${qRev1.predictedAnswer}" (confidence: ${(qRev1.confidence * 100).toFixed(2)}%)`);
  console.log(`  Top Candidates: ${qRev1.topCandidates.map(c => `"${c.word}": ${(c.prob * 100).toFixed(1)}%`).join(' | ')}`);

  const qRev2 = await sglmRev.query('Who is mentor of Arun ?');
  console.log(`\nQuery: "Who is mentor of Arun ?" [Expected: Karan]`);
  console.log(`  Prediction:     "${qRev2.predictedAnswer}" (confidence: ${(qRev2.confidence * 100).toFixed(2)}%)`);
  console.log(`  Top Candidates: ${qRev2.topCandidates.map(c => `"${c.word}": ${(c.prob * 100).toFixed(1)}%`).join(' | ')}`);

  // 6. Generalization Test Across Unseen Entities
  console.log('\n========================================================================================');
  console.log('GENERALIZATION TEST ON UNSEEN ENTITY PAIRS');
  console.log('========================================================================================');

  const unseenTests = [
    { ctx: ['Deepak is brother of Chetan .', 'Deepak is mentor of Harish .'], q: 'Who is brother of Deepak ?', expected: 'Chetan' },
    { ctx: ['Deepak is brother of Chetan .', 'Deepak is mentor of Harish .'], q: 'Who is mentor of Deepak ?', expected: 'Harish' },
    { ctx: ['Suresh is father of Manav .', 'Suresh is friend of Kabir .'], q: 'Who is father of Suresh ?', expected: 'Manav' },
    { ctx: ['Suresh is father of Manav .', 'Suresh is friend of Kabir .'], q: 'Who is friend of Suresh ?', expected: 'Kabir' },
    { ctx: ['Priya is sister of Riya .', 'Priya is mentor of Divya .'], q: 'Who is sister of Priya ?', expected: 'Riya' },
    { ctx: ['Priya is sister of Riya .', 'Priya is mentor of Divya .'], q: 'Who is mentor of Priya ?', expected: 'Divya' },
  ];

  let passed = 0;
  for (const test of unseenTests) {
    const s = new SGLMBrain({ model: sglm.model, tokenizer: sglm.tokenizer, memoryStore: { facts: [] } });
    for (const f of test.ctx) await s.store(f);
    const res = await s.query(test.q);
    const ok = res.predictedAnswer?.toLowerCase() === test.expected.toLowerCase();
    if (ok) passed++;
    console.log(`  Query: "${test.q.padEnd(28)}" -> Pred: "${(res.predictedAnswer || '').padEnd(8)}" | Expected: "${test.expected.padEnd(8)}" | ${ok ? 'PASS' : 'FAIL'}`);
  }

  console.log(`\nUnseen Entities Accuracy: ${passed}/${unseenTests.length} (${((passed / unseenTests.length) * 100).toFixed(1)}%)`);
  console.log('========================================================================================\n');
}

run().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});
