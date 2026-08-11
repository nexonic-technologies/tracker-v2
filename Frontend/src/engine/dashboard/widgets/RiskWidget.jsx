/**
 * Dashboard Engine — Risk Widget (§2.1 Registry Widget #7)
 *
 * Displays alert & risk items ranked by severity.
 */
import React from 'react';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';

function RiskWidget({ config, data }) {
  const alerts = Array.isArray(data) ? data : [];

  if (alerts.length === 0) return null;

  const severityIcons = {
    red: AlertOctagon,
    orange: AlertTriangle,
    yellow: AlertTriangle,
    info: Info,
  };

  const severityColors = {
    red: 'var(--dsh-negative)',
    orange: 'var(--dsh-warning)',
    yellow: 'var(--dsh-warning)',
    info: 'var(--dsh-info)',
  };

  const severityBgs = {
    red: 'var(--dsh-negative-light)',
    orange: 'var(--dsh-warning-light)',
    yellow: 'var(--dsh-warning-light)',
    info: 'var(--dsh-info-light)',
  };

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((item, idx) => {
        const severity = item.severity || 'orange';
        const Icon = severityIcons[severity] || AlertTriangle;
        const color = severityColors[severity];
        const bg = severityBgs[severity];

        return (
          <div
            key={item.id || idx}
            className="flex items-center gap-3 p-2.5 rounded-[var(--tracker-radius-md)] transition-colors"
            style={{ backgroundColor: bg }}
          >
            <div className="flex-shrink-0" style={{ color }}>
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--tracker-ink)] truncate">
                {item.text}
              </p>
              {item.subtitle && (
                <p className="text-[11px] text-[var(--tracker-ink-subtle)] truncate">
                  {item.subtitle}
                </p>
              )}
            </div>
            {item.count > 1 && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                {item.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const manifest = {
  id: 'risk',
  name: 'Risk & Alert Widget',
  icon: 'ShieldAlert',
  category: WIDGET_CATEGORIES.STATUS,
  configurable: true,
  supportedDataTypes: ['array'],
  sizeConstraints: { minW: 3, maxW: 12, minH: 2, maxH: 5, defaultW: 4, defaultH: 3 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
    { type: 'metricPicker', name: 'dataSource', label: 'Data source' },
  ],
  defaultConfig: {},
};

registerWidget('risk', RiskWidget, manifest);
export default RiskWidget;
