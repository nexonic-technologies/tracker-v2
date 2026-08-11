import dotenv from 'dotenv';
import connectDB from '../Config/ConnectDB.js';
import { initGlobalModels, getGlobalModels } from '../models/global/index.js';
import TenantConnectionManager from '../tenant/TenantConnectionManager.js';
import { runWithTenantContext, getTenantStore } from '../tenant/tenantContext.js';
import { getModel } from '../utils/appRegistry.js';

dotenv.config();

async function runPhase1Verification() {
  console.log('----------------------------------------------------');
  console.log('🧪 Starting No-Code DB-Backed Dynamic Architecture Verification');
  console.log('----------------------------------------------------');

  try {
    // 1. Base DB Connection
    await connectDB(1);
    initGlobalModels();
    console.log('✅ 1. Global DB Models Initialized');

    const { Tenant, UserLogin, Module, ModelDefinition } = getGlobalModels();
    if (!Tenant || !UserLogin || !Module || !ModelDefinition) {
      throw new Error('Global models Tenant, UserLogin, Module, or ModelDefinition not initialized properly');
    }
    console.log('✅ 2. Global DB Schemas (Tenant, UserLogin, Module, ModelDefinition) Ready');

    // 3. Verify Global System Modules Seeded in Global DB
    const modulesInDb = await Module.find().lean();
    if (modulesInDb.length === 0) {
      throw new Error('System modules not seeded in Global DB');
    }
    console.log(`✅ 3. Global DB System Modules Seeded (${modulesInDb.length} modules available)`);

    // 4. Create a Dynamic Custom ModelDefinition in Global DB (No-Code Engine Test)
    const customModelName = 'CustomInspectionReport';
    await ModelDefinition.deleteOne({ modelName: customModelName });

    const dynamicDef = await ModelDefinition.create({
      modelName: customModelName,
      collectionName: 'custom_inspection_reports',
      moduleId: 'hrms',
      displayName: 'Custom Inspection Report',
      fields: [
        { name: 'reportTitle', type: 'String', required: true },
        { name: 'score', type: 'Number', default: 100 },
        { name: 'inspectionDate', type: 'Date' },
        { name: 'passed', type: 'Boolean', default: true },
      ],
      isCustom: true,
      status: 'Active',
    });
    console.log(`✅ 4. Created Dynamic ModelDefinition "${customModelName}" in Global DB metadata`);

    // 5. Dynamic Module-Wise Collection Compilation Test
    const testDbName = 'tracker_tenant_verification_test';
    const hrmsMod = modulesInDb.find((m) => m.moduleId === 'hrms');
    const enabledModules = hrmsMod ? [hrmsMod.moduleId] : ['hrms'];

    const { conn, models } = await TenantConnectionManager.getTenantConnection(testDbName, enabledModules);
    if (!conn || !models || !models.employees || !models.CustomInspectionReport) {
      throw new Error('TenantConnectionManager failed to compile dynamic ModelDefinition schema');
    }
    console.log(`✅ 5. Dynamic Runtime Resolution: Compiled "${customModelName}" from Global DB metadata on DB "${testDbName}"`);

    // 6. AsyncLocalStorage Context & Dynamic appRegistry getModel Resolution Test
    await runWithTenantContext(
      {
        tenantId: 'test_tenant',
        dbName: testDbName,
        enabledModules,
        conn,
        models,
      },
      async () => {
        const activeStore = getTenantStore();
        if (!activeStore || activeStore.tenantId !== 'test_tenant') {
          throw new Error('AsyncLocalStorage failed to store active tenant context');
        }

        const dynamicModel = getModel('CustomInspectionReport');
        if (!dynamicModel || dynamicModel.db.name !== testDbName) {
          throw new Error('appRegistry.getModel failed to return dynamic model from context');
        }
        console.log(`✅ 6. Dynamic appRegistry.getModel("CustomInspectionReport") Scoped to Tenant DB: "${dynamicModel.db.name}"`);
      }
    );

    console.log('----------------------------------------------------');
    console.log('🎉 No-Code DB-Backed Dynamic Architecture Verification Passed!');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('❌ Verification Failed:', err.message);
    process.exit(1);
  }
}

runPhase1Verification().then(() => process.exit(0));
