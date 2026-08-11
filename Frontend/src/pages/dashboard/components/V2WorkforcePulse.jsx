import React from 'react';
import { Users, Clock, Calendar, Laptop, AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * V2WorkforcePulse - Workforce Pulse bar.
 *
 * Props:
 *   pulse - Object containing { total, present, leave, wfh, late, unchecked, lop, absent, attendanceRate }
 *   scope - 'team' | 'org'
 */
export default function V2WorkforcePulse({ pulse, scope = 'org' }) {
  if (!pulse || pulse.total === 0) return null;

  const {
    total,
    present,
    leave,
    wfh,
    late,
    unchecked,
    lop,
    absent,
    attendanceRate
  } = pulse;

  const scopeLabel = scope === 'team' ? 'Team' : 'Org';

  // Calculate percentages for the segmented bar
  const getPct = (val) => (val / total) * 100;

  const segments = [
    { key: 'present', value: present, color: 'bg-emerald-500', label: 'Present' },
    { key: 'wfh', value: wfh, color: 'bg-sky-500', label: 'WFH' },
    { key: 'late', value: late, color: 'bg-amber-500', label: 'Late' },
    { key: 'leave', value: leave, color: 'bg-purple-500', label: 'Leave' },
    { key: 'absent', value: absent + lop, color: 'bg-rose-500', label: 'Absent' },
    { key: 'unchecked', value: unchecked, color: 'bg-slate-300 dark:bg-zinc-700', label: 'Unchecked' }
  ].filter((s) => s.value > 0);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-surface border border-hairline rounded-tracker-md shadow-xs text-xs text-ink-muted">
      {/* Pulse Summary Text */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
          <Users className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-ink">
          <span>{scopeLabel}:</span>
          <span className="text-ink font-bold">
            {present + wfh + late}/{total}
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/40">
            {attendanceRate}% present
          </span>
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex-1 h-2 max-w-full md:max-w-md bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={`${seg.color} h-full transition-all duration-500`}
            style={{ width: `${getPct(seg.value)}%` }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>

      {/* Categories breakdown details */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {late > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200/40 font-medium">
            <Clock className="h-3 w-3" />
            {late} late
          </span>
        )}
        {leave > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-200/40 font-medium">
            <Calendar className="h-3 w-3" />
            {leave} leave
          </span>
        )}
        {wfh > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300 border border-sky-200/40 font-medium">
            <Laptop className="h-3 w-3" />
            {wfh} WFH
          </span>
        )}
        {absent + lop > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200/40 font-medium">
            <AlertTriangle className="h-3 w-3" />
            {absent + lop} absent
          </span>
        )}
        {unchecked > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200/40 font-medium">
            <HelpCircle className="h-3 w-3 text-slate-400" />
            {unchecked} unchecked
          </span>
        )}
      </div>
    </div>
  );
}
