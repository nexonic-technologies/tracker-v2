import { AsyncLocalStorage } from 'async_hooks';
import mongoose from 'mongoose';
import { getGlobalModels } from '../models/global/index.js';
import staticModelMap from '../models/tenantRegistry.js';
import { getCanonicalModelName } from '../models/canonicalModelMap.js';

const tenantStorage = new AsyncLocalStorage();

// Pre-build normalized static model map (lowercased keys -> model/schema) for O(1) case-insensitive lookup
const normalizedStaticModelMap = new Map();
if (staticModelMap) {
  for (const [k, v] of Object.entries(staticModelMap)) {
    if (k && v) {
      normalizedStaticModelMap.set(k.toLowerCase(), v);
      if (v.modelName) {
        normalizedStaticModelMap.set(v.modelName.toLowerCase(), v);
      }
    }
  }
}

/**
 * Creates a standardized tenantContext object according to platform architecture contract.
 */
export function createTenantContext({
  tenantId,
  tenantSlug,
  tenant = null,
  subscription = null,
  enabledModules = ['*'],
  actor = null,
  effectiveUser = null,
  isImpersonated = false,
  connection = null,
  models = {},
}) {
  const context = {
    tenantId,
    tenantSlug: tenantSlug || tenantId,
    tenant,
    subscription,
    enabledModules,
    actor,
    effectiveUser,
    isImpersonated,
    connection,
    models,
    getModel(modelName) {
      if (!modelName) {
        throw new Error('[tenantContext] modelName is required');
      }
      const canonicalName = getCanonicalModelName(modelName) || modelName;
      const key = canonicalName.toLowerCase();

      let Model = models[canonicalName] ||
                    models[key] ||
                    models[modelName] ||
                    (connection && connection.models ? (connection.models[canonicalName] || connection.models[modelName] || connection.models[key] || connection.models[key + 's']) : null);

      if (!Model && connection) {
        const staticModelOrSchema = normalizedStaticModelMap.get(key) || staticModelMap[key] || staticModelMap[canonicalName] || staticModelMap[modelName];
        if (staticModelOrSchema) {
          const targetName = staticModelOrSchema.modelName || canonicalName || modelName;
          if (connection.models && connection.models[targetName]) {
            Model = connection.models[targetName];
          } else if (connection.models && connection.models[targetName.toLowerCase()]) {
            Model = connection.models[targetName.toLowerCase()];
          } else if (staticModelOrSchema.schema) {
            Model = connection.model(targetName, staticModelOrSchema.schema);
          } else if (staticModelOrSchema instanceof mongoose.Schema) {
            Model = connection.model(targetName, staticModelOrSchema);
          } else {
            Model = staticModelOrSchema;
          }

          if (Model) {
            models[key] = Model;
            models[modelName] = Model;
            models[canonicalName] = Model;
            models[targetName] = Model;
            models[targetName.toLowerCase()] = Model;
          }
        }
      }

      if (!Model) {
        try {
          const globalModels = getGlobalModels();
          if (globalModels) {
            Model = globalModels[canonicalName] || globalModels[modelName] || globalModels[key];
          }
        } catch (e) {
          // Global models not yet initialized
        }
      }

      if (!Model) {
        throw new Error(`[tenantContext] Model "${modelName}" (canonical: "${canonicalName}") is not registered on active tenant context`);
      }
      return Model;
    },
  };

  return context;
}

/**
 * Execute callback within an isolated tenant context store.
 * @param {Object} store - Standardized tenantContext object
 * @param {Function} callback
 */
export function runWithTenantContext(store, callback) {
  return tenantStorage.run(store, callback);
}

/**
 * Get active tenant store from AsyncLocalStorage context.
 * @returns {Object|null}
 */
export function getTenantStore() {
  return tenantStorage.getStore() || null;
}

/**
 * Helper to get a model from the active tenant context store.
 * @param {string} modelName
 * @returns {Object|null}
 */
export function getTenantModel(modelName) {
  const store = getTenantStore();
  if (store && typeof store.getModel === 'function') {
    try {
      return store.getModel(modelName);
    } catch (_) {
      return null;
    }
  }
  if (store && store.models) {
    const canonicalName = getCanonicalModelName(modelName) || modelName;
    const key = canonicalName.toLowerCase();
    return store.models[canonicalName] || store.models[key] || store.models[modelName] || null;
  }
  return null;
}

/**
 * Centralized dynamic Proxy for accessing tenant models.
 * Usage: import { tenantModels } from '../tenant/tenantContext.js';
 *        tenantModels.employees.find(...)
 */
export const tenantModels = new Proxy({}, {
  get(_, prop) {
    if (typeof prop === 'symbol') return undefined;
    const propStr = String(prop);
    const M = getTenantModel(propStr);
    if (!M) {
      throw new Error(`[tenantModels] Model "${propStr}" not registered on active tenant context`);
    }
    return M;
  }
});


