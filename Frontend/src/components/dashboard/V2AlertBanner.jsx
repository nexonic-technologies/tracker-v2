import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * V2AlertBanner - conditional alert strip with custom hover tooltip card.
 *
 * Props:
 *   alerts - Array of { type, severity, text, count }
 */
export default function V2AlertBanner({ alerts = [] }) {
  if (!alerts || alerts.length === 0) return null;

  // Determine aggregate severity (red takes precedence over orange)
  const hasRed = alerts.some((a) => a.severity === 'red');
  const severityClass = hasRed
    ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';

  const Icon = hasRed ? AlertCircle : AlertTriangle;

  // Combine alert texts with dots
  const alertText = alerts.map((a) => a.text).join('  ·  ');

  return (
    <div className="relative group w-full">
      <div
        className={`h-10 flex items-center justify-between gap-2.5 px-3.5 border rounded-xl text-xs font-medium transition-all duration-300 select-none cursor-pointer ${severityClass}`}
        role="alert"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className="h-4 w-4 flex-shrink-0 animate-pulse" />
          <span className="truncate">{alertText}</span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-black/20 flex-shrink-0">
          {alerts.length}
        </span>
      </div>

      {/* Floating Hover Tooltip Card */}
      <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 p-3 bg-surface border border-hairline rounded-tracker-md shadow-xl z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 scale-95 group-hover:scale-100 origin-top-right">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline-soft">
          <span className="text-xs font-bold text-ink flex items-center gap-1.5 uppercase tracking-wider">
            <Info className="h-3.5 w-3.5 text-amber-500" /> Notifications & Alerts
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
            {alerts.length} alert{alerts.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-md text-xs flex items-start gap-2 ${
                alert.severity === 'red'
                  ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200/50'
                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50'
              }`}
            >
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
              <span className="font-medium leading-relaxed">{alert.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
