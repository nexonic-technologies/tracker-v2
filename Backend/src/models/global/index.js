import mongoose from 'mongoose';
import TenantSchema from './Tenant.js';
import UserLoginSchema from './UserLogin.js';
import ModuleSchema from './Module.js';
import ModelDefinitionSchema from './ModelDefinition.js';
import ProvisioningRunSchema from './ProvisioningRun.js';

let globalConn = null;
let Tenant = null;
let UserLogin = null;
let Module = null;
let ModelDefinition = null;
let ProvisioningRun = null;

import { MODULE_DEFINITIONS, MODULE_METADATA } from '../tenantRegistry.js';

export const DEFAULT_MODULES_SEED = Object.keys(MODULE_DEFINITIONS).map((modId) => {
  const meta = MODULE_METADATA[modId] || {
    name: modId.toUpperCase(),
    description: `Module ${modId}`,
    icon: 'Package',
    isCore: modId === 'core'
  };
  return {
    moduleId: modId,
    name: meta.name,
    description: meta.description,
    icon: meta.icon,
    isCore: Boolean(meta.isCore),
    collections: MODULE_DEFINITIONS[modId]
  };
});

export const initGlobalModels = (conn = mongoose.connection) => {
  globalConn = conn;
  Tenant = conn.models.Tenant || conn.model('Tenant', TenantSchema);
  UserLogin = conn.models.UserLogin || conn.model('UserLogin', UserLoginSchema);
  Module = conn.models.Module || conn.model('Module', ModuleSchema);
  ModelDefinition = conn.models.ModelDefinition || conn.model('ModelDefinition', ModelDefinitionSchema);
  ProvisioningRun = conn.models.ProvisioningRun || conn.model('ProvisioningRun', ProvisioningRunSchema);

  // Auto-seed global system modules if empty
  seedGlobalModules().catch((err) =>
    console.error('[initGlobalModels] Failed to seed system modules:', err.message)
  );

  return { Tenant, UserLogin, Module, ModelDefinition, ProvisioningRun };
};

export const seedGlobalModules = async () => {
  if (!Module) return;
  const count = await Module.countDocuments();
  if (count === 0) {
    console.log('[GlobalDB] Seeding system modules in Global Database...');
    for (const mod of DEFAULT_MODULES_SEED) {
      await Module.updateOne(
        { moduleId: mod.moduleId },
        { $setOnInsert: mod },
        { upsert: true }
      );
    }
    console.log('[GlobalDB] System modules successfully seeded');
  }
};

export const getGlobalModels = () => {
  if (!Tenant || !UserLogin || !Module || !ModelDefinition || !ProvisioningRun) {
    initGlobalModels(mongoose.connection);
  }
  return { Tenant, UserLogin, Module, ModelDefinition, ProvisioningRun };
};

export { TenantSchema, UserLoginSchema, ModuleSchema, ModelDefinitionSchema, ProvisioningRunSchema };
