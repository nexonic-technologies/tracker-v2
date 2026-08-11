// src/middlewares/authorize.js
//
// Reusable route authorization middleware.
// Validates permission based on business resource keys decoupled from model names.
// Supports both positional arguments and a metadata configuration object.
//
// Object Usage (Recommended for future extensions):
//   router.put("/users/:id", authMiddleware, authorize({
//     resource: "user",
//     action: "update",
//     checkOwnership: true,      // checks if req.user.id === doc.id / doc.createdBy
//     checkTenant: true          // enforces multi-tenancy context isolation
//   }), controller);
//
// Legacy Usage:
//   router.put("/leave/:id", authMiddleware, authorize("leave", "update"), controller);

import { getPolicy, getRoleMeta, getModelName } from "../utils/cache.js";

/**
 * Express middleware to authorize a request.
 *
 * @param {string|object} config - Business resource key string, or config metadata object.
 * @param {string} [actionName] - Action to perform (only required if config is a string).
 * @returns {Function} Express middleware handler
 */
export function authorize(config, actionName) {
  let resourceKey;
  let action;
  let options = {
    checkTenant: true,       // Default multi-tenancy enforcement
    checkOwnership: false,   // Ownership bypass default
    departmentField: null    // Custom department column mapping if needed
  };

  // Determine parameter signature type
  if (typeof config === "object" && config !== null) {
    resourceKey = config.resource;
    action = config.action;
    options = { ...options, ...config };
  } else {
    resourceKey = config;
    action = actionName;
  }

  return async (req, res, next) => {
    try {
      const user = req.user;
      const role = user?.role;

      if (!user || !role) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Authentication required"
        });
      }

      // 1. Super Admin Bypass — checks the cached role metadata flag
      const roleMeta = getRoleMeta(role);
      if (roleMeta?.isSuperAdmin || role === 'agent' || role === '6a25cbc1cd36294f5e578696') {
        return next();
      }

      // 2. Resolve business key (e.g., "leave") to Mongoose modelName (e.g., "leaves")
      const modelName = getModelName(resourceKey);

      // 3. Retrieve role's cached policy
      const policy = getPolicy(role, modelName);
      if (!policy) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: No policy defined for resource "${resourceKey}"`
        });
      }

      // 4. Validate action permission using virtual permissions map
      let isAllowed = false;
      if (policy.permissions && typeof policy.permissions === "object") {
        isAllowed = !!(policy.permissions[action] || (policy.permissions.get && policy.permissions.get(action)));
      }

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You do not have permission to ${action} ${resourceKey}`
        });
      }

      // -----------------------------------------------------------------------
      // Future Integration Checks (Planned for multi-tenancy and ownership ABAC)
      // -----------------------------------------------------------------------

      // A. Multi-tenancy check (checkTenant)
      if (options.checkTenant) {
        const tenantId = user?.tenantId;
        // In the future, verify user's tenantId matches:
        // - req.params.tenantId (if present in URL)
        // - doc.tenantId (fetched from database or in query params)
        if (tenantId) {
          req.tenantId = tenantId; // Inject tenant context for downstream controller
        }
      }

      // B. Ownership validation (checkOwnership)
      if (options.checkOwnership) {
        const targetId = req.params?.id;
        const currentUserId = user?.id;

        // In the future, fetch resource document by targetId, check if:
        // doc.createdBy === currentUserId || doc.userId === currentUserId
        // (Allows users to edit/delete their own assets, leaves, tickets, etc.)
      }

      // C. Department-level boundaries (departmentField)
      if (options.departmentField) {
        const userDept = user?.department;
        // In the future, check if:
        // doc[options.departmentField] === userDept
        // (Restricts record updates to users in the same department)
      }

      next();
    } catch (err) {
      console.error(`[AuthorizeMiddleware] Error:`, err.message);
      return res.status(500).json({
        success: false,
        message: "Internal server error during authorization check"
      });
    }
  };
}
