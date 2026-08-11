import { useContext } from 'react';
import { PermissionContext } from '../context/permissionProvider';

/**
 * Custom React hook for consuming central ABAC permissions context.
 * Provides: can(action, resource), canAny(), canAll(), hasCapability(), permissions, navigation, isSuperAdmin, loading.
 */
export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

export default usePermissions;
