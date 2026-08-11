/**
 * Dashboard Engine — Widget Shell (§3.2 State Matrix)
 *
 * The SINGLE wrapper every widget gets rendered inside. Widgets never
 * manage their own loading/empty/error/stale states — WidgetShell does.
 *
 * Responsibilities:
 *  - State matrix (loading → skeleton, empty → direction, error → recovery, stale → badge)
 *  - Permission gate (hidden → null, read-only → non-interactive)
 *  - Widget chrome (title bar, actions dropdown, focus ring)
 *  - Consistent radius, shadow, padding from tokens (§3.1)
 */
import React from 'react';
import { DATA_STATUS, PERMISSION_LEVEL } from '../registry/widgetManifest';
import WidgetSkeleton from './WidgetSkeleton';
import WidgetEmpty from './WidgetEmpty';
import WidgetError from './WidgetError';
import WidgetHeader from './WidgetHeader';

/**
 * @param {Object} props
 * @param {Object} props.descriptor - Universal Widget Contract (§2.3)
 * @param {React.ReactNode} props.children - the actual widget content
 * @param {Function} [props.onRetry] - callback for error retry
 * @param {string} [props.permission] - computed permission level
 * @param {string} [props.className] - additional classes
 */
export default function WidgetShell({
  descriptor,
  children,
  onRetry,
  permission = PERMISSION_LEVEL.VISIBLE,
  className = '',
}) {
  const { data, config, title, type, actions } = descriptor;
  const status = data?.status || DATA_STATUS.READY;

  // §2.9 — Hidden widgets are simply absent
  if (permission === PERMISSION_LEVEL.HIDDEN) {
    return null;
  }

  // State matrix (§3.2) — WidgetShell decides which visual state to show
  if (status === DATA_STATUS.LOADING) {
    return (
      <div
        className={`dsh-widget dsh-widget--loading ${className}`}
        role="status"
        aria-label={`Loading ${title || type}`}
      >
        <WidgetSkeleton type={type} config={config} />
      </div>
    );
  }

  if (status === DATA_STATUS.ERROR) {
    return (
      <div className={`dsh-widget dsh-widget--error ${className}`}>
        <WidgetHeader title={title} />
        <WidgetError
          message={data?.error || 'Something went wrong'}
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (status === DATA_STATUS.EMPTY) {
    return (
      <div className={`dsh-widget dsh-widget--empty ${className}`}>
        <WidgetHeader title={title} />
        <WidgetEmpty
          message={config?.emptyMessage || 'No data in this range'}
          suggestion={config?.emptySuggestion}
        />
      </div>
    );
  }

  // §3.2 — Read-only widgets look visibly non-interactive
  const isReadOnly = permission === PERMISSION_LEVEL.READ_ONLY;

  return (
    <div
      className={`dsh-widget ${status === DATA_STATUS.STALE ? 'dsh-widget--stale' : ''} ${isReadOnly ? 'dsh-widget--readonly' : ''} ${className}`}
      tabIndex={0}
      role="region"
      aria-label={title || type}
    >
      <WidgetHeader
        title={title}
        actions={isReadOnly ? [] : actions}
        isStale={status === DATA_STATUS.STALE}
        staleLabel={data?.staleLabel}
      />
      <div className="dsh-widget__body">
        {children}
      </div>
    </div>
  );
}
