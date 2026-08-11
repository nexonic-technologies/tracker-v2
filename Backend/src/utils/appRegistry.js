const registry = {
  models: {},
  services: {},
  policies: {},
  providers: {},
  cronJobs: {}
};

/**
 * Register a component to the application registry.
 * @param {string} type - 'models', 'services', 'policies', 'providers', 'cronJobs'
 * @param {string} name - Component key name
 * @param {any} instance - The exported instance or class reference
 */
export function registerComponent(type, name, instance) {
  if (!registry[type]) {
    throw new Error(`[AppRegistry] Invalid component type: ${type}`);
  }
  registry[type][name] = instance;
}

/**
 * Get a registered component from the application registry.
 * @param {string} type - 'models', 'services', 'policies', 'providers', 'cronJobs'
 * @param {string} name - Component key name
 * @returns {any}
 */
export function getComponent(type, name) {
  const component = registry[type]?.[name];
  if (!component) {
    throw new Error(`[AppRegistry] Component "${name}" of type "${type}" not registered.`);
  }
  return component;
}

import { getTenantModel } from '../tenant/tenantContext.js';
import { getCanonicalModelName } from '../models/canonicalModelMap.js';

/**
 * Helper to retrieve a model synchronously (consults active tenant context store first).
 * @param {string} name
 * @returns {any}
 */
export function getModel(name) {
  const canonicalName = getCanonicalModelName(name) || name;
  const tenantModel = getTenantModel(canonicalName) || getTenantModel(name);
  if (tenantModel) {
    return tenantModel;
  }
  try {
    return getComponent('models', canonicalName) || getComponent('models', name);
  } catch (_) {
    throw new Error(`[appRegistry] Model "${name}" (canonical: "${canonicalName}") is not registered on active tenant context`);
  }
}

/**
 * Helper to retrieve a service hook synchronously.
 * @param {string} name
 * @returns {any}
 */
export function getService(name) {
  const canonicalName = getCanonicalModelName(name) || name;
  try {
    return getComponent('services', canonicalName);
  } catch (_) {
    return getComponent('services', name);
  }
}

/**
 * Helper to retrieve a provider reference synchronously.
 * @param {string} name
 * @returns {any}
 */
export function getProvider(name) {
  return getComponent('providers', name);
}

