import { useTenant } from '../context/TenantContext';

/**
 * Custom React hook checking tenant module entitlements and subscription lifecycle status.
 * Provides: isModuleEnabled(moduleId), subscription, tenantId, tenantSlug.
 */
export function useModuleAccess() {
  const { tenantId, tenantSlug, enabledModules = ['*'], subscription } = useTenant();

  const isModuleEnabled = (moduleId) => {
    if (!moduleId || moduleId.toLowerCase() === 'core') return true;
    if (!enabledModules || enabledModules.includes('*')) return true;
    return enabledModules.map((m) => m.toLowerCase()).includes(moduleId.toLowerCase());
  };

  const subscriptionStatus = (subscription?.status || 'ACTIVE').toUpperCase();

  return {
    isModuleEnabled,
    subscriptionStatus,
    subscription,
    tenantId,
    tenantSlug
  };
}

export default useModuleAccess;
