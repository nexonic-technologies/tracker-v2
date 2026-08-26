import React, { useState, useEffect } from 'react';
import { useAuth } from '@context/authProvider';
import { useGenericAPI } from '@components/useGenericAPI';
import { usePermissions } from '../../hooks/usePermissions';
import { Play, Square } from 'lucide-react';
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

export default function V2EmployeeHeader({ attendance: propAttendance, refresh }) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { create, read, update } = useGenericAPI();
  const [busy, setBusy] = useState(false);
  const [liveDuration, setLiveDuration] = useState('');
  const [localAttendance, setLocalAttendance] = useState(null);

  const canPunchIn = can('create', 'attendances');
  const canPunchOut = can('update', 'attendances');

  const attendance = localAttendance || propAttendance;

  useEffect(() => {
    setLocalAttendance(propAttendance);
  }, [propAttendance]);

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

  // Live timer for check-in duration
  useEffect(() => {
    if (!isCheckedIn || !attendance?.checkIn) {
      setLiveDuration(attendance?.duration || '');
      return;
    }

    const calculateLive = () => {
      let baseMs = 0;
      if (attendance.punches && attendance.punches.length > 0) {
        attendance.punches.forEach(p => {
          if (p.checkIn && p.checkOut) {
            baseMs += Math.max(0, new Date(p.checkOut) - new Date(p.checkIn));
          }
        });
        const lastPunch = attendance.punches[attendance.punches.length - 1];
        if (lastPunch.checkIn && !lastPunch.checkOut) {
          baseMs += Math.max(0, Date.now() - new Date(lastPunch.checkIn).getTime());
        }
      } else {
        baseMs = Date.now() - new Date(attendance.checkIn).getTime();
      }
      const hours = Math.floor(baseMs / 3600000);
      const mins = Math.floor((baseMs % 3600000) / 60000);
      setLiveDuration(`${hours}h ${mins}m`);
    };

    const interval = setInterval(calculateLive, 60000);
    calculateLive();

    return () => clearInterval(interval);
  }, [isCheckedIn, attendance]);

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

      // Get the correct local calendar date (YYYY-MM-DD) for the employee's current timezone
      const tzOffset = new Date().getTimezoneOffset();
      const localTime = new Date(Date.now() - (tzOffset * 60 * 1000));
      const todayStr = localTime.toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      // Retrieve today's record if it exists
      const checkRes = await read('attendances', {
        filter: {
          employee: user.id || user._id,
          date: { $gte: `${todayStr}T00:00:00.000Z`, $lte: `${todayStr}T23:59:59.999Z` },
        },
        limit: 1,
      });
      const todayDoc = checkRes.data?.[0];

      if (!isCheckedIn) {
        // Clock In
        if (todayDoc?._id) {
          await update(
            'attendances',
            todayDoc._id,
            {
              checkIn: nowIso,
              location: loc,
            },
            'Clocked In!'
          );
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
        // Clock Out
        if (todayDoc?._id) {
          await update(
            'attendances',
            todayDoc._id,
            {
              checkOut: nowIso,
              location: loc,
            },
            'Clocked Out!'
          );
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

  const borderClass = isCheckedIn
    ? 'border-l-4 border-emerald-500'
    : isCheckedOut
    ? 'border-l-4 border-amber-500'
    : 'border-l-4 border-red-500';

  return (
    <div className={`min-h-[80px] flex items-center justify-between p-4 border border-hairline-soft rounded-2xl bg-surface text-xs select-none shadow-xs ${borderClass}`}>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-ink text-sm truncate">{user?.name}</span>
          <span className="text-ink-subtle">&middot;</span>
          <span
            className={`font-semibold ${
              isCheckedIn
                ? 'text-emerald-600 dark:text-emerald-400'
                : isCheckedOut
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isCheckedIn
              ? `Checked In at ${formatTime(attendance?.checkIn)}`
              : isCheckedOut
              ? `Checked Out at ${formatTime(attendance?.checkOut)}`
              : 'Not Checked In'}
          </span>
        </div>
        {isCheckedIn && liveDuration && (
          <p className="text-ink-muted text-xs font-medium">
            Working for <span className="font-semibold text-ink tabular-nums">{liveDuration}</span>
          </p>
        )}
      </div>

      <button
        onClick={handleClockAction}
        disabled={busy || !canAction}
        title={!canAction ? (isCheckedIn ? 'Clock-out managed by Admin' : 'Clock-in managed by Admin') : undefined}
        className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs ${
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
  );
}
