import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import pageCapabilityMappingHelper from '../Config/pageCapabilityMapping.js';
import { setCache } from '../utils/cache.js';
import TenantConnectionManager from '../tenant/TenantConnectionManager.js';
import { getGlobalModels } from '../models/global/index.js';
import { seedNavigationAndCapabilities } from '../scripts/seedMasterNavigationAndCapabilities.js';

/**
 * Pure single-tenant provisioning function used by both development seed and live Platform Admin.
 * NEVER contains destructive reset operations (wipe global DB, drop tenant DBs, etc.).
 *
 * Runs 9 discrete stages with persistent ProvisioningRun progress tracking and scoped verification.
 */
export async function provisionTenant({
  name,
  slug,
  ownerEmail,
  password,
  plan = 'Professional',
  billingCycle = 'Annual',
  licenseExpiredAt = null,
  paymentStatus = 'Paid',
  maxUsers = 50,
  enabledModules = [],
  allowAllModules = false,
  createdBy = 'system',
  onProgress = null,
}) {
  const runId = crypto.randomBytes(8).toString('hex');
  const cleanSlug = (slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const dbName = `tenant_${cleanSlug}`;
  const tenantId = `t_${cleanSlug}_${Date.now().toString(36)}`;
  const cleanEmail = (ownerEmail || '').toLowerCase().trim();

  // Calculate default license expiration date based on billingCycle if not explicitly passed
  let computedExpiry = licenseExpiredAt ? new Date(licenseExpiredAt) : null;
  if (!computedExpiry || isNaN(computedExpiry.getTime())) {
    const now = new Date();
    if (billingCycle === 'Monthly') {
      computedExpiry = new Date(now.setMonth(now.getMonth() + 1));
    } else {
      computedExpiry = new Date(now.setFullYear(now.getFullYear() + 1));
    }
  }

  const STAGES = [
    { step: 1, label: 'Validate Inputs' },
    { step: 2, label: 'Resolve Modules' },
    { step: 3, label: 'Create Tenant Record' },
    { step: 4, label: 'Provision Database' },
    { step: 5, label: 'Seed Roles & Master Data' },
    { step: 6, label: 'Seed Policies & Capabilities' },
    { step: 7, label: 'Seed Filtered Sidebars' },
    { step: 8, label: 'Create User' },
    { step: 9, label: 'Verify Provisioning' },
  ];

  const { Tenant, UserLogin, Module, ProvisioningRun } = getGlobalModels();

  let runDoc = null;
  if (ProvisioningRun) {
    runDoc = await ProvisioningRun.create({
      runId,
      tenantId,
      tenantName: name,
      slug: cleanSlug,
      status: 'running',
      currentStep: 0,
      totalSteps: 9,
      steps: STAGES.map((s) => ({
        step: s.step,
        label: s.label,
        status: 'pending',
        detail: '',
      })),
      createdBy,
    });
  }

  const updateStage = async (stepNum, status, detail = '', errorMsg = null) => {
    if (!runDoc) return;
    const now = new Date();
    const stepIdx = stepNum - 1;
    if (runDoc.steps[stepIdx]) {
      runDoc.steps[stepIdx].status = status;
      if (detail) runDoc.steps[stepIdx].detail = detail;
      if (status === 'running' && !runDoc.steps[stepIdx].startedAt) {
        runDoc.steps[stepIdx].startedAt = now;
      }
      if (status === 'completed' || status === 'failed') {
        runDoc.steps[stepIdx].completedAt = now;
      }
      if (errorMsg) runDoc.steps[stepIdx].error = errorMsg;
    }
    runDoc.currentStep = stepNum;
    await runDoc.save();

    if (typeof onProgress === 'function') {
      try {
        onProgress({
          runId,
          step: stepNum,
          total: 9,
          label: STAGES[stepIdx]?.label || '',
          status,
          detail,
          error: errorMsg,
        });
      } catch (_) {
        // Fire-and-forget callback failure handling
      }
    }
  };

  try {
    // ── Stage 1: Validate Inputs ──
    await updateStage(1, 'running', 'Validating organization name, slug, email, and password...');
    if (!name || !cleanSlug || !cleanEmail || !password) {
      throw new Error('Name, slug, ownerEmail, and password are required');
    }
    const existingTenant = await Tenant.findOne({ slug: cleanSlug });
    if (existingTenant) {
      throw new Error(`Tenant with slug "${cleanSlug}" already exists`);
    }
    const existingUser = await UserLogin.findOne({ email: cleanEmail });
    if (existingUser) {
      throw new Error(`User with email "${cleanEmail}" already exists`);
    }
    await updateStage(1, 'completed', 'Input validation passed.');

    // ── Stage 2: Resolve Modules ──
    await updateStage(2, 'running', 'Resolving module entitlements from Global DB...');
    let moduleIdsToStore = [];
    let enabledModuleKeys = [];

    if (!allowAllModules && Array.isArray(enabledModules) && enabledModules.length > 0) {
      const dbModules = await Module.find({
        $or: [
          { _id: { $in: enabledModules.filter((id) => mongoose.Types.ObjectId.isValid(id)) } },
          { moduleId: { $in: enabledModules } },
        ],
      }).lean();
      moduleIdsToStore = dbModules.map((m) => m._id);
      enabledModuleKeys = dbModules.map((m) => m.moduleId);
    } else if (allowAllModules) {
      const dbModules = await Module.find().lean();
      moduleIdsToStore = dbModules.map((m) => m._id);
      enabledModuleKeys = dbModules.map((m) => m.moduleId);
    }

    if (!allowAllModules && enabledModuleKeys.length === 0) {
      throw new Error('None of the requested modules exist in Global DB');
    }
    await updateStage(2, 'completed', `Resolved ${enabledModuleKeys.length} modules: [${enabledModuleKeys.join(', ')}]`);

    // ── Stage 3: Create Tenant Record ──
    await updateStage(3, 'running', 'Creating tenant metadata record in Global DB...');
    const hashedPassword = await bcrypt.hash(password, 10);
    const tenant = await Tenant.create({
      tenantId,
      name,
      slug: cleanSlug,
      dbName,
      ownerEmail: cleanEmail,
      plan,
      billingCycle,
      licenseExpiredAt: computedExpiry,
      paymentStatus,
      licenseStatus: 'Valid',
      enabledModules: moduleIdsToStore,
      status: 'Provisioning',
      settings: {
        maxUsers: Number(maxUsers) || 50,
        features: [],
      },
    });
    if (runDoc) {
      runDoc.enabledModuleKeys = enabledModuleKeys;
      await runDoc.save();
    }
    await updateStage(3, 'completed', `Created Tenant record ${tenantId} (${dbName}) with status 'Provisioning'.`);

    // ── Stage 4: Provision Database ──
    await updateStage(4, 'running', `Connecting and building compiled Mongoose models for ${dbName}...`);
    const { conn, models } = await TenantConnectionManager.getTenantConnection(dbName, enabledModuleKeys);
    await updateStage(4, 'completed', `Database pool ${dbName} provisioned with ${Object.keys(models).length} Mongoose models.`);

    // ── Stage 5: Seed Roles & Master Data ──
    await updateStage(5, 'running', 'Seeding Super Admin role, department, and designation...');
    const superAdminId = '6a25cbc1cd36294f5e578696';
    let superAdminRole = await models.roles.findById(superAdminId);
    if (!superAdminRole) {
      superAdminRole = await models.roles.findOne({ isSuperAdmin: true });
    }
    if (!superAdminRole) {
      superAdminRole = await models.roles.create({
        _id: new mongoose.Types.ObjectId(superAdminId),
        name: 'Super Admin',
        isSuperAdmin: true,
        level: 10,
        isActive: true,
        permissionVersion: 1,
        capabilities: [],
        description: 'Super Admin role with absolute privileges',
      });
    }
    let dept = await models.departments.findOne({ name: 'Super Admin' });
    if (!dept) {
      dept = await models.departments.create({
        name: 'Super Admin',
        shortCode: 'SA',
        description: 'Super Admin Department',
        designations: [],
      });
    }
    let desig = await models.designations.findOne({ title: 'Super Admin' });
    if (!desig) {
      desig = await models.designations.create({
        title: 'Super Admin',
        description: 'Super Admin Designation',
      });
    }
    if (dept && desig && Array.isArray(dept.designations) && !dept.designations.some((d) => d.toString() === desig._id.toString())) {
      dept.designations.push(desig._id);
      await dept.save();
    }
    await updateStage(5, 'completed', 'Super Admin role, department (SA), and designation seeded.');

    // ── Stage 6: Seed Policies & Capabilities ──
    await updateStage(6, 'running', 'Seeding access policies and page capability definitions...');
    const modelKeys = Object.keys(models);
    let policyCount = 0;
    for (const modelName of modelKeys) {
      if (!modelName || modelName.startsWith('_')) continue;
      const existingPolicy = await models.access_policies.findOne({
        role: superAdminRole._id,
        modelName: modelName.toLowerCase(),
      });
      if (!existingPolicy) {
        await models.access_policies.create({
          role: superAdminRole._id,
          modelName: modelName.toLowerCase(),
          actions: ['read', 'create', 'update', 'delete', 'list', 'statistics', 'export', 'report'],
          forbiddenAccess: { read: [], create: [], update: [], delete: [] },
          allowAccess: { read: ['*'], create: ['*'], update: ['*'], delete: ['*'] },
          registry: [],
          conditions: {},
        });
        policyCount++;
      }
    }
    // ── Stage 6: Seed Policies & Capabilities ──
    const seedRes = await seedNavigationAndCapabilities(conn, {
      enabledModuleKeys,
      allowAllModules,
      clearExisting: true
    });

    await updateStage(6, 'completed', `Seeded ${policyCount} access policies and ${seedRes.capabilitiesCount} capabilities.`);

    // ── Stage 7: Seed Filtered Sidebars ──
    await updateStage(7, 'completed', `Seeded ${seedRes.sidebarsCount} sidebars with mapped capabilities.`);

    // ── Stage 8: Create User ──
    await updateStage(8, 'running', 'Creating Super Admin Employee and Global UserLogin records...');
    let employee = await models.employees.findOne({
      $or: [{ 'authInfo.workEmail': cleanEmail }, { 'basicInfo.email': cleanEmail }],
    });

    if (!employee) {
      employee = await models.employees.create({
        basicInfo: {
          firstName: name || 'SuperAdmin',
          lastName: 'Owner',
          gender: 'male',
          phone: '9876543210',
          email: cleanEmail,
        },
        professionalInfo: {
          empId: 'EMP001',
          department: dept._id,
          designation: desig._id,
          role: superAdminRole._id,
          level: 'L4',
        },
        authInfo: {
          workEmail: cleanEmail,
          password: hashedPassword,
        },
        status: 'Active',
        isActive: true,
      });
    }

    const userLogin = await UserLogin.create({
      email: cleanEmail,
      password: hashedPassword,
      tenantId,
      dbName,
      employeeId: employee._id,
      role: 'Super Admin',
      userType: 'employee',
      status: 'Active',
    });
    await updateStage(8, 'completed', `UserLogin created for ${cleanEmail} (ID: ${userLogin._id}).`);

    // ── Stage 9: Verify Provisioning (Scoped) ──
    await updateStage(9, 'running', 'Running scoped provisioning verification checks...');
    const verificationResults = {
      tenantRecord: Boolean(tenant && tenant._id),
      enabledModulesMatch: tenant.enabledModules.length === moduleIdsToStore.length,
      dbReachable: Boolean(conn && conn.readyState === 1),
      superAdminRoleExists: Boolean(superAdminRole),
      employeeExists: Boolean(employee),
      userLoginExists: Boolean(userLogin),
      sidebarCount: oldToNew.size,
      orphanedChildrenCount: orphanedChildren.length,
      disabledLeaksCount: 0,
    };

    const tenantSidebars = await models.sidebars.find({}).lean();
    const leakedSidebars = tenantSidebars.filter((sb) => !isSidebarAllowed(sb));
    verificationResults.disabledLeaksCount = leakedSidebars.length;

    const allPassed =
      verificationResults.tenantRecord &&
      verificationResults.dbReachable &&
      verificationResults.superAdminRoleExists &&
      verificationResults.employeeExists &&
      verificationResults.userLoginExists &&
      verificationResults.disabledLeaksCount === 0;

    if (!allPassed) {
      throw new Error(`Scoped verification failed: ${JSON.stringify(verificationResults)}`);
    }

    tenant.status = 'Active';
    await tenant.save();

    try {
      await setCache();
    } catch (_) {}

    await updateStage(9, 'completed', 'Scoped verification passed 100%! Tenant marked Active.');

    if (runDoc) {
      runDoc.status = 'completed';
      runDoc.completedAt = new Date();
      runDoc.verification = verificationResults;
      await runDoc.save();
    }

    const populatedTenant = await Tenant.findById(tenant._id).populate('enabledModules');

    return {
      success: true,
      runId,
      tenant: populatedTenant,
      user: {
        id: userLogin._id,
        employeeId: userLogin.employeeId,
        email: userLogin.email,
        tenantId: userLogin.tenantId,
        tenantSlug: cleanSlug,
        role: userLogin.role,
      },
      verification: verificationResults,
    };
  } catch (err) {
    const errorMsg = err.message || 'Provisioning failed';
    if (runDoc) {
      runDoc.status = 'failed';
      runDoc.error = errorMsg;
      runDoc.completedAt = new Date();
      await runDoc.save();
    }
    if (runDoc && runDoc.currentStep > 0) {
      await updateStage(runDoc.currentStep, 'failed', 'Error encountered during provisioning.', errorMsg);
    }
    throw err;
  }
}

/**
 * Seed a tenant database connection with default Super Admin roles,
 * department, designation, capabilities, access policies, sidebars, and owner employee record.
 *
 * IMPORTANT: Sidebars are filtered by enabledModuleKeys to enforce module isolation.
 * A tenant only receives sidebars whose moduleKey is in its enabledModuleKeys.
 *
 * @param {Object} params
 * @param {mongoose.Connection} params.conn - Active tenant connection
 * @param {Object} params.models - Compiled tenant models
 * @param {string} params.ownerEmail - Email for the tenant Super Admin user
 * @param {string[]} params.enabledModuleKeys - Required. Module keys this tenant is entitled to (e.g. ['core', 'attendance', 'payroll'])
 * @param {boolean} [params.allowAllModules=false] - Explicit opt-in to bypass module filtering (for internal/system seed only)
 * @param {string} [params.password] - Plain text password (hashed if provided) or existing hash
 * @param {string} [params.passwordHash] - Pre-hashed password
 * @param {string} [params.firstName='SuperAdmin'] - First name
 * @param {string} [params.lastName='Owner'] - Last name
 * @returns {Promise<Object>} The created or resolved employee document
 */
export async function seedTenantDatabase({
  conn,
  models,
  ownerEmail,
  enabledModuleKeys,
  allowAllModules = false,
  password = 'password123',
  passwordHash = null,
  firstName = 'SuperAdmin',
  lastName = 'Owner',
}) {
  // ── Guard: enabledModuleKeys is mandatory ──
  if (!allowAllModules) {
    if (!Array.isArray(enabledModuleKeys)) {
      throw new Error('[tenantSeedingService] enabledModuleKeys is required for tenant provisioning');
    }
    if (enabledModuleKeys.length === 0) {
      throw new Error('[tenantSeedingService] Tenant must have at least one enabled module');
    }
  }

  if (!models || !models.roles || !models.employees) {
    throw new Error('[tenantSeedingService] Invalid models object provided for tenant seeding');
  }

  const cleanEmail = ownerEmail.toLowerCase().trim();

  // 1. Super Admin Role
  const superAdminId = '6a25cbc1cd36294f5e578696';
  let superAdminRole = await models.roles.findById(superAdminId);
  if (!superAdminRole) {
    superAdminRole = await models.roles.findOne({ isSuperAdmin: true });
  }

  if (!superAdminRole) {
    superAdminRole = await models.roles.create({
      _id: new mongoose.Types.ObjectId(superAdminId),
      name: 'Super Admin',
      isSuperAdmin: true,
      level: 10,
      isActive: true,
      permissionVersion: 1,
      capabilities: [],
      description: 'Super Admin role with absolute privileges',
    });
  }

  // 2. Super Admin Department & Designation
  let dept = await models.departments.findOne({ name: 'Super Admin' });
  if (!dept) {
    dept = await models.departments.create({
      name: 'Super Admin',
      shortCode: 'SA',
      description: 'Super Admin Department',
      designations: [],
    });
  }

  let desig = await models.designations.findOne({ title: 'Super Admin' });
  if (!desig) {
    desig = await models.designations.create({
      title: 'Super Admin',
      description: 'Super Admin Designation',
    });
  }

  if (dept && desig && Array.isArray(dept.designations) && !dept.designations.some((d) => d.toString() === desig._id.toString())) {
    dept.designations.push(desig._id);
    await dept.save();
  }

  // 3. Seed Access Policies for all registered models
  const modelKeys = Object.keys(models);
  for (const modelName of modelKeys) {
    if (!modelName || modelName.startsWith('_')) continue;
    const existingPolicy = await models.access_policies.findOne({
      role: superAdminRole._id,
      modelName: modelName.toLowerCase(),
    });

    if (!existingPolicy) {
      await models.access_policies.create({
        role: superAdminRole._id,
        modelName: modelName.toLowerCase(),
        actions: ['read', 'create', 'update', 'delete', 'list', 'statistics', 'export', 'report'],
        forbiddenAccess: { read: [], create: [], update: [], delete: [] },
        allowAccess: { read: ['*'], create: ['*'], update: ['*'], delete: ['*'] },
        registry: [],
        conditions: {},
      });
    }
  }

  // 4. Seed Capabilities and Sidebars with proper mapping
  await seedNavigationAndCapabilities(conn, {
    enabledModuleKeys,
    allowAllModules,
    clearExisting: true
  });

  // 5. Hash Password if required
  let finalHash = passwordHash;
  if (!finalHash && password) {
    finalHash = await bcrypt.hash(password, 10);
  }

  // 6. Create / Update Employee Record in tenant DB
  let employee = await models.employees.findOne({
    $or: [{ 'authInfo.workEmail': cleanEmail }, { 'basicInfo.email': cleanEmail }],
  });

  if (!employee) {
    employee = await models.employees.create({
      basicInfo: {
        firstName,
        lastName,
        gender: 'male',
        phone: '9876543210',
        email: cleanEmail,
      },
      professionalInfo: {
        empId: 'EMP001',
        department: dept._id,
        designation: desig._id,
        role: superAdminRole._id,
        level: 'L4',
      },
      authInfo: {
        workEmail: cleanEmail,
        password: finalHash,
      },
      status: 'Active',
      isActive: true,
    });
  } else {
    // Update existing to ensure Super Admin role is linked
    employee.professionalInfo.role = superAdminRole._id;
    if (finalHash) {
      employee.authInfo.password = finalHash;
    }
    employee.status = 'Active';
    employee.isActive = true;
    await employee.save();
  }

  // 7. Refresh Cache
  try {
    await setCache();
  } catch (_) {
    // Non-blocking if cache server is optional
  }

  return employee;
}

export default seedTenantDatabase;

