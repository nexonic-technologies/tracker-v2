import { getTenantStore } from '../tenant/tenantContext.js';
import models from '../models/Collection.js';

/**
 * Resolves effective UI capabilities for a user
 * 
 * Resolution Algorithm (UI-only):
 * 1. Start with empty capability set
 * 2. Apply designation grants (if user has designation)
 * 3. Apply role grants (from user's role)
 * 4. Apply designation+role grants (if both exist)
 * 5. Apply user overrides (always wins)
 * 6. Return effective capability set
 * 
 * @param {Object} user - User object with designation, role
 * @returns {Set<string>} Set of allowed capability keys
 */
export async function resolveUserCapabilities(user) {
  if (!user) {
    return new Set();
  }

  const capabilities = new Set();
  const deniedCapabilities = new Set();

  const tenantContext = getTenantStore();
  const RoleModel = tenantContext?.getModel ? tenantContext.getModel('roles') : models.roles;
  const UserOverrideModel = tenantContext?.getModel ? (tenantContext.getModel('user_overrides') || tenantContext.getModel('useroverrides')) : (models.user_overrides || models.useroverrides);

  // Extract user identifiers
  const userId = user._id || user.id;
  const roleId = user.professionalInfo?.role || user.role;

  // Check if Super Admin - Super Admin receives all capabilities unrestricted
  if (roleId) {
    const { getRoleMeta } = await import('../utils/cache.js');
    const roleMeta = getRoleMeta(roleId.toString());
    if (roleMeta?.isSuperAdmin) {
      const allKeys = await getActiveCapabilityKeys();
      return new Set(allKeys);
    }
  }

  if (user?.isSuperAdmin || user?.role?.isSuperAdmin) {
    const allKeys = await getActiveCapabilityKeys();
    return new Set(allKeys);
  }

  // Step 1: Apply role capabilities directly from the Role document
  if (roleId && RoleModel && typeof RoleModel.findById === 'function') {
    try {
      const roleDoc = await RoleModel.findById(roleId).populate('capabilities').lean();
      if (roleDoc && Array.isArray(roleDoc.capabilities)) {
        for (const cap of roleDoc.capabilities) {
          if (cap && cap.status === 'active' && cap.key) {
            capabilities.add(cap.key);
          }
        }
      }
    } catch (_) {}
  }

  // Step 2: Apply user overrides (always wins)
  if (UserOverrideModel && typeof UserOverrideModel.findOne === 'function') {
    try {
      const userOverride = await UserOverrideModel.findOne({ userId }).lean();
      if (userOverride?.overrides) {
        for (const override of userOverride.overrides) {
          if (override.effect === 'allow') {
            capabilities.add(override.capabilityKey);
            deniedCapabilities.delete(override.capabilityKey);
          } else {
            capabilities.delete(override.capabilityKey);
            deniedCapabilities.add(override.capabilityKey);
          }
        }
      }
    } catch (_) {}
  }

  // Remove denied capabilities from allowed set
  for (const denied of deniedCapabilities) {
    capabilities.delete(denied);
  }

  return capabilities;
}

/**
 * Get all active capability keys for efficient querying
 * @returns {Promise<string[]>}
 */
async function getActiveCapabilityKeys() {
  const tenantContext = getTenantStore();
  const CapabilityModel = tenantContext?.getModel ? tenantContext.getModel('capabilities') : models.capabilities;
  if (!CapabilityModel || typeof CapabilityModel.distinct !== 'function') return [];
  const keys = await CapabilityModel.distinct('key', { status: 'active' });
  return keys;
}

/**
 * Check if a user has a specific UI capability
 * @param {Object} user - User object
 * @param {string} capabilityKey - Capability key to check
 * @returns {Promise<boolean>}
 */
export async function hasCapability(user, capabilityKey) {
  const capabilities = await resolveUserCapabilities(user);
  return capabilities.has(capabilityKey);
}

/**
 * Get all capabilities with metadata for a user
 * @param {Object} user - User object
 * @returns {Promise<Array>} Array of capability objects with metadata
 */
export async function getUserCapabilitiesWithMetadata(user) {
  const capabilityKeys = await resolveUserCapabilities(user);

  if (capabilityKeys.size === 0) {
    return [];
  }

  const capabilities = await Capability.find({
    key: { $in: Array.from(capabilityKeys) },
    status: 'active'
  }).lean();

  return capabilities;
}

/**
 * Increment permission version for a user (cache invalidation)
 * @param {string} userId - User ID
 */
export async function incrementPermissionVersion(userId) {
  const PermissionVersion = (await import('../models/PermissionVersion.js')).default;

  await PermissionVersion.findOneAndUpdate(
    { userId },
    {
      $inc: { version: 1 },
      $set: { updatedAt: new Date() }
    },
    { upsert: true }
  );
}

/**
 * Log permission change to audit trail
 * @param {Object} params - Audit parameters
 */
export async function logPermissionChange({ actor, targetUser, change, reason, metadata = {} }) {
  const permission_audit = (await import('../models/permission_audit.js')).default;

  await permission_audit.create({
    actor,
    targetUser,
    change,
    reason,
    metadata
  });
}

export default {
  resolveUserCapabilities,
  hasCapability,
  getUserCapabilitiesWithMetadata,
  incrementPermissionVersion,
  logPermissionChange
};
