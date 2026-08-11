/**
 * Dashboard Engine — Widget Error State (§3.2)
 *
 * Explains what happened and how to recover.
 * Never a raw stack trace or a generic "Something went wrong."
 */
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * @param {Object} props
 * @param {string} props.message - human-readable error description
 * @param {Function} [props.onRetry] - retry callback
 */
export default function WidgetError({ message, onRetry }) {
  return (
    <div className="dsh-widget__error">
      <div className="dsh-widget__error-icon">
        <AlertTriangle size={20} strokeWidth={1.5} />
      </div>
      <p className="dsh-widget__error-message">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="dsh-widget__error-retry"
          type="button"
        >
          <RefreshCw size={13} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
