import React, { useState } from 'react';
import { PartyPopper, Calendar } from 'lucide-react';
import ProfileImage from '@components/Common/ProfileImage';

const EVENT_TYPE_CONFIG = {
  birthday: {
    emoji: '🎂',
    label: 'Birthday',
    borderColor: 'border-l-4 border-pink-400',
    badgeClass: 'bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-300',
  },
  work_anniversary: {
    emoji: '🏢',
    label: 'Work Anniversary',
    borderColor: 'border-l-4 border-purple-500',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300',
  },
  wedding_anniversary: {
    emoji: '💍',
    label: 'Wedding Anniversary',
    borderColor: 'border-l-4 border-rose-400',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
  },
};

export default function V2Celebrations({ celebrations = [] }) {
  const items = celebrations || [];
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'TODAY'

  const todayList = items.filter((item) => item.daysUntil === 0);
  const displayedList = filter === 'TODAY' ? todayList : items;

  return (
    <section className="bg-surface rounded-2xl shadow-xs border border-hairline-soft p-4 sm:p-5 flex flex-col justify-start h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-hairline-soft pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400">
            <PartyPopper className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-ink tracking-wider uppercase">
            Celebrations
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
            {items.length}
          </span>
        </div>

        {items.length > 1 && (
          <div className="flex items-center gap-1 bg-surface-1/60 p-0.5 rounded-lg border border-hairline-soft">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Next 7 Days ({items.length})
            </button>
            {todayList.length > 0 && (
              <button
                onClick={() => setFilter('TODAY')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                  filter === 'TODAY'
                    ? 'bg-surface text-pink-600 dark:text-pink-400 shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Today ({todayList.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {displayedList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-ink-subtle text-center flex-1">
          <PartyPopper className="h-8 w-8 mb-2 opacity-40 text-pink-400" />
          <p className="text-xs font-medium">No celebrations in the next 7 days</p>
          <p className="text-[10px] text-ink-tertiary mt-0.5">Check back soon for team birthdays & anniversaries!</p>
        </div>
      ) : (
        <div className="space-y-2.5 overflow-y-auto max-h-[360px] pr-1">
          {displayedList.slice(0, 5).map((item, idx) => {
            const config = EVENT_TYPE_CONFIG[item.type] || EVENT_TYPE_CONFIG.birthday;
            const nameParts = item.name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts[1] || '';

            let timingTag = 'Today';
            let timingClass = 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300';

            if (item.daysUntil === 1) {
              timingTag = 'Tomorrow';
              timingClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
            } else if (item.daysUntil > 1) {
              timingTag = `In ${item.daysUntil} days`;
              timingClass = 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300';
            }

            return (
              <div
                key={idx}
                className={`flex items-center justify-between gap-3 p-2.5 bg-surface-1/40 hover:bg-surface-1/70 border border-hairline-soft rounded-xl transition-all duration-200 ${config.borderColor}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    <ProfileImage
                      profileImage={item.profileImage}
                      firstName={firstName}
                      lastName={lastName}
                      size="sm"
                      className="h-8 w-8 rounded-full border border-hairline-soft"
                    />
                    <span className="absolute -bottom-1 -right-1 text-xs select-none">
                      {config.emoji}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate leading-tight">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-ink-muted flex items-center gap-1 mt-0.5 font-medium">
                      <span>{config.label}</span>
                      {item.years > 0 && item.type !== 'birthday' && (
                        <span className="font-semibold text-ink-subtle">&middot; {item.years} yr{item.years > 1 ? 's' : ''}</span>
                      )}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex-shrink-0 ${timingClass}`}
                >
                  {timingTag}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
