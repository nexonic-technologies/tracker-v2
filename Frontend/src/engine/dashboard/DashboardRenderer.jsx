/**
 * Dashboard Engine — DashboardRenderer (§2.4)
 *
 * The ONLY component the dashboard page imports.
 * Takes a dashboard JSON schema → renders the complete dashboard.
 *
 * Render loop:
 *   foreach(widget) → WidgetFactory(widget.type) → Render(widget.config, widget.data)
 *
 * This component does NOT know about roles, permissions, or business logic.
 * It only knows: "Here's a schema. Render it."
 */
import React from 'react';
import DashboardGrid from './layout/DashboardGrid';
import WidgetFactory from './factory/WidgetFactory';
import { PERMISSION_LEVEL } from './registry/widgetManifest';

// Import all registered widgets (triggers self-registration)
import './widgets/index';

// Import engine styles
import './styles/dashboard-engine.css';

/**
 * @param {Object} props
 * @param {Object} props.schema - Dashboard JSON schema:
 *   { id, name, description, widgets: WidgetDescriptor[] }
 * @param {Function} [props.onLayoutChange] - called when layout changes (Phase 4)
 * @param {Function} [props.onAction] - called when a widget action is triggered
 * @param {Object} [props.permissions] - widget-level permissions map: { widgetId: 'visible'|'hidden'|'read-only' }
 */
export default function DashboardRenderer({
  schema,
  onLayoutChange,
  onAction,
  permissions = {},
}) {
  if (!schema || !schema.widgets || schema.widgets.length === 0) {
    return (
      <div className="dsh-empty-dashboard">
        <div className="dsh-widget__empty">
          <div className="dsh-widget__empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <p className="dsh-widget__empty-message">
            No widgets configured for this dashboard
          </p>
          <p className="dsh-widget__empty-suggestion">
            An administrator can set up widgets in Settings → Dashboard Builder
          </p>
        </div>
      </div>
    );
  }

  // Filter out hidden widgets based on permissions
  const visibleWidgets = schema.widgets.filter((widget) => {
    const perm = permissions[widget.id] || PERMISSION_LEVEL.VISIBLE;
    return perm !== PERMISSION_LEVEL.HIDDEN;
  });

  return (
    <div className="dsh-renderer" data-dashboard-id={schema.id}>
      <DashboardGrid widgets={visibleWidgets}>
        {visibleWidgets.map((widget) => (
          <WidgetFactory
            key={widget.id}
            descriptor={widget}
            permission={permissions[widget.id] || PERMISSION_LEVEL.VISIBLE}
            onAction={(action) => onAction?.(widget.id, action)}
          />
        ))}
      </DashboardGrid>
    </div>
  );
}
