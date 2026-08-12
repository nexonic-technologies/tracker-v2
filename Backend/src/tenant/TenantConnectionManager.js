import mongoose from 'mongoose';
import { compileTenantModels } from '../models/tenantRegistry.js';
import { ensureTenantIndexes } from '../utils/databaseIndexer.js';
import { runTenantMigrations } from './TenantMigrationRunner.js';

class TenantConnectionManager {
  constructor() {
    this.connectionCache = new Map(); // dbName -> { conn, models, lastAccessed, modulesKey }
    this.maxCacheSize = 100;
  }

  /**
   * Validate DB name against injection payloads (e.g. path traversal, SQL/NoSQL injection).
   * @param {string} dbName
   */
  validateDbName(dbName) {
    if (!dbName || typeof dbName !== 'string') {
      throw new Error('[TenantConnectionManager] Invalid or missing dbName');
    }
    // Only allow alphanumeric characters, underscores, and hyphens
    const validDbNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validDbNameRegex.test(dbName)) {
      throw new Error(`[TenantConnectionManager] Malformed dbName detected: "${dbName}"`);
    }
  }

  /**
   * Get or create tenant DB connection and compiled models for enabled modules.
   * @param {string} dbName - Database name e.g. "tracker_tenant_acme"
   * @param {Array<string>} [enabledModules=['*']] - Subscribed module keys
   * @returns {Object} { conn, models }
   */
  async getTenantConnection(dbName, enabledModules = ['*']) {
    if (!dbName) {
      throw new Error('[TenantConnectionManager] dbName is required');
    }
    this.validateDbName(dbName);

    const modulesKey = JSON.stringify((enabledModules || ['*']).sort());

    // Check RAM LRU cache
    if (this.connectionCache.has(dbName)) {
      const cached = this.connectionCache.get(dbName);
      if (cached.modulesKey === modulesKey) {
        cached.lastAccessed = Date.now();
        return { conn: cached.conn, models: cached.models };
      }
    }

    const baseConn = mongoose.connection;
    if (!baseConn || baseConn.readyState !== 1) {
      throw new Error('[TenantConnectionManager] Base MongoDB connection is not open');
    }

    // High performance useDb with socket pool reuse
    const tenantConn = baseConn.useDb(dbName, { useCache: true });

    // Compile tenant models (static baseline + dynamic ModelDefinition from Global DB)
    const models = await compileTenantModels(tenantConn, enabledModules);

    // Asynchronously trigger non-destructive schema migrations and index sync
    runTenantMigrations(tenantConn).catch((err) => console.warn(`[TenantConnectionManager] Migration error on ${dbName}:`, err.message));
    ensureTenantIndexes(tenantConn, models).catch((err) => console.warn(`[TenantConnectionManager] Indexing error on ${dbName}:`, err.message));

    // Evict oldest if cache exceeded limit
    if (this.connectionCache.size >= this.maxCacheSize) {
      this._evictOldest();
    }

    this.connectionCache.set(dbName, {
      conn: tenantConn,
      models,
      modulesKey,
      lastAccessed: Date.now(),
    });

    return { conn: tenantConn, models };
  }

  /**
   * Invalidate connection cache for a tenant by tenantId or dbName.
   * @param {string} tenantIdOrDbName
   */
  invalidate(tenantIdOrDbName) {
    if (!tenantIdOrDbName) return;
    const dbName = tenantIdOrDbName.startsWith('tracker_tenant_')
      ? tenantIdOrDbName
      : `tracker_tenant_${tenantIdOrDbName}`;
    this.connectionCache.delete(dbName);
    this.connectionCache.delete(tenantIdOrDbName);
  }

  /**
   * Resolve a Mongoose model from tenantContext safely.
   * @param {Object} tenantContext
   * @param {string} modelName
   * @returns {mongoose.Model}
   */
  getModel(tenantContext, modelName) {
    if (!tenantContext || !tenantContext.models) {
      throw new Error('[TenantConnectionManager] Invalid or missing tenantContext');
    }
    if (!modelName) {
      throw new Error('[TenantConnectionManager] modelName is required');
    }
    const key = modelName.toLowerCase();
    const Model = tenantContext.models[key] || tenantContext.models[modelName];
    if (!Model) {
      throw new Error(`[TenantConnectionManager] Model "${modelName}" not found in tenant registry`);
    }
    return Model;
  }

  clearTenantCache(dbName) {
    if (dbName) {
      this.connectionCache.delete(dbName);
    } else {
      this.connectionCache.clear();
    }
  }

  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.connectionCache.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.connectionCache.delete(oldestKey);
    }
  }

  clearCache() {
    this.connectionCache.clear();
  }

  getActiveConnectionCount() {
    return this.connectionCache.size;
  }
}

const instance = new TenantConnectionManager();
export default instance;
