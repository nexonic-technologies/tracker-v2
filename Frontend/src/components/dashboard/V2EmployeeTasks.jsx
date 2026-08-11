import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, CheckSquare, Clock, ArrowRight, ExternalLink } from 'lucide-react';

const PRIORITY_COLORS = {
  High: 'bg-rose-500 text-white',
  Medium: 'bg-amber-500 text-white',
  Low: 'bg-emerald-500 text-white',
};

const formatDueDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);

  const diffTime = taskDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function V2EmployeeTasks({ tasks }) {
  const taskList = tasks || [];
  const [timerRunning, setTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimerValue = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(
      mins
    ).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartStopTimer = (e) => {
    e.stopPropagation();
    setTimerRunning((prev) => !prev);
  };

  return (
    <section className="bg-surface rounded-2xl shadow-xs border border-hairline-soft p-4 sm:p-5 flex flex-col justify-start">
      <div className="flex items-center justify-between mb-3 border-b border-hairline-soft pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
            <CheckSquare className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-ink tracking-wider uppercase">
            My Priority Tasks
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
            {taskList.length}
          </span>
        </div>

        <Link
          to="/tasks"
          className="text-xs font-bold text-brand hover:text-brand-dark transition-colors flex items-center gap-1.5 group"
        >
          <span>View All Tasks</span>
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {taskList.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-ink-subtle text-center">
          <CheckSquare className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-xs font-medium mb-2">No active tasks assigned to you</p>
          <Link
            to="/tasks"
            className="text-xs text-brand font-bold hover:underline inline-flex items-center gap-1"
          >
            Go to Task Module <ExternalLink size={11} />
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {taskList.slice(0, 5).map((task, index) => {
            const isTopTask = index === 0;
            const priorityColor = PRIORITY_COLORS[task.priorityLevel] || 'bg-slate-400 text-white';
            const dueDateText = formatDueDate(task.endDate);

            return (
              <div
                key={task._id}
                className="flex items-center justify-between gap-3 p-3 bg-surface-1/40 hover:bg-surface-1/80 border border-hairline-soft hover:border-brand/30 rounded-xl transition-all duration-200 group"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase mt-0.5 flex-shrink-0 ${priorityColor}`}
                  >
                    {task.priorityLevel || 'Low'}
                  </span>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/tasks/${task._id}`}
                      className="text-xs font-bold text-ink hover:text-brand transition-colors leading-tight truncate block"
                    >
                      {task.title}
                    </Link>
                    <p className="text-[10px] text-ink-muted flex items-center gap-1 mt-1 font-medium">
                      <Clock className="h-3 w-3 text-ink-subtle" />
                      <span>Due: {dueDateText}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isTopTask && (
                    <button
                      onClick={handleStartStopTimer}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors border select-none ${
                        timerRunning
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400'
                          : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200/50 dark:bg-sky-950/20 dark:text-sky-400'
                      }`}
                    >
                      {timerRunning ? (
                        <>
                          <Pause className="h-3 w-3 fill-current animate-pulse" />
                          <span className="font-mono">{formatTimerValue(seconds)}</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 fill-current" />
                          <span>Start Timer</span>
                        </>
                      )}
                    </button>
                  )}

                  <Link
                    to={`/tasks/${task._id}`}
                    className="p-1 rounded-md text-ink-subtle hover:text-brand hover:bg-surface-1 transition-colors"
                    title="Open Task Details"
                  >
                    <ExternalLink size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
