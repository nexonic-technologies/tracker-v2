import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useGenericAPI } from "@hooks/useGenericAPI";
import toast from "react-hot-toast";
import {
  LogIn, LogOut, CheckCircle, XCircle,
  Clock, TrendingUp, Zap, ChevronLeft, ChevronRight, Plus, MapPin
} from "lucide-react";

/* ════════════════════════════════
   HELPERS
   ════════════════════════════════ */
const fmt12 = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const fmtHM = (hrs) => {
  const h = Math.floor(hrs);
  const m = Math.floor((hrs - h) * 60);
  return h === 0 && m === 0 ? "—" : `${h}h ${m}m`;
};

const getWeekDays = (offset = 0) => {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

const getDaysInMonth = (month, year) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const getLocalDateString = (d = new Date()) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const aStr = typeof a === "string" ? a.split("T")[0] : getLocalDateString(a);
  const bStr = typeof b === "string" ? b.split("T")[0] : getLocalDateString(b);
  return aStr === bStr;
};

const isToday = (d) => isSameDay(d, new Date());
const isFuture = (d) => new Date(d) > new Date() && !isToday(d);
const isWeekend = (d) => [0, 6].includes(new Date(d).getDay());

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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TARGET = 8;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/* ════════════════════════════════
   CIRCULAR RING
   ════════════════════════════════ */
const Ring = ({ pct, size = 52, sw = 5, color }) => {
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-hairline-soft" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={c - (Math.min(pct, 100) / 100) * c}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)" }} />
    </svg>
  );
};

/* ════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════ */
const AttendancePage = () => {
  const { user, loading: authLoading } = useAuth();
  const { read, create, update } = useGenericAPI();
  const navigate = useNavigate();

  const [todayRec, setTodayRec]         = useState(null);
  const [records, setRecords]           = useState([]);
  const [pageLoading, setPageLoading]   = useState(true);
  const [actionBusy, setActionBusy]     = useState(false);
  const [now, setNow]                   = useState(new Date());

  // View settings states
  const [viewType, setViewType]         = useState("monthly"); // "monthly" | "weekly" | "daywise"
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [weekOffset, setWeekOffset]     = useState(0);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);

  // Drawer modal state for monthly details view
  const [detailDate, setDetailDate]     = useState(null);

  /* clock ticking */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /* active hours calculator */
  const activeHours = useMemo(() => {
    if (!todayRec?.checkIn) return 0;
    if (todayRec.punches && todayRec.punches.length > 0) {
      let totalMs = 0;
      todayRec.punches.forEach(p => {
        const start = new Date(p.checkIn);
        const end = p.checkOut ? new Date(p.checkOut) : now;
        totalMs += Math.max(0, end - start);
      });
      return totalMs / 3_600_000;
    }
    const end = todayRec.checkOut ? new Date(todayRec.checkOut) : now;
    return Math.max(0, (end - new Date(todayRec.checkIn)) / 3_600_000);
  }, [todayRec, now]);

  // Determine active view days list
  const activeDaysList = useMemo(() => {
    if (viewType === "monthly") {
      return getDaysInMonth(selectedMonth, selectedYear);
    } else if (viewType === "weekly") {
      return getWeekDays(weekOffset);
    } else {
      const targetDay = new Date();
      targetDay.setDate(targetDay.getDate() + selectedDayOffset);
      return [targetDay];
    }
  }, [viewType, selectedMonth, selectedYear, weekOffset, selectedDayOffset]);

  /* fetch today's record independently */
  const fetchTodayRecord = useCallback(async () => {
    if (!user?.id) return;
    try {
      const todayStr = getLocalDateString();
      const res = await read('attendances', {
        filter: {
          employee: user.id,
          date: {
            $gte: `${todayStr}T00:00:00.000Z`,
            $lte: `${todayStr}T23:59:59.999Z`
          }
        }
      });
      const recs = res?.data || [];
      setTodayRec(recs.length > 0 ? recs[0] : null);
    } catch (e) {
      // handled
    }
  }, [user?.id]);

  /* fetch range records based on current view type */
  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    try {
      const days = activeDaysList;
      const startLocalDate = getLocalDateString(days[0]);
      const endLocalDate = getLocalDateString(days[days.length - 1]);

      const res = await read('attendances', {
        filter: {
          employee: user.id,
          date: {
            $gte: `${startLocalDate}T00:00:00.000Z`,
            $lte: `${endLocalDate}T23:59:59.999Z`
          },
        },
      });
      setRecords(res?.data || []);
    } catch (e) {
      // handled
    } finally {
      setPageLoading(false);
    }
  }, [user?.id, activeDaysList]);

  useEffect(() => {
    if (!user?.id || authLoading) return;
    fetchTodayRecord();
  }, [user?.id, authLoading, fetchTodayRecord]);

  useEffect(() => {
    if (!user?.id || authLoading) return;
    fetchAll();
  }, [user?.id, authLoading, fetchAll]);

  /* check in handler */
  const handleCheckIn = async () => {
    if (!user || actionBusy) return;
    setActionBusy(true);
    try {
      const loc = await getBrowserLocation();
      if (!loc) {
        toast.error("Location access is required to check in. Please enable location permissions in your browser to proceed.");
        return;
      }

      if (todayRec?._id) {
        await update('attendances', todayRec._id, {
          checkIn: new Date().toISOString(),
          location: loc,
        }, "Checked in!");
      } else {
        await create('attendances', {
          employee: user.id, employeeName: user.name,
          date: getLocalDateString(),
          checkIn: new Date().toISOString(), status: "Present",
          managerId: user.managerId, workType: "fixed",
          location: loc,
        }, "Checked in!");
      }
      await fetchTodayRecord();
      await fetchAll();
    } catch (e) { /* handled */ }
    finally { setActionBusy(false); }
  };

  /* check out handler */
  const handleCheckOut = async () => {
    if (!todayRec || actionBusy) return;
    setActionBusy(true);
    try {
      const loc = await getBrowserLocation();
      if (!loc) {
        toast.error("Location access is required to check out. Please enable location permissions in your browser to proceed.");
        return;
      }

      await update('attendances', todayRec._id, {
        checkOut: new Date().toISOString(),
        location: loc,
      }, "Checked out!");
      await fetchTodayRecord();
      await fetchAll();
    } catch (e) { /* handled */ }
    finally { setActionBusy(false); }
  };

  /* stats calculation */
  const presentDays = useMemo(() => {
    return records.filter((r) => r.status === "Present" || r.checkIn).length;
  }, [records]);

  const totalHrs = useMemo(() => {
    return records.reduce((acc, r) => {
      if (!r.checkIn) return acc;
      if (isSameDay(r.date, new Date())) {
        if (r.punches && r.punches.length > 0) {
          let totalMs = 0;
          r.punches.forEach(p => {
            const start = new Date(p.checkIn);
            const end = p.checkOut ? new Date(p.checkOut) : new Date();
            totalMs += Math.max(0, end - start);
          });
          return acc + totalMs / 3_600_000;
        }
        const end = r.checkOut ? new Date(r.checkOut) : new Date();
        return acc + Math.max(0, (end - new Date(r.checkIn)) / 3_600_000);
      }
      if (typeof r.workHours === 'number') return acc + r.workHours;
      const end = r.checkOut ? new Date(r.checkOut) : new Date(r.checkIn);
      return acc + Math.max(0, (end - new Date(r.checkIn)) / 3_600_000);
    }, 0);
  }, [records]);

  const workDaysPassed = useMemo(() => {
    return activeDaysList.filter((d) => !isFuture(d) && !isWeekend(d)).length;
  }, [activeDaysList]);

  const attendRate = workDaysPassed > 0 ? Math.round((presentDays / workDaysPassed) * 100) : 0;

  /* day helpers */
  const getDayRec  = (d) => records.find((r) => isSameDay(r.date, d));
  
  const getDayHrs  = (d) => {
    const r = getDayRec(d);
    if (!r?.checkIn) return null;
    if (isToday(d)) {
      if (r.punches && r.punches.length > 0) {
        let totalMs = 0;
        r.punches.forEach(p => {
          const start = new Date(p.checkIn);
          const end = p.checkOut ? new Date(p.checkOut) : new Date();
          totalMs += Math.max(0, end - start);
        });
        return totalMs / 3_600_000;
      }
      const end = r.checkOut ? new Date(r.checkOut) : new Date();
      return Math.max(0, (end - new Date(r.checkIn)) / 3_600_000);
    }
    if (typeof r.workHours === 'number') return r.workHours;
    const end = r.checkOut ? new Date(r.checkOut) : new Date(r.checkIn);
    return Math.max(0, (end - new Date(r.checkIn)) / 3_600_000);
  };

  const dayStatus = (d) => {
    const r = getDayRec(d);
    if (r && r.status === "Leave") return "leave";
    if (isFuture(d))  return "future";
    if (isWeekend(d)) return "weekend";
    if (!r)            return "absent";
    if (r.checkIn)    return "present";
    return "absent";
  };

  const STATUS = {
    present: { bg: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400", label: "Present" },
    absent:  { bg: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400", label: "Absent" },
    leave:   { bg: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400", label: "Leave" },
    weekend: { bg: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400", label: "Weekend" },
    future:  { bg: "bg-transparent text-ink-tertiary border border-dashed border-hairline", label: "Upcoming" },
  };

  const isCurrentlyCheckedIn = !!(
    todayRec &&
    todayRec.checkIn &&
    (todayRec.punches && todayRec.punches.length > 0
      ? !todayRec.punches[todayRec.punches.length - 1].checkOut
      : !todayRec.checkOut)
  );

  const hasIn  = !!todayRec?.checkIn;
  const hasOut = !!todayRec?.checkOut;
  const pct    = Math.min((activeHours / TARGET) * 100, 100);
  const ringColor = pct >= 100 ? "var(--tracker-success)" : pct >= 60 ? "var(--tracker-ink)" : "var(--tracker-ink-subtle)";

  /* Date formatting labels */
  const monthNameLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
  
  const weekLabel = () => {
    const days = getWeekDays(weekOffset);
    const mon = days[0];
    const sat = days[5];
    return `${mon.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sat.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const dayLabel = () => {
    const targetDay = new Date();
    targetDay.setDate(targetDay.getDate() + selectedDayOffset);
    return targetDay.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  if (pageLoading) return (
    <div className="flex items-center justify-center h-full bg-canvas text-ink">
      <div className="h-8 w-8 border-4 border-hairline border-t-accent rounded-full animate-spin" />
    </div>
  );

  const detailRecord = detailDate ? getDayRec(detailDate) : null;

  return (
    <div data-module="hr" className="h-full flex flex-col gap-3 overflow-y-auto bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      
      {/* ─── TODAY CARD ─── */}
      <div className="bg-surface rounded-tracker-card border border-hairline p-5 lg:p-6 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-ink" />
            <span className="text-[16px] font-medium text-ink leading-tight">Today</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] font-medium ${hasIn ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'}`}>
            {hasIn ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {hasIn ? "Present" : "Absent"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:gap-10">
          {/* Check In */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[8px] bg-surface-1 flex items-center justify-center">
              <LogIn className="h-5 w-5 text-ink" />
            </div>
            <div>
              <p className="text-[12px] text-ink-subtle mb-0.5">Check In</p>
              <p className={`text-[15px] font-medium tabular-nums leading-none ${hasIn ? 'text-ink' : 'text-ink-tertiary'}`}>
                {hasIn ? fmt12(todayRec.checkIn) : "--:--"}
              </p>
            </div>
          </div>

          {/* Check Out */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[8px] bg-surface-1 flex items-center justify-center">
              <LogOut className="h-5 w-5 text-ink" />
            </div>
            <div>
              <p className="text-[12px] text-ink-subtle mb-0.5">Check Out</p>
              <p className={`text-[15px] font-medium tabular-nums leading-none ${hasOut ? 'text-ink' : 'text-ink-tertiary'}`}>
                {hasOut ? fmt12(todayRec.checkOut) : "--:--"}
              </p>
            </div>
          </div>

          {/* Hours Ring */}
          <div className="flex items-center gap-3">
            <div className="relative inline-flex items-center justify-center">
              <Ring pct={pct} size={44} sw={4} color={ringColor} />
              <span className="absolute text-[11px] font-medium text-ink">
                {Math.floor(activeHours)}h
              </span>
            </div>
            <div>
              <p className="text-[12px] text-ink-subtle mb-0.5">Active</p>
              <p className="text-[15px] font-medium text-ink leading-none">{fmtHM(activeHours)}</p>
            </div>
          </div>

          {/* Spacer + Action */}
          <div className="ml-auto flex-shrink-0 mt-2 sm:mt-0">
            {!isCurrentlyCheckedIn ? (
              <button onClick={handleCheckIn} disabled={actionBusy}
                className="flex items-center gap-2 px-5 py-2.5 tracker-btn-accent cursor-pointer disabled:opacity-50">
                <LogIn className="h-4 w-4" />
                {actionBusy ? "..." : (todayRec?.checkIn ? "Check In Again" : "Check In")}
              </button>
            ) : (
              <button onClick={handleCheckOut} disabled={actionBusy}
                className="flex items-center gap-2 px-5 py-2.5 tracker-btn-secondary cursor-pointer disabled:opacity-50">
                <LogOut className="h-4 w-4" />
                {actionBusy ? "..." : "Check Out"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── STATS ROW ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        <StatCard icon={CheckCircle} value={`${presentDays}/${workDaysPassed}`} label="Days Present" />
        <StatCard icon={Clock}       value={fmtHM(totalHrs)}                   label="Active Hours" />
        <StatCard icon={TrendingUp}  value={`${attendRate}%`}                  label="Attendance Rate" />
        <StatCard icon={Zap}         value={fmtHM(activeHours)}                label="Today Active" />
      </div>

      {/* ─── ATTENDANCE LIST & VIEW SWITCHER ─── */}
      <div className="bg-surface rounded-tracker-card border border-hairline flex-1 min-h-[400px] flex flex-col shadow-sm">
        
        {/* Header toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-hairline-soft">
          <div className="flex items-center gap-3">
            <span className="text-[16px] font-medium text-ink">Attendance Logs</span>
            
            {/* View Switcher Tabs */}
            <div className="flex bg-surface-1 p-0.5 rounded-[8px] text-[12px] font-medium border border-hairline-soft">
              <button 
                onClick={() => setViewType("monthly")}
                className={`px-3 py-1 rounded-[6px] transition-all ${viewType === "monthly" ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink"}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setViewType("weekly")}
                className={`px-3 py-1 rounded-[6px] transition-all ${viewType === "weekly" ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink"}`}
              >
                Weekly
              </button>
              <button 
                onClick={() => setViewType("daywise")}
                className={`px-3 py-1 rounded-[6px] transition-all ${viewType === "daywise" ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink"}`}
              >
                Day-wise
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/Attendance/leave-regularization')}
              className="flex items-center gap-1.5 tracker-btn-secondary py-1 px-3 text-[12px] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Apply Leave / Request
            </button>

            <div className="h-6 w-px bg-hairline-soft" />

            {/* Monthly Navigators */}
            {viewType === "monthly" && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (selectedMonth === 0) {
                      setSelectedMonth(11);
                      setSelectedYear(prev => prev - 1);
                    } else {
                      setSelectedMonth(prev => prev - 1);
                    }
                  }}
                  className="p-1 rounded-[6px] hover:bg-surface-1 text-ink-muted transition-colors cursor-pointer"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-transparent text-sm font-semibold border-none focus:outline-none focus:ring-0 cursor-pointer pr-8 py-1 rounded-[6px] hover:bg-surface-1"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>

                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-transparent text-sm font-semibold border-none focus:outline-none focus:ring-0 cursor-pointer pr-8 py-1 rounded-[6px] hover:bg-surface-1"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    if (selectedMonth === 11) {
                      setSelectedMonth(0);
                      setSelectedYear(prev => prev + 1);
                    } else {
                      setSelectedMonth(prev => prev + 1);
                    }
                  }}
                  className="p-1 rounded-[6px] hover:bg-surface-1 text-ink-muted transition-colors cursor-pointer"
                  aria-label="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Weekly Navigators */}
            {viewType === "weekly" && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  className="p-1.5 rounded-[6px] hover:bg-surface-1 text-ink-muted transition-colors cursor-pointer"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className={`px-3 py-1 rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer ${weekOffset === 0 ? 'bg-surface-1 text-ink' : 'text-ink-muted hover:bg-surface-1'}`}
                >
                  {weekOffset === 0 ? "This Week" : weekLabel()}
                </button>
                <button
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  className="p-1.5 rounded-[6px] hover:bg-surface-1 text-ink-muted transition-colors cursor-pointer"
                  aria-label="Next week"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Day-wise Navigators */}
            {viewType === "daywise" && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedDayOffset(prev => prev - 1)}
                  className="p-1.5 rounded-[6px] hover:bg-surface-1 text-ink-muted transition-colors cursor-pointer"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedDayOffset(0)}
                  className={`px-3 py-1 rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer ${selectedDayOffset === 0 ? 'bg-surface-1 text-ink' : 'text-ink-muted hover:bg-surface-1'}`}
                >
                  {selectedDayOffset === 0 ? "Today" : dayLabel()}
                </button>
                <button
                  onClick={() => setSelectedDayOffset(prev => prev + 1)}
                  className="p-1.5 rounded-[6px] hover:bg-surface-1 text-ink-muted transition-colors cursor-pointer"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* View Layout Renderer with Fixed Height & Scroll */}
        <div className="flex-1 max-h-[380px] overflow-y-auto scrollbar-thin">
          {viewType === "monthly" ? (
            /* Monthly Calendar Grid Layout */
            <div className="p-5">
              <div className="grid grid-cols-7 gap-2 mb-3 text-center text-xs font-semibold text-ink-subtle">
                {DAY_LABELS.map(lbl => <div key={lbl}>{lbl}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {/* Pad first week days */}
                {Array.from({ length: activeDaysList[0].getDay() }).map((_, i) => (
                  <div key={`pad-${i}`} className="h-20 bg-surface-1/10 rounded-[8px] border border-dashed border-hairline-soft" />
                ))}
                
                {/* Calendar Days */}
                {activeDaysList.map((d, i) => {
                  const st = dayStatus(d);
                  const hrs = getDayHrs(d);
                  const rec = getDayRec(d);
                  const sty = STATUS[st];
                  const tod = isToday(d);
                  
                  return (
                    <div
                      key={i}
                      onClick={() => setDetailDate(d)}
                      className={`h-20 p-2 rounded-[8px] border cursor-pointer transition-all flex flex-col justify-between hover:shadow-xs ${
                        tod 
                          ? "border-accent bg-accent-muted/20" 
                          : "border-hairline hover:border-accent bg-surface"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-[12px] font-semibold ${tod ? 'text-accent' : 'text-ink'}`}>{d.getDate()}</span>
                        {rec?.checkIn && (
                          <span className="text-[10px] tabular-nums text-ink-subtle font-medium">{fmt12(rec.checkIn).split(" ")[0]}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between gap-1 flex-wrap mt-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-[4px] font-bold ${sty.bg}`}>
                          {sty.label}
                        </span>
                        {hrs != null && (
                          <span className="text-[10px] tabular-nums font-semibold text-ink-muted">
                            {hrs.toFixed(1)}h
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* List Layout (Weekly & Day-wise) */
            <div className="divide-y divide-hairline-soft">
              {activeDaysList.map((d, i) => {
                const st  = dayStatus(d);
                const hrs = getDayHrs(d);
                const rec = getDayRec(d);
                const sty = STATUS[st];
                const tod = isToday(d);
                const punches = rec?.punches || [];

                return (
                  <div
                    key={i}
                    onClick={() => setDetailDate(d)}
                    className={`
                      flex flex-wrap items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors
                      ${tod ? 'bg-surface-1/50' : 'hover:bg-surface-1/30'}
                    `}
                  >
                    {/* Day label + date */}
                    <div className={`w-24 flex-shrink-0 ${tod ? 'text-ink' : 'text-ink-muted'}`}>
                      <span className="text-[13px] font-bold">{DAY_LABELS[d.getDay()]}</span>
                      <span className="text-[12px] ml-1.5 font-normal text-ink-subtle">{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>

                    {/* Status badge */}
                    <div className={`px-2.5 py-1 rounded-[6px] text-[11px] font-bold flex-shrink-0 ${sty.bg}`}>
                      {sty.label}
                    </div>

                    {/* Multi-punch sessions or Single check-in/out */}
                    {punches.length > 1 ? (
                      <div className="flex flex-col gap-1.5 min-w-[260px] flex-1 py-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle mb-0.5">
                          Punch Sessions ({punches.length})
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {punches.map((p, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-xs font-semibold bg-surface-1/80 px-3 py-1.5 rounded-lg border border-hairline-soft w-fit shadow-2xs">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface text-ink-subtle">
                                Session #{idx + 1}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <LogIn className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="font-bold text-ink tabular-nums">{fmt12(p.checkIn)}</span>
                              </div>
                              <span className="text-ink-subtle">➔</span>
                              <div className="flex items-center gap-1.5">
                                <LogOut className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                <span className={p.checkOut ? "font-bold text-ink tabular-nums" : "text-emerald-600 dark:text-emerald-400 font-extrabold"}>
                                  {p.checkOut ? fmt12(p.checkOut) : "Active"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Check In */}
                        <div className="flex items-center gap-2 w-28 flex-shrink-0">
                          <LogIn className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className={`text-[13px] tabular-nums ${rec?.checkIn ? 'text-ink font-bold' : 'text-ink-tertiary'}`}>
                            {rec?.checkIn ? fmt12(rec.checkIn) : "--:--"}
                          </span>
                        </div>

                        {/* Check Out */}
                        <div className="flex items-center gap-2 w-28 flex-shrink-0">
                          <LogOut className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          <span className={`text-[13px] tabular-nums ${rec?.checkOut ? 'text-ink font-bold' : 'text-ink-tertiary'}`}>
                            {rec?.checkOut ? fmt12(rec.checkOut) : "--:--"}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Hours Bar */}
                    <div className="flex-1 min-w-[120px] flex items-center justify-end">
                      {hrs != null ? (
                        <div className="flex items-center gap-3 w-full max-w-[200px]">
                          <div className="flex-1 h-2 bg-hairline rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min((hrs / TARGET) * 100, 100)}%`,
                                background: hrs >= TARGET ? 'var(--tracker-success)' : 'var(--tracker-ink)',
                              }}
                            />
                          </div>
                          <span className="text-[13px] font-bold text-ink tabular-nums">{fmtHM(hrs)}</span>
                        </div>
                      ) : (
                        <span className="text-[13px] text-ink-tertiary">
                          {st === "weekend" ? "Off" : st === "future" ? "" : "—"}
                        </span>
                      )}
                    </div>

                    {/* Arrow navigator */}
                    <ChevronRight className="h-4 w-4 text-ink-subtle flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── DETAIL DRAWER (Monthly Details View) ─── */}
      {detailDate && (
        <DayDetailsDrawer 
          date={detailDate}
          record={detailRecord}
          onClose={() => setDetailDate(null)}
        />
      )}
    </div>
  );
};

/* ── DayDetailsDrawer Component ── */
function DayDetailsDrawer({ date, record, onClose }) {
  if (!date) return null;
  const isWeekendDay = isWeekend(date);
  const status = record ? record.status : isWeekendDay ? "Weekend" : "Absent";
  const punches = record?.punches || [];
  
  // Calculate active hours dynamically if punches are open
  const hrs = record?.workHours != null 
    ? record.workHours 
    : record?.checkIn 
      ? Math.max(0, (new Date(record.checkOut || new Date()) - new Date(record.checkIn)) / 3600000) 
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface h-full shadow-2xl flex flex-col p-6 animate-slide-in overflow-y-auto border-l border-hairline">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-hairline">
          <div>
            <h3 className="text-lg font-semibold text-ink">
              {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
            <p className="text-xs text-ink-muted mt-1">Detailed Attendance Logs</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-1 rounded-tracker-md text-ink-muted hover:text-ink cursor-pointer">
            <XCircle size={20} />
          </button>
        </div>

        {/* Status Section */}
        <div className="py-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-subtle">Status</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              status === "Present" ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" :
              status === "Leave" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400" :
              status === "Weekend" ? "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400" :
              "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400"
            }`}>
              {status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-1 p-3.5 rounded-tracker-md">
              <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-1">Check In</span>
              <span className="text-sm font-medium text-ink tabular-nums">
                {record?.checkIn ? fmt12(record.checkIn) : "—"}
              </span>
            </div>
            <div className="bg-surface-1 p-3.5 rounded-tracker-md">
              <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-1">Check Out</span>
              <span className="text-sm font-medium text-ink tabular-nums">
                {record?.checkOut ? fmt12(record.checkOut) : "—"}
              </span>
            </div>
          </div>

          <div className="bg-surface-1 p-3.5 rounded-tracker-md flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-0.5">Work Hours</span>
              <span className="text-sm font-semibold text-ink tabular-nums">
                {record?.checkIn ? fmtHM(hrs) : "—"}
              </span>
            </div>
            {hrs >= TARGET && (
              <span className="text-xs text-green-600 font-medium">Goal met ✓</span>
            )}
          </div>
        </div>

        {/* Punch logs */}
        <div className="flex-1 space-y-4">
          <h4 className="text-sm font-semibold text-ink flex items-center gap-1.5 pb-2 border-b border-hairline-soft">
            <Clock size={16} />
            Punch History
          </h4>

          {punches.length === 0 ? (
            <div className="text-center py-6 text-ink-subtle text-xs">
              {record?.checkIn ? "Single punch session recorded." : "No punches logged for this date."}
            </div>
          ) : (
            <div className="relative border-l border-hairline ml-3.5 pl-5 space-y-5">
              {punches.map((p, index) => (
                <div key={index} className="relative">
                  <span className="absolute -left-[27px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface border border-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-ink-subtle">Session #{index + 1}</span>
                    <div className="grid grid-cols-2 gap-2 mt-1.5 text-xs text-ink-muted">
                      <div>In: <span className="font-medium text-ink tabular-nums">{fmt12(p.checkIn)}</span></div>
                      <div>Out: <span className="font-medium text-ink tabular-nums">{p.checkOut ? fmt12(p.checkOut) : "Active"}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location Coordinates if available */}
        {record?.location && (
          <div className="mt-auto pt-4 border-t border-hairline space-y-3">
            {record.location.latitude && record.location.longitude && (
              <div className="w-full h-40 rounded-lg overflow-hidden border border-hairline shadow-inner">
                <iframe
                  title="Geotag Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src={`https://maps.google.com/maps?q=${record.location.latitude},${record.location.longitude}&z=15&output=embed`}
                  allowFullScreen
                />
              </div>
            )}
            <div>
              <span className="text-xs font-semibold text-ink-subtle flex items-center gap-1 mb-1">
                <MapPin size={12} />
                Geotag Coordinates
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] text-ink-muted tabular-nums">
                <div>Lat: {record.location.latitude || "N/A"}</div>
                <div>Lng: {record.location.longitude || "N/A"}</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Sub Components ── */
const StatCard = ({ icon: Icon, value, label }) => (
  <div className="bg-surface rounded-tracker-lg border border-hairline p-4 flex items-center gap-3 shadow-sm">
    <div className="h-10 w-10 rounded-tracker-md bg-accent-muted flex items-center justify-center flex-shrink-0">
      <Icon className="h-5 w-5 text-accent" />
    </div>
    <div>
      <p className="text-[18px] font-semibold text-ink leading-[1.20] tabular-nums">{value}</p>
      <p className="text-[12px] text-ink-muted mt-0.5">{label}</p>
    </div>
  </div>
);

export default AttendancePage;