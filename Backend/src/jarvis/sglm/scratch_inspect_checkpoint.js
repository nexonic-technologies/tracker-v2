import { TransparentInspectableTokenizer } from './kernel/TransparentInspectableTokenizer.js';
import { MultiHeadCopyTransformer } from './kernel/MultiHeadCopyTransformer.js';
import { trainRelationBinding } from './experience/train_relation_binding.js';

const tokenizer = new TransparentInspectableTokenizer();

const model = new MultiHeadCopyTransformer({
  vocabSize: 256,
  dModel: 64,
  nLayers: 2,
  nHeads: 4,
  nCopyHeads: 2,
  maxSeqLen: 256,
  positionEncoding: 'rope',
  tokenizer,
});

console.log('Training relational binding on SGLM...');
await trainRelationBinding(model, tokenizer, { epochs: 50, learningRate: 0.005 });
console.log('Training complete.\n');

const testCases = [
  { ctx: 'Arun is brother of Bala . Vikram is mentor of Deepak . Priya is sister of Kavita .', q: 'Who is brother of Arun ?', expected: 'Bala' },
  { ctx: 'Arun is brother of Bala . Vikram is mentor of Deepak . Priya is sister of Kavita .', q: 'Who is mentor of Vikram ?', expected: 'Deepak' },
  { ctx: 'Arun is brother of Bala . Vikram is mentor of Deepak . Priya is sister of Kavita .', q: 'Who is sister of Priya ?', expected: 'Kavita' },
  { ctx: 'Neha is friend of Meera . Kumar is father of Ravi . Amit is brother of Rohan .', q: 'Who is father of Kumar ?', expected: 'Ravi' },
  { ctx: 'John is friend of David . Alex is father of Lucas . Elena is sister of Maya .', q: 'Who is friend of John ?', expected: 'David' },
  { ctx: 'John is friend of David . Alex is father of Lucas . Elena is sister of Maya .', q: 'Who is father of Alex ?', expected: 'Lucas' },
];

let passed = 0;
for (const tc of testCases) {
  const full = `${tc.ctx} ${tc.q}`;
  const toks = tokenizer.encode(full, { addBos: true });
  const ctxToks = tokenizer.encode(tc.ctx, { addBos: true });
  const querySpan = [ctxToks.length, toks.length - 1];

  const res = model.forward(toks, true, true, true, 20.0, querySpan);
  const qPos = toks.length - 1;

  let maxP = -Infinity, predId = 0;
  for (let c = 0; c < model.vocabSize; c++) {
    const p = res.tokenProbs[qPos * model.vocabSize + c];
    if (p > maxP) { maxP = p; predId = c; }
  }
  const predWord = tokenizer.decode([predId]).trim();
  const ok = predWord.toLowerCase() === tc.expected.toLowerCase();
  if (ok) passed++;
  console.log(`Query: "${tc.q.padEnd(28)}" -> Predicted: "${predWord.padEnd(8)}" (P=${(maxP*100).toFixed(1)}%) | Expected: "${tc.expected.padEnd(8)}" | ${ok ? 'PASS' : 'FAIL'}`);
}

console.log(`\nResult: ${passed}/${testCases.length} (${((passed/testCases.length)*100).toFixed(1)}%)`);
