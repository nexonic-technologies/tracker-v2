import { useState, useMemo } from 'react';
import ActivityGanttView from '@components/Tasks/ActivityGanttView';
import SprintScheduler from '@components/Tasks/SprintScheduler';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { useAuth } from '@providers/AuthProvider';

/**
 * Activity Timeline page — Full-page Gantt view of employee work activities.
 * Route: /tasks/activity-timeline
 */
export default function ActivityTimeline() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [showScheduler, setShowScheduler] = useState(false);

  const isUserManager = useMemo(() => {
    const roleName = (user?.roleName || "").toLowerCase();
    return roleName.includes("manager") || roleName.includes("admin") || user?.isSuperAdmin;
  }, [user]);

  const goToday = () => setDate(new Date());
  const goPrev = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d);
  };
  const goNext = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d);
  };

  const isToday = new Date().toDateString() === date.toDateString();

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Activity Timeline</h1>
            <p className="text-xs text-slate-500 mt-0.5">Real-time view of what everyone is working on</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Navigator */}
            <div className="flex items-center gap-2">
              <button onClick={goPrev} className="p-2 hover:bg-white border rounded-lg transition-colors cursor-pointer">
                <ChevronLeft size={16} className="text-slate-600" />
              </button>
              <button
                onClick={goToday}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  isToday ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 hover:bg-blue-50 border-slate-200'
                }`}
              >
                Today
              </button>
              <button onClick={goNext} className="p-2 hover:bg-white border rounded-lg transition-colors cursor-pointer">
                <ChevronRight size={16} className="text-slate-600" />
              </button>
              <div className="flex items-center gap-1.5 ml-1 px-3 py-1.5 bg-white border rounded-lg text-xs font-medium text-slate-700">
                <Calendar size={12} />
                {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>

            {/* Schedule Sprint (Managers only) */}
            {isUserManager && (
              <button
                onClick={() => setShowScheduler(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} /> Schedule Sprint
              </button>
            )}
          </div>
        </div>

        {/* Gantt View */}
        <ActivityGanttView date={date} />

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500 px-2">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" /> Live session
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-0.5 h-4 bg-red-500" /> Current time
          </span>
        </div>
      </div>

      {/* Sprint Scheduler Modal */}
      {showScheduler && (
        <SprintScheduler
          onClose={() => setShowScheduler(false)}
          onSuccess={() => {
            // refresh data if needed
          }}
        />
      )}
    </div>
  );
}
