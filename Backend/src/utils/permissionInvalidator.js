// src/utils/permissionInvalidator.js
//
// Invalidates the in-memory permission cache and notifies connected clients
// via Socket.io when access_policies or Roles change.
//
// Call invalidatePermissions() from service hooks (afterUpdate, afterCreate, afterDelete)
// on access_policies and Roles.

import { setCache, getCacheVersion } from "./cache.js";

let invalidationTimer = null;
let pendingRoleIds = new Set();

/**
  * Refresh the backend cache and broadcast invalidation to all connected frontend clients.
  * Rapid calls within a 50ms window are coalesced into a single invalidation pass.
  *
  * @param {string|null} roleId - If provided, the role whose permissions changed.
  *                                If null, all roles are invalidated.
  */
export async function invalidatePermissions(roleId = null) {
  if (roleId) {
    pendingRoleIds.add(roleId.toString());
  } else {
    pendingRoleIds.add("all");
  }

  if (invalidationTimer) {
    return; // Coalesce rapid invalidations into the active window
  }

  invalidationTimer = setTimeout(async () => {
    invalidationTimer = null;
    const rolesToInvalidate = Array.from(pendingRoleIds);
    pendingRoleIds.clear();

    // 1. Refresh in-memory cache (re-reads access_policies + Roles from DB once)
    await setCache();

    try {
      const { clearNavigationCache } = await import("./contextBuilder.js");
      if (rolesToInvalidate.includes("all")) {
        clearNavigationCache(null);
      } else {
        rolesToInvalidate.forEach((rId) => clearNavigationCache(rId));
      }
    } catch (_) { }

    const version = getCacheVersion();

    // 2. Broadcast to connected clients via Socket.io
    try {
      const { io } = await import("../index.js");

      if (io) {
        const payload = {
          event: "permissions:invalidated",
          version,
          roles: rolesToInvalidate,
          timestamp: new Date().toISOString()
        };

        io.emit("permissions:invalidated", payload);
      }
    } catch (err) {
      console.warn("[PermissionInvalidator] Socket broadcast failed:", err.message);
    }

    console.log(
      `[PermissionInvalidator] Coalesced cache v${version} refreshed — roles: ${rolesToInvalidate.join(", ")}`
    );
  }, 50); // 50ms coalescing window
}

/**
 * Generic Pipeline Invalidation Processor
 * Automatically called by populateHelper.js on any mutation.
 * Detects if the mutated model or document affects permissions, roles, sidebars, or capabilities,
 * increments permissionVersion on the target Role(s), and triggers coalesced cache invalidation.
 *
 * @param {Object} params
 * @param {string} params.modelName
 * @param {string} params.action - 'create', 'update', 'delete', etc.
 * @param {Object} [params.data] - Resulting or created document
 * @param {Object} [params.beforeDoc] - Pre-mutation document (if update)
 * @param {Object} [params.deletedDoc] - Deleted document (if delete)
 * @param {Object} [params.tenantContext] - Tenant connection & models
 */
export async function processGenericVersionInvalidation({
  modelName,
  action,
  data,
  beforeDoc,
  deletedDoc,
  tenantContext
}) {
  if (!modelName) return;
  const normalizedModel = modelName.toLowerCase();

  // List of security/permission/navigation models that govern authorization & capabilities
  const SECURITY_MODELS = new Set([
    'roles', 'role',
    'access_policies', 'access_policy', 'accesspolicies',
    'grants', 'grant',
    'capabilities', 'capability',
    'sidebars', 'sidebar',
    'user_overrides', 'user_override'
  ]);

  const doc = data || beforeDoc || deletedDoc;
  const hasVersionField = doc && (doc.permissionVersion !== undefined || doc.version !== undefined);

  if (!SECURITY_MODELS.has(normalizedModel) && !hasVersionField) {
    return; // Fast bypass for standard business models
  }

  // Resolve target Role ID(s)
  let targetRoleId = null;
  if (normalizedModel === 'roles' || normalizedModel === 'role') {
    targetRoleId = doc?._id || doc?.id || null;
  } else if (doc?.role) {
    targetRoleId = typeof doc.role === 'object' ? doc.role._id || doc.role.id : doc.role;
  } else if (doc?.roleId) {
    targetRoleId = typeof doc.roleId === 'object' ? doc.roleId._id || doc.roleId.id : doc.roleId;
  }

  // Increment permissionVersion on Role if targetRoleId is identified
  if (targetRoleId && tenantContext?.getModel) {
    try {
      const RoleModel = tenantContext.getModel('roles');
      if (RoleModel) {
        await RoleModel.findByIdAndUpdate(targetRoleId, { $inc: { permissionVersion: 1 } });
      }
    } catch (err) {
      console.warn('[processGenericVersionInvalidation] Failed to increment Role permissionVersion:', err.message);
    }
  }

  // Invalidate CBAC cache if available
  try {
    const { invalidateAllCache } = await import('./cbacCacheService.js');
    await invalidateAllCache();
  } catch (_) {}

  // Trigger coalesced invalidation pass
  await invalidatePermissions(targetRoleId ? targetRoleId.toString() : null);
}

