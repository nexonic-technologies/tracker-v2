/**
 * Dashboard Engine — Widget Header
 *
 * Consistent title bar across all widget types.
 * Shows title, optional action buttons, and stale data indicator.
 * §3.3 — Use structural devices only when they encode real information.
 */
import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Clock } from 'lucide-react';

/**
 * @param {Object} props
 * @param {string} [props.title] - widget title
 * @param {Array<{label: string, icon?: string, action: string}>} [props.actions]
 * @param {boolean} [props.isStale] - true if data is older than refresh interval
 * @param {string} [props.staleLabel] - e.g. "Updated 5m ago"
 * @param {Function} [props.onAction] - action callback
 */
export default function WidgetHeader({
  title,
  actions = [],
  isStale = false,
  staleLabel,
  onAction,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // No header if no title and no actions
  if (!title && actions.length === 0) return null;

  return (
    <div className="dsh-widget__header">
      <div className="dsh-widget__header-left">
        {title && (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-solid,#6366f1)] flex-shrink-0" />
            <h3 className="dsh-widget__title">{title}</h3>
          </div>
        )}
        {isStale && (
          <span className="dsh-widget__stale-badge" title={staleLabel || 'Data may be outdated'}>
            <Clock size={11} />
            <span>{staleLabel || 'Stale'}</span>
          </span>
        )}
      </div>

      {actions.length > 0 && (
        <div className="dsh-widget__header-actions" ref={menuRef}>
          <button
            className="dsh-widget__action-trigger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Widget actions"
            aria-expanded={menuOpen}
            type="button"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="dsh-widget__action-menu" role="menu">
              {actions.map((action, i) => (
                <button
                  key={action.action || i}
                  className="dsh-widget__action-item"
                  role="menuitem"
                  onClick={() => {
                    onAction?.(action.action);
                    setMenuOpen(false);
                  }}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
