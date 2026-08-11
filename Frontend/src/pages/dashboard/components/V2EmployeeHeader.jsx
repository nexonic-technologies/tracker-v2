import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/authProvider';
import { useGenericAPI } from '../../../components/useGenericAPI';
import { Play, Square } from 'lucide-react';
import toast from 'react-hot-toast';

const formatTime = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getBrowserLocation = () => {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Geolocation permission denied or failed:", error.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  });
};

export default function V2EmployeeHeader({ attendance, refresh }) {
  const { user } = useAuth();
  const { create, read, update } = useGenericAPI();
  const [busy, setBusy] = useState(false);
  const [liveDuration, setLiveDuration] = useState('');

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

  const handleClockAction = async () => {
    if (busy || !user) return;
    setBusy(true);
    try {
      const loc = await getBrowserLocation();
      if (!loc) {
        const actionName = isCheckedIn ? 'clock out' : 'clock in';
        toast.error(`Location access is required to ${actionName}. Please enable location permissions in your browser to proceed.`);
        return;
      }

      // Get the correct local calendar date (YYYY-MM-DD) for the employee's current timezone
      const tzOffset = new Date().getTimezoneOffset();
      const localTime = new Date(Date.now() - (tzOffset * 60 * 1000));
      const todayStr = localTime.toISOString().split('T')[0];

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
              checkIn: new Date().toISOString(),
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
              checkIn: new Date().toISOString(),
              status: 'Present',
              managerId: user.managerId,
              workType: 'fixed',
              location: loc,
            },
            'Clocked In!'
          );
        }
      } else {
        // Clock Out
        if (todayDoc?._id) {
          await update(
            'attendances',
            todayDoc._id,
            {
              checkOut: new Date().toISOString(),
              location: loc,
            },
            'Clocked Out!'
          );
        } else {
          toast.error('Check-in record not found.');
        }
      }
      if (refresh) refresh();
    } catch (err) {
      console.error('Clock action failed:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-10 flex items-center justify-between px-4 py-1.5 border border-hairline rounded-tracker-md bg-surface text-xs select-none">
      <div className="flex items-center gap-2 truncate">
        <span className="font-semibold text-ink truncate">{user?.name}</span>
        <span className="text-ink-subtle">&middot;</span>
        <span
          className={`font-medium ${
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
        {isCheckedIn && liveDuration && (
          <>
            <span className="text-ink-subtle">&middot;</span>
            <span className="font-semibold text-ink tabular-nums">({liveDuration})</span>
          </>
        )}
      </div>

      <button
        onClick={handleClockAction}
        disabled={busy}
        className={`px-3 py-1 font-semibold rounded-tracker-md cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          isCheckedIn
            ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 border border-red-200/50'
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40 border border-emerald-200/50'
        }`}
      >
        {isCheckedIn ? (
          <>
            <Square className="h-3 w-3 fill-current" />
            <span>Clock Out</span>
          </>
        ) : (
          <>
            <Play className="h-3 w-3 fill-current" />
            <span>Clock In</span>
          </>
        )}
      </button>
    </div>
  );
}
