import React, { useState, useEffect } from 'react';
import { useAuth } from '@context/authProvider';
import { useGenericAPI } from '@components/useGenericAPI';
import { usePermissions } from '../../hooks/usePermissions';
import { Play, Square, Pause, Pin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getBrowserLocation } from '@utils/geolocation';

const formatTime = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// 240-Degree Arc SVG Component
const ShiftProgressArc = ({ progress = 0, displayState = 'not_started', size = 96, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  // 240 degree arc circumference = (240 / 360) * 2 * PI * radius
  const maxArcAngle = 240;
  const circumference = (maxArcAngle / 360) * 2 * Math.PI * radius;
  const validPct = Math.min(Math.max(progress ?? 0, 0), 100);
  const strokeDashoffset = circumference - (validPct / 100) * circumference;

  let strokeColor = 'var(--brand-solid)';
  if (displayState === 'on_break' || displayState === 'overtime') strokeColor = '#F59E0B'; // Amber
  if (displayState === 'missing_checkout' || displayState === 'issue') strokeColor = '#EF4444'; // Red
  if (displayState === 'completed') strokeColor = '#10B981'; // Green
  if (displayState === 'not_started') strokeColor = '#94A3B8'; // Slate

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform rotate-[150deg]">
        {/* Background Arc Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} 999`}
          strokeLinecap="round"
          className="text-slate-100 dark:text-zinc-800"
        />
        {/* Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} 999`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-sm font-extrabold text-ink leading-none">{validPct}%</span>
        <span className="text-[9px] font-bold text-ink-subtle mt-0.5">SHIFT</span>
      </div>
    </div>
  );
};

export default function V2ShiftArc({ attendance: propAttendance, refresh }) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { create, read, update } = useGenericAPI();
  const [busy, setBusy] = useState(false);
  const [localAttendance, setLocalAttendance] = useState(null);

  const canPunchIn = can('create', 'attendances');
  const canPunchOut = can('update', 'attendances');

  const attendance = localAttendance || propAttendance;

  useEffect(() => {
    setLocalAttendance(propAttendance);
  }, [propAttendance]);

  const [liveWorkedMin, setLiveWorkedMin] = useState(attendance?.workedMinutes || 0);

  const isCheckedIn = !!(
    attendance?.checkIn &&
    (attendance.punches && attendance.punches.length > 0
      ? !attendance.punches[attendance.punches.length - 1].checkOut
      : !attendance.checkOut)
  );

  const isCheckedOut = !!(
    attendance?.checkIn &&
    (attendance.punches && attendance.punches.length > 0
      ? !!attendance.punches[attendance.punches.length - 1].checkOut
      : !!attendance.checkOut)
  );

  // Live minute counter
  useEffect(() => {
    if (!isCheckedIn || !attendance?.checkIn) {
      setLiveWorkedMin(attendance?.workedMinutes || 0);
      return;
    }

    const calcLive = () => {
      let baseMs = 0;
      if (attendance.punches && attendance.punches.length > 0) {
        attendance.punches.forEach((p) => {
          if (p.checkIn && p.checkOut) {
            baseMs += Math.max(0, new Date(p.checkOut) - new Date(p.checkIn));
          }
        });
        const last = attendance.punches[attendance.punches.length - 1];
        if (last.checkIn && !last.checkOut) {
          baseMs += Math.max(0, Date.now() - new Date(last.checkIn).getTime());
        }
      } else {
        baseMs = Date.now() - new Date(attendance.checkIn).getTime();
      }
      setLiveWorkedMin(Math.round(baseMs / 60000));
    };

    const interval = setInterval(calcLive, 60000);
    calcLive();
    return () => clearInterval(interval);
  }, [isCheckedIn, attendance]);

  const workedHours = (liveWorkedMin / 60).toFixed(1);
  const expectedMin = attendance?.expectedMinutes || 480;
  const expectedHours = (expectedMin / 60).toFixed(1);
  const remainingMin = Math.max(0, expectedMin - liveWorkedMin);
  const remainingHours = (remainingMin / 60).toFixed(1);
  const progressPct = Math.min(100, Math.round((liveWorkedMin / expectedMin) * 100));

  const displayState = attendance?.displayState || (isCheckedIn ? 'active' : isCheckedOut ? 'completed' : 'not_started');

  const borderClass =
    displayState === 'on_break' || displayState === 'overtime'
      ? 'border-l-4 border-amber-500'
      : displayState === 'issue'
      ? 'border-l-4 border-red-500'
      : 'border border-hairline-soft';

  const canAction = isCheckedIn ? canPunchOut : canPunchIn;

  const handleClockAction = async () => {
    if (busy || !user || !canAction) return;
    setBusy(true);
    try {
      const locRes = await getBrowserLocation();
      if (locRes.status === 'DENIED') {
        const actionName = isCheckedIn ? 'clock out' : 'clock in';
        toast.error(`Location permission is blocked. Please allow location access in your browser to ${actionName}.`);
        return;
      }

      const loc = locRes.location || { latitude: 0, longitude: 0 };

      const tzOffset = new Date().getTimezoneOffset();
      const localTime = new Date(Date.now() - tzOffset * 60 * 1000);
      const todayStr = localTime.toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      const checkRes = await read('attendances', {
        filter: {
          employee: user.id || user._id,
          date: { $gte: `${todayStr}T00:00:00.000Z`, $lte: `${todayStr}T23:59:59.999Z` },
        },
        limit: 1,
      });
      const todayDoc = checkRes.data?.[0];

      if (!isCheckedIn) {
        if (todayDoc?._id) {
          await update('attendances', todayDoc._id, { checkIn: nowIso, location: loc }, 'Clocked In!');
        } else {
          await create(
            'attendances',
            {
              employee: user.id || user._id,
              employeeName: user.name,
              date: todayStr,
              checkIn: nowIso,
              status: 'Present',
              managerId: user.managerId,
              workType: 'fixed',
              location: loc,
            },
            'Clocked In!'
          );
        }
        setLocalAttendance({
          ...(todayDoc || {}),
          checkIn: nowIso,
          checkOut: null,
          punches: [
            ...(todayDoc?.punches || []),
            { checkIn: nowIso, location: loc }
          ],
          status: 'Present'
        });
      } else {
        if (todayDoc?._id) {
          await update('attendances', todayDoc._id, { checkOut: nowIso, location: loc }, 'Clocked Out!');
        } else {
          toast.error('Check-in record not found.');
        }
        setLocalAttendance({
          ...(todayDoc || attendance || {}),
          checkOut: nowIso,
          punches: (todayDoc?.punches || attendance?.punches || []).map((p, idx, arr) =>
            idx === arr.length - 1 ? { ...p, checkOut: nowIso, checkOutLocation: loc } : p
          )
        });
      }
      if (refresh) refresh();
    } catch (err) {
      console.error('Clock action failed:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`min-h-[96px] p-4 sm:p-5 bg-surface rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-200 select-none ${borderClass}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Arc & Info */}
        <div className="flex items-center gap-4">
          <ShiftProgressArc progress={progressPct} displayState={displayState} />

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-ink truncate">{user?.name}</span>
              <span className="text-ink-subtle">&middot;</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isCheckedIn
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : isCheckedOut
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                }`}
              >
                {isCheckedIn
                  ? `Checked in at ${formatTime(attendance?.checkIn)}`
                  : isCheckedOut
                  ? `Checked out at ${formatTime(attendance?.checkOut)}`
                  : 'Not Checked In'}
              </span>
            </div>

            <p className="text-xs text-ink-muted font-medium">
              <span className="font-bold text-ink">{workedHours}h worked</span>
              {expectedMin ? ` of ${expectedHours}h shift (${remainingHours}h remaining)` : ''}
            </p>

            {attendance?.expectedEnd && isCheckedIn && (
              <p className="text-[11px] text-ink-subtle flex items-center gap-1 font-medium">
                <Clock className="h-3 w-3 text-ink-subtle" />
                Est. shift end: <span className="font-semibold text-ink">{formatTime(attendance.expectedEnd)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
          <button
            onClick={handleClockAction}
            disabled={busy || !canAction}
            title={!canAction ? (isCheckedIn ? 'Clock-out managed by Admin' : 'Clock-in managed by Admin') : undefined}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs ${
              !canAction
                ? 'bg-surface-2 text-ink-muted border border-hairline'
                : isCheckedIn
                ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 border border-red-200/50 cursor-pointer'
                : 'tracker-btn-brand cursor-pointer'
            }`}
          >
            {isCheckedIn ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>{canPunchOut ? 'Clock Out' : 'Clock Out (Managed by Admin)'}</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{canPunchIn ? 'Clock In' : 'Clock In (Managed by Admin)'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Subdued Next Event Line */}
      {attendance?.nextEvent && (
        <div className="mt-3 pt-2.5 border-t border-hairline-soft flex items-center gap-1.5 text-xs text-ink-muted">
          <Pin className="h-3.5 w-3.5 text-brand flex-shrink-0" />
          <span className="font-medium truncate">
            Next: <strong className="text-ink font-semibold">{attendance.nextEvent.label}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
