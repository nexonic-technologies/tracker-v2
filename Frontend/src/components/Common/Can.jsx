// src/components/Common/Can.jsx
//
// Declarative permission guard component.
// Renders children only if the current user has the required permission.
// Uses the central PermissionProvider — NO separate API calls.
//
// Usage:
//   <Can action="create" resource="tickets">
//     <AddTicketButton />
//   </Can>
//
//   <Can action="update" resource="leaves" fallback={<DisabledButton />}>
//     <ApproveButton />
//   </Can>
//
//   <Can action="read" resource="employees">
//     <ExportButton />   {/* Export follows read permission */}
//   </Can>

import { usePermission } from "../../context/permissionProvider";

/**
 * @param {Object} props
 * @param {string} props.action       - Single action to check: "read", "create", "update", "delete"
 * @param {string} props.resource     - Model/resource name: "tickets", "employees", "leaves", etc.
 * @param {React.ReactNode} [props.fallback] - Optional UI to render if unauthorized (default: null)
 * @param {React.ReactNode} props.children   - UI to render if authorized
 */
const Can = ({ action, resource, fallback = null, children }) => {
  const { can, loading } = usePermission();

  // Don't flash content while loading permissions
  if (loading) return null;

  if (!action || !resource) {
    console.warn("[Can] Missing action or resource prop");
    return fallback;
  }

  return can(action, resource) ? <>{children}</> : fallback;
};

export default Can;
