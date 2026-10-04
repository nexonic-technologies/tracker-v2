/**
 * seed_brain_memory.js
 *
 * SCRIPT 1: SEED FACTS INTO BRAIN MEMORY VIA SGLM
 *
 * SGLM receives the facts and stores them into its memory.
 * Zero JSON file patches. 100% Real Database.
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

async function seedBrainMemory() {
  console.log('========================================================================================');
  console.log('  SCRIPT 1: SEEDING FACTS INTO REAL MONGODB BRAIN MEMORY VIA SGLM');
  console.log('========================================================================================\n');

  console.log('Connecting to MongoDB...');
  await connectDB();
  initGlobalModels(mongoose.connection);
  console.log('MongoDB connected successfully.\n');

  // Caller interacts directly with SGLM Brain
  const sglmBrain = new SGLMBrain();

  // Retrieve existing memories to enforce strict idempotency (no duplicate seeding)
  const existingRecords = await sglmBrain.retrieveFromMemory();
  const normalizeFact = (f) => (f ? f.toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim() : '');
  const existingFacts = new Set(
    existingRecords.map((r) => normalizeFact(sglmBrain.toCompactSemanticFact(r))).filter(Boolean)
  );

  console.log(`Current existing memories in MongoDB: ${existingFacts.size}`);

  const benchmarkFacts = [
    'Arun is brother of Bala .',
    'Arun is mentor of Raj .',
    'Arun is friend of Sam .',
    'my name is arunbharathi .',
    'Vikram is mentor of Deepak .',
    'Priya is sister of Kavita .',
    'Neha is friend of Meera .',
    'Kumar is father of Ravi .',
    'Amit is brother of Rohan .',
    'John is friend of David .',
    'Alex is father of Lucas .',
    'Elena is sister of Maya .',
  ];

  let storedCount = 0;
  let skippedCount = 0;

  console.log(`\nEvaluating ${benchmarkFacts.length} candidate facts for Brain Memory...`);
  for (let i = 0; i < benchmarkFacts.length; i++) {
    const fact = benchmarkFacts[i];
    const cleanFact = sglmBrain.toCompactSemanticFact(fact);
    const norm = normalizeFact(cleanFact);

    if (existingFacts.has(norm)) {
      console.log(`  [Skipped - Already Exists] "${cleanFact}"`);
      skippedCount++;
    } else {
      // Deterministic ID based on content to prevent duplicate insertion
      const safeId = `fact_${norm.replace(/[^a-z0-9]+/g, '_').slice(0, 30)}`;
      await sglmBrain.store(cleanFact, { id: safeId, tags: ['benchmark'] });
      existingFacts.add(norm);
      console.log(`  [SGLM Stored] "${cleanFact}" (id: ${safeId})`);
      storedCount++;
    }
  }

  console.log('\n========================================================================================');
  console.log(`  SEEDING COMPLETE. Stored: ${storedCount} new facts | Skipped: ${skippedCount} existing facts.`);
  console.log('========================================================================================\n');

  await mongoose.connection.close();
  console.log('Database connection closed.\n');
}

seedBrainMemory().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
