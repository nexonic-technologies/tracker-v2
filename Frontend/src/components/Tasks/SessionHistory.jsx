import { useState, useEffect } from 'react';
import { Clock, User, Zap } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

/**
 * SessionHistory — Shows completed time tracking sessions for a task.
 * Displays job type, employee, duration, production cost, and delivery stage.
 * 
 * @param {string} taskId - The task ID to show history for
 */
export default function SessionHistory({ taskId }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.post('/populate/list/time_tracker_sessions', {
          filter: { taskId, status: 'completed' },
          sort: { startTime: -1 },
          limit: 50,
          populateFields: {
            jobTypeId: 'name,icon,color',
            userId: 'basicInfo.firstName,basicInfo.lastName'
          }
        });
        setSessions(res.data?.data || []);
      } catch (err) {
        console.error('[SessionHistory] Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [taskId]);

  if (loading) {
    return <div className="text-xs text-gray-400 animate-pulse">Loading history...</div>;
  }

  if (sessions.length === 0) {
    return null; // Don't render if no history
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const totalHours = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 3600;
  const totalCost = sessions.reduce((sum, s) => sum + (s.productionCost || 0), 0);
  const displayedSessions = expanded ? sessions : sessions.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Clock size={10} /> Session History
        </label>
        <span className="text-[10px] text-slate-400">
          {totalHours.toFixed(1)}h · ₹{totalCost.toFixed(0)}
        </span>
      </div>

      <div className="space-y-1.5">
        {displayedSessions.map((session, i) => {
          const jobType = typeof session.jobTypeId === 'object' ? session.jobTypeId : null;
          const userName = typeof session.userId === 'object'
            ? `${session.userId.basicInfo?.firstName || ''} ${session.userId.basicInfo?.lastName || ''}`.trim()
            : '';

          return (
            <div key={session._id || i} className="flex items-center gap-2 px-2 py-1.5 bg-white rounded border border-slate-100 text-xs">
              {/* Job Type Badge */}
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-white text-[10px] font-semibold flex-shrink-0"
                style={{ backgroundColor: jobType?.color || '#6B7280' }}
              >
                {jobType?.icon || '📋'} {jobType?.name || 'Session'}
              </span>

              {/* Employee */}
              <span className="text-slate-500 truncate flex-1" title={userName}>
                {userName}
              </span>

              {/* Duration */}
              <span className="font-mono font-bold text-slate-700 flex-shrink-0">
                {formatDuration(session.duration)}
              </span>

              {/* Cost */}
              {session.productionCost > 0 && (
                <span className="text-emerald-600 font-medium flex-shrink-0 flex items-center gap-0.5">
                  <Zap size={8} />₹{session.productionCost.toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {sessions.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold w-full text-center py-1"
        >
          {expanded ? 'Show less' : `Show all ${sessions.length} sessions`}
        </button>
      )}
    </div>
  );
}
