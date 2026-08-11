/**
 * importCache.js
 *
 * A singleton in-memory cache for dynamic ESM imports.
 * Wraps the native `import()` so that each module URL is only loaded
 * from disk ONCE per process lifetime. All subsequent calls get the
 * already-resolved module object from memory — eliminating the
 * repeated file-system read + V8 parse cost on every request.
 *
 * Hot paths this fixes:
 *   - buildReadQuery / buildCreateQuery / buildUpdateQuery / buildDeleteQuery
 *     → service module import on every CRUD operation
 *   - populateHelper → Employee, Role, policyEngine, Collection imports
 *   - access_policies → Role imported 3× in separate branches
 *   - contextBuilder → Role imported inside every auth middleware call
 *   - domainEventService → imported in create/update AFTER a DB write
 */

const _cache = new Map();

/**
 * Lazily import a module and keep it in memory for the process lifetime.
 *
 * @param {string} specifier  The same string you would pass to `import()`.
 *                            Can be a file URL (pathToFileURL result) or a
 *                            bare package specifier ('jsonwebtoken', etc.).
 * @returns {Promise<any>}    The resolved module object.
 */
export async function cachedImport(specifier) {
  if (_cache.has(specifier)) {
    return _cache.get(specifier);
  }
  const mod = await import(specifier);
  _cache.set(specifier, mod);
  return mod;
}

/**
 * Manually evict a cached module (useful after hot-reload in dev or when
 * a service file is replaced at runtime).
 * @param {string} specifier
 */
export function evictImport(specifier) {
  _cache.delete(specifier);
}

/**
 * Return the current size of the import cache (for monitoring/logging).
 */
export function importCacheSize() {
  return _cache.size;
}

export default cachedImport;
