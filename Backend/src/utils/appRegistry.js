import { getTenantModel } from '../tenant/tenantContext.js';
import { getCanonicalModelName } from '../models/canonicalModelMap.js';
import { getGlobalModels } from '../models/global/index.js';

const registry = {
  models: {},
  services: {},
  policies: {},
  providers: {},
  cronJobs: {}
};

/**
 * Register a component to the application registry.
 */
export function registerComponent(type, name, instance) {
  if (registry[type]) {
    registry[type][name] = instance;
  }
}

/**
 * Get a registered component from the application registry.
 */
export function getComponent(type, name) {
  return registry[type]?.[name] || null;
}

/**
 * Helper to retrieve a model synchronously (delegates to active tenant context store, fallback to global models).
 * @param {string} name
 * @returns {any}
 */
export function getModel(name) {
  const canonicalName = getCanonicalModelName(name) || name;
  const tenantModel = getTenantModel(canonicalName) || getTenantModel(name);
  if (tenantModel) {
    return tenantModel;
  }
  const fallback = registry.models[canonicalName] || registry.models[name];
  if (fallback) {
    return fallback;
  }
  try {
    const globalModels = getGlobalModels();
    if (globalModels) {
      const gModel = globalModels[canonicalName] || globalModels[name] || globalModels[`jarvis_${name}`] || globalModels[`Jarvis${canonicalName}`];
      if (gModel) return gModel;
    }
  } catch (_) {}
  throw new Error(`[appRegistry] Model "${name}" (canonical: "${canonicalName}") is not registered on active tenant context or global registry`);
}

/**
 * Helper to retrieve a service hook synchronously.
 */
export function getService(name) {
  const canonicalName = getCanonicalModelName(name) || name;
  return registry.services[canonicalName] || registry.services[name] || null;
}

/**
 * Helper to retrieve a provider reference synchronously.
 */
export function getProvider(name) {
  return registry.providers[name] || null;
}


