import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useGenericAPI } from "@hooks/useGenericAPI";
import axiosInstance from "@api/axiosInstance";
import toast from "react-hot-toast";
import ProfileImage from "@components/Common/ProfileImage";
import {
  LogIn, LogOut, CheckCircle, XCircle,
  Clock, TrendingUp, Zap, ChevronLeft, ChevronRight, Plus, MapPin,
  Users, CheckSquare, Search, SlidersHorizontal, ArrowRight,
  ShieldCheck, AlertCircle, CalendarDays, Check, X, FileText,
  Activity, ExternalLink, RefreshCw, Send, Loader2
} from "lucide-react";

/* ════════════════════════════════
   HELPERS & DATE UTILITIES
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
   CIRCULAR PROGRESS RING
   ════════════════════════════════ */
const Ring = ({ pct, size = 52, sw = 5, color }) => {
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-hairline-soft" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={c - (Math.min(pct, 100) / 100) * c}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
};

/* ════════════════════════════════
   MAIN ATTENDANCE HUB
   ════════════════════════════════ */
const AttendancePage = () => {
  const { user, loading: authLoading } = useAuth();
  const { read, create, update } = useGenericAPI();
  const navigate = useNavigate();

  // Active Control Center Tab: "my" | "team" | "approvals"
  const [activeTab, setActiveTab] = useState("my");

  // Dynamic capability resolution (Sacred Zero-Hardcode Law)
  const isSuperAdmin = Boolean(
    user?.isSuperAdmin === true ||
    user?.isSuperAdmin === 'true' ||
    user?.role?.isSuperAdmin === true ||
    user?.roleMeta?.isSuperAdmin === true ||
    user?.role === 'Super Admin' ||
    user?.roleTitle === 'Super Admin' ||
    user?.role?.name === 'Super Admin' ||
    user?.role?.title === 'Super Admin'
  );

  const canViewTeam = Boolean(
    isSuperAdmin ||
    user?.canViewTeam === true ||
    user?.roleMeta?.canViewTeam === true ||
    user?.isManager === true ||
    user?.departmentHead === true ||
    user?.subordinatesCount > 0
  );

  // ── My Attendance States ──
  const [todayRec, setTodayRec]         = useState(null);
  const [records, setRecords]           = useState([]);
  const [pageLoading, setPageLoading]   = useState(true);
  const [actionBusy, setActionBusy]     = useState(false);
  const [now, setNow]                   = useState(new Date());

  // View settings states: Daywise is the default primary UX
  const [viewType, setViewType]         = useState("daywise"); // "daywise" | "weekly" | "monthly"
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());
  const [weekOffset, setWeekOffset]     = useState(0);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);

  // Drawer state for day details & self-service regularization
  const [detailDate, setDetailDate]     = useState(null);

  // ── Team Presence States ──
  const [teamPresence, setTeamPresence] = useState([]);
  const [teamLoading, setTeamLoading]   = useState(false);
  const [teamSearch, setTeamSearch]     = useState("");
  const [deptFilter, setDeptFilter]     = useState("all");

  // ── Approvals Queue States ──
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [approvalActionBusy, setApprovalActionBusy] = useState(false);

  /* Clock ticking */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /* Active hours calculator */
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

  /* Fetch today's personal record */
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
      console.error(e);
    }
  }, [user?.id, read]);

  /* Fetch range records for personal calendar */
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
      console.error(e);
    } finally {
      setPageLoading(false);
    }
  }, [user?.id, activeDaysList, read]);

  /* Fetch Team Live Presence */
  const fetchTeamPresence = useCallback(async () => {
    if (!canViewTeam) return;
    try {
      setTeamLoading(true);
      const todayStr = getLocalDateString();
      const [attRes, empRes] = await Promise.all([
        axiosInstance.post('/populate/read/attendances', {
          filter: {
            date: {
              $gte: `${todayStr}T00:00:00.000Z`,
              $lte: `${todayStr}T23:59:59.999Z`
            }
          },
          populateFields: {
            employee: 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.designation,professionalInfo.department'
          },
          limit: 500
        }),
        axiosInstance.post('/populate/read/employees', {
          fields: 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.designation,professionalInfo.department',
          populateFields: {
            'professionalInfo.department': 'name',
            'professionalInfo.designation': 'title'
          },
          filter: { 'professionalInfo.isActive': { $ne: false } },
          limit: 500
        })
      ]);

      const attendances = attRes.data?.data || [];
      const allEmployees = empRes.data?.data || [];

      const attMap = {};
      attendances.forEach(a => {
        const empId = a.employee?._id || a.employee;
        if (empId) attMap[String(empId)] = a;
      });

      const presenceList = allEmployees.map(emp => {
        const att = attMap[String(emp._id)];
        const hasIn = Boolean(att?.checkIn);
        const hasOut = Boolean(att?.checkOut);
        const isOnline = hasIn && !hasOut;
        const isLeave = att?.status === 'Leave';

        let status = 'Absent';
        if (isLeave) status = 'On Leave';
        else if (isOnline) status = 'Checked In';
        else if (hasIn && hasOut) status = 'Completed Shift';

        return {
          _id: emp._id,
          employee: emp,
          attendance: att,
          status,
          checkIn: att?.checkIn,
          checkOut: att?.checkOut,
          workHours: att?.workHours,
          department: emp.professionalInfo?.department?.name || emp.professionalInfo?.department || 'General',
          designation: emp.professionalInfo?.designation?.title || emp.professionalInfo?.designation || 'Staff'
        };
      });

      setTeamPresence(presenceList);
    } catch (e) {
      console.error('Failed to fetch team presence', e);
    } finally {
      setTeamLoading(false);
    }
  }, [canViewTeam]);

  /* Fetch Pending Approvals */
  const fetchPendingApprovals = useCallback(async () => {
    if (!canViewTeam) return;
    try {
      setApprovalsLoading(true);
      const [leavesRes, regsRes] = await Promise.all([
        axiosInstance.post('/populate/read/leaves', {
          filter: { status: 'Pending' },
          populateFields: {
            employeeId: 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.designation'
          },
          limit: 100
        }),
        axiosInstance.post('/populate/read/regularizations', {
          filter: { status: 'Pending' },
          populateFields: {
            employeeId: 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.designation'
          },
          limit: 100
        })
      ]);

      const leaves = (leavesRes.data?.data || []).map(l => ({ ...l, requestType: 'Leave' }));
      const regularizations = (regsRes.data?.data || []).map(r => ({ ...r, requestType: 'Regularization' }));
      setPendingApprovals([...leaves, ...regularizations]);
    } catch (e) {
      console.error('Failed to fetch pending approvals', e);
    } finally {
      setApprovalsLoading(false);
    }
  }, [canViewTeam]);

  useEffect(() => {
    if (!user?.id || authLoading) return;
    fetchTodayRecord();
    fetchAll();
    if (canViewTeam) {
      fetchTeamPresence();
      fetchPendingApprovals();
    }
  }, [user?.id, authLoading, canViewTeam, fetchTodayRecord, fetchAll, fetchTeamPresence, fetchPendingApprovals]);

  /* Check in handler */
  const handleCheckIn = async () => {
    if (!user || actionBusy) return;
    setActionBusy(true);
    try {
      const loc = await getBrowserLocation();
      if (!loc) {
        toast.error("Location access is required to check in. Please enable location permissions in your browser.");
        return;
      }

      if (todayRec?._id) {
        await update('attendances', todayRec._id, {
          checkIn: new Date().toISOString(),
          location: loc,
        }, "Checked in!");
      } else {
        await create('attendances', {
          employee: user.id,
          employeeName: user.name,
          date: getLocalDateString(),
          checkIn: new Date().toISOString(),
          status: "Present",
          managerId: user.managerId,
          workType: "fixed",
          location: loc,
        }, "Checked in!");
      }
      await fetchTodayRecord();
      await fetchAll();
      if (canViewTeam) fetchTeamPresence();
    } catch (e) {
      console.error(e);
    } finally {
      setActionBusy(false);
    }
  };

  /* Check out handler */
  const handleCheckOut = async () => {
    if (!todayRec || actionBusy) return;
    setActionBusy(true);
    try {
      const loc = await getBrowserLocation();
      if (!loc) {
        toast.error("Location access is required to check out. Please enable location permissions in your browser.");
        return;
      }

      await update('attendances', todayRec._id, {
        checkOut: new Date().toISOString(),
        location: loc,
      }, "Checked out!");
      await fetchTodayRecord();
      await fetchAll();
      if (canViewTeam) fetchTeamPresence();
    } catch (e) {
      console.error(e);
    } finally {
      setActionBusy(false);
    }
  };

  /* Handle Quick Approval / Rejection */
  const handleQuickApproval = async (reqItem, status, comment = "") => {
    setApprovalActionBusy(true);
    try {
      const model = reqItem.requestType === "Leave" ? "leaves" : "regularizations";
      await axiosInstance.put(`/populate/update/${model}/${reqItem._id}`, {
        status: status === "Approved" ? "Approved" : "Rejected",
        approverComment: comment || (status === "Approved" ? "Approved by reviewer" : "Rejected by reviewer"),
        approvedAt: new Date().toISOString()
      });
      toast.success(`${reqItem.requestType} request ${status.toLowerCase()}`);
      setSelectedApproval(null);
      await fetchPendingApprovals();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || `Failed to ${status.toLowerCase()} request`);
    } finally {
      setApprovalActionBusy(false);
    }
  };

  /* Stats calculation for personal view */
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

  const getDayRec = (d) => records.find((r) => isSameDay(r.date, d));

  const getDayHrs = (d) => {
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
    present: { bg: "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]", label: "Present" },
    absent:  { bg: "bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]", label: "Absent" },
    leave:   { bg: "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]", label: "Leave" },
    weekend: { bg: "bg-surface-2 text-ink-muted", label: "Weekend" },
    future:  { bg: "bg-transparent text-ink-subtle border border-dashed border-hairline", label: "Upcoming" },
  };

  const isCurrentlyCheckedIn = Boolean(
    todayRec &&
    todayRec.checkIn &&
    (todayRec.punches && todayRec.punches.length > 0
      ? !todayRec.punches[todayRec.punches.length - 1].checkOut
      : !todayRec.checkOut)
  );

  const hasIn  = Boolean(todayRec?.checkIn);
  const hasOut = Boolean(todayRec?.checkOut);
  const pct    = Math.min((activeHours / TARGET) * 100, 100);
  const ringColor = pct >= 100 ? "var(--tracker-success)" : pct >= 60 ? "var(--module-hr)" : "var(--tracker-ink-subtle)";

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

  // ── Team Presence Filtered List ──
  const departments = useMemo(() => {
    const depts = new Set(teamPresence.map(p => p.department).filter(Boolean));
    return ["all", ...Array.from(depts)];
  }, [teamPresence]);

  const filteredTeamPresence = useMemo(() => {
    return teamPresence.filter(p => {
      const matchesSearch = !teamSearch || 
        `${p.employee?.basicInfo?.firstName || ""} ${p.employee?.basicInfo?.lastName || ""}`.toLowerCase().includes(teamSearch.toLowerCase()) ||
        p.designation.toLowerCase().includes(teamSearch.toLowerCase());
      const matchesDept = deptFilter === "all" || p.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [teamPresence, teamSearch, deptFilter]);

  const checkedInCount = teamPresence.filter(p => p.status === 'Checked In').length;
  const onLeaveCount = teamPresence.filter(p => p.status === 'On Leave').length;
  const absentCount = teamPresence.filter(p => p.status === 'Absent').length;

  if (pageLoading) return (
    <div className="flex items-center justify-center h-full bg-canvas text-ink py-20">
      <div className="h-8 w-8 border-4 border-hairline border-t-[var(--module-hr)] rounded-full animate-spin" />
    </div>
  );

  const detailRecord = detailDate ? getDayRec(detailDate) : null;

  return (
    <div data-module="hr" className="h-full flex flex-col gap-4 overflow-y-auto bg-canvas text-ink p-1 sm:p-2">
      
      {/* ─── CONTROL CENTER HEADER & SEGMENTED TABS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-hairline-soft pb-3">
        <div>
          <p className="lmx-page-eyebrow mb-0">HUMAN RESOURCES</p>
          <h1 className="text-[19px] font-semibold text-ink flex items-center gap-2 tracking-tight">
            <Clock size={19} className="text-[var(--module-hr)]" />
            Attendance Control Center
          </h1>
        </div>

        {/* Tab Navigation (Context-Aware Persona Routing) */}
        <div className="lmx-tab-bar">
          <button
            onClick={() => setActiveTab("my")}
            className={`lmx-tab ${activeTab === "my" ? "lmx-tab-active" : ""}`}
          >
            <Clock size={13} />
            My Attendance
          </button>

          {canViewTeam && (
            <button
              onClick={() => setActiveTab("team")}
              className={`lmx-tab ${activeTab === "team" ? "lmx-tab-active" : ""}`}
            >
              <Users size={13} />
              Team Live Presence
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--module-hr-light)] text-[var(--module-hr)] font-bold">
                {teamPresence.length}
              </span>
            </button>
          )}

          {canViewTeam && (
            <button
              onClick={() => setActiveTab("approvals")}
              className={`lmx-tab ${activeTab === "approvals" ? "lmx-tab-active" : ""}`}
            >
              <CheckSquare size={13} />
              Approvals Queue
              {pendingApprovals.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)] font-bold">
                  {pendingApprovals.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: MY ATTENDANCE (Individual Employee Self-Service)
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "my" && (
        <div className="space-y-4">
          {/* ─── TODAY CARD ─── */}
          <div className="bg-surface rounded-tracker-card border border-hairline p-5 lg:p-6 flex-shrink-0 shadow-xs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-[var(--module-hr)]" />
                <span className="text-[16px] font-semibold text-ink leading-tight">Today</span>
                {isCurrentlyCheckedIn && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${hasIn ? 'bg-[var(--tracker-success-light)] text-[var(--tracker-success)]' : 'bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]'}`}>
                {hasIn ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {hasIn ? "Present" : "Not Checked In"}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                {/* Check In */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-surface-1 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-hairline-soft">
                    <LogIn className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11.5px] text-ink-subtle mb-0.5 font-medium">Check In</p>
                    <p className={`text-[15px] font-semibold tabular-nums leading-none ${hasIn ? 'text-ink' : 'text-ink-subtle'}`}>
                      {hasIn ? fmt12(todayRec.checkIn) : "--:--"}
                    </p>
                  </div>
                </div>

                {/* Check Out */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-surface-1 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-hairline-soft">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11.5px] text-ink-subtle mb-0.5 font-medium">Check Out</p>
                    <p className={`text-[15px] font-semibold tabular-nums leading-none ${hasOut ? 'text-ink' : 'text-ink-subtle'}`}>
                      {hasOut ? fmt12(todayRec.checkOut) : "--:--"}
                    </p>
                  </div>
                </div>

                {/* Hours Ring */}
                <div className="flex items-center gap-3">
                  <div className="relative inline-flex items-center justify-center">
                    <Ring pct={pct} size={44} sw={4} color={ringColor} />
                    <span className="absolute text-[11px] font-bold text-ink">
                      {Math.floor(activeHours)}h
                    </span>
                  </div>
                  <div>
                    <p className="text-[11.5px] text-ink-subtle mb-0.5 font-medium">Active Logged</p>
                    <p className="text-[15px] font-semibold text-ink leading-none">{fmtHM(activeHours)}</p>
                  </div>
                </div>
              </div>

              {/* Check-In / Check-Out Action Button */}
              <div className="flex items-center gap-2">
                {!hasIn ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={actionBusy}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {actionBusy ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
                    Clock In
                  </button>
                ) : isCurrentlyCheckedIn ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={actionBusy}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {actionBusy ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                    Clock Out
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 text-ink-muted">
                    <CheckCircle size={13} className="text-emerald-500" /> Shift Completed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ─── SUMMARY KPI STRIP ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={CheckCircle} value={`${presentDays} / ${workDaysPassed} d`} label="Days Present" />
            <StatCard icon={Clock} value={fmtHM(totalHrs)} label="Total Logged Hours" />
            <StatCard icon={TrendingUp} value={`${attendRate}%`} label="Monthly Attendance Rate" />
          </div>

          {/* ─── ATTENDANCE LEDGER & CALENDAR ─── */}
          <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-hairline-soft">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-[var(--module-hr)]" />
                <h2 className="text-[15px] font-semibold text-ink">
                  {viewType === "monthly" ? monthNameLabel : viewType === "weekly" ? weekLabel() : dayLabel()}
                </h2>
              </div>

              {/* View Selector & Navigators */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* View Selector & Navigators: Daywise first & default, Weekly second, Monthly third */}
                <div className="inline-flex rounded-lg border border-hairline p-0.5 bg-surface-1">
                  {[
                    { id: "daywise", label: "Daywise" },
                    { id: "weekly", label: "Weekly" },
                    { id: "monthly", label: "Monthly" }
                  ].map(v => (
                    <button
                      key={v.id}
                      onClick={() => setViewType(v.id)}
                      className={`px-3 py-1 rounded-md text-[11.5px] font-medium transition-all cursor-pointer ${viewType === v.id ? "bg-surface text-ink shadow-xs font-semibold" : "text-ink-muted hover:text-ink"}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                {/* Date Navigator Controls */}
                <div className="flex items-center gap-1">
                  {viewType === "daywise" && (
                    <>
                      <button
                        onClick={() => setSelectedDayOffset(d => d - 1)}
                        className="p-1 rounded-md border border-hairline bg-surface hover:bg-surface-1 text-ink cursor-pointer"
                        title="Previous Day"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {selectedDayOffset !== 0 && (
                        <button
                          onClick={() => setSelectedDayOffset(0)}
                          className="px-2 py-0.5 text-[11px] font-semibold text-[var(--module-hr)] hover:bg-[var(--module-hr-light)] rounded-md transition-colors cursor-pointer"
                        >
                          Today
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedDayOffset(d => d + 1)}
                        disabled={selectedDayOffset >= 0}
                        className="p-1 rounded-md border border-hairline bg-surface hover:bg-surface-1 text-ink cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Next Day"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </>
                  )}

                  {viewType === "weekly" && (
                    <>
                      <button
                        onClick={() => setWeekOffset(w => w - 1)}
                        className="p-1 rounded-md border border-hairline bg-surface hover:bg-surface-1 text-ink cursor-pointer"
                        title="Previous Week"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {weekOffset !== 0 && (
                        <button
                          onClick={() => setWeekOffset(0)}
                          className="px-2 py-0.5 text-[11px] font-semibold text-[var(--module-hr)] hover:bg-[var(--module-hr-light)] rounded-md transition-colors cursor-pointer"
                        >
                          This Week
                        </button>
                      )}
                      <button
                        onClick={() => setWeekOffset(w => w + 1)}
                        disabled={weekOffset >= 0}
                        className="p-1 rounded-md border border-hairline bg-surface hover:bg-surface-1 text-ink cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Next Week"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </>
                  )}

                  {viewType === "monthly" && (
                    <>
                      <button
                        onClick={() => setSelectedMonth(m => m === 0 ? 11 : m - 1)}
                        className="p-1 rounded-md border border-hairline bg-surface hover:bg-surface-1 text-ink cursor-pointer"
                        title="Previous Month"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => setSelectedMonth(m => m === 11 ? 0 : m + 1)}
                        className="p-1 rounded-md border border-hairline bg-surface hover:bg-surface-1 text-ink cursor-pointer"
                        title="Next Month"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Daywise Dedicated Breakdown Card ── */}
            {viewType === "daywise" && (() => {
              const d = activeDaysList[0] || new Date();
              const rec = getDayRec(d);
              const hrs = getDayHrs(d);
              const st = dayStatus(d);
              const sty = STATUS[st] || STATUS.absent;
              const punches = rec?.punches || [];

              return (
                <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                  {/* Day Summary Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-1 p-4 rounded-xl border border-hairline-soft">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-surface flex items-center justify-center font-bold text-ink border border-hairline shadow-xs">
                        {DAY_LABELS[d.getDay()]}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-ink">
                          {d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        </h3>
                        <p className="text-xs text-ink-subtle">
                          {isToday(d) ? "Today's Active Attendance Record" : "Historical Attendance Record"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${sty.bg}`}>
                        {sty.label}
                      </span>
                      <button
                        onClick={() => setDetailDate(d)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-[var(--module-hr-light)] text-[var(--module-hr)] hover:bg-[var(--module-hr)] hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <FileText size={12} />
                        {st === "leave" || st === "weekend" || st === "holiday" ? "View Details" : "Details & Regularize"}
                      </button>
                    </div>
                  </div>

                  {/* Day Key Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-surface-1 p-3 rounded-xl border border-hairline-soft">
                      <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-0.5">Clock In</span>
                      <span className="text-sm font-bold text-ink tabular-nums">
                        {rec?.checkIn ? fmt12(rec.checkIn) : "--:--"}
                      </span>
                    </div>
                    <div className="bg-surface-1 p-3 rounded-xl border border-hairline-soft">
                      <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-0.5">Clock Out</span>
                      <span className="text-sm font-bold text-ink tabular-nums">
                        {rec?.checkOut ? fmt12(rec.checkOut) : "--:--"}
                      </span>
                    </div>
                    <div className="bg-surface-1 p-3 rounded-xl border border-hairline-soft">
                      <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-0.5">Work Hours</span>
                      <span className="text-sm font-bold text-ink tabular-nums">
                        {hrs != null ? fmtHM(hrs) : "—"}
                      </span>
                    </div>
                    <div className="bg-surface-1 p-3 rounded-xl border border-hairline-soft flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-0.5">Target (8h)</span>
                        <span className={`text-xs font-bold ${hrs >= TARGET ? "text-emerald-600" : "text-ink-muted"}`}>
                          {hrs >= TARGET ? "Goal Met ✓" : `${Math.round(((hrs || 0) / TARGET) * 100)}%`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Punch Sessions Stream */}
                  <div className="bg-surface-1 p-4 rounded-xl border border-hairline-soft space-y-3">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5 pb-1 border-b border-hairline-soft">
                      <Clock size={13} className="text-[var(--module-hr)]" />
                      Punch Sessions ({punches.length > 0 ? punches.length : rec?.checkIn ? 1 : 0})
                    </h4>

                    {punches.length === 0 ? (
                      <div className="text-center py-4 text-ink-subtle text-xs">
                        {rec?.checkIn ? "Single punch session recorded for this day." : "No punches logged for this date."}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {punches.map((p, idx) => (
                          <div key={idx} className="bg-surface p-2.5 rounded-lg border border-hairline flex items-center justify-between text-xs shadow-2xs">
                            <span className="font-bold text-ink-subtle">Session #{idx + 1}</span>
                            <div className="flex items-center gap-2 tabular-nums">
                              <span className="text-emerald-600 font-semibold">{fmt12(p.checkIn)}</span>
                              <span className="text-ink-subtle">➔</span>
                              <span className={p.checkOut ? "text-amber-600 font-semibold" : "text-emerald-600 font-extrabold"}>
                                {p.checkOut ? fmt12(p.checkOut) : "Active"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Geotag Map Coordinates (If Available) */}
                  {rec?.location?.latitude && rec?.location?.longitude && (
                    <div className="bg-surface-1 p-4 rounded-xl border border-hairline-soft space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-ink">
                        <span className="flex items-center gap-1"><MapPin size={13} className="text-[var(--module-hr)]" /> Verified Geotag Location</span>
                        <span className="text-ink-subtle tabular-nums">{rec.location.latitude.toFixed(4)}, {rec.location.longitude.toFixed(4)}</span>
                      </div>
                      <div className="w-full h-36 rounded-lg overflow-hidden border border-hairline">
                        <iframe
                          title="Day Geotag Map"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          src={`https://maps.google.com/maps?q=${rec.location.latitude},${rec.location.longitude}&z=15&output=embed`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Multi-Day Ledger (Weekly & Monthly Views) ── */}
            {viewType !== "daywise" && (
              <div className="divide-y divide-hairline-soft">
                {activeDaysList.map((d, i) => {
                  const rec = getDayRec(d);
                  const hrs = getDayHrs(d);
                  const st = dayStatus(d);
                  const sty = STATUS[st] || STATUS.absent;
                  const tod = isToday(d);

                  return (
                    <div
                      key={i}
                      onClick={() => setDetailDate(d)}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${tod ? "bg-surface-1 border border-hairline-soft font-semibold" : "hover:bg-surface-1/50"}`}
                    >
                      <div className="flex items-center gap-3 min-w-[120px]">
                        <span className="text-[13px] font-bold text-ink w-8">{DAY_LABELS[d.getDay()]}</span>
                        <span className="text-[12px] text-ink-subtle">{d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${sty.bg}`}>
                          {sty.label}
                        </span>
                      </div>

                      <div className="hidden sm:flex items-center gap-4 text-xs tabular-nums text-ink">
                        <div>In: <span className="font-semibold">{rec?.checkIn ? fmt12(rec.checkIn) : "--:--"}</span></div>
                        <div>Out: <span className="font-semibold">{rec?.checkOut ? fmt12(rec.checkOut) : "--:--"}</span></div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold tabular-nums text-ink">{hrs != null ? fmtHM(hrs) : "—"}</span>
                        <ChevronRight size={14} className="text-ink-subtle" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: TEAM REAL-TIME PRESENCE (Manager/Admin Control Center)
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "team" && canViewTeam && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Team Summary Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-surface rounded-xl border border-hairline p-3.5 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[11px] font-semibold text-ink-subtle uppercase">Total Team</p>
                <p className="text-[19px] font-extrabold text-ink leading-tight">{teamPresence.length}</p>
              </div>
              <Users size={18} className="text-[var(--module-hr)]" />
            </div>

            <div className="bg-surface rounded-xl border border-hairline p-3.5 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[11px] font-semibold text-emerald-600 uppercase flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Checked In
                </p>
                <p className="text-[19px] font-extrabold text-emerald-600 leading-tight">{checkedInCount}</p>
              </div>
              <LogIn size={18} className="text-emerald-500" />
            </div>

            <div className="bg-surface rounded-xl border border-hairline p-3.5 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[11px] font-semibold text-amber-600 uppercase">On Leave</p>
                <p className="text-[19px] font-extrabold text-amber-600 leading-tight">{onLeaveCount}</p>
              </div>
              <CalendarDays size={18} className="text-amber-500" />
            </div>

            <div className="bg-surface rounded-xl border border-hairline p-3.5 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[11px] font-semibold text-red-600 uppercase">Absent / Not In</p>
                <p className="text-[19px] font-extrabold text-red-600 leading-tight">{absentCount}</p>
              </div>
              <XCircle size={18} className="text-red-500" />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-hairline shadow-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                type="text"
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                placeholder="Search team members by name or title…"
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-hairline bg-surface-1 text-ink outline-none focus:border-[var(--module-hr)]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-hairline bg-surface text-ink cursor-pointer outline-none"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d === "all" ? "All Departments" : d}</option>
                ))}
              </select>

              <button
                onClick={fetchTeamPresence}
                disabled={teamLoading}
                className="p-1.5 rounded-lg border border-hairline bg-surface hover:bg-surface-1 text-ink-muted hover:text-ink cursor-pointer"
                title="Refresh team presence"
              >
                <RefreshCw size={13} className={teamLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Team Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTeamPresence.map(member => (
              <div
                key={member._id}
                className="bg-surface rounded-xl border border-hairline p-4 flex items-start gap-3 shadow-xs hover:border-[var(--module-hr)] transition-all"
              >
                <ProfileImage
                  profileImage={member.employee?.basicInfo?.profileImage}
                  firstName={member.employee?.basicInfo?.firstName}
                  lastName={member.employee?.basicInfo?.lastName}
                  px={36}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-[13px] font-semibold text-ink truncate">
                      {member.employee?.basicInfo?.firstName} {member.employee?.basicInfo?.lastName}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      member.status === "Checked In" ? "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]" :
                      member.status === "On Leave" ? "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]" :
                      member.status === "Completed Shift" ? "bg-surface-2 text-ink-muted" :
                      "bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]"
                    }`}>
                      {member.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted truncate">{member.designation} · {member.department}</p>
                  
                  <div className="mt-2 pt-2 border-t border-hairline-soft flex items-center justify-between text-[11px] text-ink-subtle">
                    <span>In: <strong className="text-ink">{member.checkIn ? fmt12(member.checkIn) : "—"}</strong></span>
                    <span>Out: <strong className="text-ink">{member.checkOut ? fmt12(member.checkOut) : "—"}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: APPROVALS & REGULARIZATIONS (Anti-Popup Inline Queue)
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "approvals" && canViewTeam && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-hairline shadow-xs">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Pending Regularizations & Leave Requests</h2>
              <p className="text-xs text-ink-muted mt-0.5">Review, verify, and resolve staff attendance exceptions in real-time.</p>
            </div>
            <button
              onClick={fetchPendingApprovals}
              disabled={approvalsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-hairline rounded-lg bg-surface text-ink hover:bg-surface-1 cursor-pointer"
            >
              <RefreshCw size={12} className={approvalsLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-dashed border-hairline p-12 text-center">
              <ShieldCheck size={36} className="mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-semibold text-ink">No Pending Requests</p>
              <p className="text-xs text-ink-subtle mt-1">All regularization and leave requests have been resolved.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map(reqItem => {
                const emp = reqItem.employeeId;
                const empName = emp?.basicInfo ? `${emp.basicInfo.firstName || ""} ${emp.basicInfo.lastName || ""}`.trim() : (reqItem.employeeName || "Employee");
                const isReg = reqItem.requestType === "Regularization";

                return (
                  <div
                    key={reqItem._id}
                    className="bg-surface rounded-xl border border-hairline p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-[var(--module-hr)] transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <ProfileImage
                        profileImage={emp?.basicInfo?.profileImage}
                        firstName={emp?.basicInfo?.firstName}
                        lastName={emp?.basicInfo?.lastName}
                        px={36}
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-bold text-ink">{empName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isReg ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                            {reqItem.requestType}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-ink-subtle mt-0.5">
                          Date: <strong className="text-ink">{new Date(reqItem.requestDate || reqItem.startDate).toLocaleDateString()}</strong>
                          {reqItem.reason && ` · Reason: "${reqItem.reason}"`}
                        </p>
                        {isReg && (
                          <p className="text-[11px] text-ink-muted mt-1 font-medium">
                            Requested Times: In: <span className="font-semibold text-emerald-600">{fmt12(reqItem.requestedCheckIn)}</span> · Out: <span className="font-semibold text-amber-600">{fmt12(reqItem.requestedCheckOut)}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick Approve / Reject Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleQuickApproval(reqItem, "Approved")}
                        disabled={approvalActionBusy}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Check size={12} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleQuickApproval(reqItem, "Rejected")}
                        disabled={approvalActionBusy}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <X size={12} />
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── SLIDE-OVER DETAIL & REGULARIZATION DRAWER (Anti-Popup Law) ─── */}
      {detailDate && (
        <DayDetailsDrawer 
          date={detailDate}
          record={detailRecord}
          currentUserId={user?.id}
          onClose={() => setDetailDate(null)}
          onRegularizationSubmitted={() => {
            fetchAll();
            if (canViewTeam) fetchPendingApprovals();
          }}
        />
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   SLIDE-OVER DRAWER WITH INLINE REGULARIZATION (Zero Popup Law)
   ══════════════════════════════════════════════════════════════════ */
function DayDetailsDrawer({ date, record, currentUserId, onClose, onRegularizationSubmitted }) {
  if (!date) return null;
  const isWeekendDay = isWeekend(date);
  const status = record ? record.status : isWeekendDay ? "Weekend" : "Absent";
  const punches = record?.punches || [];
  
  // Inline regularization state
  const [showRegForm, setShowRegForm] = useState(false);
  const [reqCheckIn, setReqCheckIn]   = useState("");
  const [reqCheckOut, setReqCheckOut] = useState("");
  const [reason, setReason]           = useState("");
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  const hrs = record?.workHours != null 
    ? record.workHours 
    : record?.checkIn 
      ? Math.max(0, (new Date(record.checkOut || new Date()) - new Date(record.checkIn)) / 3600000) 
      : 0;

  const handleCreateRegularization = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for regularization");
      return;
    }
    setIsSubmittingReg(true);
    try {
      const targetDateStr = getLocalDateString(date);
      await axiosInstance.post('/populate/create/regularizations', {
        employeeId: currentUserId,
        requestDate: targetDateStr,
        originalCheckIn: record?.checkIn || null,
        originalCheckOut: record?.checkOut || null,
        requestedCheckIn: reqCheckIn ? `${targetDateStr}T${reqCheckIn}:00.000Z` : null,
        requestedCheckOut: reqCheckOut ? `${targetDateStr}T${reqCheckOut}:00.000Z` : null,
        reason: reason.trim(),
        status: "Pending"
      });
      toast.success("Regularization request submitted!");
      setShowRegForm(false);
      if (onRegularizationSubmitted) onRegularizationSubmitted();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit regularization");
    } finally {
      setIsSubmittingReg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface h-full shadow-2xl flex flex-col p-6 animate-slide-in overflow-y-auto border-l border-hairline">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-hairline">
          <div>
            <h3 className="text-[17px] font-semibold text-ink">
              {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">Attendance Ledger & Geotag Details</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-1 rounded-lg text-ink-muted hover:text-ink cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Status Section */}
        <div className="py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-subtle uppercase">Attendance Status</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              status === "Present" ? "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]" :
              status === "Leave" ? "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]" :
              status === "Weekend" ? "bg-surface-2 text-ink-muted" :
              "bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]"
            }`}>
              {status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-1 p-3 rounded-xl border border-hairline-soft">
              <span className="text-[10.5px] font-semibold text-ink-subtle uppercase block mb-0.5">Clock In</span>
              <span className="text-sm font-bold text-ink tabular-nums">
                {record?.checkIn ? fmt12(record.checkIn) : "—"}
              </span>
            </div>
            <div className="bg-surface-1 p-3 rounded-xl border border-hairline-soft">
              <span className="text-[10.5px] font-semibold text-ink-subtle uppercase block mb-0.5">Clock Out</span>
              <span className="text-sm font-bold text-ink tabular-nums">
                {record?.checkOut ? fmt12(record.checkOut) : "—"}
              </span>
            </div>
          </div>

          <div className="bg-surface-1 p-3 rounded-xl border border-hairline-soft flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-semibold text-ink-subtle uppercase block mb-0.5">Effective Work Hours</span>
              <span className="text-sm font-bold text-ink tabular-nums">
                {record?.checkIn ? fmtHM(hrs) : "—"}
              </span>
            </div>
            {hrs >= TARGET && (
              <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                Goal Met ✓
              </span>
            )}
          </div>
        </div>

        {/* Inline Self-Service Regularization (Only for workdays / missed punch days) */}
        {status === "Leave" ? (
          <div className="my-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <span>Approved Leave Record • No regularization required for authorized time off.</span>
          </div>
        ) : status === "Weekend" ? (
          <div className="my-2 p-3 bg-surface-1 border border-hairline-soft rounded-xl flex items-center gap-2 text-xs text-ink-subtle">
            <span className="h-2 w-2 rounded-full bg-ink-subtle shrink-0" />
            <span>Scheduled Non-Working Weekend • Regularization not applicable.</span>
          </div>
        ) : status === "Holiday" ? (
          <div className="my-2 p-3 bg-surface-1 border border-hairline-soft rounded-xl flex items-center gap-2 text-xs text-ink-subtle">
            <span className="h-2 w-2 rounded-full bg-ink-subtle shrink-0" />
            <span>Official Holiday • Regularization not applicable.</span>
          </div>
        ) : (
          <div className="my-2 p-3 bg-surface-1 rounded-xl border border-hairline-soft">
            {!showRegForm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink">Need an adjustment?</p>
                  <p className="text-[11px] text-ink-subtle">Missed punch or incorrect hours logged.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegForm(true)}
                  className="px-2.5 py-1 text-xs font-semibold bg-[var(--module-hr)] text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Request Regularization
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateRegularization} className="space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-hairline-soft">
                  <span className="text-xs font-bold text-ink">Regularization Request</span>
                  <button type="button" onClick={() => setShowRegForm(false)} className="text-xs text-ink-subtle hover:text-ink">Cancel</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-ink-subtle uppercase block mb-0.5">Req In Time</label>
                    <input
                      type="time"
                      value={reqCheckIn}
                      onChange={e => setReqCheckIn(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-hairline bg-surface text-ink outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-ink-subtle uppercase block mb-0.5">Req Out Time</label>
                    <input
                      type="time"
                      value={reqCheckOut}
                      onChange={e => setReqCheckOut(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-hairline bg-surface text-ink outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-ink-subtle uppercase block mb-0.5">Reason</label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Reason for regularization..."
                    className="w-full p-1.5 text-xs rounded border border-hairline bg-surface text-ink outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingReg}
                  className="w-full py-1.5 rounded-lg text-xs font-bold bg-[var(--module-hr)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isSubmittingReg ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Submit Request
                </button>
              </form>
            )}
          </div>
        )}

        {/* Punch Logs Timeline */}
        <div className="flex-1 space-y-3 mt-2">
          <h4 className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5 pb-1 border-b border-hairline-soft">
            <Clock size={13} className="text-[var(--module-hr)]" />
            Punch History
          </h4>

          {punches.length === 0 ? (
            <div className="text-center py-4 text-ink-subtle text-xs">
              {record?.checkIn ? "Single check-in/out session recorded." : "No punch logs for this date."}
            </div>
          ) : (
            <div className="relative border-l border-hairline ml-3 pl-4 space-y-3">
              {punches.map((p, index) => (
                <div key={index} className="relative text-xs">
                  <span className="absolute -left-[21px] top-1 flex h-2.5 w-2.5 rounded-full bg-[var(--module-hr)]" />
                  <span className="text-[11px] font-semibold text-ink-subtle">Session #{index + 1}</span>
                  <div className="grid grid-cols-2 gap-2 mt-0.5 text-ink-muted">
                    <div>In: <strong className="text-ink">{fmt12(p.checkIn)}</strong></div>
                    <div>Out: <strong className="text-ink">{p.checkOut ? fmt12(p.checkOut) : "Active"}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Geotag Map Coordinates */}
        {record?.location?.latitude && record?.location?.longitude && (
          <div className="mt-auto pt-3 border-t border-hairline space-y-2">
            <div className="w-full h-32 rounded-lg overflow-hidden border border-hairline">
              <iframe
                title="Geotag Location"
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://maps.google.com/maps?q=${record.location.latitude},${record.location.longitude}&z=15&output=embed`}
              />
            </div>
            <div className="flex items-center justify-between text-[10.5px] text-ink-subtle font-medium">
              <span className="flex items-center gap-1"><MapPin size={11} /> Verified Geotag</span>
              <span>Lat: {record.location.latitude.toFixed(4)}, Lng: {record.location.longitude.toFixed(4)}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Metric Stat Card ── */
const StatCard = ({ icon: Icon, value, label }) => (
  <div className="bg-surface rounded-xl border border-hairline p-3.5 flex items-center gap-3 shadow-xs">
    <div className="h-9 w-9 rounded-lg bg-[var(--module-hr-light)] flex items-center justify-center flex-shrink-0 text-[var(--module-hr)]">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-[16px] font-bold text-ink leading-tight tabular-nums">{value}</p>
      <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
    </div>
  </div>
);

export default AttendancePage;