import mongoose from 'mongoose';
import connectDB from '../src/Config/ConnectDB.js';
import TenantConnectionManager from '../src/tenant/TenantConnectionManager.js';
import { createTenantContext, runWithTenantContext } from '../src/tenant/tenantContext.js';
import { calculateAttendance } from '../src/services/attendances.js';

async function runPhase3Verification() {
  console.log('====================================================');
  console.log('  PHASE 3 DOMAIN SERVICE & FRONTEND TENANT AUDIT   ');
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

  // TEST 1: Tenant Domain Service Model Resolution
  console.log('\n1. Testing Domain Service Execution on Tenant Context...');
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

  // Calculate Attendance on Tenant A
  let calculatedA = null;
  await runWithTenantContext(tenantContextA, async () => {
    calculatedA = await calculateAttendance({
      employeeId: new mongoose.Types.ObjectId(),
      date: new Date(),
      checkIn: new Date(),
      punches: []
    }, { save: false });
  });

  assert(calculatedA && calculatedA.status, `calculateAttendance executed on Tenant A context (Status: ${calculatedA?.status})`);

  // Calculate Attendance on Tenant B
  let calculatedB = null;
  await runWithTenantContext(tenantContextB, async () => {
    calculatedB = await calculateAttendance({
      employeeId: new mongoose.Types.ObjectId(),
      date: new Date(),
      checkIn: new Date(),
      punches: []
    }, { save: false });
  });

  assert(calculatedB && calculatedB.status, `calculateAttendance executed on Tenant B context (Status: ${calculatedB?.status})`);

  // TEST 2: Frontend Tenant Context Exports Check
  console.log('\n2. Testing Frontend Tenant Context Infrastructure...');
  try {
    const fs = await import('fs');
    const path = await import('path');

    const tenantContextFile = path.resolve('../Frontend/src/context/TenantContext.jsx');
    const axiosFile = path.resolve('../Frontend/src/api/axiosInstance.js');
    const mainFile = path.resolve('../Frontend/src/main.jsx');

    assert(fs.existsSync(tenantContextFile), 'Frontend/src/context/TenantContext.jsx created successfully');
    assert(fs.existsSync(axiosFile), 'Frontend/src/api/axiosInstance.js exists');

    const axiosContent = fs.readFileSync(axiosFile, 'utf8');
    assert(axiosContent.includes("config.headers['x-tenant-id']"), 'axiosInstance request interceptor propagates x-tenant-id header');

    const mainContent = fs.readFileSync(mainFile, 'utf8');
    assert(mainContent.includes('<TenantProvider>'), 'TenantProvider wrapped in Frontend/src/main.jsx provider tree');
  } catch (err) {
    assert(false, `Frontend verification check failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(` PHASE 3 AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await mongoose.connection.close();
  process.exit(failed > 0 ? 1 : 0);
}

runPhase3Verification().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
