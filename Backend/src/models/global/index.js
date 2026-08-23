import mongoose from 'mongoose';
import TenantSchema from './Tenant.js';
import UserLoginSchema from './UserLogin.js';
import ModuleSchema from './Module.js';
import ModelDefinitionSchema from './ModelDefinition.js';
import ProvisioningRunSchema from './ProvisioningRun.js';
import JarvisTokenSchema from './JarvisToken.js';
import JarvisRelationshipSchema from './JarvisRelationship.js';
import JarvisMemorySchema from './JarvisMemory.js';
import JarvisTraceSchema from './JarvisTrace.js';
import JarvisChatSessionSchema from './JarvisChatSession.js';

let globalConn = null;
let Tenant = null;
let UserLogin = null;
let Module = null;
let ModelDefinition = null;
let ProvisioningRun = null;
let JarvisToken = null;
let JarvisRelationship = null;
let JarvisMemory = null;
let JarvisTrace = null;
let JarvisChatSession = null;

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

  // Global Jarvis Knowledge & Memory Models (Zero Tenant-Scoping — Shared Global Intelligence)
  JarvisToken = conn.models.jarvis_tokens || conn.model('jarvis_tokens', JarvisTokenSchema);
  JarvisRelationship = conn.models.jarvis_relationships || conn.model('jarvis_relationships', JarvisRelationshipSchema);
  JarvisMemory = conn.models.jarvis_memories || conn.model('jarvis_memories', JarvisMemorySchema);
  JarvisTrace = conn.models.jarvis_traces || conn.model('jarvis_traces', JarvisTraceSchema);
  JarvisChatSession = conn.models.jarvis_chat_sessions || conn.model('jarvis_chat_sessions', JarvisChatSessionSchema);

  // Auto-seed global system modules if empty
  seedGlobalModules().catch((err) =>
    console.error('[initGlobalModels] Failed to seed system modules:', err.message)
  );

  return { Tenant, UserLogin, Module, ModelDefinition, ProvisioningRun, JarvisToken, JarvisRelationship, JarvisMemory, JarvisTrace, JarvisChatSession };
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
  if (!Tenant || !UserLogin || !Module || !ModelDefinition || !ProvisioningRun || !JarvisToken || !JarvisRelationship || !JarvisMemory || !JarvisTrace || !JarvisChatSession) {
    initGlobalModels(mongoose.connection);
  }
  return { Tenant, UserLogin, Module, ModelDefinition, ProvisioningRun, JarvisToken, JarvisRelationship, JarvisMemory, JarvisTrace, JarvisChatSession };
};

export {
  TenantSchema,
  UserLoginSchema,
  ModuleSchema,
  ModelDefinitionSchema,
  ProvisioningRunSchema,
  JarvisTokenSchema,
  JarvisRelationshipSchema,
  JarvisMemorySchema,
  JarvisTraceSchema,
  JarvisChatSessionSchema,
};
