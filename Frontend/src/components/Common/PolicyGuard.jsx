import React from "react";
import { usePermission } from "@context/permissionProvider";

/**
 * Permission guard component — backward-compatible bridge.
 *
 * Delegates to the central PermissionProvider instead of making its own API calls.
 * Existing usages of <PolicyGuard model="tickets" action="update"> continue to work.
 *
 * NEW: Prefer using <Can action="update" resource="tickets"> for new code.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children    - The UI elements to render if authorized.
 * @param {string} [props.model]              - The model name (e.g., 'clients').
 * @param {'read'|'create'|'update'|'delete'} [props.action] - The action to check.
 * @param {string[]} [props.requiredRoles]    - (Legacy fallback) Array of allowed roles.
 * @param {React.ReactNode} [props.fallback]  - Optional UI to render if unauthorized.
 */
const PolicyGuard = ({ children, model, action, requiredRoles = [], fallback = null }) => {
  const { can, role, isSuperAdmin, loading } = usePermission();

  if (loading) {
    return null;
  }

  // Super admin bypass
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  let isAuthorized = false;

  // 1. Check via central permission context (model + action)
  if (model && action) {
    isAuthorized = can(action, model);
  }
  // 2. Legacy fallback: role name matching
  else if (requiredRoles && requiredRoles.length > 0) {
    const roleLower = (role?.name || "").toLowerCase();
    isAuthorized = requiredRoles.includes(roleLower);
  }

  if (!isAuthorized) {
    return fallback;
  }

  return <>{children}</>;
};

export default PolicyGuard;
