import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initGlobalDB, getGlobalModels } from '../src/models/global/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function resetGraph() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';
  console.log('Connecting to Global DB at:', mongoUri);
  await initGlobalDB(mongoUri);

  const { JarvisRelationship, JarvisToken, JarvisMemory } = getGlobalModels();

  if (JarvisRelationship) {
    const relRes = await JarvisRelationship.deleteMany({});
    console.log(`✓ Cleared ${relRes.deletedCount} JarvisRelationship records`);
  }

  if (JarvisToken) {
    // Retain core system tokens if any, or clear dynamic tokens
    const tokRes = await JarvisToken.deleteMany({ id: { $gte: 20000 } });
    console.log(`✓ Cleared ${tokRes.deletedCount} dynamic JarvisToken records`);
  }

  if (JarvisMemory) {
    const memRes = await JarvisMemory.deleteMany({});
    console.log(`✓ Cleared ${memRes.deletedCount} JarvisMemory records`);
  }

  console.log('\n✅ Knowledge Graph and Brain Memory reset complete.');
  process.exit(0);
}

resetGraph().catch((err) => {
  console.error('Reset error:', err);
  process.exit(1);
});
