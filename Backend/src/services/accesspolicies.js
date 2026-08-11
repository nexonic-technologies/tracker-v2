// src/services/access_policies.js
//
// Service hook for the access_policies model.
// When policies are created, updated, or deleted, the in-memory cache is
// invalidated and all connected frontend clients are notified via Socket.io.

import { invalidatePermissions } from "../utils/permissionInvalidator.js";
import models from "../models/Collection.js";

const Role = models.roles;

export default function () {
  return {
    /**
     * After a new policy is created, invalidate cache for the affected role.
     */
    afterCreate: async (ctx) => {
      const { data } = ctx;
      const roleId = data?.role?.toString?.() || null;
      if (roleId) {
        try {
          await Role.findByIdAndUpdate(roleId, { $inc: { permissionVersion: 1 } });
        } catch (err) {
          console.warn("[access_policiesHook] Failed to increment role permissionVersion:", err.message);
        }
      }
      await invalidatePermissions(roleId);
    },

    /**
     * After a policy is updated, invalidate cache for the affected role.
     */
    afterUpdate: async (ctx) => {
      const { data, beforeDoc } = ctx;
      const roleId = data?.role?.toString?.() || beforeDoc?.role?.toString?.() || null;
      if (roleId) {
        try {
          await Role.findByIdAndUpdate(roleId, { $inc: { permissionVersion: 1 } });
        } catch (err) {
          console.warn("[access_policiesHook] Failed to increment role permissionVersion:", err.message);
        }
      }
      await invalidatePermissions(roleId);
    },

    /**
     * After a policy is deleted, invalidate all caches (can't reliably extract role
     * from the soft-deleted doc).
     */
    afterDelete: async (ctx) => {
      const { deletedDoc } = ctx;
      const roleId = deletedDoc?.role?.toString?.() || null;
      if (roleId) {
        try {
          await Role.findByIdAndUpdate(roleId, { $inc: { permissionVersion: 1 } });
        } catch (err) {
          console.warn("[access_policiesHook] Failed to increment role permissionVersion:", err.message);
        }
      }
      await invalidatePermissions(roleId);
    }
  };
}
