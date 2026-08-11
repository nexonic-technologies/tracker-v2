import React, { useState } from 'react';
import { Users, Clock, CheckCircle2, UserX, AlertCircle } from 'lucide-react';
import ProfileImage from '@components/Common/ProfileImage';

const STATUS_STYLING = {
  Present: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-200/30',
  'Late Entry': 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border-amber-200/30',
  Leave: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/20 border-purple-200/30',
  'Work From Home': 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20 border-blue-200/30',
  Absent: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20 border-red-200/30',
  LOP: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20 border-red-200/30',
  Unchecked: 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-zinc-800/40 border-gray-200/30',
  'Check-Out': 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/20 border-yellow-200/30',
  'Early check-out': 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/20 border-yellow-200/30',
};

const formatTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export default function V2TeamAttendanceGrid({ teamGrid }) {
  const grid = teamGrid || [];
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'PRESENT', 'PENDING'

  const checkedInList = grid.filter((m) =>
    ['Present', 'Late Entry', 'Check-Out', 'Work From Home'].includes(m.status)
  );
  const pendingList = grid.filter(
    (m) => !['Present', 'Late Entry', 'Check-Out', 'Work From Home'].includes(m.status)
  );

  const displayedList =
    filter === 'PRESENT'
      ? checkedInList
      : filter === 'PENDING'
      ? pendingList
      : grid;

  return (
    <section className="bg-surface rounded-2xl shadow-xs border border-hairline-soft p-4 sm:p-5 flex flex-col h-full justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 border-b border-hairline-soft pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold text-ink tracking-wider uppercase">
              Team Today
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
              {grid.length}
            </span>
          </div>
        </div>

        {/* Group Filter Tabs */}
        {grid.length > 0 && (
          <div className="flex items-center gap-1 mb-3 bg-surface-1/60 p-1 rounded-xl border border-hairline-soft">
            <button
              onClick={() => setFilter('ALL')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center ${
                filter === 'ALL'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              All ({grid.length})
            </button>
            <button
              onClick={() => setFilter('PRESENT')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1 ${
                filter === 'PRESENT'
                  ? 'bg-surface text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <CheckCircle2 size={12} /> In ({checkedInList.length})
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1 ${
                filter === 'PENDING'
                  ? 'bg-surface text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <UserX size={12} /> Pending ({pendingList.length})
            </button>
          </div>
        )}

        {/* List */}
        {displayedList.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-ink-subtle text-center">
            <Users className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs font-medium">No team members match this filter</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
            {displayedList.map((member) => {
              const statusClass =
                STATUS_STYLING[member.status] ||
                'text-gray-500 bg-gray-50 dark:bg-zinc-800/40';

              const nameParts = member.name.split(' ');
              const firstName = nameParts[0] || '';
              const lastName = nameParts[1] || '';

              return (
                <div
                  key={member.employeeId}
                  className="flex items-center justify-between gap-3 p-2.5 bg-surface-1/40 hover:bg-surface-1/70 border border-hairline-soft rounded-xl transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ProfileImage
                      profileImage={member.profileImage}
                      firstName={firstName}
                      lastName={lastName}
                      size="sm"
                      className="h-8 w-8 rounded-full border border-hairline-soft flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate leading-tight">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-ink-muted flex items-center gap-1 mt-0.5 font-medium">
                        <Clock className="h-3 w-3 text-ink-subtle" />
                        {member.checkIn ? formatTime(member.checkIn) : 'Not Checked In'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${statusClass} flex-shrink-0`}
                  >
                    {member.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
