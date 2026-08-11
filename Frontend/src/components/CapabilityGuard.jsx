// frontend/src/components/CapabilityGuard.jsx
// Component to conditionally render children based on CBAC capabilities
// Used for button visibility, feature access, and conditional rendering

import React from 'react';
import { useCapability } from '../hooks/useCapability';

/**
 * Capability Guard Component
 * Conditionally renders children based on user's CBAC capabilities
 * 
 * @param {Object} props
 * @param {string|Array<string>} props.capability - Required capability or array of capabilities
 * @param {string} props.mode - 'any' or 'all' (default: 'any')
 * @param {React.ReactNode} props.children - Children to render if capability check passes
 * @param {React.ReactNode} props.fallback - Fallback to render if capability check fails
 * @param {boolean} props.requireAll - Alias for mode='all' (deprecated, use mode instead)
 */
export function CapabilityGuard({ 
  capability, 
  mode = 'any', 
  children, 
  fallback = null,
  requireAll = false 
}) {
  const { hasCapability, hasAnyCapability, hasAllCapabilities } = useCapability();

  let hasAccess = false;

  if (typeof capability === 'string') {
    // Single capability
    hasAccess = hasCapability(capability);
  } else if (Array.isArray(capability)) {
    // Multiple capabilities
    const checkMode = requireAll ? 'all' : mode;
    if (checkMode === 'all') {
      hasAccess = hasAllCapabilities(capability);
    } else {
      hasAccess = hasAnyCapability(capability);
    }
  }

  return hasAccess ? children : fallback;
}

/**
 * HOC to wrap components with capability check
 * 
 * @param {string|Array<string>} capability - Required capability
 * @param {string} mode - 'any' or 'all'
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component
 */
export function withCapability(capability, mode = 'any') {
  return function WrappedComponent(props) {
    return (
      <CapabilityGuard capability={capability} mode={mode}>
        <Component {...props} />
      </CapabilityGuard>
    );
  };
}

export default CapabilityGuard;
