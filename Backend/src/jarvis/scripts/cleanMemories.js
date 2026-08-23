import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../../Config/ConnectDB.js';
import { getGlobalModels } from '../../models/global/index.js';

async function cleanupStaleMemories() {
  await connectDB();
  const { JarvisMemory } = getGlobalModels();

  // Find all memories and inspect them
  const allMemories = await JarvisMemory.find({});
  console.log(`Found ${allMemories.length} total memories in Global DB.`);

  for (const mem of allMemories) {
    console.log(`\nMemory ID: ${mem._id}`);
    console.log(`Type: ${mem.type}`);
    console.log('Content:', JSON.stringify(mem.content, null, 2));
  }

  // Delete stale memories where parameters.expression is a hardcoded static string like "9 - 4"
  const res = await JarvisMemory.deleteMany({
    'content.parameters.expression': { $regex: /^[0-9\s+\-*/%]+$/ },
  });
  console.log(`\nDeleted ${res.deletedCount} static hardcoded memories.`);
}

cleanupStaleMemories()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
