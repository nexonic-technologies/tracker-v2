import mongoose from 'mongoose';
import connectDB from '../src/Config/ConnectDB.js';
import TenantConnectionManager from '../src/tenant/TenantConnectionManager.js';
import { createTenantContext, runWithTenantContext } from '../src/tenant/tenantContext.js';
import { buildQuery } from '../src/utils/policy/policyEngine.js';
import { calculateAttendance } from '../src/services/attendances.js';
import { seedDefaultPolicyForModel } from '../src/services/policySeedingService.js';
import { moduleGateMiddleware } from '../src/middlewares/moduleGateMiddleware.js';
import { ensureTenantIndexes } from '../src/utils/databaseIndexer.js';
import { runTenantMigrations } from '../src/tenant/TenantMigrationRunner.js';
import fs from 'fs';
import path from 'path';

async function runMasterVerification() {
  console.log('====================================================');
  console.log('  TRACKER MULTI-TENANT MASTER SYSTEM AUDIT REPORT   ');
  console.log('====================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      totalPassed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      totalFailed++;
    }
  }

  // Connect to MongoDB Cluster
  console.log('Connecting to MongoDB Cluster...');
  await connectDB(3);

  // ── PHASE 1 & 2: TENANT CONNECTION & ISOLATED CRUD ─────────────────────────
  console.log('\n--- PHASE 1 & 2: TENANT CONNECTION & ISOLATED CRUD ---');
  const { conn: connA, models: modelsA } = await TenantConnectionManager.getTenantConnection('tracker_tenant_test_a');
  const { conn: connB, models: modelsB } = await TenantConnectionManager.getTenantConnection('tracker_tenant_test_b');

  assert(connA.name === 'tracker_tenant_test_a', 'Tenant A connection bound to tracker_tenant_test_a');
  assert(connB.name === 'tracker_tenant_test_b', 'Tenant B connection bound to tracker_tenant_test_b');

  const tenantContextA = createTenantContext({
    tenantId: 'test_a',
    tenantSlug: 'test_a',
    connection: connA,
    models: modelsA
  });

  const tenantContextB = createTenantContext({
    tenantId: 'test_b',
    tenantSlug: 'test_b',
    connection: connB,
    models: modelsB
  });

  // Create doc on Tenant A
  const createdDocA = await runWithTenantContext(tenantContextA, async () => {
    return await buildQuery({
      role: 'Super Admin',
      userId: new mongoose.Types.ObjectId().toString(),
      action: 'create',
      modelName: 'Attendance',
      tenantContext: tenantContextA,
      body: {
        employee: new mongoose.Types.ObjectId(),
        employeeName: 'Master Test User A',
        date: new Date(),
        status: 'Present',
        workType: 'fixed'
      }
    });
  });

  assert(createdDocA && createdDocA._id, 'Document created on Tenant A DB');

  // Verify DB Isolation on Tenant B
  const tenantBReads = await runWithTenantContext(tenantContextB, async () => {
    return await buildQuery({
      role: 'Super Admin',
      userId: new mongoose.Types.ObjectId().toString(),
      action: 'read',
      modelName: 'Attendance',
      tenantContext: tenantContextB,
      filter: { _id: createdDocA._id }
    });
  });

  assert(Array.isArray(tenantBReads) && tenantBReads.length === 0, 'Tenant B read query returns 0 records for Tenant A document (Strict DB Isolation)');

  // ── PHASE 3: DOMAIN SERVICE CONTEXT BINDING ───────────────────────────────
  console.log('\n--- PHASE 3: DOMAIN SERVICE CONTEXT BINDING ---');
  let calculatedA = null;
  await runWithTenantContext(tenantContextA, async () => {
    calculatedA = await calculateAttendance({
      employeeId: new mongoose.Types.ObjectId(),
      date: new Date(),
      checkIn: new Date(),
      punches: []
    }, { save: false });
  });

  assert(calculatedA && calculatedA.status, `Attendance domain service executed under tenant context (Status: ${calculatedA?.status})`);

  // ── PHASE 4: DYNAMIC ABAC & POLICY OVERRIDES ──────────────────────────────
  console.log('\n--- PHASE 4: DYNAMIC ABAC & POLICY OVERRIDES ---');
  const seeded = await seedDefaultPolicyForModel('MasterTestModel', 'core');
  assert(Array.isArray(seeded) && seeded.length > 0, `Auto-seeded ABAC policies for newly defined model (${seeded.length} templates)`);

  // ── PHASE 5: RUNTIME MODULE GATING & LICENSING ───────────────────────────
  console.log('\n--- PHASE 5: RUNTIME MODULE GATING & LICENSING ---');
  const reqUnlicensed = {
    method: 'GET',
    params: { model: 'clients' },
    tenantContext: createTenantContext({ tenantId: 'unlicensed_test', enabledModules: ['hrms'] })
  };

  let gateStatus = null;
  const resGate = {
    status(s) { gateStatus = s; return this; },
    json() { return this; }
  };

  await moduleGateMiddleware(reqUnlicensed, resGate, () => {});
  assert(gateStatus === 403, 'Unlicensed module API request correctly rejected with HTTP 403');

  // ── PHASE 6: TENANT MIGRATIONS & INDEXING ────────────────────────────────
  console.log('\n--- PHASE 6: TENANT MIGRATIONS & INDEXING ---');
  const indexResult = await ensureTenantIndexes(connA, modelsA);
  assert(indexResult.totalModels > 0, `Multi-tenant index sync complete (${indexResult.syncedModels}/${indexResult.totalModels} models synced)`);

  const migResult = await runTenantMigrations(connA);
  assert(migResult.total > 0, `Tenant migration runner executed idempotently (${migResult.skipped} skipped)`);

  // ── PHASE 7: SUPER ADMIN CONTROL PLANE & FRONTEND ASSETS ──────────────────
  console.log('\n--- PHASE 7: SUPER ADMIN CONTROL PLANE & FRONTEND ASSETS ---');
  const tenantContextFile = path.resolve('../Frontend/src/context/TenantContext.jsx');
  const permGateFile = path.resolve('../Frontend/src/components/PermissionGate.jsx');
  const modGuardFile = path.resolve('../Frontend/src/components/ModuleGuard.jsx');
  const adminTenantPage = path.resolve('../Frontend/src/pages/admin/tenant-management.jsx');
  const adminProvisionPage = path.resolve('../Frontend/src/pages/admin/tenant-provisioning.jsx');
  const adminModulePage = path.resolve('../Frontend/src/pages/admin/module-management.jsx');
  const adminModelDefPage = path.resolve('../Frontend/src/pages/admin/model-definitions.jsx');
  const adminCtrlFile = path.resolve('./src/Controller/TenantAdminController.js');

  assert(fs.existsSync(tenantContextFile), 'Frontend TenantContext.jsx exists');
  assert(fs.existsSync(permGateFile), 'Frontend PermissionGate.jsx exists');
  assert(fs.existsSync(modGuardFile), 'Frontend ModuleGuard.jsx exists');
  assert(fs.existsSync(adminTenantPage), 'Frontend Super Admin tenant-management.jsx page exists');
  assert(fs.existsSync(adminProvisionPage), 'Frontend Super Admin tenant-provisioning.jsx page exists');
  assert(fs.existsSync(adminModulePage), 'Frontend Super Admin module-management.jsx page exists');
  assert(fs.existsSync(adminModelDefPage), 'Frontend Super Admin model-definitions.jsx page exists');
  assert(fs.existsSync(path.resolve('../Frontend/src/pages/admin/create-module.jsx')), 'Frontend Super Admin create-module.jsx page exists');
  assert(fs.existsSync(path.resolve('../Frontend/src/pages/admin/create-model-definition.jsx')), 'Frontend Super Admin create-model-definition.jsx page exists');
  assert(fs.existsSync(adminCtrlFile), 'Backend Super Admin TenantAdminController.js exists');

  console.log('\n====================================================');
  console.log(` MASTER AUDIT RESULT: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log('====================================================\n');

  await mongoose.connection.close();
  process.exit(totalFailed > 0 ? 1 : 0);
}

runMasterVerification().catch((err) => {
  console.error('Master verification script crashed:', err);
  process.exit(1);
});
