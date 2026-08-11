import PropTypes from 'prop-types';
import { usePermissions } from '../hooks/usePermissions';

/**
 * PermissionGate — Declarative gate component.
 * Performs strictly conditional rendering:
 * Checks capabilities (`hasCapability`) if `capability` prop is provided,
 * or ABAC rules (`can`) if `action` & `resource` props are provided.
 *
 * Returns `children` if allowed, or `fallback` (default: null) if denied.
 */
export default function PermissionGate({ capability, action, resource, fallback = null, children }) {
  const { can, hasCapability, isSuperAdmin } = usePermissions();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  let allowed = false;
  if (capability) {
    allowed = hasCapability(capability);
  } else if (action && resource) {
    allowed = can(action, resource);
  } else if (resource) {
    allowed = can('read', resource);
  }

  if (!allowed) {
    return fallback;
  }

  return <>{children}</>;
}

PermissionGate.propTypes = {
  capability: PropTypes.string,
  action: PropTypes.string,
  resource: PropTypes.string,
  fallback: PropTypes.node,
  children: PropTypes.node,
};
