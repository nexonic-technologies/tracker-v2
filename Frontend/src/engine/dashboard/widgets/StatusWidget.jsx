/**
 * Dashboard Engine — Status Widget (§2.1 Registry Widget #6)
 *
 * Multi-bar status breakdown — attendance pulse, team grid, leave balance.
 * Variant-driven display.
 *
 * Config shape:
 *   variant: "pulse-bar" | "team-grid" | "leave-balance"
 */
import React from 'react';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';

/** Workforce Pulse Bar — horizontal breakdown */
function PulseBarView({ data }) {
  if (!data || typeof data !== 'object') return null;

  const { total = 0, present = 0, leave = 0, wfh = 0, late = 0, unchecked = 0, lop = 0, attendanceRate = 0 } = data;

  const segments = [
    { key: 'present', label: 'Present', value: present, color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' },
    { key: 'wfh', label: 'WFH', value: wfh, color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' },
    { key: 'late', label: 'Late', value: late, color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' },
    { key: 'leave', label: 'Leave', value: leave, color: '#8b5cf6', bg: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300' },
    { key: 'unchecked', label: 'Unchecked', value: unchecked, color: '#64748b', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
    { key: 'lop', label: 'LOP', value: lop, color: '#ef4444', bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300' },
  ].filter(s => s.value > 0);

  const rateColor = attendanceRate >= 85 ? '#10b981' : attendanceRate >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col gap-3.5 pt-1">
      {/* Attendance rate hero */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="dsh-figure dsh-figure--hero" style={{ color: rateColor }}>
            {attendanceRate}%
          </span>
          <span className="text-xs font-bold text-[var(--tracker-ink-subtle,#64748b)]">
            Attendance Rate
          </span>
        </div>

        <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
          {total} Total Employees
        </div>
      </div>

      {/* Segmented bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800/60 p-0.5 shadow-inner">
        {segments.map(seg => (
          <div
            key={seg.key}
            className="h-full rounded-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            style={{
              width: total > 0 ? `${(seg.value / total) * 100}%` : '0%',
              backgroundColor: seg.color,
            }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>

      {/* Legend chips */}
      <div className="flex flex-wrap gap-2 pt-0.5">
        {segments.map(seg => (
          <div
            key={seg.key}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${seg.bg} border border-black/5 dark:border-white/5 shadow-2xs`}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span>{seg.label}</span>
            <span className="font-black ml-0.5">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Team Grid — avatar status grid */
function TeamGridView({ data }) {
  const members = Array.isArray(data) ? data : [];
  if (members.length === 0) return null;

  const statusColors = {
    Present: 'var(--dsh-positive)',
    'Check-In': 'var(--dsh-positive)',
    'Work From Home': 'var(--dsh-info)',
    'Late Entry': 'var(--dsh-warning)',
    Leave: 'var(--tracker-ink-subtle)',
    LOP: 'var(--dsh-negative)',
    Absent: 'var(--dsh-negative)',
    Unchecked: 'var(--dsh-neutral)',
    'Check-Out': 'var(--dsh-positive)',
  };

  return (
    <div className="flex flex-col gap-1">
      {members.map((member, i) => (
        <div
          key={member.employeeId || i}
          className="flex items-center gap-2.5 py-1.5 px-1 rounded-[var(--tracker-radius-sm)] hover:bg-[var(--tracker-surface-1)] transition-colors"
        >
          {/* Avatar placeholder */}
          <div className="relative flex-shrink-0">
            <div
              className="w-8 h-8 rounded-full bg-[var(--tracker-surface-2)] flex items-center justify-center text-[11px] font-bold text-[var(--tracker-ink-muted)]"
              style={member.profileImage ? { backgroundImage: `url(${member.profileImage})`, backgroundSize: 'cover' } : {}}
            >
              {!member.profileImage && (member.name?.[0]?.toUpperCase() || '?')}
            </div>
            {/* Status dot */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--dsh-widget-bg)]"
              style={{ backgroundColor: statusColors[member.status] || statusColors.Unchecked }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[var(--tracker-ink)] truncate">{member.name}</p>
          </div>

          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{
              color: statusColors[member.status] || statusColors.Unchecked,
              backgroundColor: 'var(--tracker-surface-1)',
            }}
          >
            {member.status}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Leave Balance — per-type progress bars */
function LeaveBalanceView({ data }) {
  const balances = Array.isArray(data) ? data : [];
  if (balances.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {balances.map((item, i) => {
        const total = (item.available || 0) + (item.usedThisYear || 0);
        const pct = total > 0 ? Math.round((item.available / total) * 100) : 0;

        return (
          <div key={item.leaveTypeId || i}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[12px] font-medium text-[var(--tracker-ink)]">{item.leaveType}</span>
              <span className="text-[11px] font-semibold text-[var(--tracker-ink-muted)]">
                {item.available}/{total}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--tracker-surface-2)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct > 50 ? 'var(--dsh-positive)' : pct > 20 ? 'var(--dsh-warning)' : 'var(--dsh-negative)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.config
 * @param {*} props.data
 */
function StatusWidget({ config, data }) {
  const { variant = 'pulse-bar' } = config;

  switch (variant) {
    case 'pulse-bar':
      return <PulseBarView data={data} />;
    case 'team-grid':
      return <TeamGridView data={data} />;
    case 'leave-balance':
      return <LeaveBalanceView data={data} />;
    default:
      return <PulseBarView data={data} />;
  }
}

// Self-register
const manifest = {
  id: 'status',
  name: 'Status Widget',
  icon: 'Activity',
  category: WIDGET_CATEGORIES.STATUS,
  configurable: true,
  supportedDataTypes: ['object', 'array'],
  sizeConstraints: { minW: 3, maxW: 12, minH: 2, maxH: 6, defaultW: 4, defaultH: 3 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
    { type: 'metricPicker', name: 'dataSource', label: 'Data source' },
    { type: 'select', name: 'variant', label: 'Display style', options: [
      { value: 'pulse-bar', label: 'Pulse Bar' },
      { value: 'team-grid', label: 'Team Grid' },
      { value: 'leave-balance', label: 'Leave Balance' },
    ]},
  ],
  defaultConfig: { variant: 'pulse-bar' },
};

registerWidget('status', StatusWidget, manifest);
export default StatusWidget;
