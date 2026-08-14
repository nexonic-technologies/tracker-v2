import { invalidateAllCache } from "../utils/cbacCacheService.js";
import { clearNavigationCache } from "../utils/contextBuilder.js";
import { invalidatePermissions } from "../utils/permissionInvalidator.js";
import models from "../models/Collection.js";

const Role = models.roles;

export default function () {
  return {
    beforeCreate: async (ctx) => {
      const { body, user } = ctx;
      if (body && body.isSuperAdmin === true) {
        const isSuperAdmin = user?.isSuperAdmin === true;
        if (!isSuperAdmin) {
          throw new Error("Privilege escalation protection: Only Super Admins can create a role with isSuperAdmin=true");
        }
      }
    },
    beforeUpdate: async (ctx) => {
      const { body, user } = ctx;
      if (body && body.isSuperAdmin === true) {
        const isSuperAdmin = user?.isSuperAdmin === true;
        if (!isSuperAdmin) {
          throw new Error("Privilege escalation protection: Only Super Admins can update a role with isSuperAdmin=true");
        }
      }
    }
  };
}
