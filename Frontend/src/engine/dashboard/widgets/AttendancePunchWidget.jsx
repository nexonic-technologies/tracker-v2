/**
 * Dashboard Engine — Dedicated Attendance Punch & Live Shift Widget
 *
 * Dedicated widget for Attendance-purchased users:
 * - Live punch status (Checked In / Checked Out)
 * - Real-time working duration counter
 * - Punch in/out timestamp & shift hours
 * - Direct one-click Check-In / Check-Out execution with location & toast
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import { useAuth } from '../../../context/authProvider';
import axiosInstance from '../../../api/axiosInstance';
import toast from 'react-hot-toast';
import {
  LogIn, LogOut, Clock, CheckCircle2,
  Calendar, Loader2, ArrowRight, Activity
} from 'lucide-react';

function AttendancePunchWidget({ config, data }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id || user?._id;

  const [loading, setLoading] = useState(false);
  const [attRecord, setAttRecord] = useState(data?.attendance || (data?.checkIn ? data : null));
  const [elapsed, setElapsed] = useState('');

  // Auto-fetch today's attendance record if not passed in props or on mount
  useEffect(() => {
    if (data?.attendance || data?.checkIn) {
      setAttRecord(data?.attendance || data);
      return;
    }

    if (!userId) return;
    const fetchTodayAttendance = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await axiosInstance.post('/populate/read/attendances', {
          filter: { employee: userId, date: today },
          limit: 1
        });
        if (res.data?.data?.[0]) {
          setAttRecord(res.data.data[0]);
        }
      } catch (e) { }
    };
    fetchTodayAttendance();
  }, [userId, data]);

  // Extract check-in state
  const checkInTime = attRecord?.checkIn ? new Date(attRecord.checkIn) : null;
  const isCheckedIn = Boolean(checkInTime && !attRecord?.checkOut);

  // Live timer for working duration
  useEffect(() => {
    if (!checkInTime || attRecord?.checkOut) {
      if (attRecord?.duration) setElapsed(attRecord.duration);
      return;
    }

    const updateTimer = () => {
      const ms = Date.now() - checkInTime.getTime();
      const hrs = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setElapsed(`${hrs}h ${mins}m ${secs}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [checkInTime, attRecord]);

  const handlePunch = async () => {
    if (!userId) {
      toast.error('Authentication required');
      return;
    }
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // 1. Fetch today's existing attendance
      const readRes = await axiosInstance.post('/populate/read/attendances', {
        filter: { employee: userId, date: today },
        limit: 1
      });
      const existing = readRes.data?.data?.[0];

      let res;
      if (existing) {
        // Standard Update: if currently checked in -> stamp checkOut; if checked out -> stamp new checkIn punch
        const isCurrentlyIn = Boolean(existing.checkIn && (!existing.checkOut || (existing.punches?.length > 0 && !existing.punches[existing.punches.length - 1].checkOut)));
        const updatePayload = isCurrentlyIn ? { checkOut: now } : { checkIn: now };

        res = await axiosInstance.put(`/populate/update/attendances/${existing._id}`, updatePayload);
        if (res.data?.success || res.data?.data) {
          toast.success(isCurrentlyIn ? 'Checked Out successfully' : 'Checked In successfully! Have a great day.');
          setAttRecord(res.data?.data || existing);
        }
      } else {
        // Standard Create: first check-in of the day
        res = await axiosInstance.post('/populate/create/attendances', {
          employee: userId,
          date: today,
          checkIn: now
        });
        if (res.data?.success || res.data?.data) {
          toast.success('Checked In successfully! Have a great day.');
          setAttRecord(res.data?.data || {});
        }
      }
    } catch (err) {
      navigate('/attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-3 p-1">
      {/* Top status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isCheckedIn ? 'bg-[var(--tracker-success)] animate-pulse' : 'bg-[var(--tracker-ink-subtle)]'}`} />
          <span className="text-xs font-bold text-[var(--tracker-ink)]">
            {isCheckedIn ? 'Currently Checked In' : 'Currently Checked Out'}
          </span>
        </div>
        <span className="text-[11px] font-mono font-semibold text-[var(--brand-solid)] bg-[var(--tracker-surface-1)] px-2 py-0.5 rounded-full border border-[var(--tracker-border)]">
          {elapsed || '0h 0m'}
        </span>
      </div>

      {/* Hero punch action button */}
      <button
        onClick={handlePunch}
        disabled={loading}
        type="button"
        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[var(--tracker-radius-md)] text-xs font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
          isCheckedIn
            ? 'bg-[var(--tracker-danger)] hover:bg-red-600 shadow-red-500/20'
            : 'bg-[var(--tracker-success)] hover:bg-emerald-600 shadow-emerald-500/20'
        }`}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isCheckedIn ? (
          <>
            <LogOut size={16} /> Check Out Now
          </>
        ) : (
          <>
            <LogIn size={16} /> Check In Now
          </>
        )}
      </button>

      {/* Footer info & jump link */}
      <div className="flex items-center justify-between text-[11px] text-[var(--tracker-ink-subtle)] pt-1 border-t border-[var(--tracker-border)]">
        <span>
          {checkInTime ? `In: ${checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No punch today'}
        </span>
        <button
          onClick={() => navigate('/attendance')}
          className="flex items-center gap-1 text-[var(--brand-solid)] hover:underline font-semibold cursor-pointer"
          type="button"
        >
          View Log <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

const manifest = {
  id: 'attendancePunch',
  name: 'Attendance Punch Widget',
  icon: 'Clock',
  category: WIDGET_CATEGORIES.ACTIONS,
  configurable: true,
  supportedDataTypes: ['object'],
  sizeConstraints: { minW: 3, maxW: 6, minH: 2, maxH: 4, defaultW: 4, defaultH: 3 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
    { type: 'metricPicker', name: 'dataSource', label: 'Data Source', defaultValue: 'employee.attendance' },
  ],
  defaultConfig: {
    title: 'Attendance & Punch',
    dataSource: 'employee.attendance',
  },
};

registerWidget('attendancePunch', AttendancePunchWidget, manifest);
export default AttendancePunchWidget;
