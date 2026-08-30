import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock, ChevronDown, Briefcase, Zap } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import useJobSession from '../../hooks/useJobSession';
import toast from 'react-hot-toast';

/**
 * JobSessionTimer — Activity-centric timer component for task detail pages.
 * 
 * Features:
 *   - Job type selector grouped by category
 *   - Live timer display with play/pause/stop controls
 *   - Cost snapshot info (rate, billable status)
 *   - Delivery stage badge auto-update
 * 
 * @param {string} taskId - The task ID to track time against
 * @param {string} userId - Current user's employee ID
 * @param {function} onSessionChange - Callback when session state changes (for parent refresh)
 */
export default function JobSessionTimer({ taskId, userId, onSessionChange }) {
  const {
    session, elapsed, formattedElapsed, loading, error,
    isActive, isPaused, hasSession,
    startSession, pauseSession, resumeSession, completeSession
  } = useJobSession(taskId, userId);

  const [job_types, setjob_types] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedJobTypeId, setSelectedJobTypeId] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const selectorRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) {
        setShowSelector(false);
      }
    };
    if (showSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSelector]);

  // ── Fetch job types grouped by category ──
  useEffect(() => {
    const fetchjob_types = async () => {
      setLoadingTypes(true);
      try {
        const [catRes, typeRes] = await Promise.all([
          axiosInstance.post('/populate/read/job_categories', {
            filter: { isActive: true },
            sort: { order: 1 },
            limit: 50
          }),
          axiosInstance.post('/populate/read/job_types', {
            filter: { isActive: true },
            sort: { order: 1 },
            limit: 100,
            populateFields: { categoryId: 'name,icon,color' }
          })
        ]);
        setCategories(catRes.data?.data || []);
        setjob_types(typeRes.data?.data || []);
      } catch (err) {
        console.error('[JobSessionTimer] Error loading job types:', err);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchjob_types();
  }, []);

  // ── Group job types by category ──
  const groupedTypes = categories.map(cat => ({
    ...cat,
    types: job_types.filter(jt => {
      const catId = typeof jt.categoryId === 'object' ? jt.categoryId?._id : jt.categoryId;
      return catId === cat._id;
    })
  })).filter(g => g.types.length > 0);

  // ── Get selected job type info ──
  const selectedType = job_types.find(jt => jt._id === selectedJobTypeId);

  // ── Handlers ──
  const handleStart = async () => {
    if (!selectedJobTypeId) {
      toast.error('Select what you\'re working on first');
      setShowSelector(true);
      return;
    }
    try {
      await startSession(selectedJobTypeId);
      toast.success(`Started: ${selectedType?.name || 'Session'}`);
      onSessionChange?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePause = async () => {
    await pauseSession();
    toast('Session paused', { icon: '⏸️' });
    onSessionChange?.();
  };

  const handleResume = async () => {
    await resumeSession();
    toast('Session resumed', { icon: '▶️' });
    onSessionChange?.();
  };

  const handleComplete = async () => {
    const result = await completeSession();
    if (result) {
      const hrs = (result.duration / 3600).toFixed(2);
      const cost = result.productionCost?.toFixed(2) || '0.00';
      toast.success(`Completed: ${hrs}h — ₹${cost}`);
    } else {
      toast.success('Session completed');
    }
    setSelectedJobTypeId(null);
    onSessionChange?.();
  };

  return (
    <div className="space-y-3">
      {/* ── Timer Display ── */}
      <div className="flex items-center gap-3">
        <div className={`
          font-mono text-2xl font-bold tracking-wider
          ${isActive ? 'text-emerald-500' : isPaused ? 'text-amber-500' : 'text-gray-400'}
        `}>
          {hasSession ? formattedElapsed : '00:00:00'}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {!hasSession && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); handleStart(); }}
              disabled={loading}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              title="Start session"
            >
              <Play size={16} fill="white" />
            </button>
          )}

          {isActive && (
            <>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handlePause(); }}
                disabled={loading}
                className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-all shadow-sm"
                title="Pause"
              >
                <Pause size={16} fill="white" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleComplete(); }}
                disabled={loading}
                className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-sm"
                title="Stop & complete"
              >
                <Square size={14} fill="white" />
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleResume(); }}
                disabled={loading}
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-sm"
                title="Resume"
              >
                <Play size={16} fill="white" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleComplete(); }}
                disabled={loading}
                className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-sm"
                title="Stop & complete"
              >
                <Square size={14} fill="white" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Active Session Info ── */}
      {hasSession && session?.jobTypeId && (
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white font-medium"
            style={{ backgroundColor: (typeof session.jobTypeId === 'object' ? session.jobTypeId.color : selectedType?.color) || '#6B7280' }}>
            {typeof session.jobTypeId === 'object' ? session.jobTypeId.icon : selectedType?.icon} {typeof session.jobTypeId === 'object' ? session.jobTypeId.name : selectedType?.name}
          </span>
          {session.costSnapshot?.isBillable && (
            <span className="text-emerald-600 font-medium flex items-center gap-0.5">
              <Zap size={10} /> Billable
            </span>
          )}
          {session.costSnapshot?.isBillable === false && (
            <span className="text-gray-400 font-medium">Non-billable</span>
          )}
        </div>
      )}

      {/* ── Job Type Selector (only when no active session) ── */}
      {!hasSession && (
        <div className="relative" ref={selectorRef}>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setShowSelector(!showSelector); }}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border rounded-lg hover:border-blue-400 transition-colors bg-white"
          >
            <div className="flex items-center gap-2 text-left truncate">
              <Briefcase size={14} className="text-gray-400 flex-shrink-0" />
              {selectedType ? (
                <span className="flex items-center gap-1.5">
                  <span>{selectedType.icon}</span>
                  <span className="font-medium">{selectedType.name}</span>
                </span>
              ) : (
                <span className="text-gray-400">What are you doing?</span>
              )}
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${showSelector ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {showSelector && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl max-h-72 overflow-y-auto">
              {loadingTypes ? (
                <div className="p-4 text-center text-sm text-gray-400">Loading activities...</div>
              ) : groupedTypes.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">No job types configured</div>
              ) : (
                groupedTypes.map(group => (
                  <div key={group._id}>
                    {/* Category Header */}
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b sticky top-0 flex items-center gap-1.5">
                      <span>{group.icon}</span>
                      {group.name}
                    </div>
                    {/* Job Types */}
                    {group.types.map(jt => (
                      <button
                        key={jt._id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedJobTypeId(jt._id);
                          setShowSelector(false);
                        }}
                        className={`
                          w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors
                          ${selectedJobTypeId === jt._id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}
                        `}
                      >
                        <span className="w-5 text-center">{jt.icon}</span>
                        <span className="flex-1">{jt.name}</span>
                        {jt.isBillable && (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">₹</span>
                        )}
                        {jt.defaultDeliveryStage && (
                          <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">{jt.defaultDeliveryStage}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
