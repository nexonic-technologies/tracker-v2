import { moduleGateMiddleware } from '../src/middlewares/moduleGateMiddleware.js';
import { createTenantContext } from '../src/tenant/tenantContext.js';

async function runPhase5Verification() {
  console.log('====================================================');
  console.log('  PHASE 5 MODULE LICENSING & GATING AUDIT           ');
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

  // TEST 1: Unlicensed Module Access Block (HTTP 403)
  console.log('1. Testing Unlicensed Module Access Gate...');
  const tenantContextUnlicensed = createTenantContext({
    tenantId: 'tenant_hrms_only',
    enabledModules: ['hrms', 'attendance']
  });

  const reqUnlicensed = {
    method: 'GET',
    params: { model: 'clients' },
    tenantContext: tenantContextUnlicensed
  };

  let statusSent = null;
  let jsonSent = null;
  const resUnlicensed = {
    status(s) {
      statusSent = s;
      return this;
    },
    json(data) {
      jsonSent = data;
      return this;
    }
  };

  await moduleGateMiddleware(reqUnlicensed, resUnlicensed, () => {
    assert(false, 'moduleGateMiddleware should block access to unsubscribed CRM module');
  });

  assert(statusSent === 403, 'Unlicensed module request returned HTTP 403');
  assert(jsonSent?.code === 'MODULE_LICENSE_REQUIRED', 'Response error code is MODULE_LICENSE_REQUIRED');

  // TEST 2: Suspended Tenant Account Block (HTTP 402)
  console.log('\n2. Testing Suspended Tenant Account Block...');
  const tenantContextSuspended = createTenantContext({
    tenantId: 'tenant_suspended',
    enabledModules: ['*'],
    subscription: { status: 'SUSPENDED' }
  });

  const reqSuspended = {
    method: 'GET',
    params: { model: 'attendances' },
    tenantContext: tenantContextSuspended
  };

  statusSent = null;
  jsonSent = null;
  await moduleGateMiddleware(reqSuspended, resUnlicensed, () => {
    assert(false, 'moduleGateMiddleware should block suspended tenant requests');
  });

  assert(statusSent === 402, 'Suspended tenant request returned HTTP 402');
  assert(jsonSent?.code === 'TENANT_SUSPENDED', 'Response error code is TENANT_SUSPENDED');

  // TEST 3: Canceled Tenant Subscription Read-Only Mode
  console.log('\n3. Testing Canceled Tenant Subscription Read-Only Mode...');
  const tenantContextCanceled = createTenantContext({
    tenantId: 'tenant_canceled',
    enabledModules: ['*'],
    subscription: { status: 'CANCELED' }
  });

  const reqWriteCanceled = {
    method: 'POST',
    params: { model: 'attendances' },
    tenantContext: tenantContextCanceled
  };

  statusSent = null;
  jsonSent = null;
  await moduleGateMiddleware(reqWriteCanceled, resUnlicensed, () => {
    assert(false, 'moduleGateMiddleware should block write request for canceled subscription');
  });

  assert(statusSent === 403, 'Canceled subscription write request returned HTTP 403');
  assert(jsonSent?.code === 'TENANT_CANCELED_READONLY', 'Response error code is TENANT_CANCELED_READONLY');

  let nextCalledRead = false;
  const reqReadCanceled = {
    method: 'GET',
    params: { model: 'attendances' },
    tenantContext: tenantContextCanceled
  };
  await moduleGateMiddleware(reqReadCanceled, resUnlicensed, () => {
    nextCalledRead = true;
  });
  assert(nextCalledRead, 'Canceled subscription GET read request allowed in read-only mode');

  // TEST 4: Frontend Module Guard Assets
  console.log('\n4. Testing Frontend Module Guard Assets...');
  try {
    const fs = await import('fs');
    const path = await import('path');

    const hookFile = path.resolve('../Frontend/src/hooks/useModuleAccess.js');
    const guardFile = path.resolve('../Frontend/src/components/ModuleGuard.jsx');

    assert(fs.existsSync(hookFile), 'Frontend/src/hooks/useModuleAccess.js created successfully');
    assert(fs.existsSync(guardFile), 'Frontend/src/components/ModuleGuard.jsx created successfully');

    const guardContent = fs.readFileSync(guardFile, 'utf8');
    assert(guardContent.includes('export default function ModuleGuard'), 'ModuleGuard exports React component');
    assert(guardContent.includes('isModuleEnabled'), 'ModuleGuard invokes isModuleEnabled()');
  } catch (err) {
    assert(false, `Frontend component check failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(` PHASE 5 AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runPhase5Verification().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
