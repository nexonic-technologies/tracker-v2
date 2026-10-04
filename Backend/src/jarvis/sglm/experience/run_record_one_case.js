/**
 * run_record_one_case.js
 *
 * Runs ONE existing 1-hop case through SGLM with the SGLMExperienceRecorder.
 *
 * Pipeline Traced:
 *   QUERY
 *   → SGLM RAW COMPUTATION (Query Tokenization & Initial Embedding)
 *   → MEMORY ACCESS (Retrieve from Memory Store)
 *   → SGLM RAW COMPUTATION (Full Neural Forward Pass, Attention & Logits)
 *   → FINAL OUTPUT (Raw Neural Argmax vs Ground Truth)
 *
 * Zero JavaScript interpretation.
 * Zero JavaScript deciding the answer.
 * Zero external LLMs.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), 'Backend/.env') });
}

import connectDB from '../../../Config/ConnectDB.js';
import { initGlobalModels } from '../../../models/global/index.js';
import { TransparentInspectableTokenizer } from '../kernel/TransparentInspectableTokenizer.js';
import { MultiHeadCopyTransformer } from '../kernel/MultiHeadCopyTransformer.js';
import { SGLMBrain } from '../core/SGLMBrain.js';
import { SGLMExperienceRecorder } from './SGLMExperienceRecorder.js';

function createRng(seed) {
  let a = (seed ^ 0x9E3779B9) >>> 0;
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function run() {
  console.log('========================================================================================');
  console.log('  SGLM EXECUTION EXPERIENCE RECORDER — RUNNING 1-HOP TEST CASE');
  console.log('========================================================================================\n');

  // 1. Connect to DB to access SGLM's memory store
  let dbConnected = false;
  try {
    console.log('[Setup] Connecting to MongoDB Memory...');
    await connectDB();
    initGlobalModels(mongoose.connection);
    dbConnected = true;
    console.log('[Setup] Connected to MongoDB Memory.\n');
  } catch (err) {
    console.log('[Setup] MongoDB connection skipped/failed, using in-memory fallback:', err.message);
  }

  // 2. Initialize SGLM Model and Tokenizer
  const seedVal = 101;
  const tokenizer = new TransparentInspectableTokenizer();

  const model = new MultiHeadCopyTransformer({
    vocabSize: tokenizer.vocabSize + 32,
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

  const sglmBrain = new SGLMBrain({ model, tokenizer });
  const recorder = new SGLMExperienceRecorder();

  // 3. Define the ONE 1-Hop Case
  const testCase = {
    query: 'Who is brother of Arun ?',
    expectedAnswer: 'Bala',
  };

  console.log(`Executing 1-Hop Case:`);
  console.log(`  Query: "${testCase.query}"`);
  console.log(`  Expected: "${testCase.expectedAnswer}"\n`);

  // 4. Trace & Record Execution
  const record = await recorder.recordBrainExecution({
    sglmBrain,
    queryText: testCase.query,
    groundTruth: testCase.expectedAnswer,
    metadata: {
      caseName: '1-Hop Arun Brother Retrieval',
      seed: seedVal,
    },
  });

  // 5. Print the Complete Human-Readable Trace
  console.log(recorder.formatTraceSummary(record));

  // 6. Print the Stored File Location and Full Raw JSON Payload
  const recordPath = path.join(recorder.storageDir, `${record.executionId}.json`);
  console.log(`\n[Record Stored] Full raw execution record saved to:\n  ${recordPath}\n`);

  if (dbConnected && mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('[Cleanup] MongoDB connection closed.');
  }

  return record;
}

run().catch(async (err) => {
  console.error('[Error] Execution recorder failed:', err);
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
