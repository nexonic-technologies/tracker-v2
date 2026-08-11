/**
 * Dashboard Engine — Insight Widget (§2.1 Registry Widget #8)
 *
 * Text insight/recommendation with optional metric highlight.
 */
import React from 'react';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import { Sparkles, ArrowRight } from 'lucide-react';

function InsightWidget({ config, data }) {
  const { template = 'Automated summary insight' } = config;

  const text = typeof data === 'string' ? data : data?.text || data?.summary || template;
  const highlight = data?.highlight || data?.value;

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="flex items-center gap-2 text-[var(--brand-solid)] font-semibold text-xs">
        <Sparkles size={16} />
        <span>System Insight</span>
      </div>

      <p className="text-xs text-[var(--tracker-ink-muted)] leading-relaxed">
        {text}
      </p>

      {highlight && (
        <div className="mt-1 flex items-baseline gap-2">
          <span className="dsh-figure dsh-figure--hero text-[var(--brand-solid)]">
            {highlight}
          </span>
          {data?.highlightLabel && (
            <span className="text-xs text-[var(--tracker-ink-subtle)]">
              {data.highlightLabel}
            </span>
          )}
        </div>
      )}

      {config.actionUrl && (
        <a
          href={config.actionUrl}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-solid)] hover:underline"
        >
          <span>{config.actionLabel || 'Learn more'}</span>
          <ArrowRight size={12} />
        </a>
      )}
    </div>
  );
}

const manifest = {
  id: 'insight',
  name: 'Insight Widget',
  icon: 'Sparkles',
  category: WIDGET_CATEGORIES.INSIGHTS,
  configurable: true,
  supportedDataTypes: ['object', 'string'],
  sizeConstraints: { minW: 3, maxW: 6, minH: 2, maxH: 4, defaultW: 4, defaultH: 3 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
    { type: 'metricPicker', name: 'dataSource', label: 'Data source' },
    { type: 'textbox', name: 'template', label: 'Default Text' },
  ],
  defaultConfig: {},
};

registerWidget('insight', InsightWidget, manifest);
export default InsightWidget;
