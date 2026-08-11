import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus, ArrowRight } from 'lucide-react';

const LEAVE_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
];

export default function V2EmployeeLeaveBalance({ leaveBalance }) {
  const balance = leaveBalance || [];
  return (
    <section className="bg-surface rounded-2xl shadow-xs border border-hairline-soft p-4 sm:p-5 flex flex-col justify-start">
      <div className="flex items-center justify-between mb-3 border-b border-hairline-soft pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Calendar className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-ink tracking-wider uppercase">
            Leave Balance
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/Attendance/leaves/calendar"
            className="text-xs font-semibold text-ink-muted hover:text-ink flex items-center gap-1 transition"
          >
            <Calendar className="h-3 w-3" />
            Calendar
          </Link>
          <Link
            to="/Attendance/leave-regularization"
            className="text-xs font-semibold text-[var(--module-accent)] hover:underline flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Apply Leave
          </Link>
        </div>
      </div>

      {balance.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-ink-subtle text-center">
          <Calendar className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-xs font-medium">No leave balances found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {balance.map((item, idx) => {
            const total = item.available + item.usedThisYear;
            const pct = total > 0 ? (item.available / total) * 100 : 100;
            const barColor = LEAVE_COLORS[idx % LEAVE_COLORS.length];

            return (
              <div key={idx} className="p-3 bg-surface-1/40 rounded-xl border border-hairline-soft space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">{item.leaveType}</span>
                  <span className="text-xs font-extrabold text-ink">
                    {item.available}<span className="text-ink-muted font-normal">/{total > 0 ? total : item.available}</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-ink-tertiary pt-0.5">
                  <span>Used: {item.usedThisYear || 0}</span>
                  {item.carriedForward > 0 && <span>Carry-fwd: {item.carriedForward}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
