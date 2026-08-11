/**
 * Dashboard Engine — Feed Widget (§2.1 Registry Widget #4)
 *
 * Chronological event stream: celebrations, activity feed.
 * Variant-driven display.
 *
 * Config shape:
 *   variant: "celebrations" | "activity"
 */
import React from 'react';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import { Cake, Award, Heart } from 'lucide-react';

/** Celebration type → icon & color */
const celebrationMeta = {
  birthday: { Icon: Cake, color: 'var(--dsh-warning)', label: 'Birthday' },
  work_anniversary: { Icon: Award, color: 'var(--dsh-info)', label: 'Work Anniversary' },
  wedding_anniversary: { Icon: Heart, color: 'var(--dsh-positive)', label: 'Wedding Anniversary' },
};

/** Celebrations variant */
function CelebrationsView({ items }) {
  const celebrations = Array.isArray(items) ? items : [];

  // Group: today vs upcoming
  const today = celebrations.filter(c => c.daysUntil === 0);
  const upcoming = celebrations.filter(c => c.daysUntil > 0);

  const renderItem = (item, i) => {
    const meta = celebrationMeta[item.type] || celebrationMeta.birthday;
    const { Icon } = meta;

    return (
      <div
        key={`${item.type}-${item.name}-${i}`}
        className="flex items-center gap-3 py-2 px-1 rounded-[var(--tracker-radius-sm)] hover:bg-[var(--tracker-surface-1)] transition-colors"
      >
        {/* Avatar / icon */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
          style={{
            backgroundColor: item.profileImage ? 'transparent' : 'var(--tracker-surface-2)',
            color: 'var(--tracker-ink-muted)',
            backgroundImage: item.profileImage ? `url(${item.profileImage})` : 'none',
            backgroundSize: 'cover',
          }}
        >
          {!item.profileImage && (item.name?.[0]?.toUpperCase() || '?')}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-[var(--tracker-ink)] truncate">{item.name}</p>
          <p className="text-[11px] text-[var(--tracker-ink-subtle)]">
            {meta.label}
            {item.years > 0 && ` · ${item.years} year${item.years > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Type icon */}
        <div
          className="w-7 h-7 rounded-[var(--tracker-radius-sm)] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--tracker-surface-1)', color: meta.color }}
        >
          <Icon size={14} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      {today.length > 0 && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--dsh-warning)] px-1 mb-1">
            🎉 Today
          </p>
          {today.map(renderItem)}
        </>
      )}
      {upcoming.length > 0 && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--tracker-ink-subtle)] px-1 mt-2 mb-1">
            Upcoming
          </p>
          {upcoming.map(renderItem)}
        </>
      )}
      {today.length === 0 && upcoming.length === 0 && (
        <p className="text-[12px] text-[var(--tracker-ink-subtle)] text-center py-4">
          No celebrations this week
        </p>
      )}
    </div>
  );
}

function FeedWidget({ config, data }) {
  const { variant = 'celebrations' } = config;
  const items = Array.isArray(data) ? data : [];

  switch (variant) {
    case 'celebrations':
      return <CelebrationsView items={items} />;
    case 'activity':
    default:
      return <CelebrationsView items={items} />;
  }
}

// Self-register
const manifest = {
  id: 'feed',
  name: 'Feed Widget',
  icon: 'Rss',
  category: WIDGET_CATEGORIES.COLLECTIONS,
  configurable: true,
  supportedDataTypes: ['array'],
  sizeConstraints: { minW: 3, maxW: 12, minH: 2, maxH: 6, defaultW: 4, defaultH: 3 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
    { type: 'metricPicker', name: 'dataSource', label: 'Data source' },
    { type: 'select', name: 'variant', label: 'Display style', options: [
      { value: 'celebrations', label: 'Celebrations' },
      { value: 'activity', label: 'Activity Feed' },
    ]},
  ],
  defaultConfig: { variant: 'celebrations' },
};

registerWidget('feed', FeedWidget, manifest);
export default FeedWidget;
