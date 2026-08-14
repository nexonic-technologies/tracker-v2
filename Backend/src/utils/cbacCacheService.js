// services/cbacCacheService.js
// Cache service for UI capabilities
// This does NOT replace access_policies - it only caches UI visibility decisions

import models from '../models/Collection.js';
import { resolveUserCapabilities } from './cbacResolutionService.js';

const PermissionVersion = models.permissionversions;


// In-memory cache for UI capabilities
const uiCapabilityCache = new Map();
// Cache key format: "userId:version"
let cacheInitialized = false;
let globalCacheVersion = 0;

/**
 * Initialize the CBAC cache
 */
export async function initializeCBACCache() {
  try {
    uiCapabilityCache.clear();
    cacheInitialized = true;
    globalCacheVersion++;
    console.log('✅ CBAC UI capability cache initialized');
  } catch (error) {
    console.error('❌ Failed to initialize CBAC cache:', error.message);
  }
}

/**
 * Get cached UI capabilities for a user
 * @param {string} userId - User ID
 * @param {number} version - Permission version
 * @returns {Set<string>|null} Cached capabilities or null if cache miss
 */
export function getCachedCapabilities(userId, version) {
  if (!cacheInitialized) {
    return null;
  }

  const cacheKey = `${userId}:${version}`;
  const cached = uiCapabilityCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.capabilities;
  }

  return null;
}

/**
 * Cache UI capabilities for a user
 * @param {string} userId - User ID
 * @param {number} version - Permission version
 * @param {Set<string>} capabilities - Capabilities to cache
 * @param {number} ttl - Time to live in milliseconds (default 5 minutes)
 */
export function setCachedCapabilities(userId, version, capabilities, ttl = 300000) {
  if (!cacheInitialized) {
    return;
  }

  const cacheKey = `${userId}:${version}`;
  uiCapabilityCache.set(cacheKey, {
    capabilities,
    expiresAt: Date.now() + ttl,
    cachedAt: Date.now()
  });
}

/**
 * Invalidate cache for a specific user
 * @param {string} userId - User ID
 */
export async function invalidateUserCache(userId) {
  // Remove all cache entries for this user regardless of version
  for (const key of uiCapabilityCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      uiCapabilityCache.delete(key);
    }
  }

  // Increment permission version
  await PermissionVersion.findOneAndUpdate(
    { userId },
    {
      $inc: { version: 1 },
      $set: { updatedAt: new Date() }
    },
    { upsert: true }
  );

  globalCacheVersion++;
}

/**
 * Invalidate entire CBAC cache
 */
export async function invalidateAllCache() {
  uiCapabilityCache.clear();
  globalCacheVersion++;
  console.log('🔄 CBAC cache invalidated');
}

/**
 * Get UI capabilities with cache fallback
 * @param {Object} user - User object
 * @returns {Promise<Set<string>>} User's UI capabilities
 */
export async function getUserCapabilities(user) {
  if (!user) {
    return new Set();
  }

  const userId = user._id || user.id;
  const roleId = user.professionalInfo?.role?.toString() || user.role?.toString();

  let version = 1;
  if (roleId) {
    const { getRoleMeta } = await import('../utils/cache.js');
    const roleMeta = getRoleMeta(roleId);
    version = roleMeta?.permissionVersion || 1;
  } else {
    const permVersion = await PermissionVersion.findOne({ userId }).lean();
    version = permVersion?.version || 1;
  }

  // Try cache first
  const cached = getCachedCapabilities(userId, version);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - resolve capabilities
  const capabilities = await resolveUserCapabilities(user);

  // Cache the result
  setCachedCapabilities(userId, version, capabilities);

  return capabilities;
}

/**
 * Get global cache version
 * @returns {number}
 */
export function getCacheVersion() {
  return globalCacheVersion;
}

/**
 * Check if cache is initialized
 * @returns {boolean}
 */
export function isCacheReady() {
  return cacheInitialized;
}

/**
 * Clear expired cache entries
 */
export function clearExpiredEntries() {
  const now = Date.now();
  let cleared = 0;

  for (const [key, value] of uiCapabilityCache.entries()) {
    if (value.expiresAt < now) {
      uiCapabilityCache.delete(key);
      cleared++;
    }
  }

  if (cleared > 0) {
    console.log(`🧹 Cleared ${cleared} expired CBAC cache entries`);
  }
}

// Periodic cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(clearExpiredEntries, 300000);
}

export default {
  initializeCBACCache,
  getCachedCapabilities,
  setCachedCapabilities,
  invalidateUserCache,
  invalidateAllCache,
  getUserCapabilities,
  getCacheVersion,
  isCacheReady,
  clearExpiredEntries
};
