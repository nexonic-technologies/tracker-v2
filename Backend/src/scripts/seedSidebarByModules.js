// src/scripts/seedSidebarByModules.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import SideBar from '../models/SideBar.js';
import ModuleSchema from '../models/global/Module.js';
import { DEFAULT_MODULES_SEED } from '../models/global/index.js';
import { resolveModuleKey } from '../utils/moduleMapping.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

export async function runSidebarModuleMigration(dbConnection) {
  const conn = dbConnection || mongoose.connection;

  // 1. Get or compile Module model
  const ModuleModel = conn.models.Module || conn.model('Module', ModuleSchema);

  // 2. Ensure global/tenant modules exist
  const moduleMap = new Map(); // moduleKey -> Module document _id
  for (const modDef of DEFAULT_MODULES_SEED) {
    let modDoc = await ModuleModel.findOne({ moduleId: modDef.moduleId });
    if (!modDoc) {
      modDoc = await ModuleModel.create(modDef);
    }
    moduleMap.set(modDef.moduleId, modDoc._id);
  }

  // Also index any existing custom modules
  const existingModules = await ModuleModel.find({}).lean();
  for (const mod of existingModules) {
    moduleMap.set(mod.moduleId, mod._id);
  }

  // 3. Query all SideBar documents
  const SideBarModel = conn.models.sidebars || conn.model('sidebars', SideBar.schema);
  const sidebars = await SideBarModel.find({ isDeleted: { $ne: true } });

  console.log(`[seedSidebarByModules] Processing ${sidebars.length} sidebar items...`);

  let updatedCount = 0;
  for (const sb of sidebars) {
    const key = resolveModuleKey(sb.mainRoute, sb.title);
    const modObjectId = moduleMap.get(key) || moduleMap.get('core') || null;

    sb.moduleKey = key;
    if (modObjectId) {
      sb.moduleId = modObjectId;
    }
    await sb.save();
    updatedCount++;
  }

  console.log(`[seedSidebarByModules] Successfully attached moduleId ObjectIds & moduleKeys to ${updatedCount} sidebar documents.`);
  return { success: true, count: updatedCount };
}

// Standalone execution entrypoint
if (process.argv[1] && process.argv[1].includes('seedSidebarByModules.js')) {
  (async () => {
    try {
      console.log(`[seedSidebarByModules] Connecting to MongoDB: ${MONGO_URI}`);
      await mongoose.connect(MONGO_URI);
      await runSidebarModuleMigration(mongoose.connection);
      console.log(`[seedSidebarByModules] Migration complete.`);
      process.exit(0);
    } catch (err) {
      console.error(`[seedSidebarByModules] Error during migration:`, err);
      process.exit(1);
    }
  })();
}
