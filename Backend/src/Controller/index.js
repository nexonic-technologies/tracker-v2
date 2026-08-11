// src/policy/index.js
// or src/utils/policy/index.js

/**
 * Central registry store for all conditional (dynamic) policy logic.
 * Add new registry functions here to extend ABAC capabilities.
 */
const registryStore = Object.freeze({});

/**
 * Retrieve a registry function by name.
 * @param {string} name - registry key from the policy JSON ("isSelf", "populateRef", ...)
 * @returns {Function|null} - matching registry function, or null if not found
 */
export function getRegistry(name) {
  return registryStore[name] ?? null; // no exception → safe skip
}

/**
 * Helper to list all registered functions (mainly for debugging or DevTools)
 */
export function listRegistries() {
  return Object.keys(registryStore);
}

export default {
  getRegistry,
  listRegistries,
};
