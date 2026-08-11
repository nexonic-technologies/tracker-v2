/**
 * Dashboard Engine — Goal Widget (§2.1 Registry Widget #10)
 *
 * Progress-toward-target gauge: shift arc, payroll completion, goal tracking.
 * The "instrument" widget — communicates progress at a glance.
 *
 * Config shape:
 *   variant: "shift-arc" | "gauge" | "progress"
 */
import React from 'react';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';

/** 240-degree arc SVG — matches existing V2ShiftArc geometry */
function ShiftArcView({ data }) {
  if (!data || typeof data !== 'object') return null;

  const {
    displayState = 'not_started',
    progress = 0,
    workedMinutes = 0,
    expectedMinutes = 480,
    remainingMinutes,
    checkIn,
    checkOut,
    expectedEnd,
  } = data;

  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const maxArcAngle = 240;
  const circumference = (maxArcAngle / 360) * 2 * Math.PI * radius;
  const validPct = Math.min(Math.max(progress ?? 0, 0), 100);
  const strokeDashoffset = circumference - (validPct / 100) * circumference;

  // Color by state
  const colorMap = {
    not_started: 'var(--dsh-neutral)',
    active: 'var(--brand-solid)',
    on_break: 'var(--dsh-warning)',
    overtime: 'var(--dsh-warning)',
    completed: 'var(--dsh-positive)',
    issue: 'var(--dsh-negative)',
  };
  const strokeColor = colorMap[displayState] || colorMap.not_started;

  // Format time
  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const hours = Math.floor(workedMinutes / 60);
  const mins = workedMinutes % 60;

  const stateLabels = {
    not_started: 'Not Started',
    active: 'Working',
    on_break: 'On Break',
    overtime: 'Overtime',
    completed: 'Completed',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Arc */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform rotate-[150deg]">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--tracker-surface-2)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${2 * Math.PI * radius - circumference}`}
            strokeLinecap="round"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${2 * Math.PI * radius - circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="dsh-figure dsh-figure--lg text-[var(--tracker-ink)]">
            {hours}h {mins}m
          </span>
          <span className="text-[10px] font-semibold" style={{ color: strokeColor }}>
            {stateLabels[displayState] || displayState}
          </span>
        </div>
      </div>

      {/* Time row */}
      <div className="flex items-center justify-center gap-4 text-[11px] text-[var(--tracker-ink-subtle)]">
        {checkIn && (
          <span>In: <strong className="text-[var(--tracker-ink-muted)]">{formatTime(checkIn)}</strong></span>
        )}
        {checkOut ? (
          <span>Out: <strong className="text-[var(--tracker-ink-muted)]">{formatTime(checkOut)}</strong></span>
        ) : expectedEnd ? (
          <span>ETA: <strong className="text-[var(--tracker-ink-muted)]">{formatTime(expectedEnd)}</strong></span>
        ) : null}
      </div>

      {/* Remaining */}
      {remainingMinutes != null && remainingMinutes > 0 && displayState === 'active' && (
        <p className="text-[11px] text-[var(--tracker-ink-subtle)]">
          {Math.floor(remainingMinutes / 60)}h {remainingMinutes % 60}m remaining
        </p>
      )}
    </div>
  );
}

/** Simple gauge — generic progress-toward-target */
function GaugeView({ data, config }) {
  const value = typeof data === 'number' ? data : data?.value ?? 0;
  const target = config?.target || 100;
  const pct = Math.min(Math.round((value / target) * 100), 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="dsh-figure dsh-figure--hero text-[var(--tracker-ink)]">{pct}%</span>
      <div className="w-full h-2 rounded-full bg-[var(--tracker-surface-2)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 80 ? 'var(--dsh-positive)' : pct >= 50 ? 'var(--dsh-warning)' : 'var(--dsh-negative)',
          }}
        />
      </div>
      <span className="text-[11px] text-[var(--tracker-ink-subtle)]">
        {value} / {target}
      </span>
    </div>
  );
}

function GoalWidget({ config, data }) {
  const { variant = 'shift-arc' } = config;

  switch (variant) {
    case 'shift-arc':
      return <ShiftArcView data={data} />;
    case 'gauge':
    case 'progress':
      return <GaugeView data={data} config={config} />;
    default:
      return <ShiftArcView data={data} />;
  }
}

// Self-register
const manifest = {
  id: 'goal',
  name: 'Goal Widget',
  icon: 'Target',
  category: WIDGET_CATEGORIES.METRICS,
  configurable: true,
  supportedDataTypes: ['object', 'number'],
  sizeConstraints: { minW: 3, maxW: 6, minH: 3, maxH: 5, defaultW: 4, defaultH: 4 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
    { type: 'metricPicker', name: 'dataSource', label: 'Data source' },
    { type: 'select', name: 'variant', label: 'Display style', options: [
      { value: 'shift-arc', label: 'Shift Arc' },
      { value: 'gauge', label: 'Gauge' },
      { value: 'progress', label: 'Progress Bar' },
    ]},
  ],
  defaultConfig: { variant: 'shift-arc' },
};

registerWidget('goal', GoalWidget, manifest);
export default GoalWidget;
