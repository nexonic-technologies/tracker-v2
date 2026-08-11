/**
 * Dashboard Engine — Widget Factory (§2.1, §2.3)
 *
 * Takes a widget descriptor (universal contract) → resolves component from
 * registry → wraps in WidgetShell. This is the ONLY place widgets get
 * instantiated. No widget is ever rendered directly.
 *
 * Flow: descriptor.type → WidgetRegistry.getWidget(type) → WidgetShell(Component)
 */
import React from 'react';
import { getWidget } from '../registry/widgetRegistry';
import WidgetShell from '../core/WidgetShell';
import { DATA_STATUS, PERMISSION_LEVEL } from '../registry/widgetManifest';

/**
 * Unknown widget fallback — shows when a widget type isn't registered.
 * This happens during development or when a dashboard references a
 * widget that hasn't been installed yet.
 */
function UnknownWidget({ descriptor }) {
  return (
    <div className="dsh-widget__unknown">
      <p className="text-[var(--tracker-ink-subtle)] text-xs font-medium">
        Widget type <code className="text-[var(--dsh-warning)] font-mono">"{descriptor.type}"</code> is not registered.
      </p>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.descriptor - Universal Widget Contract (§2.3):
 *   { id, type, title, layout, config, data, actions }
 * @param {Function} [props.onRetry] - retry callback passed to WidgetShell
 * @param {Function} [props.onAction] - action callback
 * @param {string} [props.permission] - computed permission level
 */
export default function WidgetFactory({
  descriptor,
  onRetry,
  onAction,
  permission = PERMISSION_LEVEL.VISIBLE,
}) {
  const entry = getWidget(descriptor.type);

  // Unknown widget type — render placeholder in dev, null in prod
  if (!entry) {
    return (
      <WidgetShell
        descriptor={{
          ...descriptor,
          data: { ...descriptor.data, status: DATA_STATUS.READY },
        }}
        permission={permission}
      >
        <UnknownWidget descriptor={descriptor} />
      </WidgetShell>
    );
  }

  const { component: WidgetComponent } = entry;

  return (
    <WidgetShell
      descriptor={descriptor}
      onRetry={onRetry}
      permission={permission}
    >
      <WidgetComponent
        config={descriptor.config || {}}
        data={descriptor.data?.payload || {}}
        actions={descriptor.actions || []}
        onAction={onAction}
      />
    </WidgetShell>
  );
}
