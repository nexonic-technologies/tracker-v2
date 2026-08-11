import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';

/**
 * useJobSession — manages the lifecycle of an activity-centric timer session.
 * 
 * Handles: start (with job type), pause, resume, complete, and live elapsed timer.
 * Talks to the backend via Populate API (time_tracker_sessions).
 * 
 * @param {string} taskId - The task ID to track time against
 * @param {string} userId - The current user's employee ID
 * @returns {Object} session state and controls
 */
export default function useJobSession(taskId, userId) {
  const [session, setSession] = useState(null);       // Current active/paused session
  const [elapsed, setElapsed] = useState(0);           // Live elapsed seconds
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  // ── Fetch active session for this task + user ──
  const fetchActiveSession = useCallback(async () => {
    if (!taskId || !userId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.post('/populate/list/time_tracker_sessions', {
        filter: {
          taskId,
          userId,
          status: { $in: ['active', 'paused'] }
        },
        limit: 1,
        sort: { startTime: -1 },
        populateFields: {
          jobTypeId: 'name,icon,color,categoryId',
          jobCategoryId: 'name,icon,color'
        }
      });
      const sessions = res.data?.data || [];
      if (sessions.length > 0) {
        setSession(sessions[0]);
        if (sessions[0].status === 'active') {
          // Calculate elapsed from startTime minus pauses
          const start = new Date(sessions[0].startTime).getTime();
          const now = Date.now();
          let totalPaused = 0;
          (sessions[0].pauses || []).forEach(p => {
            if (p.resumedAt) {
              totalPaused += p.duration || 0;
            } else {
              totalPaused += Math.floor((now - new Date(p.pausedAt).getTime()) / 1000);
            }
          });
          setElapsed(Math.max(0, Math.floor((now - start) / 1000) - totalPaused) || 0);
        }
      } else {
        setSession(null);
        setElapsed(0);
      }
    } catch (err) {
      console.error('[useJobSession] Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId, userId]);

  // ── Live timer ──
  useEffect(() => {
    if (session?.status === 'active') {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [session?.status]);

  // ── Initial fetch ──
  useEffect(() => {
    fetchActiveSession();
  }, [fetchActiveSession]);

  // ── Start session ──
  const startSession = useCallback(async (jobTypeId, notes = '') => {
    if (!taskId || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const body = {
        taskId,
        userId,
        status: 'active',
        startTime: new Date().toISOString()
      };
      if (jobTypeId) body.jobTypeId = jobTypeId;
      if (notes) body.notes = notes;

      const res = await axiosInstance.post('/populate/create/time_tracker_sessions', body);
      setSession(res.data?.data);
      setElapsed(0);
      return res.data?.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [taskId, userId]);

  // ── Pause session ──
  const pauseSession = useCallback(async () => {
    if (!session?._id) return;
    setLoading(true);
    try {
      const res = await axiosInstance.put(`/populate/update/time_tracker_sessions/${session._id}`, {
        status: 'paused'
      });
      setSession(prev => ({ ...prev, status: 'paused' }));
      return res.data?.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // ── Resume session ──
  const resumeSession = useCallback(async () => {
    if (!session?._id) return;
    setLoading(true);
    try {
      const res = await axiosInstance.put(`/populate/update/time_tracker_sessions/${session._id}`, {
        status: 'active'
      });
      setSession(prev => ({ ...prev, status: 'active' }));
      return res.data?.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // ── Complete session ──
  const completeSession = useCallback(async () => {
    if (!session?._id) return;
    setLoading(true);
    try {
      const res = await axiosInstance.put(`/populate/update/time_tracker_sessions/${session._id}`, {
        status: 'completed'
      });
      setSession(null);
      setElapsed(0);
      return res.data?.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // ── Format elapsed ──
  const formatElapsed = useCallback((secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  return {
    session,
    elapsed,
    formattedElapsed: formatElapsed(elapsed),
    loading,
    error,
    isActive: session?.status === 'active',
    isPaused: session?.status === 'paused',
    hasSession: !!session,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    refresh: fetchActiveSession
  };
}
