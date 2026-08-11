import models from "../models/Collection.js";
import mongoose from "mongoose";

import { getTenantStore } from "../tenant/tenantContext.js";

const access_policies = models.access_policies;
const Role = models.roles;
const Resource = models.resources;

const cache = new Map();
const roleLevelCache = new Map(); // roleId -> level (1-10)
const roleMetaCache = new Map(); // roleId -> { name, isSuperAdmin, level }
const resourceKeyMap = new Map(); // businessKey -> modelName
let cacheInitialized = false;
let cacheVersion = 0;

export async function setCache() {
    try {
        const tenantStore = getTenantStore();
        const tenantId = tenantStore?.tenantId || 'global';

        // Wait for database connection
        if (mongoose.connection.readyState !== 1 && !tenantStore?.connection) {
            await new Promise((resolve) => {
                if (mongoose.connection.readyState === 1) {
                    resolve();
                } else {
                    mongoose.connection.once('connected', resolve);
                }
            });
        }

        const [policies, roles, resources] = await Promise.all([
            access_policies.find({}).lean(),
            Role.find({ isActive: true }).populate('capabilities').lean(),
            Resource.find({ isActive: true }).lean(),
        ]);

        policies.forEach((p) => {
            const role = p.role.toString();
            const scopedKey = `${tenantId}:${role}`;
            if (!cache.has(scopedKey)) cache.set(scopedKey, {});
            if (!cache.has(role)) cache.set(role, {});

            // Construct virtual permissions object from actions array to preserve backward compatibility
            const permissionsObj = {};
            if (Array.isArray(p.actions)) {
                p.actions.forEach((act) => {
                    permissionsObj[act] = true;
                });
            }

            // Default standard CRUD actions to false if not explicitly granted in the array
            ["read", "create", "update", "delete"].forEach((act) => {
                if (permissionsObj[act] === undefined) {
                    permissionsObj[act] = false;
                }
            });

            const policyItem = {
                ...p,
                permissions: permissionsObj
            };

            cache.get(scopedKey)[p.modelName] = policyItem;
            cache.get(role)[p.modelName] = policyItem;
        });

        resourceKeyMap.clear();
        resources.forEach((r) => {
            if (r.key && r.modelName) {
                resourceKeyMap.set(r.key.toLowerCase(), r.modelName);
            }
        });

        roleLevelCache.clear();
        roleMetaCache.clear();
        roles.forEach((r) => {
            const id = r._id.toString();
            const capKeys = (r.capabilities || [])
                .filter(cap => cap && cap.key && cap.status === 'active')
                .map(cap => cap.key);
            const meta = {
                id,
                _id: r._id,
                name: r.name,
                isSuperAdmin: !!r.isSuperAdmin,
                level: r.level || 1,
                capabilities: capKeys,
                permissionVersion: r.permissionVersion || 1
            };
            roleLevelCache.set(id, r.level || 1);
            roleMetaCache.set(id, meta);

            if (r.name) {
                roleLevelCache.set(r.name, r.level || 1);
                roleLevelCache.set(r.name.toLowerCase(), r.level || 1);
                roleMetaCache.set(r.name, meta);
                roleMetaCache.set(r.name.toLowerCase(), meta);
            }
        });

        cacheVersion++;
        cacheInitialized = true;
    }
    catch (error) {
        console.error('Cache initialization error:', error.stack || error.message);
    }
}

export function getPolicy(role, modelName) {
    try {
        if (!cacheInitialized) return null;
        let roleStr = role ? role.toString().trim() : "";
        if (!roleStr) return null;
        if (roleStr === 'agent') {
            roleStr = '6a25cbc1cd36294f5e578696';
        }
        let roleCache = cache.get(roleStr) || cache.get(roleStr.toLowerCase());
        if (!roleCache && cache) {
            // Check if roleStr is a role name (e.g., "Admin")
            const meta = getRoleMeta(roleStr);
            if (meta && meta.id) {
                roleCache = cache.get(meta.id);
            }
        }
        if (!roleCache) return null;
        if (!modelName) return roleCache;
        const targetModel = modelName.toString().trim();
        return roleCache[targetModel] || roleCache[targetModel.toLowerCase()] || null;
    } catch { return null; }
}

/**
 * Get the level (1-10) for a role.
 * Used by dashboard to determine layout variant without hardcoding role names.
 * @param {string} roleId - role ObjectId as string or role name
 * @returns {number} level 1-10, defaults to 1
 */
export function getRoleLevel(roleId) {
    if (!cacheInitialized || !roleId) return 1;
    const str = roleId.toString().trim();
    return roleLevelCache.get(str) || roleLevelCache.get(str.toLowerCase()) || 1;
}

/**
 * Get cached role metadata (name, isSuperAdmin, level, capabilities).
 * Used by contextBuilder to avoid an extra DB query.
 * @param {string} roleId - role ObjectId as string or role name
 * @returns {object|null} { name, isSuperAdmin, level, capabilities }
 */
export function getRoleMeta(roleId) {
    if (!cacheInitialized || !roleId) return null;
    const str = roleId.toString().trim();
    let meta = roleMetaCache.get(str) || roleMetaCache.get(str.toLowerCase());
    if (!meta) {
        // Fallback: linear search by name (trimmed and lowercased)
        const target = str.toLowerCase();
        for (const [, v] of roleMetaCache.entries()) {
            if (v.name && v.name.trim().toLowerCase() === target) {
                return v;
            }
        }
    }
    return meta || null;
}

/**
 * Get current cache version counter.
 * Incremented on every setCache() call.
 * Used by contextBuilder for cache busting on the frontend.
 * @returns {number}
 */
export function getCacheVersion() {
    return cacheVersion;
}

/**
 * Check if cache is ready.
 * @returns {boolean}
 */
export function isCacheReady() {
    return cacheInitialized;
}

/**
 * Translate a business resource key (e.g. "leave") to its Mongoose modelName (e.g. "leaves").
 * If no mapping exists, returns the original key as a fallback.
 * @param {string} resourceKey
 * @returns {string} Mongoose modelName
 */
export function getModelName(resourceKey) {
    if (!cacheInitialized || !resourceKey) return resourceKey;
    return resourceKeyMap.get(resourceKey.toLowerCase()) || resourceKey;
}

export default cache;

