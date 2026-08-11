/**
 * Dashboard Engine — Calendar Widget (§2.1 Registry Widget #5)
 *
 * Compact date grid with event indicators.
 */
import React, { useState } from 'react';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function CalendarWidget({ config, data }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const events = Array.isArray(data) ? data : [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="flex flex-col gap-2">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--tracker-ink)]">
          {monthName} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-1 rounded text-[var(--tracker-ink-subtle)] hover:bg-[var(--tracker-surface-1)] hover:text-[var(--tracker-ink)]"
            type="button"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={handleNext}
            className="p-1 rounded text-[var(--tracker-ink-subtle)] hover:bg-[var(--tracker-surface-1)] hover:text-[var(--tracker-ink)]"
            type="button"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[var(--tracker-ink-subtle)] mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const isToday = isCurrentMonth && day === today.getDate();
          const hasEvent = events.some((e) => new Date(e.date).getDate() === day);

          return (
            <div
              key={day}
              className={`relative flex items-center justify-center h-7 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                isToday
                  ? 'bg-[var(--brand-solid)] text-white font-bold'
                  : 'hover:bg-[var(--tracker-surface-1)] text-[var(--tracker-ink)]'
              }`}
            >
              {day}
              {hasEvent && !isToday && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[var(--dsh-info)]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const manifest = {
  id: 'calendar',
  name: 'Calendar Widget',
  icon: 'Calendar',
  category: WIDGET_CATEGORIES.COLLECTIONS,
  configurable: true,
  supportedDataTypes: ['array'],
  sizeConstraints: { minW: 3, maxW: 6, minH: 3, maxH: 6, defaultW: 4, defaultH: 4 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
    { type: 'metricPicker', name: 'dataSource', label: 'Data source' },
  ],
  defaultConfig: {},
};

registerWidget('calendar', CalendarWidget, manifest);
export default CalendarWidget;
