/**
 * Dashboard Engine — Widget Empty State (§3.2)
 *
 * An empty state is direction, not decoration:
 *  - Says plainly WHY there's nothing
 *  - Optionally suggests what to do about it
 *  - Uses the interface's voice, not a person's
 */
import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * @param {Object} props
 * @param {string} props.message - explains why there's nothing
 * @param {string} [props.suggestion] - what to do about it
 */
export default function WidgetEmpty({ message, suggestion }) {
  return (
    <div className="dsh-widget__empty py-6 px-4">
      <div className="dsh-widget__empty-icon transition-transform duration-300 hover:scale-105">
        <Inbox size={22} strokeWidth={1.75} className="text-slate-400 dark:text-slate-500" />
      </div>
      <p className="dsh-widget__empty-message leading-snug">{message}</p>
      {suggestion && (
        <p className="dsh-widget__empty-suggestion leading-normal mt-0.5">{suggestion}</p>
      )}
    </div>
  );
}
