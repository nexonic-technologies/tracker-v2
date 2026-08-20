import jwt from 'jsonwebtoken';
import TenantConnectionManager from '../tenant/TenantConnectionManager.js';
import { runWithTenantContext, createTenantContext } from '../tenant/tenantContext.js';
import { getGlobalModels } from '../models/global/index.js';

// Fast in-memory cache for Global DB Tenant lookup (TTL: 60s)
const tenantRecordCache = new Map();
const TENANT_CACHE_TTL_MS = 60 * 1000;

export const tenantMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];
    let tokenDecoded = null;
    if (token) {
      try {
        tokenDecoded = jwt.decode(token);
      } catch (_) { }
    }

    const jwtTenantId = req.user?.tenantId || tokenDecoded?.tenantId;
    const headerTenantId = req.headers['x-tenant-id'];

    // Hardened Guardrail 1 & P1: JWT vs Header Mismatch Check
    if (jwtTenantId && headerTenantId && jwtTenantId !== headerTenantId && headerTenantId !== 'admin') {
      return res.status(403).json({
        error: 'Tenant identity mismatch between JWT token and request header',
        code: 'TENANT_MISMATCH'
      });
    }

    const isPlatformAdminRoute = req.path?.startsWith('/admin') || req.originalUrl?.includes('/api/admin');
    const isPublicRoute = req.path?.includes('/auth/login') || req.path === '/test' || req.originalUrl?.includes('/api/auth/login');
    const isFileServing = req.path?.startsWith('/files/serve') || req.path?.startsWith('/files/render') || req.originalUrl?.includes('/api/files/serve') || req.originalUrl?.includes('/api/files/render');

    let tenantId = jwtTenantId || headerTenantId || req.params?.tenantSlug;
    
    if (!tenantId) {
      if (isPlatformAdminRoute) {
        tenantId = 'admin';
      } else if (isPublicRoute || isFileServing) {
        tenantId = 'default';
      } else {
        return res.status(400).json({
          error: 'Missing mandatory tenant identifier (JWT tenantId or X-Tenant-Id header required)',
          code: 'TENANT_IDENTIFIER_MISSING'
        });
      }
    }

    let tenantSlug = req.params?.tenantSlug || tenantId;
    let dbName = req.user?.dbName || tokenDecoded?.dbName || req.headers['x-tenant-dbname'] || (tenantId.startsWith('tenant_') || tenantId.startsWith('tracker_tenant_') ? tenantId : `tenant_${tenantId}`);
    let enabledModules = req.user?.enabledModules || tokenDecoded?.enabledModules || null;
    let tenantRecord = null;
    let subscription = null;

    // Standardize default DB fallback if base connection is used
    if (dbName === 'tracker_tenant_default' || dbName === 'tenant_default' || tenantId === 'default' || tenantId === 'admin') {
      dbName = process.env.DEFAULT_TENANT_DB || 'tenant_admin';
    }

    // If dbName and tenantId are already validated in JWT session token, use cached connection directly
    const hasTokenTenantInfo = Boolean(tokenDecoded?.dbName || req.user?.dbName);

    if (!hasTokenTenantInfo && tenantId !== 'default' && tenantId !== 'admin') {
      // Load Tenant & Subscription from Global DB only when resolving unauthenticated or token-less requests
      try {
        const { Tenant } = getGlobalModels();
        if (Tenant) {
          const cacheKey = `${tenantId}:${tenantSlug}`;
          const cached = tenantRecordCache.get(cacheKey);
          const now = Date.now();

          if (cached && (now - cached.timestamp < TENANT_CACHE_TTL_MS)) {
            tenantRecord = cached.tenantRecord;
          } else {
            tenantRecord = await Tenant.findOne({ $or: [{ tenantId }, { slug: tenantSlug }] }).populate('enabledModules').lean();
            if (tenantRecord) {
              tenantRecordCache.set(cacheKey, { tenantRecord, timestamp: now });
            }
          }

          if (tenantRecord) {
            // Verify status
            const statusUpper = (tenantRecord.status || '').toUpperCase();
            if (statusUpper === 'SUSPENDED') {
              return res.status(402).json({ error: 'Account suspended due to billing or policy constraints', code: 'TENANT_SUSPENDED' });
            }
            if (statusUpper === 'INACTIVE' || statusUpper === 'CANCELED' || statusUpper === 'CANCELLED') {
              return res.status(403).json({ error: 'Tenant account is inactive or canceled', code: 'TENANT_INACTIVE' });
            }

            if (tenantRecord.dbName) {
              dbName = tenantRecord.dbName;
            }

            if (Array.isArray(tenantRecord.enabledModules) && tenantRecord.enabledModules.length > 0) {
              enabledModules = [];
              tenantRecord.enabledModules.forEach((mod) => {
                if (typeof mod === 'string') {
                  enabledModules.push(mod);
                } else if (mod && typeof mod === 'object') {
                  if (mod.moduleId) enabledModules.push(mod.moduleId);
                  if (mod._id) enabledModules.push(mod._id.toString());
                  if (mod.name) enabledModules.push(mod.name.toLowerCase());
                }
              });
            }
            subscription = tenantRecord.subscription || null;
          }
        }
      } catch (_) {
        // Non-blocking fallback if Global DB is uninitialized in dev/testing
      }
    }

    const safeEnabledModules = (Array.isArray(enabledModules) && enabledModules.length > 0) ? enabledModules : ['*'];
    const { conn, models } = await TenantConnectionManager.getTenantConnection(dbName, safeEnabledModules);

    const userObj = req.user || tokenDecoded;
    // Build standardized tenantContext
    const tenantContext = createTenantContext({
      tenantId,
      tenantSlug,
      tenant: tenantRecord,
      subscription,
      enabledModules: safeEnabledModules,
      actor: userObj ? { id: userObj.id || userObj._id, role: userObj.role } : null,
      effectiveUser: userObj ? { id: userObj.id || userObj._id, role: userObj.role } : null,
      isImpersonated: Boolean(userObj?.isImpersonated),
      connection: conn,
      models,
    });

    req.tenantId = tenantId;
    req.dbName = dbName;
    req.enabledModules = enabledModules;
    req.tenantConn = conn;
    req.tenantModels = models;
    req.tenantContext = tenantContext;

    // Bind into AsyncLocalStorage context for transparent model resolution
    runWithTenantContext(tenantContext, () => {
      next();
    });
  } catch (err) {
    if (err.message && err.message.includes('Malformed dbName')) {
      return res.status(400).json({ error: 'Malformed tenant identifier or database name', details: err.message });
    }
    console.error('[tenantMiddleware] Failed to resolve tenant context:', err.message);
    return res.status(500).json({ error: 'Tenant context resolution failed', details: err.message });
  }
};
