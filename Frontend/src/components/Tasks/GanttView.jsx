import { useMemo, useRef, useEffect } from "react";
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, isToday, isWeekend } from "date-fns";

export default function GanttView({ data, onTaskClick }) {
  const containerRef = useRef(null);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    let min = new Date();
    let max = new Date();

    if (data.length > 0) {
      const dates = data.flatMap(t => {
        const arr = [];
        if (t.startDate) arr.push(new Date(t.startDate));
        if (t.endDate || t.dueDate) arr.push(new Date(t.endDate || t.dueDate));
        if (t.createdAt) arr.push(new Date(t.createdAt));
        return arr;
      });

      if (dates.length > 0) {
        min = new Date(Math.min(...dates.map(d => d.getTime())));
        max = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    }

    min = startOfWeek(addDays(min, -7));
    max = endOfWeek(addDays(max, 14));

    return {
      minDate: min,
      maxDate: max,
      totalDays: differenceInDays(max, min) + 1
    };
  }, [data]);

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < totalDays; i++) {
      arr.push(addDays(minDate, i));
    }
    return arr;
  }, [minDate, totalDays]);

  const DAY_WIDTH = 40;

  useEffect(() => {
    if (containerRef.current) {
      const todayIndex = days.findIndex(d => isToday(d));
      if (todayIndex > -1) {
        containerRef.current.scrollLeft = (todayIndex * DAY_WIDTH) - (containerRef.current.clientWidth / 2);
      }
    }
  }, [days]);

  return (
    <div className="flex flex-col h-full bg-surface border border-hairline rounded-tracker-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-surface-1">
        <h2 className="text-[13px] font-semibold text-ink">Timeline View</h2>
        <div className="flex items-center gap-4 text-[11px] font-medium text-ink-muted">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[var(--tracker-success)]" /> Completed</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[var(--module-project)]" /> In Progress</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[var(--tracker-warning)]" /> Overdue</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" ref={containerRef}>
        <div style={{ minWidth: `${totalDays * DAY_WIDTH + 250}px` }} className="pb-8">
          <div className="flex sticky top-0 z-20 bg-surface border-b border-hairline shadow-sm">
            <div className="w-[250px] flex-shrink-0 sticky left-0 z-30 bg-surface border-r border-hairline px-4 py-2 flex items-end">
              <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Tasks</span>
            </div>
            
            <div className="flex flex-1">
              {days.map((day, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col items-center justify-end py-1.5 border-r border-hairline-soft ${isWeekend(day) ? "bg-surface-1/50" : ""} ${isToday(day) ? "bg-blue-50/50" : ""}`}
                  style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                >
                  <span className="text-[10px] text-ink-subtle">{format(day, 'MMM')}</span>
                  <span className={`text-[12px] font-semibold ${isToday(day) ? "text-[var(--module-project)]" : "text-ink"}`}>
                    {format(day, 'dd')}
                  </span>
                  <span className="text-[9px] text-ink-subtle">{format(day, 'E')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {days.findIndex(d => isToday(d)) > -1 && (
              <div 
                className="absolute top-0 bottom-0 w-px bg-[var(--module-project)] z-10 opacity-50 pointer-events-none"
                style={{ left: 250 + (days.findIndex(d => isToday(d)) * DAY_WIDTH) + (DAY_WIDTH / 2) }}
              />
            )}

            {data.map((task) => {
              const start = new Date(task.startDate || task.createdAt);
              const end = new Date(task.endDate || task.dueDate || new Date());
              
              const startOffsetDays = differenceInDays(start, minDate);
              let durationDays = differenceInDays(end, start) + 1;
              if (durationDays < 1) durationDays = 1;

              const leftPos = Math.max(0, startOffsetDays * DAY_WIDTH);
              const width = durationDays * DAY_WIDTH;

              let barColor = "var(--tracker-ink-subtle)";
              if (task.status === "Completed" || task.status === "Approved") barColor = "var(--tracker-success)";
              else if (task.status === "In Progress" || task.status === "In Review") barColor = "var(--module-project)";
              else if (new Date(end) < new Date()) barColor = "var(--tracker-danger)";

              return (
                <div key={task._id} className="flex border-b border-hairline-soft group hover:bg-surface-1/50 transition-colors">
                  <div className="w-[250px] flex-shrink-0 sticky left-0 z-20 bg-surface group-hover:bg-surface-1/50 border-r border-hairline px-4 py-3 flex flex-col justify-center transition-colors">
                    <p 
                      className="text-[12px] font-semibold text-ink line-clamp-1 cursor-pointer hover:text-[var(--module-accent)] transition-colors"
                      onClick={() => onTaskClick?.(task)}
                    >
                      {task.title || "Untitled Task"}
                    </p>
                    <p className="text-[10px] text-ink-muted">
                      {task.assignedTo?.[0]?.basicInfo?.firstName || "Unassigned"}
                    </p>
                  </div>
                  
                  <div className="flex-1 relative h-14 bg-stripes">
                    <div className="absolute inset-0 flex pointer-events-none">
                      {days.map((day, i) => (
                        <div key={i} className={`h-full border-r border-hairline-soft/30 ${isWeekend(day) ? "bg-surface-1/50" : ""}`} style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }} />
                      ))}
                    </div>

                    <div 
                      className="absolute top-1/2 -translate-y-1/2 h-7 rounded-tracker-sm shadow-sm cursor-pointer hover:brightness-110 transition-all flex items-center px-2 overflow-hidden z-10"
                      style={{ 
                        left: `${leftPos}px`, 
                        width: `${width}px`, 
                        backgroundColor: barColor 
                      }}
                      onClick={() => onTaskClick?.(task)}
                    >
                      <span className="text-[10px] font-semibold text-white whitespace-nowrap truncate mix-blend-overlay opacity-90">
                        {task.title}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {data.length === 0 && (
              <div className="py-12 text-center text-ink-subtle text-[13px]">
                No tasks available for timeline.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
