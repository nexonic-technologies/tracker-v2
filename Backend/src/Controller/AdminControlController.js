import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getGlobalModels } from '../models/global/index.js';
import TenantConnectionManager from '../tenant/TenantConnectionManager.js';
import { generateSecret } from '../utils/tokenGenrator.js';
import { MODULE_DEFINITIONS } from '../models/tenantRegistry.js';
import { seedTenantDatabase, provisionTenant } from '../utils/tenantSeedingService.js';

/* -------------------------------- MODULES CRUD -------------------------------- */


export const listModules = async (req, res, next) => {
  try {
    const { Module } = getGlobalModels();
    const modules = await Module.find().populate('modelDefinitions').sort({ isCore: -1, name: 1 }).lean();
    return res.json({ modules });
  } catch (err) {
    next(err);
  }
};

export const createModule = async (req, res, next) => {
  try {
    const { moduleId, name, description, icon = 'Layers', collections = [], modelDefinitions = [] } = req.body;

    if (!moduleId || !name) {
      return res.status(400).json({ error: 'moduleId and name are required' });
    }

    const { Module } = getGlobalModels();
    const cleanModuleId = moduleId.toLowerCase().replace(/[^a-z0-9_]/g, '');

    const existing = await Module.findOne({ moduleId: cleanModuleId });
    if (existing) {
      return res.status(400).json({ error: `Module "${cleanModuleId}" already exists` });
    }

    const newModule = await Module.create({
      moduleId: cleanModuleId,
      name,
      description,
      icon,
      collections,
      modelDefinitions,
      isCore: false,
      status: 'Active',
    });

    return res.status(201).json({ message: 'Module created successfully in Global DB', module: newModule });
  } catch (err) {
    next(err);
  }
};

export const updateModule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, collections, modelDefinitions, status } = req.body;

    const { Module } = getGlobalModels();
    const updatedModule = await Module.findByIdAndUpdate(
      id,
      { name, description, icon, collections, modelDefinitions, status },
      { new: true }
    ).populate('modelDefinitions');

    if (!updatedModule) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Invalidate connection cache for all tenants to reflect updated module schema definition
    TenantConnectionManager.clearTenantCache();

    return res.json({ message: 'Module updated successfully', module: updatedModule });
  } catch (err) {
    next(err);
  }
};

/* --------------------------- DYNAMIC MODEL DEFINITION CRUD --------------------------- */

export const listModelDefinitions = async (req, res, next) => {
  try {
    const { ModelDefinition } = getGlobalModels();
    const modelDefs = await ModelDefinition.find().sort({ moduleId: 1, modelName: 1 }).lean();
    return res.json({ modelDefinitions: modelDefs });
  } catch (err) {
    next(err);
  }
};

export const createModelDefinition = async (req, res, next) => {
  try {
    const { modelName, name, collectionName, moduleId, displayName, description, fields = [], timestamps = true } = req.body;
    const finalModelName = modelName || name;

    if (!finalModelName || !collectionName || !moduleId) {
      return res.status(400).json({ error: 'modelName, collectionName, and moduleId are required' });
    }

    const { ModelDefinition, Module } = getGlobalModels();

    const existing = await ModelDefinition.findOne({ modelName: finalModelName });
    if (existing) {
      return res.status(400).json({ error: `Model "${finalModelName}" already exists` });
    }

    const modelDef = await ModelDefinition.create({
      modelName: finalModelName,
      collectionName: collectionName.toLowerCase(),
      moduleId: moduleId.toLowerCase(),
      displayName: displayName || finalModelName,
      description,
      fields,
      timestamps,
      isCustom: true,
      status: 'Active',
    });

    // Link ModelDefinition to Module in Global DB
    await Module.updateOne(
      { moduleId: moduleId.toLowerCase() },
      { $addToSet: { modelDefinitions: modelDef._id, collections: collectionName.toLowerCase() } }
    );

    // Invalidate connection cache so new model definition is dynamically compiled on next request
    TenantConnectionManager.clearTenantCache();

    return res.status(201).json({ message: 'Dynamic Model definition created in Global DB', modelDefinition: modelDef });
  } catch (err) {
    next(err);
  }
};

export const updateModelDefinition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { displayName, description, fields, timestamps, status } = req.body;

    const { ModelDefinition } = getGlobalModels();
    const updated = await ModelDefinition.findByIdAndUpdate(
      id,
      { displayName, description, fields, timestamps, status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'ModelDefinition not found' });
    }

    // Invalidate connection cache so updated model schema is compiled dynamically
    TenantConnectionManager.clearTenantCache();

    return res.json({ message: 'Dynamic Model definition updated in Global DB', modelDefinition: updated });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------- TENANT CONTROL -------------------------------- */

export const createTenant = async (req, res, next) => {
  try {
    const {
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
    } = req.body;

    const result = await provisionTenant({
      name,
      slug,
      ownerEmail,
      password,
      plan,
      billingCycle,
      licenseExpiredAt,
      paymentStatus,
      maxUsers,
      enabledModules,
      createdBy: req.user?.email || 'admin_ui',
    });

    return res.status(201).json({
      message: 'Tenant provisioned successfully with selected modules and Super Admin access',
      tenant: result.tenant,
      user: result.user,
      runId: result.runId,
      verification: result.verification,
    });
  } catch (err) {
    next(err);
  }
};

export const createTenantWithProgress = async (req, res, next) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const {
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
    } = req.body;

    const result = await provisionTenant({
      name,
      slug,
      ownerEmail,
      password,
      plan,
      billingCycle,
      licenseExpiredAt,
      paymentStatus,
      maxUsers,
      enabledModules,
      createdBy: req.user?.email || 'admin_ui',
      onProgress: (progressData) => {
        sendEvent('progress', progressData);
      },
    });

    sendEvent('complete', result);
    return res.end();
  } catch (err) {
    sendEvent('error', { error: err.message || 'Provisioning failed' });
    return res.end();
  }
};

export const getProvisioningStatus = async (req, res, next) => {
  try {
    const { runId } = req.params;
    const { ProvisioningRun } = getGlobalModels();

    if (!ProvisioningRun) {
      return res.status(500).json({ error: 'ProvisioningRun model not initialized' });
    }

    const runDoc = await ProvisioningRun.findOne({ runId }).lean();
    if (!runDoc) {
      return res.status(404).json({ error: `Provisioning run "${runId}" not found` });
    }

    return res.json({ run: runDoc });
  } catch (err) {
    next(err);
  }
};

export const listTenants = async (req, res, next) => {
  try {
    const { Tenant, Module } = getGlobalModels();
    const tenants = await Tenant.find().populate('enabledModules').sort({ createdAt: -1 }).lean();
    const availableModules = await Module.find().sort({ isCore: -1, name: 1 }).lean();
    return res.json({ tenants, availableModules });
  } catch (err) {
    next(err);
  }
};

export const updateTenantStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const STATUS_MAP = {
      active: 'Active',
      suspended: 'Suspended',
      provisioning: 'Provisioning',
      deleted: 'Deleted',
      inactive: 'Inactive',
      canceled: 'Canceled',
      cancelled: 'Canceled',
    };

    const normalizedStatus = STATUS_MAP[status?.toString()?.trim()?.toLowerCase()];
    if (!normalizedStatus) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const { Tenant } = getGlobalModels();
    const tenant = await Tenant.findByIdAndUpdate(id, { status: normalizedStatus }, { new: true });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    TenantConnectionManager.clearTenantCache(tenant.dbName);

    return res.json({ message: 'Tenant status updated', tenant });
  } catch (err) {
    next(err);
  }
};

export const updateTenantSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { billingCycle, licenseExpiredAt, paymentStatus, maxUsers } = req.body;

    const { Tenant } = getGlobalModels();
    const tenant = await Tenant.findById(id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (billingCycle && ['Monthly', 'Annual', 'Lifetime'].includes(billingCycle)) {
      tenant.billingCycle = billingCycle;
    }

    if (licenseExpiredAt) {
      const parsedDate = new Date(licenseExpiredAt);
      if (!isNaN(parsedDate.getTime())) {
        tenant.licenseExpiredAt = parsedDate;
      }
    } else if (billingCycle && billingCycle !== 'Lifetime') {
      const now = new Date();
      if (billingCycle === 'Monthly') {
        tenant.licenseExpiredAt = new Date(now.setMonth(now.getMonth() + 1));
      } else if (billingCycle === 'Annual') {
        tenant.licenseExpiredAt = new Date(now.setFullYear(now.getFullYear() + 1));
      }
    }

    if (paymentStatus && ['Paid', 'PastDue', 'Unpaid', 'Trial', 'Refunded'].includes(paymentStatus)) {
      tenant.paymentStatus = paymentStatus;
      if (paymentStatus === 'Unpaid') {
        tenant.status = 'Suspended';
      } else if (paymentStatus === 'Paid' && tenant.status === 'Suspended') {
        tenant.status = 'Active';
      }
    }

    if (maxUsers !== undefined && Number(maxUsers) > 0) {
      if (!tenant.settings) tenant.settings = {};
      tenant.settings.maxUsers = Number(maxUsers);
    }

    await tenant.save();
    TenantConnectionManager.clearTenantCache(tenant.dbName);

    const updated = await Tenant.findById(tenant._id).populate('enabledModules').lean();
    return res.json({ message: 'Tenant subscription and license updated successfully', tenant: updated });
  } catch (err) {
    next(err);
  }
};

export const updateTenantModules = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { enabledModules } = req.body;

    if (!Array.isArray(enabledModules)) {
      return res.status(400).json({ error: 'enabledModules must be an array of Module IDs or moduleKeys' });
    }

    const { Tenant, Module } = getGlobalModels();

    const dbModules = await Module.find({
      $or: [
        { _id: { $in: enabledModules.filter((m) => typeof m === 'string' && m.match(/^[0-9a-fA-F]{24}$/)) } },
        { moduleId: { $in: enabledModules } },
      ],
    });
    const moduleIdsToStore = dbModules.map((m) => m._id);

    const tenant = await Tenant.findByIdAndUpdate(
      id,
      { enabledModules: moduleIdsToStore },
      { new: true }
    ).populate('enabledModules');

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Invalidate connection cache so the next request re-compiles with updated module models
    TenantConnectionManager.clearTenantCache(tenant.dbName);

    return res.json({
      message: 'Tenant module subscription updated successfully',
      tenant,
    });
  } catch (err) {
    next(err);
  }
};

export const impersonateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Tenant, UserLogin } = getGlobalModels();

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const ownerUser = await UserLogin.findOne({ tenantId: tenant.tenantId, role: 'Admin' });
    if (!ownerUser) {
      return res.status(404).json({ error: 'Tenant admin user not found' });
    }

    const accessSecret = process.env.JWT_SECRET || generateSecret();
    const impersonateToken = jwt.sign(
      {
        id: ownerUser._id,
        userType: 'employee',
        tenantId: tenant.tenantId,
        dbName: tenant.dbName,
        role: 'Admin',
        isImpersonating: true,
      },
      accessSecret,
      { expiresIn: '15m' }
    );

    return res.json({
      message: `Impersonation token generated for ${tenant.name}`,
      token: impersonateToken,
      tenantSlug: tenant.slug,
      dbName: tenant.dbName,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------- SYSTEM OBSERVABILITY METRICS --------------------------- */

export const getDbUtilizationMetrics = async (req, res, next) => {
  try {
    const { Tenant } = getGlobalModels();
    const tenants = await Tenant.find().lean();

    const tenantMetrics = await Promise.all(
      tenants.map(async (t) => {
        try {
          const { conn } = await TenantConnectionManager.getTenantConnection(t.dbName);
          const stats = await conn.db.stats();
          return {
            tenantId: t.tenantId,
            name: t.name,
            dbName: t.dbName,
            status: t.status,
            collections: stats.collections || 0,
            objects: stats.objects || 0,
            avgObjSize: stats.avgObjSize || 0,
            dataSizeMB: Number((stats.dataSize / (1024 * 1024)).toFixed(2)) || 0,
            storageSizeMB: Number((stats.storageSize / (1024 * 1024)).toFixed(2)) || 0,
            indexes: stats.indexes || 0,
            indexSizeMB: Number((stats.indexSize / (1024 * 1024)).toFixed(2)) || 0,
          };
        } catch (e) {
          return {
            tenantId: t.tenantId,
            name: t.name,
            dbName: t.dbName,
            status: t.status,
            error: e.message,
            collections: 0,
            objects: 0,
            storageSizeMB: 0,
          };
        }
      })
    );

    const totalStorageMB = tenantMetrics.reduce((acc, curr) => acc + (curr.storageSizeMB || 0), 0);
    const totalObjects = tenantMetrics.reduce((acc, curr) => acc + (curr.objects || 0), 0);

    return res.json({
      summary: {
        totalTenants: tenants.length,
        totalStorageMB: Number(totalStorageMB.toFixed(2)),
        totalObjects,
        activeConnections: TenantConnectionManager.getActiveConnectionCount(),
      },
      tenants: tenantMetrics,
    });
  } catch (err) {
    next(err);
  }
};

export const getUsageMetrics = async (req, res, next) => {
  try {
    const { Tenant, UserLogin, Module } = getGlobalModels();

    const tenants = await Tenant.find().populate('enabledModules').lean();
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === 'Active').length;
    const suspendedTenants = tenants.filter((t) => t.status === 'Suspended').length;

    const totalUsers = await UserLogin.countDocuments({ status: { $ne: 'Inactive' } });
    const moduleCount = await Module.countDocuments();

    // Payment Status Breakdown
    const paymentStatusBreakdown = {
      Paid: tenants.filter((t) => (t.paymentStatus || 'Paid') === 'Paid').length,
      PastDue: tenants.filter((t) => t.paymentStatus === 'PastDue').length,
      Unpaid: tenants.filter((t) => t.paymentStatus === 'Unpaid').length,
      Trial: tenants.filter((t) => t.paymentStatus === 'Trial').length,
    };

    // Billing Cycle Breakdown
    const billingCycleBreakdown = {
      Annual: tenants.filter((t) => (t.billingCycle || 'Annual') === 'Annual').length,
      Monthly: tenants.filter((t) => t.billingCycle === 'Monthly').length,
      Lifetime: tenants.filter((t) => t.billingCycle === 'Lifetime').length,
    };

    // License Expiration Status & 7-Day Grace Period Breakdown
    const now = new Date();
    const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
    let validLicenses = 0;
    let gracePeriodLicenses = 0;
    let expiredLicenses = 0;

    tenants.forEach((t) => {
      if (!t.licenseExpiredAt) {
        validLicenses++;
      } else {
        const expiry = new Date(t.licenseExpiredAt);
        if (now <= expiry) {
          validLicenses++;
        } else if (now <= new Date(expiry.getTime() + GRACE_PERIOD_MS)) {
          gracePeriodLicenses++;
        } else {
          expiredLicenses++;
        }
      }
    });

    // Total Max Users Capacity across all tenants
    const totalCapacityUsers = tenants.reduce((acc, t) => acc + (t.settings?.maxUsers || 50), 0);

    const statusBreakdown = {
      Active: activeTenants,
      Suspended: suspendedTenants,
      Provisioning: tenants.filter((t) => t.status === 'Provisioning').length,
      Inactive: tenants.filter((t) => t.status === 'Inactive' || t.status === 'Canceled' || t.status === 'Cancelled').length,
    };

    return res.json({
      metrics: {
        totalTenants,
        activeTenants,
        suspendedTenants,
        activeUsers: totalUsers,
        totalCapacityUsers,
        activeModules: moduleCount,
        statusBreakdown,
        paymentStatusBreakdown,
        billingCycleBreakdown,
        licenseBreakdown: {
          Valid: validLicenses,
          GracePeriod: gracePeriodLicenses,
          Expired: expiredLicenses,
        },
        tenants: tenants.map((t) => ({
          _id: t._id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          billingCycle: t.billingCycle || 'Annual',
          licenseExpiredAt: t.licenseExpiredAt,
          paymentStatus: t.paymentStatus || 'Paid',
          maxUsers: t.settings?.maxUsers || 50,
          moduleCount: Array.isArray(t.enabledModules) ? t.enabledModules.length : 0,
        })),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getErrorLogs = async (req, res, next) => {
  try {
    const { default: models } = await import('../models/Collection.js');
    const ErrorLog = models.error_logs;

    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '50');
    const search = req.query.search || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { message: { $regex: search, $options: 'i' } },
        { route: { $regex: search, $options: 'i' } },
        { requestId: { $regex: search, $options: 'i' } },
      ];
    }

    let logs = [];
    let total = 0;

    if (ErrorLog) {
      [logs, total] = await Promise.all([
        ErrorLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        ErrorLog.countDocuments(filter),
      ]);
    }

    const total500 = logs.filter(l => !l.message?.includes('ACCESS DENIED') && !l.message?.includes('CRITICAL SECURITY')).length;
    const total403 = logs.filter(l => l.message?.includes('ACCESS DENIED') || l.message?.includes('CRITICAL SECURITY') || l.message?.includes('permission')).length;

    return res.json({
      summary: {
        totalLogs: total,
        serverErrors500: total500,
        policyRejections403: total403,
      },
      page,
      limit,
      logs,
    });
  } catch (err) {
    next(err);
  }
};


