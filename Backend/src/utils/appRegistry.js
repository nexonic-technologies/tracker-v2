import { getTenantModel } from '../tenant/tenantContext.js';
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
  if (!name) return null;
  const tenantModel = getTenantModel(name);
  if (tenantModel) {
    return tenantModel;
  }

  const raw = String(name).trim();
  const lower = raw.toLowerCase();
  const clean = lower.replace(/[^a-z0-9]/g, '');

  const fallback = registry.models[raw] || registry.models[lower] || registry.models[clean];
  if (fallback) {
    return fallback;
  }

  try {
    const globalModels = getGlobalModels();
    if (globalModels) {
      const gModel = globalModels[raw] || globalModels[lower] || globalModels[clean] || globalModels[`jarvis_${clean}`];
      if (gModel) return gModel;
    }
  } catch (_) {}

  throw new Error(`[appRegistry] Model "${name}" is not registered on active tenant context or global registry`);
}

/**
 * Helper to retrieve a service hook synchronously.
 */
export function getService(name) {
  if (!name) return null;
  const raw = String(name).trim();
  const lower = raw.toLowerCase();
  const clean = lower.replace(/[^a-z0-9]/g, '');
  return registry.services[raw] || registry.services[lower] || registry.services[clean] || null;
}

/**
 * Helper to retrieve a provider reference synchronously.
 */
export function getProvider(name) {
  return registry.providers[name] || null;
}
