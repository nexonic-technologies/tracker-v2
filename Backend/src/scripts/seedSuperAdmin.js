// Backend/src/scripts/seedSuperAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import crypto from 'crypto';
import { resolveModuleKey } from '../utils/moduleMapping.js';
import pageCapabilityMappingHelper from '../Config/pageCapabilityMapping.js';
import models from '../models/Collection.js';
import { getGlobalModels, initGlobalModels } from '../models/global/index.js';
import { setCache } from '../utils/cache.js';
import TenantConnectionManager from '../tenant/TenantConnectionManager.js';

// Force Node.js to use reliable public DNS for MongoDB SRV lookups
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

const STANDARD_MODULES = [
  { moduleId: 'core', name: 'Core Engine & Dashboard', description: 'Dashboard, settings, profile, search, policies', isCore: true },
  { moduleId: 'hrms', name: 'HRMS & Core Personnel', description: 'Employee lifecycle, departments, designations', isCore: false },
  { moduleId: 'attendance', name: 'Attendance & Leave Management', description: 'Shifts, punches, leaves, SLA tracking, WFH & comp-off requests', isCore: false },
  { moduleId: 'payroll', name: 'Payroll & Compensation', description: 'Salary structures, pay slips, expenses', isCore: false },
  { moduleId: 'tasks', name: 'Tasks & Project Management', description: 'Sprints, tasks, todos, queues', isCore: false },
  { moduleId: 'tickets', name: 'Helpdesk & Ticket System', description: 'Customer tickets, activity logs', isCore: false },
  { moduleId: 'crm', name: 'CRM & Client Management', description: 'Leads, meetings, quotations, ledgers', isCore: false },
  { moduleId: 'assets', name: 'Asset Management', description: 'Hardware allocation, incidents, repairs', isCore: false },
  { moduleId: 'recruitment', name: 'Recruitment & Job Openings', description: 'Openings, candidate pipeline', isCore: false },
  { moduleId: 'feed', name: 'Team Feed & Social Work', description: 'Groups, posts, comments, notifications', isCore: false }
];

const CLIENT_ENABLED_MODULE_KEYS = ['core', 'attendance', 'payroll'];

// Icon mapping helper
const iconMap = {
  dashboard: 'MdDashboard',
  accounts: 'MdAccountBalanceWallet',
  admin: 'MdSecurity',
  assets: 'MdWebAsset',
  attendance: 'MdCalendarToday',
  crm: 'MdPeople',
  hrms: 'MdSupervisedUserCircle',
  payroll: 'MdPayment',
  playground: 'MdPlayArrow',
  profile: 'MdPerson',
  search: 'MdSearch',
  settings: 'MdSettings',
  tickets: 'MdConfirmationNumber',
  'travel-expenses': 'MdReceipt',
  feed: 'MdRssFeed',
  policies: 'MdPolicy',
  tasks: 'MdAssignment',
  logout: 'MdExitToApp',
  teams: 'MdGroup',
  recruitment: 'MdWork'
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const cleanTitle = (name) => {
  return name
    .replace(/\.jsx$/, '')
    .replace(/\.js$/, '')
    .split(/[-_]/)
    .map(capitalize)
    .join(' ');
};

const isSubComponent = (fileName) => {
  const nameWithoutExt = fileName.replace(/\.(jsx|js)$/, '');
  const lower = nameWithoutExt.toLowerCase();

  if (fileName.startsWith('[') || fileName.startsWith('_') || fileName.startsWith('.')) return true;
  if (lower.startsWith('build') || lower.startsWith('create') || lower.endsWith('factory')) return true;

  const subComponentKeywords = [
    'form', 'modal', 'panel', 'card', 'dialog', 'header', 'filter', 'stats', 'table',
    'details', 'list', 'tab', 'item', 'dropdown', 'drawer', 'picker', 'chart', 'summary',
    'row', 'column', 'cell', 'bar', 'button', 'input', 'select', 'exit', 'org-chart'
  ];

  for (const kw of subComponentKeywords) {
    if (lower === kw || lower.endsWith(`-${kw}`) || lower.endsWith(`_${kw}`)) {
      return true;
    }
  }
  return false;
};

const isPublicOrDocRoute = (name) => {
  const clean = name.toLowerCase().replace(/\.(jsx|js)$/, '').replace(/[-_]/g, '');
  return (
    clean.startsWith('[') ||
    clean.startsWith('_') ||
    clean.includes('login') ||
    clean.includes('forgotpassword') ||
    clean.includes('resetpassword') ||
    clean.includes('playground') ||
    clean.includes('documentation') ||
    clean.includes('academy') ||
    clean === 'logout'
  );
};

/**
 * Discover frontend sidebar items dynamically from Frontend/src/pages
 */
async function discoverFrontendSidebars(pagesDir, moduleMap) {
  const sidebars = [];
  const unmappedSidebars = [];
  const folders = await fs.readdir(pagesDir, { withFileTypes: true });
  let order = 1;

  for (const folder of folders) {
    if (isPublicOrDocRoute(folder.name)) continue;

    if (folder.isDirectory()) {
      const subDirPath = path.join(pagesDir, folder.name);
      const subEntries = await fs.readdir(subDirPath, { withFileTypes: true });

      const subDirs = subEntries.filter(
        e => e.isDirectory() && !e.name.startsWith('[') && !e.name.startsWith('_')
      );

      const pageFiles = subEntries.filter(
        e => e.isFile() && (e.name.endsWith('.jsx') || e.name.endsWith('.js')) && !isSubComponent(e.name)
      );

      if (subDirs.length === 0 && pageFiles.length === 0) continue;

      const parentId = new mongoose.Types.ObjectId();
      const mainRoute = `/${folder.name.toLowerCase()}`;
      const title = cleanTitle(folder.name);
      const mKey = resolveModuleKey(mainRoute, title);
      const mId = moduleMap[mKey] || null;

      if (!mId) {
        unmappedSidebars.push({ route: mainRoute, title, reason: `Unmapped module key '${mKey}'` });
      }

      const parentSidebar = {
        _id: parentId,
        title,
        icon: {
          iconName: iconMap[folder.name.toLowerCase()] || 'MdFolder',
          iconPackage: 'react-icons/md'
        },
        mainRoute,
        visibility: 'protected',
        route: mainRoute,
        moduleKey: mKey,
        moduleId: mId,
        routes: [],
        isParent: true,
        hasChildren: subDirs.length > 0 || pageFiles.length > 0,
        order: order++,
        isActive: true,
        isDeleted: false
      };
      sidebars.push(parentSidebar);

      let childOrder = 1;

      // Subdirectories under folder
      for (const subDir of subDirs) {
        const subDirNameLower = subDir.name.toLowerCase();
        const currentSubDirPath = path.join(subDirPath, subDir.name);
        const nestedEntries = await fs.readdir(currentSubDirPath, { withFileTypes: true });

        const hasPrimaryPage = nestedEntries.some(
          e => e.isFile() && (e.name.endsWith('.jsx') || e.name.endsWith('.js')) && !isSubComponent(e.name)
        );

        if (!hasPrimaryPage) continue;

        const childRoute = `/${folder.name.toLowerCase()}/${subDirNameLower}`;
        const childTitle = cleanTitle(subDir.name);
        const childMKey = resolveModuleKey(childRoute, childTitle);
        const childMId = moduleMap[childMKey] || mId;

        if (!childMId) {
          unmappedSidebars.push({ route: childRoute, title: childTitle, reason: `Unmapped module key '${childMKey}'` });
        }

        sidebars.push({
          _id: new mongoose.Types.ObjectId(),
          title: childTitle,
          icon: {
            iconName: 'MdInsertDriveFile',
            iconPackage: 'react-icons/md'
          },
          mainRoute: childRoute,
          visibility: 'protected',
          route: childRoute,
          moduleKey: childMKey,
          moduleId: childMId,
          routes: [],
          parentId: parentId,
          isParent: false,
          hasChildren: false,
          order: childOrder++,
          isActive: true,
          isDeleted: false
        });
      }

      // Page files directly under folder
      for (const pFile of pageFiles) {
        const fileNameLower = pFile.name.replace(/\.jsx$/, '').replace(/\.js$/, '').toLowerCase();
        if (fileNameLower === 'index') continue;

        const fileRoute = `/${folder.name.toLowerCase()}/${fileNameLower}`;
        const fileTitle = cleanTitle(pFile.name);
        const fileMKey = resolveModuleKey(fileRoute, fileTitle);
        const fileMId = moduleMap[fileMKey] || mId;

        if (!fileMId) {
          unmappedSidebars.push({ route: fileRoute, title: fileTitle, reason: `Unmapped module key '${fileMKey}'` });
        }

        sidebars.push({
          _id: new mongoose.Types.ObjectId(),
          title: fileTitle,
          icon: {
            iconName: 'MdInsertDriveFile',
            iconPackage: 'react-icons/md'
          },
          mainRoute: fileRoute,
          visibility: 'protected',
          route: fileRoute,
          moduleKey: fileMKey,
          moduleId: fileMId,
          routes: [],
          parentId: parentId,
          isParent: false,
          hasChildren: false,
          order: childOrder++,
          isActive: true,
          isDeleted: false
        });
      }

    } else if (folder.isFile() && (folder.name.endsWith('.jsx') || folder.name.endsWith('.js')) && !isSubComponent(folder.name)) {
      const fileNameLower = folder.name.replace(/\.jsx$/, '').replace(/\.js$/, '').toLowerCase();
      const mainRoute = `/${fileNameLower}`;
      const title = cleanTitle(folder.name);
      const mKey = resolveModuleKey(mainRoute, title);
      const mId = moduleMap[mKey] || null;

      if (!mId) {
        unmappedSidebars.push({ route: mainRoute, title, reason: `Unmapped module key '${mKey}'` });
      }

      sidebars.push({
        _id: new mongoose.Types.ObjectId(),
        title,
        icon: {
          iconName: iconMap[fileNameLower] || 'MdInsertDriveFile',
          iconPackage: 'react-icons/md'
        },
        mainRoute,
        visibility: 'protected',
        route: mainRoute,
        moduleKey: mKey,
        moduleId: mId,
        routes: [],
        isParent: true,
        hasChildren: false,
        order: order++,
        isActive: true,
        isDeleted: false
      });
    }
  }

  return { sidebars, unmappedSidebars };
}

/**
 * Seed tenant data (Roles, Departments, Designations, Employee, AccessPolicies, Capabilities, Sidebars)
 */
async function seedTenantDatabase({ dbName, enabledModuleKeys, employeeData, deptData, desigData, discoveredSidebars }) {
  const { conn, models: tenantModels } = await TenantConnectionManager.getTenantConnection(dbName, enabledModuleKeys);

  // Clear existing collections in tenant DB
  for (const mKey of Object.keys(tenantModels)) {
    if (tenantModels[mKey] && typeof tenantModels[mKey].deleteMany === 'function') {
      await tenantModels[mKey].deleteMany({});
    }
  }

  // 1. Seed Super Admin Role
  const superAdminRole = await tenantModels.roles.create({
    name: 'Super Admin',
    isSuperAdmin: true,
    level: 10,
    isActive: true,
    permissionVersion: 1,
    capabilities: [],
    description: `Super Admin role for ${dbName}`
  });

  // 2. Seed Department & Designation
  const dept = await tenantModels.departments.create({
    name: deptData.name,
    shortCode: deptData.shortCode,
    description: `${deptData.name} Department`,
    designations: []
  });

  const desig = await tenantModels.designations.create({
    title: desigData.title,
    description: `${desigData.title} Designation`
  });

  dept.designations.push(desig._id);
  await dept.save();

  // 3. Seed Access Policies for registered model schema list
  let policyCount = 0;
  for (const modelName of Object.keys(models)) {
    if (!modelName || modelName.startsWith('_')) continue;
    await tenantModels.access_policies.create({
      role: superAdminRole._id,
      modelName: modelName.toLowerCase(),
      actions: ['read', 'create', 'update', 'delete', 'list', 'statistics', 'export', 'report'],
      forbiddenAccess: { read: [], create: [], update: [], delete: [] },
      allowAccess: { read: ['*'], create: ['*'], update: ['*'], delete: ['*'] },
      registry: [],
      conditions: {}
    });
    policyCount++;
  }

  // 4. Seed Capabilities from pageCapabilityMapping
  const capIdMap = new Map();
  for (const mapping of pageCapabilityMappingHelper.PAGE_CAPABILITY_MAPPING) {
    const key = mapping.capability;
    const parts = key.split(':');
    const module = parts[0].toLowerCase();
    const action = parts[1] || 'view';

    let capDoc = await tenantModels.capabilities.findOne({ key });
    if (!capDoc) {
      capDoc = await tenantModels.capabilities.create({
        key,
        module,
        action,
        label: mapping.description || `Access to ${parts[0]} ${action}`,
        description: mapping.description || `Access to ${parts[0]} ${action}`,
        status: 'active',
        type: 'ui'
      });
    }
    capIdMap.set(key, capDoc._id);
  }

  const getSidebarCapabilities = (route) => {
    const key = pageCapabilityMappingHelper.getCapabilityForRoute(route);
    if (key && capIdMap.has(key)) {
      return [capIdMap.get(key)];
    }
    return [];
  };

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

  // 6. Assign Sidebars based on enabled modules
  let seededSidebarCount = 0;
  for (const sb of discoveredSidebars) {
    const isAllowed = enabledModuleKeys.includes('*') || enabledModuleKeys.includes(sb.moduleKey);
    if (isAllowed) {
      const capIds = getSidebarCapabilities(sb.mainRoute || sb.route);
      await tenantModels.sidebars.create({
        ...sb,
        capabilities: capIds
      });
      seededSidebarCount++;
    }
  }

  return {
    conn,
    models: tenantModels,
    role: superAdminRole,
    dept,
    desig,
    employee,
    policyCount,
    capabilityCount: capIdMap.size,
    seededSidebarCount
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
    if (passed) {
      console.log(`  ✓ [PASS] ${name}: ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}: ${message}`);
      errors.push({ name, message, expected, actual });
    }
  };

  const { Tenant, UserLogin, Module } = getGlobalModels();

  // 1. Verify Platform Admin
  const platformAdmin = await UserLogin.findOne({ email: 'platform.admin@workhub.com' }).lean();
  const platformAdminUserLoginPassed = Boolean(
    platformAdmin &&
    platformAdmin.userType === 'global_admin' &&
    platformAdmin.tenantId === 'admin' &&
    platformAdmin.dbName === 'tracker_global' &&
    platformAdmin.role === 'Platform Admin'
  );
  addCheck(
    'Platform Admin UserLogin Contract',
    platformAdminUserLoginPassed,
    platformAdminUserLoginPassed
      ? 'Platform Admin exists with userType=global_admin, role="Platform Admin", tenantId=admin, dbName=tracker_global'
      : 'Platform Admin UserLogin missing or invalid',
    { userType: 'global_admin', role: 'Platform Admin', tenantId: 'admin', dbName: 'tracker_global' },
    platformAdmin ? { userType: platformAdmin.userType, role: platformAdmin.role, tenantId: platformAdmin.tenantId, dbName: platformAdmin.dbName } : null
  );

  const platformAdminIsolationPassed = Boolean(platformAdmin && !platformAdmin.employeeId);
  addCheck(
    'Platform Admin Employee Unattached Isolation',
    platformAdminIsolationPassed,
    platformAdminIsolationPassed ? 'Platform Admin is unattached to tenant employee data' : 'Platform Admin incorrectly points to tenant employee',
    { employeeId: null },
    platformAdmin ? { employeeId: platformAdmin.employeeId } : null
  );

  // 2. Verify Global Modules
  const globalModules = await Module.find().lean();
  const globalModulesCountPassed = globalModules.length === STANDARD_MODULES.length;
  addCheck(
    'Global Modules Count',
    globalModulesCountPassed,
    `Found ${globalModules.length} global modules in tracker_global (expected ${STANDARD_MODULES.length})`,
    STANDARD_MODULES.length,
    globalModules.length
  );

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

  // 3. Verify Global Sidebars in DB vs Discovered Frontend Pages
  const pageFilesDir = path.resolve(process.cwd(), '../Frontend/src/pages');
  const moduleMap = {};
  globalModules.forEach(m => { moduleMap[m.moduleId] = m._id; });
  const { sidebars: currentDiscoveredSidebars, unmappedSidebars } = await discoverFrontendSidebars(pageFilesDir, moduleMap);

  const dbGlobalSidebars = await models.sidebars.find().lean();
  const discoveredKeySet = new Set(currentDiscoveredSidebars.map(sb => `${sb.moduleKey}:${sb.mainRoute || sb.route}`));
  const dbKeySet = new Set(dbGlobalSidebars.map(sb => `${sb.moduleKey}:${sb.mainRoute || sb.route}`));

  const missingGlobalSidebars = currentDiscoveredSidebars.filter(sb => !dbKeySet.has(`${sb.moduleKey}:${sb.mainRoute || sb.route}`));
  const unexpectedGlobalSidebars = dbGlobalSidebars.filter(sb => !discoveredKeySet.has(`${sb.moduleKey}:${sb.mainRoute || sb.route}`));

  const globalSidebarsMatchPassed = missingGlobalSidebars.length === 0 && unexpectedGlobalSidebars.length === 0 && currentDiscoveredSidebars.length === dbGlobalSidebars.length;
  addCheck(
    'Global DB Sidebar Registry Matching',
    globalSidebarsMatchPassed,
    globalSidebarsMatchPassed
      ? `Global DB sidebar collection exactly matches ${currentDiscoveredSidebars.length} discovered frontend pages`
      : `Mismatch between discovered pages and DB sidebars (Missing in DB: ${missingGlobalSidebars.length}, Unexpected in DB: ${unexpectedGlobalSidebars.length})`,
    { count: currentDiscoveredSidebars.length, missing: 0, unexpected: 0 },
    { count: dbGlobalSidebars.length, missing: missingGlobalSidebars.length, unexpected: unexpectedGlobalSidebars.length }
  );

  addCheck(
    'Sidebar Module Mapping Resolution',
    unmappedSidebars.length === 0,
    unmappedSidebars.length === 0 ? 'All discovered sidebars successfully mapped to module keys' : `Unmapped sidebars detected: ${JSON.stringify(unmappedSidebars)}`,
    0,
    unmappedSidebars.length
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

  const expectedInternalDbName = internalTenant ? internalTenant.dbName : (process.env.DEFAULT_TENANT_DB || 'tracker_tenant_admin');

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

  // Dynamically resolve internal tenant connection using tenant's enabled modules read from DB
  const { models: internalModels } = await TenantConnectionManager.getTenantConnection(
    expectedInternalDbName,
    actualInternalModuleKeys.length > 0 ? actualInternalModuleKeys : ['*']
  );

  const internalEmp = await internalModels.employees.findOne({ 'basicInfo.email': 'developer@workhub.com' }).lean();
  const internalEmpPassed = Boolean(internalEmp);
  addCheck(
    'Internal Super Admin Employee',
    internalEmpPassed,
    internalEmp ? 'Internal Super Admin Employee record exists in tracker_tenant_admin' : 'Internal Super Admin Employee record missing',
    'Employee Record Exists',
    internalEmp ? 'Exists' : 'Missing'
  );

  const internalSidebars = await internalModels.sidebars.find().lean();
  const internalDbSidebarKeySet = new Set(internalSidebars.map(sb => `${sb.moduleKey}:${sb.mainRoute || sb.route}`));
  const missingInternalSidebars = currentDiscoveredSidebars.filter(sb => !internalDbSidebarKeySet.has(`${sb.moduleKey}:${sb.mainRoute || sb.route}`));

  const internalSidebarsExactPassed = missingInternalSidebars.length === 0 && internalSidebars.length === currentDiscoveredSidebars.length;
  addCheck(
    'Internal Tenant Sidebars Identity Match',
    internalSidebarsExactPassed,
    internalSidebarsExactPassed ? `Internal tenant sidebars exactly match all ${currentDiscoveredSidebars.length} discovered sidebars` : `Missing ${missingInternalSidebars.length} sidebars in internal tenant`,
    currentDiscoveredSidebars.length,
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
    clientExactModulesPassed ? 'Client tenant has exactly Core + Attendance + Payroll' : `Module mismatch in client tenant`,
    expectedClientModuleKeys,
    actualClientModuleKeys
  );

  const clientUserLogin = await UserLogin.findOne({ email: 'client.admin@workhub.com' }).lean();
  const clientUserLoginPassed = Boolean(
    clientUserLogin &&
    clientUserLogin.userType === 'employee' &&
    clientUserLogin.tenantId === 't_client' &&
    clientUserLogin.dbName === 'tracker_tenant_client'
  );
  addCheck(
    'Client Super Admin UserLogin',
    clientUserLoginPassed,
    clientUserLogin ? 'Client Super Admin UserLogin exists with employee scope in t_client' : 'Client Super Admin UserLogin missing',
    { userType: 'employee', tenantId: 't_client', dbName: 'tracker_tenant_client' },
    clientUserLogin ? { userType: clientUserLogin.userType, tenantId: clientUserLogin.tenantId, dbName: clientUserLogin.dbName } : null
  );

  // Dynamically resolve client tenant connection using tenant's enabled modules read from DB
  const { models: clientModels } = await TenantConnectionManager.getTenantConnection(
    clientTenant ? clientTenant.dbName : 'tracker_tenant_client',
    actualClientModuleKeys.length > 0 ? actualClientModuleKeys : CLIENT_ENABLED_MODULE_KEYS
  );

  const clientEmp = await clientModels.employees.findOne({ 'basicInfo.email': 'client.admin@workhub.com' }).lean();
  const clientEmpPassed = Boolean(clientEmp);
  addCheck(
    'Client Super Admin Employee',
    clientEmpPassed,
    clientEmp ? 'Client Super Admin Employee record exists in tracker_tenant_client' : 'Client Super Admin Employee record missing',
    'Employee Record Exists',
    clientEmp ? 'Exists' : 'Missing'
  );

  const clientSidebars = await clientModels.sidebars.find().lean();
  const expectedClientSidebarItems = currentDiscoveredSidebars.filter(sb => CLIENT_ENABLED_MODULE_KEYS.includes(sb.moduleKey));
  const clientDbSidebarKeySet = new Set(clientSidebars.map(sb => `${sb.moduleKey}:${sb.mainRoute || sb.route}`));

  const missingClientSidebars = expectedClientSidebarItems.filter(sb => !clientDbSidebarKeySet.has(`${sb.moduleKey}:${sb.mainRoute || sb.route}`));
  const disabledModuleClientSidebars = clientSidebars.filter(sb => !CLIENT_ENABLED_MODULE_KEYS.includes(sb.moduleKey));

  const clientSidebarsIdentityPassed = missingClientSidebars.length === 0 && disabledModuleClientSidebars.length === 0 && clientSidebars.length === expectedClientSidebarItems.length;
  addCheck(
    'Client Tenant Sidebars Identity & Isolation Match',
    clientSidebarsIdentityPassed,
    clientSidebarsIdentityPassed
      ? `Client tenant sidebars exactly match ${expectedClientSidebarItems.length} allowed items with 0 disabled module leaks`
      : `Client sidebar mismatch (Missing: ${missingClientSidebars.length}, Leaked disabled sidebars: ${disabledModuleClientSidebars.length})`,
    { expectedCount: expectedClientSidebarItems.length, leaked: 0 },
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
    parentChildConsistencyPassed ? 'No orphaned child sidebars detected in client tenant' : `Found ${clientOrphanedChildren.length} orphaned child sidebars`,
    0,
    clientOrphanedChildren.length
  );

  // 7. Dynamic Isolation Calculations
  const employeeIsolationPassed = Boolean(internalEmp && clientEmp && String(internalEmp._id) !== String(clientEmp._id));
  const roleIsolationPassed = Boolean(clientUserLogin && clientUserLogin.userType !== 'global_admin');
  const userScopeIsolationPassed = Boolean(
    platformAdmin && internalUserLogin && clientUserLogin &&
    platformAdmin.tenantId === 'admin' && internalUserLogin.tenantId === 't_admin' && clientUserLogin.tenantId === 't_client' &&
    platformAdmin.dbName === 'tracker_global' && internalUserLogin.dbName === expectedInternalDbName && clientUserLogin.dbName === 'tracker_tenant_client'
  );
  const sidebarIsolationPassed = disabledModuleClientSidebars.length === 0;

  addCheck(
    'Cross-Tenant Isolation Suite',
    employeeIsolationPassed && roleIsolationPassed && userScopeIsolationPassed && sidebarIsolationPassed,
    'All tenant isolation invariants (Employees, Roles, UserScopes, Sidebars) passed',
    { employeeIsolation: true, roleIsolation: true, userScopeIsolation: true, sidebarIsolation: true },
    { employeeIsolation: employeeIsolationPassed, roleIsolation: roleIsolationPassed, userScopeIsolation: userScopeIsolationPassed, sidebarIsolation: sidebarIsolationPassed }
  );

  const passed = errors.length === 0 && unmappedSidebars.length === 0;

  return {
    passed,
    checks,
    warnings,
    errors,
    unmappedSidebars,
    isolation: {
      employeeIsolationPassed,
      roleIsolationPassed,
      userScopeIsolationPassed,
      sidebarIsolationPassed
    },
    actualModuleKeys: {
      internal: actualInternalModuleKeys,
      client: actualClientModuleKeys
    },
    counts: {
      globalModules: globalModules.length,
      globalSidebars: currentDiscoveredSidebars.length,
      globalSidebarsInDb: dbGlobalSidebars.length,
      internalTenantModules: actualInternalModuleKeys.length,
      internalTenantSidebars: internalSidebars.length,
      clientTenantModules: actualClientModuleKeys.length,
      clientTenantSidebars: clientSidebars.length,
      clientDisabledModuleSidebars: disabledModuleClientSidebars.length
    }
  };
}

/**
 * Main Seed & Verification Entry Point
 */
async function seed() {
  const args = process.argv.slice(2);
  const isResetRequested = process.env.SEED_RESET === 'true' || args.includes('--reset') || args.includes('-r');
  const isVerifyOnlyRequested = process.env.VERIFY_ONLY === 'true' || args.includes('--verify-only') || args.includes('-v');

  const startTime = Date.now();
  const seedRunId = crypto.randomBytes(8).toString('hex');

  console.log('====================================================');
  console.log('🚀 Tracker Complete Database Seed & Verification System');
  console.log(`🆔 Seed Run ID: ${seedRunId}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('====================================================\n');

  // Step 1: Environment & Safety Validation
  console.log('[1] Validate environment and safety rules');
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production' && !process.env.ALLOW_PROD_SEED) {
    console.error('❌ SEED FAILED: Cannot run destructive seed/reset in production mode!');
    process.exit(1);
  }

  if (!isResetRequested && !isVerifyOnlyRequested) {
    console.error('❌ SEED SAFETY BLOCK: Neither --reset (SEED_RESET=true) nor --verify-only was specified.');
    console.error('To run full reset, seed, and verification:');
    console.error('  npm run seed   (or node src/scripts/seedSuperAdmin.js --reset)');
    console.error('To run verification against existing database:');
    console.error('  npm run verify:seed   (or node src/scripts/seedSuperAdmin.js --verify-only)\n');
    process.exit(1);
  }

  // Step 2: Database Connection
  console.log(`[2] Connect database: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);
  initGlobalModels();

  let discoveredSidebars = [];

  try {
    if (isResetRequested && !isVerifyOnlyRequested) {
      // Step 3: Complete Reset - Wipe Primary DB Collections
      console.log('[3] Wipe primary platform database collections');
      for (const mName of Object.keys(models)) {
        await models[mName].deleteMany({});
      }
      console.log('    ✓ Primary Platform DB cleared.');

      // Step 4: Wipe Global Database Collections
      console.log('[4] Wipe global database collections (Tenant, UserLogin, Module, ModelDefinition)');
      const globalModels = getGlobalModels();
      if (globalModels) {
        for (const gKey of Object.keys(globalModels)) {
          if (globalModels[gKey] && typeof globalModels[gKey].deleteMany === 'function') {
            await globalModels[gKey].deleteMany({});
          }
        }
      }
      console.log('    ✓ Global DB collections cleared.');

      // Step 5: Drop Tenant Databases
      console.log('[5] Drop all tracker_tenant_* databases');
      try {
        const adminConn = mongoose.connection.db;
        if (adminConn) {
          const dbs = await adminConn.admin().listDatabases();
          for (const dbInfo of (dbs.databases || [])) {
            if (dbInfo.name && dbInfo.name.startsWith('tracker_tenant_')) {
              console.log(`    Dropping database: ${dbInfo.name}`);
              const tConn = mongoose.connection.useDb(dbInfo.name);
              await tConn.dropDatabase();
              console.log(`    ✓ Dropped database: ${dbInfo.name}`);
            }
          }
        }
      } catch (e) {
        console.warn('    ⚠️ Tenant DB drop warning:', e.message);
      }

      // Step 6: Seed Global Module Registry
      console.log('[6] Seed global module registry');
      const { MODULE_DEFINITIONS } = await import('../models/tenantRegistry.js');
      const moduleMap = {};
      const { Module, Tenant, UserLogin } = getGlobalModels();
      if (Module) {
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
        console.log(`    ✓ Seeded ${Object.keys(moduleMap).length} global modules into tracker_global DB.`);
      }

      // Step 7: Seed Platform Administrator
      console.log('[7] Seed Platform Administrator (Control Plane)');
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
      console.log(`    ✓ Created Platform Control Plane Admin (${platformEmail})`);

      // Step 8: Discover Global Sidebars from Frontend pages
      console.log('[8] Discover and parse global sidebars from Frontend/src/pages');
      const pagesDir = path.resolve(process.cwd(), '../Frontend/src/pages');
      const discoveryResult = await discoverFrontendSidebars(pagesDir, moduleMap);
      discoveredSidebars = discoveryResult.sidebars;

      if (discoveryResult.unmappedSidebars.length > 0) {
        console.warn(`    ⚠️ Found ${discoveryResult.unmappedSidebars.length} unmapped sidebars!`);
      }
      console.log(`    ✓ Discovered ${discoveredSidebars.length} sidebar items from Frontend pages.`);

      // Seed global capabilities in primary database
      const primaryCapIdMap = new Map();
      for (const mapping of pageCapabilityMappingHelper.PAGE_CAPABILITY_MAPPING) {
        const key = mapping.capability;
        const parts = key.split(':');
        const module = parts[0].toLowerCase();
        const action = parts[1] || 'view';

        let capDoc = await models.capabilities.findOne({ key });
        if (!capDoc) {
          capDoc = await models.capabilities.create({
            key,
            module,
            action,
            label: mapping.description || `Access to ${parts[0]} ${action}`,
            description: mapping.description || `Access to ${parts[0]} ${action}`,
            status: 'active',
            type: 'ui'
          });
        }
        primaryCapIdMap.set(key, capDoc._id);
      }

      const getPrimarySidebarCapabilities = (route) => {
        const key = pageCapabilityMappingHelper.getCapabilityForRoute(route);
        if (key && primaryCapIdMap.has(key)) {
          return [primaryCapIdMap.get(key)];
        }
        return [];
      };

      // Seed global sidebars into primary DB for primary/fallback queries
      for (const sb of discoveredSidebars) {
        const capIds = getPrimarySidebarCapabilities(sb.mainRoute || sb.route);
        await models.sidebars.create({
          ...sb,
          capabilities: capIds
        });
      }
      console.log('    ✓ Seeded global sidebar registry in primary database.');

      // Step 9 & 10: Create Internal Tenant (t_admin) with ALL modules
      console.log('[9] Create Internal Tenant (t_admin) with ALL modules');
      const allGlobalModuleDocIds = Object.values(moduleMap);
      const internalOwnerEmail = 'developer@workhub.com';

      const internalTenant = await Tenant.create({
        tenantId: 't_admin',
        name: 'Admin Tenant',
        slug: 'admin',
        dbName: process.env.DEFAULT_TENANT_DB || 'tracker_tenant_admin',
        ownerEmail: internalOwnerEmail,
        plan: 'Enterprise',
        enabledModules: allGlobalModuleDocIds,
        status: 'Active'
      });

      // Seed Internal Tenant Database
      console.log('[10] Seed Internal Tenant Organization Data & Sidebars in tracker_tenant_admin');
      const internalRes = await seedTenantDatabase({
        dbName: internalTenant.dbName,
        enabledModuleKeys: Object.keys(moduleMap), // All modules
        employeeData: {
          firstName: 'Developer',
          lastName: 'SuperAdmin',
          email: internalOwnerEmail,
          empId: 'EMP001',
          passwordHash
        },
        deptData: { name: 'Super Admin', shortCode: 'SA' },
        desigData: { title: 'Super Admin' },
        discoveredSidebars
      });

      await UserLogin.create({
        email: internalOwnerEmail.toLowerCase(),
        password: passwordHash,
        tenantId: internalTenant.tenantId,
        dbName: internalTenant.dbName,
        employeeId: internalRes.employee._id,
        role: 'Super Admin',
        userType: 'employee',
        status: 'Active'
      });
      console.log(`    ✓ Created Internal ERP SuperAdmin (${internalOwnerEmail})`);

      // Step 11 & 12: Create Client Tenant (t_client) with ONLY Core + Attendance + Payroll
      console.log('[11] Create Client Tenant (t_client) with Core + Attendance + Payroll ONLY');
      const clientModuleDocIds = CLIENT_ENABLED_MODULE_KEYS.map(k => moduleMap[k]).filter(Boolean);
      const clientOwnerEmail = 'client.admin@workhub.com';

      const clientTenant = await Tenant.create({
        tenantId: 't_client',
        name: 'Client Tenant',
        slug: 'client',
        dbName: 'tracker_tenant_client',
        ownerEmail: clientOwnerEmail,
        plan: 'Professional',
        enabledModules: clientModuleDocIds,
        status: 'Active'
      });

      // Seed Client Tenant Database
      console.log('[12] Seed Client Tenant Organization Data & Sidebars in tracker_tenant_client');
      const clientRes = await seedTenantDatabase({
        dbName: clientTenant.dbName,
        enabledModuleKeys: CLIENT_ENABLED_MODULE_KEYS, // Core, Attendance, Payroll ONLY
        employeeData: {
          firstName: 'Client',
          lastName: 'Admin',
          email: clientOwnerEmail,
          empId: 'CEMP001',
          passwordHash
        },
        deptData: { name: 'Management', shortCode: 'MGMT' },
        desigData: { title: 'Client Admin' },
        discoveredSidebars
      });

      await UserLogin.create({
        email: clientOwnerEmail.toLowerCase(),
        password: passwordHash,
        tenantId: clientTenant.tenantId,
        dbName: clientTenant.dbName,
        employeeId: clientRes.employee._id,
        role: 'Super Admin',
        userType: 'employee',
        status: 'Active'
      });
      console.log(`    ✓ Created Client ERP SuperAdmin (${clientOwnerEmail})`);

      // Step 13: Refresh Cache
      console.log('[13] Refreshing Cache...');
      await setCache();
      console.log('    ✓ Policy and sidebar cache updated.');
    } else {
      console.log('🔍 Running in --verify-only mode (Database wipe skipped).');
    }

    // Step 14: Automated Verification Engine
    const verificationResult = await runVerification();
    const durationMs = Date.now() - startTime;

    // Step 15: Generate Verification Report
    const reportData = {
      success: verificationResult.passed,
      seedRunId,
      timestamp: new Date().toISOString(),
      durationMs,
      platform: {
        platformAdmin: 'platform.admin@workhub.com',
        userType: 'global_admin',
        scope: 'tracker_global'
      },
      global: {
        modulesCount: verificationResult.counts.globalModules,
        sidebarsDiscoveredCount: verificationResult.counts.globalSidebars,
        sidebarsInDbCount: verificationResult.counts.globalSidebarsInDb
      },
      internalTenant: {
        tenantId: 't_admin',
        dbName: 'tracker_tenant_admin',
        superAdminEmail: 'developer@workhub.com',
        enabledModules: verificationResult.actualModuleKeys.internal,
        sidebarsCount: verificationResult.counts.internalTenantSidebars
      },
      clientTenant: {
        tenantId: 't_client',
        dbName: 'tracker_tenant_client',
        superAdminEmail: 'client.admin@workhub.com',
        enabledModules: verificationResult.actualModuleKeys.client,
        sidebarsCount: verificationResult.counts.clientTenantSidebars,
        disabledModuleSidebarsCount: verificationResult.counts.clientDisabledModuleSidebars
      },
      isolation: verificationResult.isolation,
      verification: {
        passed: verificationResult.passed,
        checksCount: verificationResult.checks.length,
        warningsCount: verificationResult.warnings.length,
        errorsCount: verificationResult.errors.length
      },
      checks: verificationResult.checks,
      warnings: verificationResult.warnings,
      errors: verificationResult.errors
    };

    // Save report to file seed-report.json
    const reportPath = path.resolve(process.cwd(), 'seed-report.json');
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2), 'utf-8');
    console.log(`\n📄 Structured Seed & Verification Report written to: ${reportPath}`);

    console.log('\n====================================================');
    if (verificationResult.passed) {
      console.log('✅ SEED & SYSTEM VERIFICATION PASSED SUCCESSFULLY!');
      console.log('----------------------------------------------------');
      console.log('🛡️ Platform Owner (Control Plane): platform.admin@workhub.com / password123');
      console.log('💼 Internal ERP SuperAdmin:       developer@workhub.com / password123');
      console.log('🏢 Client ERP SuperAdmin:         client.admin@workhub.com / password123');
      console.log('====================================================\n');
    } else {
      console.error('❌ SEED & SYSTEM VERIFICATION FAILED!');
      console.error(`Found ${verificationResult.errors.length} error(s) during verification.`);
      console.error('====================================================\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Database Reset/Seed Failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
