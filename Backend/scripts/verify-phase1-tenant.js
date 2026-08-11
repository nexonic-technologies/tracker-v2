import mongoose from 'mongoose';
import TenantConnectionManager from '../src/tenant/TenantConnectionManager.js';
import { createTenantContext, runWithTenantContext, getTenantModel } from '../src/tenant/tenantContext.js';

async function runPhase1Verification() {
  console.log('====================================================');
  console.log('   PHASE 1 CORE TENANT CONTEXT FOUNDATION AUDIT     ');
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

  // TEST 1: Tenant Slug & DB Name Sanitization
  console.log('1. Testing Tenant Slug / DB Name Sanitization...');
  try {
    TenantConnectionManager.validateDbName('tracker_tenant_valid_123');
    assert(true, 'Valid dbName "tracker_tenant_valid_123" accepted');
  } catch (e) {
    assert(false, `Valid dbName rejected erroneously: ${e.message}`);
  }

  const maliciousSlugs = ['../admin', 'drop_db;--', 'tenant$where', 'tenant/db'];
  for (const slug of maliciousSlugs) {
    try {
      TenantConnectionManager.validateDbName(slug);
      assert(false, `Malicious dbName "${slug}" should have been rejected!`);
    } catch (e) {
      assert(true, `Malicious dbName "${slug}" correctly rejected (${e.message})`);
    }
  }

  // TEST 2: Tenant Context Structure & Model Resolution
  console.log('\n2. Testing Standardized Tenant Context Structure & Model Resolution...');
  const fakeSchema = new mongoose.Schema({ name: String });
  const mockConnA = mongoose.createConnection();
  const mockConnB = mongoose.createConnection();

  const ModelA = mockConnA.model('Attendance', fakeSchema);
  const ModelB = mockConnB.model('Attendance', fakeSchema);

  const contextA = createTenantContext({
    tenantId: 'tenant_a',
    tenantSlug: 'tenant_a',
    connection: mockConnA,
    models: { attendance: ModelA },
  });

  const contextB = createTenantContext({
    tenantId: 'tenant_b',
    tenantSlug: 'tenant_b',
    connection: mockConnB,
    models: { attendance: ModelB },
  });

  assert(contextA.tenantId === 'tenant_a', 'contextA has correct tenantId');
  assert(contextB.tenantId === 'tenant_b', 'contextB has correct tenantId');
  assert(typeof contextA.getModel === 'function', 'contextA provides getModel() function');
  assert(contextA.getModel('Attendance') === ModelA, 'contextA.getModel("Attendance") resolves ModelA bound to ConnA');
  assert(contextB.getModel('Attendance') === ModelB, 'contextB.getModel("Attendance") resolves ModelB bound to ConnB');
  assert(contextA.getModel('Attendance') !== contextB.getModel('Attendance'), 'Model A and Model B are strictly isolated');

  // TEST 3: AsyncLocalStorage Propagation
  console.log('\n3. Testing AsyncLocalStorage Context Isolation...');
  await runWithTenantContext(contextA, async () => {
    const activeModel = getTenantModel('Attendance');
    assert(activeModel === ModelA, 'AsyncLocalStorage context inside contextA resolves ModelA');
  });

  await runWithTenantContext(contextB, async () => {
    const activeModel = getTenantModel('Attendance');
    assert(activeModel === ModelB, 'AsyncLocalStorage context inside contextB resolves ModelB');
  });

  // TEST 4: TenantConnectionManager Invalidation
  console.log('\n4. Testing TenantConnectionManager Cache Invalidation...');
  TenantConnectionManager.connectionCache.set('tracker_tenant_test', { conn: mockConnA, models: {} });
  assert(TenantConnectionManager.connectionCache.has('tracker_tenant_test'), 'Cache entry present before invalidation');
  TenantConnectionManager.invalidate('test');
  assert(!TenantConnectionManager.connectionCache.has('tracker_tenant_test'), 'Cache entry cleanly evicted after invalidate()');

  console.log('\n====================================================');
  console.log(` PHASE 1 AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await mockConnA.close();
  await mockConnB.close();
  process.exit(failed > 0 ? 1 : 0);
}

runPhase1Verification().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
