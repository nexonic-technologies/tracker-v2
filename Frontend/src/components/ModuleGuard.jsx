import PropTypes from 'prop-types';
import { useModuleAccess } from '../hooks/useModuleAccess';

/**
 * ModuleGuard — Declarative module licensing guard component.
 * Performs conditional rendering:
 * Renders `children` if target `module` is subscribed and tenant subscription is ACTIVE/PAST_DUE.
 * Returns `fallback` (or default upgrade banner) if unsubscribed or suspended.
 */
export default function ModuleGuard({ module, fallback = null, children }) {
  const { isModuleEnabled, subscriptionStatus } = useModuleAccess();

  const enabled = isModuleEnabled(module);
  const isSuspended = subscriptionStatus === 'SUSPENDED';

  if (!enabled || isSuspended) {
    if (fallback !== null) {
      return fallback;
    }

    return (
      <div className="p-6 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 text-amber-900 dark:text-amber-200">
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-base font-semibold">
            {isSuspended ? 'Subscription Suspended' : 'Module License Required'}
          </h3>
        </div>
        <p className="mt-2 text-sm">
          {isSuspended
            ? 'Your tenant subscription is currently suspended. Please contact Super Admin or update your billing information to reactivate access.'
            : `Access to the '${module}' module is not included in your current tenant subscription plan. Contact support or your administrator to upgrade.`}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

ModuleGuard.propTypes = {
  module: PropTypes.string.isRequired,
  fallback: PropTypes.node,
  children: PropTypes.node,
};
