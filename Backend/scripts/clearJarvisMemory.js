import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../src/Config/ConnectDB.js';
import { getGlobalModels } from '../src/models/global/index.js';

async function clearJarvisMemory() {
  console.log('\n========================================================');
  console.log('🧹 J.A.R.V.I.S. Cognitive Memory & Knowledge Purge Tool');
  console.log('========================================================\n');

  try {
    await connectDB();
    console.log(' Connected to MongoDB Global Database');

    const { JarvisToken, JarvisRelationship, JarvisMemory, JarvisTrace, JarvisChatSession } = getGlobalModels();

    console.log('\nPurging J.A.R.V.I.S. global cognitive collections...');

    const tokenRes = await JarvisToken.deleteMany({});
    console.log(`  ✓ Cleared jarvis_tokens: ${tokenRes.deletedCount} records deleted`);

    const relRes = await JarvisRelationship.deleteMany({});
    console.log(`  ✓ Cleared jarvis_relationships: ${relRes.deletedCount} edges deleted`);

    const memRes = await JarvisMemory.deleteMany({});
    console.log(`  ✓ Cleared jarvis_memories: ${memRes.deletedCount} facts deleted`);

    const traceRes = await JarvisTrace.deleteMany({});
    console.log(`  ✓ Cleared jarvis_traces: ${traceRes.deletedCount} traces deleted`);

    const chatRes = await JarvisChatSession.deleteMany({});
    console.log(`  ✓ Cleared jarvis_chat_sessions: ${chatRes.deletedCount} sessions deleted`);

    console.log('\n========================================================');
    console.log('✨ ALL J.A.R.V.I.S. MEMORIES & GRAPH EDGES PURGED CLEANLY');
    console.log('   Knowledge brain is reset to fresh pristine state.');
    console.log('========================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Failed to clear memory:', err);
    process.exit(1);
  }
}

clearJarvisMemory();
