// frontend/src/hooks/useCapability.js
// React hook for checking CBAC capabilities in the frontend
// Used for route protection, button visibility, and feature access

import { usePermission } from '../context/permissionProvider';

/**
 * Hook to check if user has a specific CBAC capability
 * 
 * @returns {Object} Capability checking functions
 */
export function useCapability() {
  const { uiCapabilities, isSuperAdmin, canRenderMenu } = usePermission();

  /**
   * Check if user has a specific capability
   * @param {string} capabilityKey - Capability key (e.g., "Ticket:view")
   * @returns {boolean} Whether user has the capability
   */
  const hasCapability = (capabilityKey) => {
    if (isSuperAdmin) return true;
    if (!uiCapabilities || !Array.isArray(uiCapabilities)) {
      return false;
    }
    return uiCapabilities.includes(capabilityKey);
  };

  /**
   * Check if user has any of the specified capabilities
   * @param {Array<string>} capabilityKeys - Array of capability keys
   * @returns {boolean} Whether user has any of the capabilities
   */
  const hasAnyCapability = (capabilityKeys) => {
    if (isSuperAdmin) return true;
    if (!uiCapabilities || !Array.isArray(uiCapabilities)) {
      return false;
    }
    return capabilityKeys.some(key => uiCapabilities.includes(key));
  };

  /**
   * Check if user has all of the specified capabilities
   * @param {Array<string>} capabilityKeys - Array of capability keys
   * @returns {boolean} Whether user has all of the capabilities
   */
  const hasAllCapabilities = (capabilityKeys) => {
    if (isSuperAdmin) return true;
    if (!uiCapabilities || !Array.isArray(uiCapabilities)) {
      return false;
    }
    return capabilityKeys.every(key => uiCapabilities.includes(key));
  };

  /**
   * Get all capabilities matching a pattern
   * @param {string} pattern - Pattern to match (e.g., "Ticket:*")
   * @returns {Array<string>} Matching capabilities
   */
  const getCapabilitiesByPattern = (pattern) => {
    if (!uiCapabilities || !Array.isArray(uiCapabilities)) {
      return [];
    }
    const regex = new RegExp(pattern.replace('*', '.*'));
    return uiCapabilities.filter(key => regex.test(key));
  };

  return {
    hasCapability,
    hasAnyCapability,
    hasAllCapabilities,
    getCapabilitiesByPattern,
    canRenderMenu,
    uiCapabilities
  };
}

export default useCapability;
