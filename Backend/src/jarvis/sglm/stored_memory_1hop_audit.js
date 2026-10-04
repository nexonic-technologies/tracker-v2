/**
 * stored_memory_1hop_audit.js
 *
 * SGLM STORED BRAIN MEMORY 1-HOP RETRIEVAL AUDIT
 *
 * Requirements:
 * - The test script calls SGLM DIRECTLY (sglmBrain.query).
 * - SGLM autonomously handles its own memory contact, retrieval, attention, and prediction.
 * - Test script passes ONLY the question string to SGLM. Zero context injected.
 * - Zero memoryStore calls from the test script.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), 'Backend/.env') });
}

import mongoose from 'mongoose';
import connectDB from '../../Config/ConnectDB.js';
import { initGlobalModels } from '../../models/global/index.js';
import { SGLMBrain } from './core/SGLMBrain.js';

async function runStoredMemory1HopAudit() {
  console.log('========================================================================================');
  console.log('  SGLM STORED BRAIN MEMORY 1-HOP RETRIEVAL AUDIT');
  console.log('  (Test interacts ONLY with SGLM; SGLM owns its memory, attention, and prediction)');
  console.log('========================================================================================\n');

  // 1. Connect to MongoDB
  console.log('Connecting to MongoDB...');
  await connectDB();
  initGlobalModels(mongoose.connection);
  console.log('MongoDB connected successfully.\n');

  // Disable low-level debug tracing during audit for clean reporting
  globalThis.__SGLM_TRACE__ = false;

  // 2. Instantiate SGLM Brain (SGLM manages its model, tokenizer, and memory internally)
  const sglmBrain = new SGLMBrain();

  // 3. Test Queries: The test script calls SGLM directly with ONLY the question string
  const testQueries = [
    {
      id: 1,
      query: 'Who is brother of Arun ?',
      expectedAnswer: 'Bala',
    },
    {
      id: 2,
      query: 'Who is mentor of Vikram ?',
      expectedAnswer: 'Deepak',
    },
    {
      id: 3,
      query: 'Who is sister of Priya ?',
      expectedAnswer: 'Kavita',
    },
    {
      id: 4,
      query: 'Who is father of Kumar ?',
      expectedAnswer: 'Ravi',
    },
    {
      id: 5,
      query: 'Who is friend of John ?',
      expectedAnswer: 'David',
    },
    {
      id: 6,
      query: 'Who is father of Alex ?',
      expectedAnswer: 'Lucas',
    },
  ];

  let passed = 0;
  let failed = 0;
  const auditRows = [];

  for (const tq of testQueries) {
    console.log('----------------------------------------------------------------------------------------');
    console.log(`[Case ${tq.id}] Query: "${tq.query}"`);
    console.log(`Expected: "${tq.expectedAnswer}"`);

    // SGLM does the work: contacts memory, gathers knowledge, runs copy attention, and responds
    const sglmResult = await sglmBrain.query(tq.query);

    console.log(`\nBoundary & Representation Metrics:`);
    console.log(`  * Raw Memory Token Count     : ${sglmResult.rawMemoryTokenCount}`);
    console.log(`  * Compact Memory Token Count : ${sglmResult.compactMemoryTokenCount}`);
    console.log(`  * Question Token Positions   : [${sglmResult.questionSpan ? sglmResult.questionSpan.join(' .. ') : 'N/A'}]`);
    console.log(`  * Final Sequence Token Count : ${sglmResult.totalTokens} (Max: ${sglmResult.maxSeqLen})`);
    console.log(`  * Truncation Occurred        : ${sglmResult.truncated ? 'YES (FAIL - QUESTION TRUNCATED)' : 'NO (Question inside window)'}`);

    if (sglmResult.truncated) {
      console.log(`\nResult: FAIL (Truncation violation: Sequence exceeded window)`);
      failed++;
      auditRows.push({
        caseId: tq.id,
        seqLen: sglmResult.totalTokens,
        qPos: `[${sglmResult.questionSpan.join('..')}]`,
        truncation: 'TRUNCATED',
        targetPos: 'N/A',
        predicted: 'TRUNCATED',
        expected: tq.expectedAnswer,
        attn: '0.00%',
        status: 'FAIL',
      });
      continue;
    }

    // Identify target fact position and its attention mass for reporting
    let targetFactInfo = null;
    if (sglmResult.factsWithAttention) {
      targetFactInfo = sglmResult.factsWithAttention.find((f) =>
        f.fact.toLowerCase().includes(tq.expectedAnswer.toLowerCase())
      );
    }
    const targetFactPos = targetFactInfo ? `Fact #${targetFactInfo.position}` : 'Not Found';
    const targetFactAttn = targetFactInfo ? `${(targetFactInfo.attention * 100).toFixed(2)}%` : '0.00%';

    console.log(`\nTop 5 Candidates Predicted by SGLM:`);
    sglmResult.topCandidates.forEach((cand, idx) => {
      let mark = '';
      if (cand.word.toLowerCase() === tq.expectedAnswer.toLowerCase()) mark = ' <-- [EXPECTED TARGET]';
      console.log(`  ${idx + 1}. "${cand.word}" (P = ${(cand.prob * 100).toFixed(2)}%)${mark}`);
    });

    const isMatch = (sglmResult.predictedAnswer && sglmResult.predictedAnswer.toLowerCase() === tq.expectedAnswer.toLowerCase());
    if (isMatch) {
      passed++;
      console.log(`\nResult: PASS`);
    } else {
      failed++;
      console.log(`\nResult: FAIL`);
    }

    auditRows.push({
      caseId: tq.id,
      seqLen: sglmResult.totalTokens,
      qPos: `[${sglmResult.questionSpan.join('..')}]`,
      truncation: sglmResult.truncated ? 'YES' : 'NO',
      targetPos: targetFactPos,
      predicted: sglmResult.predictedAnswer || 'N/A',
      expected: tq.expectedAnswer,
      attn: targetFactAttn,
      status: isMatch ? 'PASS' : 'FAIL',
    });
  }

  const accuracy = ((passed / testQueries.length) * 100).toFixed(2);

  console.log('\n========================================================================================');
  console.log('  SGLM STORED MEMORY RETRIEVAL 1-HOP AUDIT REPORT');
  console.log('========================================================================================');
  console.log('| Case | Seq Len | Question Pos | Truncated? | Target Fact Pos | Predicted | Expected | Target Fact Attn | Status |');
  console.log('|------|---------|--------------|------------|-----------------|-----------|----------|------------------|--------|');
  for (const r of auditRows) {
    console.log(
      `| ${String(r.caseId).padEnd(4)} | ${String(r.seqLen).padEnd(7)} | ${String(r.qPos).padEnd(12)} | ${String(r.truncation).padEnd(10)} | ${String(r.targetPos).padEnd(15)} | ${String(r.predicted).padEnd(9)} | ${String(r.expected).padEnd(8)} | ${String(r.attn).padEnd(16)} | ${String(r.status).padEnd(6)} |`
    );
  }
  console.log('----------------------------------------------------------------------------------------');
  console.log(`  Overall Accuracy: ${accuracy}% (${passed}/${testQueries.length} Passed)`);
  console.log('========================================================================================\n');

  await mongoose.connection.close();
  console.log('Database connection closed.\n');
}

runStoredMemory1HopAudit().catch(async (err) => {
  console.error('Audit failed:', err);
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
