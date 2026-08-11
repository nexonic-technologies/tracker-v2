import mongoose from 'mongoose';
import connectDB from '../src/Config/ConnectDB.js';
import TenantConnectionManager from '../src/tenant/TenantConnectionManager.js';
import { ensureTenantIndexes } from '../src/utils/databaseIndexer.js';
import { runTenantMigrations } from '../src/tenant/TenantMigrationRunner.js';

async function runPhase6Verification() {
  console.log('====================================================');
  console.log('  PHASE 6 TENANT MIGRATIONS & INDEXING AUDIT        ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // Connect to MongoDB Cluster
  console.log('Connecting to MongoDB Cluster...');
  await connectDB(3);

  // Get tenant connections for Tenant A and Tenant B
  const { conn: connA, models: modelsA } = await TenantConnectionManager.getTenantConnection('tracker_tenant_test_a');
  const { conn: connB, models: modelsB } = await TenantConnectionManager.getTenantConnection('tracker_tenant_test_b');

  // TEST 1: Tenant Index Synchronization Engine
  console.log('\n1. Testing Multi-Tenant Index Synchronization Engine...');
  try {
    const indexResultA = await ensureTenantIndexes(connA, modelsA);
    assert(indexResultA.totalModels > 0, `Tenant A index sync complete (${indexResultA.syncedModels}/${indexResultA.totalModels} models synced)`);

    const indexResultB = await ensureTenantIndexes(connB, modelsB);
    assert(indexResultB.totalModels > 0, `Tenant B index sync complete (${indexResultB.syncedModels}/${indexResultB.totalModels} models synced)`);
  } catch (err) {
    assert(false, `Index synchronization failed: ${err.message}`);
  }

  // TEST 2: Tenant Migration Runner Execution & Version Tracking
  console.log('\n2. Testing Tenant Migration Runner & Version Tracking...');
  try {
    const migResultA1 = await runTenantMigrations(connA);
    assert(migResultA1.total > 0, `Tenant A migration runner completed (${migResultA1.applied} applied, ${migResultA1.skipped} skipped)`);

    const migResultB1 = await runTenantMigrations(connB);
    assert(migResultB1.total > 0, `Tenant B migration runner completed (${migResultB1.applied} applied, ${migResultB1.skipped} skipped)`);

    // Verify _migrations collection entries
    const migrationsA = await connA.collection('_migrations').find({}).toArray();
    assert(migrationsA.length > 0, `Tenant A _migrations tracking collection contains ${migrationsA.length} record(s)`);

    const migrationsB = await connB.collection('_migrations').find({}).toArray();
    assert(migrationsB.length > 0, `Tenant B _migrations tracking collection contains ${migrationsB.length} record(s)`);
  } catch (err) {
    assert(false, `Tenant migration runner failed: ${err.message}`);
  }

  // TEST 3: Migration Idempotency & Re-execution Safety
  console.log('\n3. Testing Migration Idempotency & Safety Invariant...');
  try {
    const migResultA2 = await runTenantMigrations(connA);
    assert(migResultA2.applied === 0 && migResultA2.skipped === migResultA2.total, `Second migration run correctly skipped all ${migResultA2.skipped} already-applied migrations (Idempotent)`);
  } catch (err) {
    assert(false, `Migration idempotency check failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(` PHASE 6 AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await mongoose.connection.close();
  process.exit(failed > 0 ? 1 : 0);
}

runPhase6Verification().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
