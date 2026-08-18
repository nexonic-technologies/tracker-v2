import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import bcrypt from 'bcryptjs';
import models from '../models/Collection.js';
import { getGlobalModels, initGlobalModels } from '../models/global/index.js';
import TenantConnectionManager from '../tenant/TenantConnectionManager.js';
import { seedNavigationAndCapabilities } from './seedMasterNavigationAndCapabilities.js';

// Force Node.js to use reliable public DNS for MongoDB SRV lookups
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

const STANDARD_MODULES = [
  { moduleId: 'core', name: 'Core Engine & Dashboard', description: 'Dashboard, settings, profile, search, policies', isCore: true },
  { moduleId: 'hrms', name: 'HRMS & Core Personnel', description: 'Employee lifecycle, departments, designations', isCore: false },
  { moduleId: 'attendance', name: 'Attendance, Leaves & Payroll Suite', description: 'Daily attendance, shift scheduling, leaves, regularizations, salary structures, payroll runs', isCore: false },
  { moduleId: 'accounts', name: 'Accounts & Financial Ledger', description: 'Financial ledger, payment journals, accounting reports, payment records, and financial analytics', isCore: false },
  { moduleId: 'tasks', name: 'Tasks & Project Management', description: 'Sprints, tasks, todos, queues', isCore: false },
  { moduleId: 'tickets', name: 'Helpdesk & Ticket System', description: 'Customer tickets, activity logs', isCore: false },
  { moduleId: 'crm', name: 'CRM & Client Management', description: 'Leads, meetings, quotations, ledgers', isCore: false },
  { moduleId: 'assets', name: 'Asset Management', description: 'Hardware allocation, incidents, repairs', isCore: false },
  { moduleId: 'recruitment', name: 'Recruitment & Job Openings', description: 'Openings, candidate pipeline', isCore: false },
  { moduleId: 'feed', name: 'Team Feed & Social Work', description: 'Groups, posts, comments, notifications', isCore: false }
];

const CLIENT_ENABLED_MODULE_KEYS = ['core', 'attendance'];

/**
 * Seed tenant data (Roles, Departments, Designations, Employee, AccessPolicies, Capabilities, Sidebars)
 */
async function seedTenantDatabase({ dbName, enabledModuleKeys, employeeData, deptData, desigData }) {
  console.log(`\n  -> [seedTenantDatabase] Target DB: ${dbName}`);
  
  // Use TenantConnectionManager to ensure models are compiled for this specific tenant DB connection
  const { conn, models: tenantModels } = await TenantConnectionManager.getTenantConnection(
    dbName,
    enabledModuleKeys.includes('*') ? ['*'] : enabledModuleKeys
  );

  // 1. Clear Tenant Collections
  await tenantModels.roles.deleteMany({});
  await tenantModels.departments.deleteMany({});
  await tenantModels.designations.deleteMany({});
  await tenantModels.access_policies.deleteMany({});
  await tenantModels.employees.deleteMany({});
  await tenantModels.capabilities.deleteMany({});
  await tenantModels.sidebars.deleteMany({});

  // 2. Seed Super Admin Role
  const superAdminRole = await tenantModels.roles.create({
    name: 'Super Admin',
    description: 'Bypasses all policy and capability checks',
    isSuperAdmin: true,
    status: 'Active',
    isActive: true
  });

  // 3. Seed Default Department & Designation
  const dept = await tenantModels.departments.create({
    name: deptData.name,
    shortCode: deptData.shortCode,
    status: 'Active',
    isActive: true
  });

  const desig = await tenantModels.designations.create({
    title: desigData.title,
    level: 'L4',
    status: 'Active',
    isActive: true
  });

  // 4. Seed Comprehensive SuperAdmin Access Policy
  await tenantModels.access_policies.create({
    role: superAdminRole._id,
    modelName: '*',
    actions: ['read', 'create', 'update', 'delete', 'approve'],
    allowAccess: {
      read: ['*'],
      create: ['*'],
      update: ['*'],
      delete: ['*']
    }
  });

  // 5. Seed Employee
  const employee = await tenantModels.employees.create({
    basicInfo: {
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      gender: 'male',
      phone: '9876543210',
      email: employeeData.email
    },
    professionalInfo: {
      empId: employeeData.empId,
      department: dept._id,
      designation: desig._id,
      role: superAdminRole._id,
      level: 'L4'
    },
    authInfo: {
      workEmail: employeeData.email,
      password: employeeData.passwordHash
    },
    status: 'Active',
    isActive: true
  });

  // 6. Seed Sidebars and Capabilities from Master Markdown Specification
  const isAllowAll = enabledModuleKeys.includes('*') || enabledModuleKeys.length >= STANDARD_MODULES.length;
  const navResult = await seedNavigationAndCapabilities(conn, {
    enabledModuleKeys: isAllowAll ? STANDARD_MODULES.map(m => m.moduleId) : enabledModuleKeys,
    allowAllModules: isAllowAll,
    clearExisting: true
  });

  return {
    conn,
    models: tenantModels,
    role: superAdminRole,
    dept,
    desig,
    employee,
    policyCount: 1,
    capabilityCount: navResult.capabilitiesCount,
    seededSidebarCount: navResult.sidebarsCount
  };
}

/**
 * Automated Verification Engine
 */
async function runVerification() {
  console.log('\n--- Running Automated Verification Engine ---');
  const checks = [];
  const errors = [];
  const warnings = [];

  const addCheck = (name, passed, message, expected = null, actual = null) => {
    checks.push({ name, passed, message, expected, actual });
    if (!passed) {
      errors.push(`FAIL: [${name}] - ${message}`);
    }
  };

  const { Tenant, UserLogin, Module } = getGlobalModels();

  // 1. Verify Global Database Control Plane Users
  const globalAdmins = await UserLogin.find({ userType: 'global_admin' }).lean();
  const globalAdminPassed = globalAdmins.length >= 1;
  addCheck(
    'Global Platform Admin Count',
    globalAdminPassed,
    globalAdminPassed ? `Found ${globalAdmins.length} Platform Admin(s)` : 'No Platform Admin found in tracker_global',
    'At least 1',
    globalAdmins.length
  );

  // 2. Verify Global Modules Registry
  const globalModules = await Module.find({ status: 'Active' }).lean();
  const missingModuleIds = STANDARD_MODULES.filter(sm => !globalModules.some(gm => gm.moduleId === sm.moduleId)).map(s => s.moduleId);
  const globalModulesIntegrityPassed = missingModuleIds.length === 0;
  addCheck(
    'Global Modules Integrity',
    globalModulesIntegrityPassed,
    globalModulesIntegrityPassed ? 'All standard modules present in Global DB' : `Missing modules: ${missingModuleIds.join(', ')}`,
    [],
    missingModuleIds
  );

  // Helper to map enabledModule ObjectIds -> moduleKeys
  const getModuleKeysFromIds = (enabledModuleIds) => {
    const idToKey = new Map(globalModules.map(m => [String(m._id), m.moduleId]));
    return (enabledModuleIds || [])
      .map(id => idToKey.get(String(id)))
      .filter(Boolean)
      .sort();
  };

  // 3. Verify Global Sidebars & Capabilities from Master Matrix
  const dbGlobalSidebars = await models.sidebars.find().lean();
  const dbGlobalCapabilities = await models.capabilities.find().lean();

  const globalSidebarsMatchPassed = dbGlobalSidebars.length === 103 && dbGlobalCapabilities.length === 272;
  addCheck(
    'Global DB Master Sidebar & Capability Registry Matching',
    globalSidebarsMatchPassed,
    globalSidebarsMatchPassed
      ? `Global DB matches full Master Specification: ${dbGlobalSidebars.length} sidebars (18 root domains, 85 sub-routes) & ${dbGlobalCapabilities.length} capabilities`
      : `Mismatch in Global DB (Sidebars: ${dbGlobalSidebars.length}/103, Capabilities: ${dbGlobalCapabilities.length}/272)`,
    { sidebars: 103, capabilities: 272 },
    { sidebars: dbGlobalSidebars.length, capabilities: dbGlobalCapabilities.length }
  );

  // 4. Verify Internal Tenant (t_admin)
  const internalTenant = await Tenant.findOne({ tenantId: 't_admin' }).lean();
  const internalTenantRecordPassed = Boolean(internalTenant && internalTenant.status === 'Active');
  addCheck(
    'Internal Tenant Record',
    internalTenantRecordPassed,
    internalTenant ? 'Internal tenant t_admin exists and is Active' : 'Internal tenant t_admin missing',
    'Active',
    internalTenant ? internalTenant.status : null
  );

  const actualInternalModuleKeys = getModuleKeysFromIds(internalTenant?.enabledModules);
  const expectedInternalModuleKeys = globalModules.map(m => m.moduleId).sort();
  const internalExactModulesPassed = JSON.stringify(actualInternalModuleKeys) === JSON.stringify(expectedInternalModuleKeys);
  addCheck(
    'Internal Tenant Exact Module Entitlement',
    internalExactModulesPassed,
    internalExactModulesPassed ? 'Internal tenant has all global active modules enabled' : `Module mismatch in internal tenant`,
    expectedInternalModuleKeys,
    actualInternalModuleKeys
  );

  const expectedInternalDbName = internalTenant ? internalTenant.dbName : (process.env.DEFAULT_TENANT_DB || 'tenant_admin');

  const internalUserLogin = await UserLogin.findOne({ email: 'developer@workhub.com' }).lean();
  const internalUserLoginPassed = Boolean(
    internalUserLogin &&
    internalUserLogin.userType === 'employee' &&
    internalUserLogin.tenantId === 't_admin' &&
    internalUserLogin.dbName === expectedInternalDbName
  );
  addCheck(
    'Internal Super Admin UserLogin',
    internalUserLoginPassed,
    internalUserLogin ? `Internal Super Admin UserLogin exists with employee scope in t_admin (dbName: ${expectedInternalDbName})` : 'Internal Super Admin UserLogin missing',
    { userType: 'employee', tenantId: 't_admin', dbName: expectedInternalDbName },
    internalUserLogin ? { userType: internalUserLogin.userType, tenantId: internalUserLogin.tenantId, dbName: internalUserLogin.dbName } : null
  );

  // Resolve internal tenant connection
  const { models: internalModels } = await TenantConnectionManager.getTenantConnection(
    expectedInternalDbName,
    actualInternalModuleKeys.length > 0 ? actualInternalModuleKeys : ['*']
  );

  const internalEmp = await internalModels.employees.findOne({ 'basicInfo.email': 'developer@workhub.com' }).lean();
  const internalEmpPassed = Boolean(internalEmp);
  addCheck(
    'Internal Super Admin Employee',
    internalEmpPassed,
    internalEmp ? 'Internal Super Admin Employee record exists in tenant_admin' : 'Internal Super Admin Employee record missing',
    'Employee Record Exists',
    internalEmp ? 'Exists' : 'Missing'
  );

  const internalSidebars = await internalModels.sidebars.find().lean();
  const internalSidebarsExactPassed = internalSidebars.length === 103;
  addCheck(
    'Internal Tenant Sidebars Identity Match',
    internalSidebarsExactPassed,
    internalSidebarsExactPassed ? `Internal tenant sidebars exactly match all 103 master navigation nodes` : `Found ${internalSidebars.length}/103 sidebars in internal tenant`,
    103,
    internalSidebars.length
  );

  // 5. Verify Client Tenant (t_client)
  const clientTenant = await Tenant.findOne({ tenantId: 't_client' }).lean();
  const clientTenantRecordPassed = Boolean(clientTenant && clientTenant.status === 'Active');
  addCheck(
    'Client Tenant Record',
    clientTenantRecordPassed,
    clientTenant ? 'Client tenant t_client exists and is Active' : 'Client tenant t_client missing',
    'Active',
    clientTenant ? clientTenant.status : null
  );

  const actualClientModuleKeys = getModuleKeysFromIds(clientTenant?.enabledModules);
  const expectedClientModuleKeys = [...CLIENT_ENABLED_MODULE_KEYS].sort();
  const clientExactModulesPassed = JSON.stringify(actualClientModuleKeys) === JSON.stringify(expectedClientModuleKeys);
  addCheck(
    'Client Tenant Exact Module Entitlement',
    clientExactModulesPassed,
    clientExactModulesPassed ? 'Client tenant has exactly Core + Attendance Suite' : `Module mismatch in client tenant`,
    expectedClientModuleKeys,
    actualClientModuleKeys
  );

  const clientUserLogin = await UserLogin.findOne({ email: 'client.admin@workhub.com' }).lean();
  const clientUserLoginPassed = Boolean(
    clientUserLogin &&
    clientUserLogin.userType === 'employee' &&
    clientUserLogin.tenantId === 't_client' &&
    clientUserLogin.dbName === 'tenant_client'
  );
  addCheck(
    'Client Super Admin UserLogin',
    clientUserLoginPassed,
    clientUserLogin ? 'Client Super Admin UserLogin exists with employee scope in t_client' : 'Client Super Admin UserLogin missing',
    { userType: 'employee', tenantId: 't_client', dbName: 'tenant_client' },
    clientUserLogin ? { userType: clientUserLogin.userType, tenantId: clientUserLogin.tenantId, dbName: clientUserLogin.dbName } : null
  );

  // Resolve client tenant connection
  const { models: clientModels } = await TenantConnectionManager.getTenantConnection(
    clientTenant ? clientTenant.dbName : 'tenant_client',
    actualClientModuleKeys.length > 0 ? actualClientModuleKeys : CLIENT_ENABLED_MODULE_KEYS
  );

  const clientEmp = await clientModels.employees.findOne({ 'basicInfo.email': 'client.admin@workhub.com' }).lean();
  const clientEmpPassed = Boolean(clientEmp);
  addCheck(
    'Client Super Admin Employee',
    clientEmpPassed,
    clientEmp ? 'Client Super Admin Employee record exists in tenant_client' : 'Client Super Admin Employee record missing',
    'Employee Record Exists',
    clientEmp ? 'Exists' : 'Missing'
  );

  const clientSidebars = await clientModels.sidebars.find().lean();
  const disabledModuleClientSidebars = clientSidebars.filter(sb => !CLIENT_ENABLED_MODULE_KEYS.includes(sb.moduleKey));
  const clientSidebarsIdentityPassed = disabledModuleClientSidebars.length === 0 && clientSidebars.length > 0;
  
  addCheck(
    'Client Tenant Sidebars Identity & Isolation Match',
    clientSidebarsIdentityPassed,
    clientSidebarsIdentityPassed
      ? `Client tenant sidebars exactly match ${clientSidebars.length} allowed items with 0 disabled module leaks`
      : `Client sidebar mismatch (Leaked disabled sidebars: ${disabledModuleClientSidebars.length})`,
    { leaked: 0 },
    { actualCount: clientSidebars.length, leaked: disabledModuleClientSidebars.length }
  );

  // 6. Parent-Child Hierarchy Consistency Check
  const verifyParentChildConsistency = (sidebarsList) => {
    const parentIdSet = new Set(sidebarsList.filter(s => s.isParent).map(s => String(s._id)));
    const orphanedChildren = sidebarsList.filter(s => !s.isParent && s.parentId && !parentIdSet.has(String(s.parentId)));
    return orphanedChildren;
  };

  const clientOrphanedChildren = verifyParentChildConsistency(clientSidebars);
  const parentChildConsistencyPassed = clientOrphanedChildren.length === 0;
  addCheck(
    'Sidebar Parent-Child Hierarchy Consistency',
    parentChildConsistencyPassed,
    parentChildConsistencyPassed ? 'Zero orphaned child sidebar items in client tenant' : `Found ${clientOrphanedChildren.length} orphaned child sidebar(s)`,
    0,
    clientOrphanedChildren.length
  );

  console.log('\n================ VERIFICATION REPORT ================');
  checks.forEach(c => {
    console.log(`${c.passed ? '✓' : '✗'} [${c.name}]: ${c.message}`);
  });
  console.log('=====================================================\n');

  if (errors.length > 0) {
    console.error(`Verification FAILED with ${errors.length} error(s):`);
    errors.forEach(e => console.error(`  - ${e}`));
    return false;
  }

  console.log('🎉 ALL INTEGRITY AND ISOLATION CHECKS PASSED PERFECTLY!\n');
  return true;
}

/**
 * Main Seeding Pipeline
 */
async function main() {
  const isReset = process.argv.includes('--reset');
  const isVerifyOnly = process.argv.includes('--verify-only');

  console.log('====================================================');
  console.log('   Workhub ERP SuperAdmin Master Seeder Pipeline   ');
  console.log('====================================================');
  console.log(`Target MongoDB URI: ${MONGODB_URI}`);
  console.log(`Reset Mode: ${isReset ? 'ENABLED (Full Wipe & Re-provision)' : 'DISABLED'}`);
  console.log(`Verify Only: ${isVerifyOnly ? 'YES' : 'NO'}`);

  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  const { Tenant, UserLogin, Module, ModelDefinition, ProvisioningRun } = initGlobalModels(mongoose.connection);

  if (isVerifyOnly) {
    const passed = await runVerification();
    await mongoose.disconnect();
    process.exit(passed ? 0 : 1);
  }

  try {
    if (isReset) {
      console.log('\n--- [RESET] Purging Existing Global & Tenant Data ---');
      
      // Clear global collections
      await UserLogin.deleteMany({});
      await Tenant.deleteMany({});
      await Module.deleteMany({});
      if (ModelDefinition) await ModelDefinition.deleteMany({});
      if (ProvisioningRun) await ProvisioningRun.deleteMany({});
      await models.sidebars.deleteMany({});
      await models.capabilities.deleteMany({});
      console.log('  ✓ Cleared global collections in tracker_global');

      // Drop tenant databases
      const adminDb = mongoose.connection.db.admin();
      const { databases } = await adminDb.listDatabases();
      for (const dbInfo of databases) {
        if (dbInfo.name.startsWith('tenant_') || dbInfo.name.startsWith('tracker_tenant_')) {
          console.log(`  -> Dropping tenant database: ${dbInfo.name}`);
          const tConn = mongoose.connection.useDb(dbInfo.name);
          await tConn.dropDatabase();
          console.log(`  ✓ Dropped ${dbInfo.name}`);
        }
      }
    }

    // Step 1: Seed Global Modules
    console.log('\n[1] Seed Standard System Modules into tracker_global');
    const { MODULE_DEFINITIONS } = await import('../models/tenantRegistry.js');
    const moduleMap = {};

    for (const mod of STANDARD_MODULES) {
      const collections = MODULE_DEFINITIONS[mod.moduleId] || [];
      let mDoc = await Module.findOne({ moduleId: mod.moduleId });
      if (!mDoc) {
        mDoc = await Module.create({
          moduleId: mod.moduleId,
          name: mod.name,
          description: mod.description,
          isCore: mod.isCore,
          collections,
          status: 'Active'
        });
      } else {
        mDoc.collections = collections;
        await mDoc.save();
      }
      moduleMap[mod.moduleId] = mDoc._id;
    }
    console.log(`  ✓ Seeded ${Object.keys(moduleMap).length} global modules into tracker_global.`);

    // Step 2: Seed Platform Administrator
    console.log('\n[2] Seed Platform Administrator (Control Plane)');
    const passwordHash = await bcrypt.hash('password123', 12);
    const platformEmail = 'platform.admin@workhub.com';

    await UserLogin.create({
      email: platformEmail.toLowerCase(),
      password: passwordHash,
      tenantId: 'admin',
      dbName: 'tracker_global',
      role: 'Platform Admin',
      userType: 'global_admin',
      isSuperAdmin: true,
      status: 'Active'
    });
    console.log(`  ✓ Created Platform Control Plane Admin (${platformEmail})`);

    // Step 3: Seed Master Navigation and Capabilities into tracker_global
    console.log('\n[3] Seed Master Navigation and Capabilities into Global DB');
    const globalNavRes = await seedNavigationAndCapabilities(mongoose.connection, {
      allowAllModules: true,
      clearExisting: true
    });
    console.log(`  ✓ Global DB Seeded: ${globalNavRes.sidebarsCount} sidebars across 18 root domains, ${globalNavRes.capabilitiesCount} capabilities.`);

    // Step 4: Create Internal Tenant (t_admin) with ALL modules
    console.log('\n[4] Create Internal Tenant (t_admin) with ALL modules');
    const allGlobalModuleDocIds = Object.values(moduleMap);
    const internalOwnerEmail = 'developer@workhub.com';

    const internalTenant = await Tenant.create({
      tenantId: 't_admin',
      name: 'Admin Tenant',
      slug: 'admin',
      dbName: process.env.DEFAULT_TENANT_DB || 'tenant_admin',
      ownerEmail: internalOwnerEmail,
      plan: 'Enterprise',
      enabledModules: allGlobalModuleDocIds,
      status: 'Active'
    });

    // Seed Internal Tenant Database
    console.log('\n[5] Seed Internal Tenant Organization Data & Sidebars in tenant_admin');
    await seedTenantDatabase({
      dbName: internalTenant.dbName,
      enabledModuleKeys: Object.keys(moduleMap),
      employeeData: {
        firstName: 'Developer',
        lastName: 'SuperAdmin',
        email: internalOwnerEmail,
        empId: 'EMP001',
        passwordHash
      },
      deptData: { name: 'Super Admin', shortCode: 'SA' },
      desigData: { title: 'Super Admin' }
    });

    await UserLogin.create({
      email: internalOwnerEmail.toLowerCase(),
      password: passwordHash,
      tenantId: internalTenant.tenantId,
      dbName: internalTenant.dbName,
      role: 'Super Admin',
      userType: 'employee',
      isSuperAdmin: true,
      status: 'Active'
    });
    console.log(`  ✓ Internal Tenant Provisioned & Linked (${internalOwnerEmail})`);

    // Step 6: Create Client Tenant (t_client) with Scoped Modules (Core + Attendance Suite)
    console.log('\n[6] Create Client Tenant (t_client) with Scoped Modules (Core + Attendance Suite)');
    const clientModuleDocIds = CLIENT_ENABLED_MODULE_KEYS.map(k => moduleMap[k]).filter(Boolean);
    const clientOwnerEmail = 'client.admin@workhub.com';

    const clientTenant = await Tenant.create({
      tenantId: 't_client',
      name: 'Client Demo Tenant',
      slug: 'client',
      dbName: 'tenant_client',
      ownerEmail: clientOwnerEmail,
      plan: 'Professional',
      enabledModules: clientModuleDocIds,
      status: 'Active'
    });

    // Seed Client Tenant Database
    console.log('\n[7] Seed Client Tenant Organization Data & Sidebars in tenant_client');
    await seedTenantDatabase({
      dbName: clientTenant.dbName,
      enabledModuleKeys: CLIENT_ENABLED_MODULE_KEYS,
      employeeData: {
        firstName: 'Client',
        lastName: 'Admin',
        email: clientOwnerEmail,
        empId: 'EMP101',
        passwordHash
      },
      deptData: { name: 'Operations', shortCode: 'OPS' },
      desigData: { title: 'Manager' }
    });

    await UserLogin.create({
      email: clientOwnerEmail.toLowerCase(),
      password: passwordHash,
      tenantId: clientTenant.tenantId,
      dbName: clientTenant.dbName,
      role: 'Super Admin',
      userType: 'employee',
      isSuperAdmin: true,
      status: 'Active'
    });
    console.log(`  ✓ Client Tenant Provisioned & Scoped (${clientOwnerEmail})`);

    // Step 8: Run Automated Verification
    const verificationPassed = await runVerification();
    if (!verificationPassed) {
      process.exit(1);
    }

    console.log('Seeding and Verification Completed Successfully!');
  } catch (err) {
    console.error('❌ SuperAdmin Seeder Encountered Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  }
}

main();
