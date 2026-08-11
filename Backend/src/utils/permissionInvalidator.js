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
