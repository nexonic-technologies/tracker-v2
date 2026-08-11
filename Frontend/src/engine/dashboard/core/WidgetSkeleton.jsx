/**
 * Dashboard Engine — Widget Skeleton (§3.2 Loading State)
 *
 * Content-shaped skeleton per widget type:
 *  - metric: large number placeholder + trend line
 *  - collection: list row placeholders
 *  - visualization: chart area placeholder
 *  - status: bar/gauge placeholder
 *  - goal: arc placeholder
 *  - default: generic card skeleton
 *
 * Never a spinner-only fallback. The skeleton must look like the real content.
 */
import React from 'react';

const SkeletonPulse = ({ className = '', style = {} }) => (
  <div
    className={`dsh-skeleton ${className}`}
    style={style}
    aria-hidden="true"
  />
);

/**
 * Skeleton layouts keyed by widget type.
 * Each returns a skeleton shaped like the populated widget.
 */
const skeletonLayouts = {
  metric: () => (
    <div className="dsh-widget__body p-[var(--dsh-widget-padding)]">
      {/* Eyebrow / label */}
      <SkeletonPulse className="h-3 w-20 rounded mb-3" />
      {/* Hero number */}
      <SkeletonPulse className="h-8 w-28 rounded mb-2" />
      {/* Trend line */}
      <SkeletonPulse className="h-3 w-16 rounded" />
    </div>
  ),

  collection: () => (
    <div className="dsh-widget__body p-[var(--dsh-widget-padding)]">
      {/* Header placeholder */}
      <SkeletonPulse className="h-3.5 w-24 rounded mb-4" />
      {/* List rows */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 mb-3">
          <SkeletonPulse className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonPulse className="h-3 w-3/4 rounded" />
            <SkeletonPulse className="h-2.5 w-1/2 rounded" />
          </div>
          <SkeletonPulse className="h-6 w-14 rounded" />
        </div>
      ))}
    </div>
  ),

  visualization: () => (
    <div className="dsh-widget__body p-[var(--dsh-widget-padding)]">
      {/* Chart title */}
      <SkeletonPulse className="h-3.5 w-28 rounded mb-4" />
      {/* Chart area */}
      <div className="flex items-end gap-2 h-32">
        {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
          <SkeletonPulse
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  ),

  status: () => (
    <div className="dsh-widget__body p-[var(--dsh-widget-padding)]">
      <SkeletonPulse className="h-3.5 w-32 rounded mb-4" />
      {/* Status bars */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 mb-3">
          <SkeletonPulse className="h-3 w-3 rounded-full flex-shrink-0" />
          <SkeletonPulse className="h-3 flex-1 rounded" />
          <SkeletonPulse className="h-3 w-8 rounded" />
        </div>
      ))}
    </div>
  ),

  goal: () => (
    <div className="dsh-widget__body p-[var(--dsh-widget-padding)] flex flex-col items-center">
      {/* Arc placeholder */}
      <SkeletonPulse className="h-20 w-20 rounded-full mb-3" />
      {/* Label */}
      <SkeletonPulse className="h-3 w-16 rounded mb-1" />
      <SkeletonPulse className="h-6 w-12 rounded" />
    </div>
  ),

  feed: () => (
    <div className="dsh-widget__body p-[var(--dsh-widget-padding)]">
      <SkeletonPulse className="h-3.5 w-24 rounded mb-4" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 mb-3">
          <SkeletonPulse className="h-9 w-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonPulse className="h-3 w-2/3 rounded" />
            <SkeletonPulse className="h-2.5 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  ),

  risk: () => (
    <div className="dsh-widget__body p-[var(--dsh-widget-padding)]">
      <SkeletonPulse className="h-3.5 w-20 rounded mb-4" />
      {[0, 1].map((i) => (
        <div key={i} className="flex items-start gap-3 mb-3 p-2.5 rounded-lg bg-[var(--dsh-neutral-light)]">
          <SkeletonPulse className="h-5 w-5 rounded flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonPulse className="h-3 w-3/4 rounded" />
            <SkeletonPulse className="h-2.5 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  ),
};

/**
 * @param {Object} props
 * @param {string} props.type - widget type (determines skeleton shape)
 * @param {Object} [props.config] - widget config (unused currently, reserved)
 */
export default function WidgetSkeleton({ type }) {
  const SkeletonLayout = skeletonLayouts[type] || skeletonLayouts.metric;
  return <SkeletonLayout />;
}
