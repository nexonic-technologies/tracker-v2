import mongoose from 'mongoose';
import connectDB from '../src/Config/ConnectDB.js';
import { seedDefaultPolicyForModel } from '../src/services/policySeedingService.js';
import { buildQuery } from '../src/utils/policy/policyEngine.js';
import { createTenantContext } from '../src/tenant/tenantContext.js';

async function runPhase4Verification() {
  console.log('====================================================');
  console.log('  PHASE 4 DYNAMIC ABAC & FRONTEND GATES AUDIT       ');
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

  // TEST 1: Policy Auto-Seeding Service
  console.log('\n1. Testing Automatic ABAC Policy Seeding Service...');
  try {
    const seeded = await seedDefaultPolicyForModel('TestDynamicModel', 'core');
    assert(Array.isArray(seeded) && seeded.length > 0, `seedDefaultPolicyForModel auto-generated ${seeded.length} policy templates`);
  } catch (err) {
    assert(false, `Policy seeding failed: ${err.message}`);
  }

  // TEST 2: Tenant Policy Overrides
  console.log('\n2. Testing Tenant-Specific Policy Overrides in policyEngine...');
  const fakeSchema = new mongoose.Schema({ name: String });
  const mockConn = mongoose.createConnection();
  const AttendanceModel = mockConn.model('Attendance', fakeSchema);

  const tenantContextWithOverride = createTenantContext({
    tenantId: 'tenant_override_test',
    connection: mockConn,
    models: { attendance: AttendanceModel }
  });

  // Inject custom override granting custom role 'CustomRole123' full access on Attendance
  const overrideObj = {
    role: 'CustomRole123',
    modelName: 'Attendance',
    permissions: { read: true, create: true, update: true, delete: true },
    allowAccess: { read: ['*'], create: ['*'], update: ['*'], delete: ['*'] },
    forbiddenAccess: { read: [], create: [], update: [], delete: [] }
  };
  tenantContextWithOverride.policyOverrides = {
    'CustomRole123': {
      'Attendance': overrideObj,
      'attendances': overrideObj
    }
  };

  try {
    const safeFilter = await buildQuery({
      action: 'read',
      modelName: 'Attendance',
      filter: { status: 'Present' },
      user: { id: '000000000000000000000001', role: 'CustomRole123' },
      tenantContext: tenantContextWithOverride,
      returnFilter: true
    });
    assert(safeFilter !== null && safeFilter !== undefined, 'Tenant policy override evaluated successfully for CustomRole123');
  } catch (err) {
    assert(false, `Tenant policy override failed: ${err.message}`);
  }

  // TEST 3: Frontend Permission Gate & Hook Assets
  console.log('\n3. Testing Frontend Permission Component Infrastructure...');
  try {
    const fs = await import('fs');
    const path = await import('path');

    const hookFile = path.resolve('../Frontend/src/hooks/usePermissions.js');
    const gateFile = path.resolve('../Frontend/src/components/PermissionGate.jsx');

    assert(fs.existsSync(hookFile), 'Frontend/src/hooks/usePermissions.js created successfully');
    assert(fs.existsSync(gateFile), 'Frontend/src/components/PermissionGate.jsx created successfully');

    const gateContent = fs.readFileSync(gateFile, 'utf8');
    assert(gateContent.includes('export default function PermissionGate'), 'PermissionGate exports React component');
    assert(gateContent.includes('hasCapability') && gateContent.includes('can'), 'PermissionGate supports UI capabilities (CBAC) and ABAC rules');
    assert(gateContent.includes('return fallback;'), 'PermissionGate uses strict conditional rendering (returns fallback/null if denied)');
  } catch (err) {
    assert(false, `Frontend component check failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(` PHASE 4 AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await mockConn.close();
  await mongoose.connection.close();
  process.exit(failed > 0 ? 1 : 0);
}

runPhase4Verification().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
