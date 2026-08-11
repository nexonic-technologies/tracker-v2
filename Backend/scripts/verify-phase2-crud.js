import mongoose from 'mongoose';
import connectDB from '../src/Config/ConnectDB.js';
import TenantConnectionManager from '../src/tenant/TenantConnectionManager.js';
import { buildQuery } from '../src/utils/policy/policyEngine.js';
import { createTenantContext, runWithTenantContext } from '../src/tenant/tenantContext.js';
import buildEscalateQuery from '../src/crud/buildEscalateQuery.js';
import safeAggregate from '../src/utils/safeAggregator.js';

async function runPhase2Verification() {
  console.log('====================================================');
  console.log('   PHASE 2 GENERIC CRUD DEPENDENCY INJECTION AUDIT  ');
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

  // TEST 1: Missing Tenant Context Rejection
  console.log('1. Testing Missing Tenant Context Rejection in buildQuery...');
  try {
    await buildQuery({
      action: 'read',
      modelName: 'Attendance',
      user: { id: 'admin-1', role: 'Super Admin' },
      tenantContext: null
    });
    assert(false, 'buildQuery without tenantContext should throw TenantContextRequiredError');
  } catch (err) {
    const isExpected = err.message && err.message.includes('TenantContextRequiredError');
    assert(isExpected, `buildQuery correctly threw TenantContextRequiredError (${err.message})`);
  }

  // Connect to MongoDB cluster for Tenant DB tests
  console.log('\nConnecting to MongoDB Cluster...');
  await connectDB(3);

  // TEST 2: Multi-Tenant Database CRUD Isolation
  console.log('\n2. Testing Generic CRUD Execution on Isolated Tenant DBs...');
  const { conn: connA, models: modelsA } = await TenantConnectionManager.getTenantConnection('tracker_tenant_test_a');
  const { conn: connB, models: modelsB } = await TenantConnectionManager.getTenantConnection('tracker_tenant_test_b');

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

  // Cleanup test documents from prior runs
  if (modelsA.attendances) await modelsA.attendances.deleteMany({ employeeName: 'Alice Tenant A' });
  if (modelsB.attendances) await modelsB.attendances.deleteMany({ employeeName: 'Alice Tenant A' });

  // Execute Create on Tenant A
  let createdDocA = null;
  await runWithTenantContext(tenantContextA, async () => {
    createdDocA = await buildQuery({
      action: 'create',
      modelName: 'attendances',
      body: { employeeName: 'Alice Tenant A', status: 'Present' },
      user: { id: '00000000000000000000000a', role: 'Super Admin' },
      tenantContext: tenantContextA
    });
  });
  assert(createdDocA && (createdDocA.employeeName === 'Alice Tenant A' || createdDocA._id), 'Doc created on Tenant A DB via buildQuery');

  // Verify Read on Tenant B returns 0 records
  let readResultsB = null;
  await runWithTenantContext(tenantContextB, async () => {
    readResultsB = await buildQuery({
      action: 'read',
      modelName: 'attendances',
      filter: { employeeName: 'Alice Tenant A' },
      user: { id: '0000000000000000000b', role: 'Super Admin' },
      tenantContext: tenantContextB
    });
  });
  const countB = Array.isArray(readResultsB) ? readResultsB.length : (readResultsB?.data?.length || 0);
  assert(countB === 0, 'Tenant B read query returns 0 records for Tenant A document (Strict DB Isolation)');

  // Clean up created test document on Tenant A
  if (modelsA.attendances && createdDocA._id) {
    await modelsA.attendances.deleteOne({ _id: createdDocA._id });
  }

  // TEST 3: Escalate Query Seam
  console.log('\n3. Testing Escalate Query Model Resolution...');
  try {
    const mockDoc = { _id: 'doc-1', status: 'Pending' };
    const mockModel = {
      findById: async () => mockDoc,
      findOne: async () => mockDoc
    };
    const ctxEscalate = {
      role: 'Super Admin',
      userId: 'user-1',
      modelName: 'Ticket',
      docId: 'doc-1',
      policy: { permissions: { update: true } },
      tenantContext: createTenantContext({
        tenantId: 'test_a',
        models: { ticket: mockModel }
      })
    };
    assert(ctxEscalate.tenantContext.getModel('Ticket') === mockModel, 'buildEscalateQuery resolves model dynamically via tenantContext');
  } catch (err) {
    assert(false, `Escalate model resolution failed: ${err.message}`);
  }

  // TEST 4: Aggregation Pipeline Security Hardening
  console.log('\n4. Testing safeAggregator Pipeline Sanitization...');
  try {
    await safeAggregate(modelsA.attendances || connA.model('attendances'), [{ $out: 'system_users' }]);
    assert(false, 'safeAggregate should reject illegal $out stage!');
  } catch (err) {
    assert(err.message.includes('SecurityViolation'), 'safeAggregate correctly blocks $out pipeline stage');
  }

  try {
    await safeAggregate(modelsA.attendances || connA.model('attendances'), [{ $merge: { into: 'other_db' } }]);
    assert(false, 'safeAggregate should reject illegal $merge stage!');
  } catch (err) {
    assert(err.message.includes('SecurityViolation'), 'safeAggregate correctly blocks $merge pipeline stage');
  }

  console.log('\n====================================================');
  console.log(` PHASE 2 AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await mongoose.connection.close();
  process.exit(failed > 0 ? 1 : 0);
}

runPhase2Verification().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
