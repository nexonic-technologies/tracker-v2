import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@context/authProvider";
import { useGenericAPI } from "@hooks/useGenericAPI";
import StatCard from "@components/Common/StatCard";
import MonthNavigator from "@components/Common/MonthNavigator";
import PageLoader from "@components/Common/PageLoader";
import FilterDropdown from "@components/Common/FilterDropdown";
import {
  BarChart3, TrendingUp, Clock, Users, AlertTriangle,
  Calendar, Download, CheckCircle, Sun, Search, FileSpreadsheet, Layers,
  MapPin, LogIn, LogOut, ExternalLink
} from "lucide-react";

/* ════════════════════════════════
   HELPERS & CONSTANTS
   ════════════════════════════════ */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_COLORS = {
  "Present": "#10b981",
  "Check-Out": "#10b981",
  "Late Entry": "#f59e0b",
  "Early check-out": "#f97316",
  "Half Day": "#eab308",
  "Absent": "#ef4444",
  "Leave": "#3b82f6",
  "Work From Home": "#14b8a6",
  "Holiday": "#a855f7",
  "Week Off": "#94a3b8",
  "LOP": "#dc2626",
  "Pending": "#0ea5e9",
};

const MATRIX_STATUS_MAP = {
  "Present": { short: "P", color: "bg-emerald-500", text: "text-white" },
  "Check-Out": { short: "P", color: "bg-emerald-500", text: "text-white" },
  "Late Entry": { short: "L", color: "bg-amber-500", text: "text-white" },
  "Early check-out": { short: "E", color: "bg-orange-500", text: "text-white" },
  "Half Day": { short: "H", color: "bg-yellow-500", text: "text-black" },
  "Absent": { short: "A", color: "bg-red-500", text: "text-white" },
  "Leave": { short: "Lv", color: "bg-blue-500", text: "text-white" },
  "Holiday": { short: "Ho", color: "bg-purple-500", text: "text-white" },
  "Week Off": { short: "W", color: "bg-slate-400", text: "text-white" },
  "Work From Home": { short: "WH", color: "bg-teal-500", text: "text-white" },
  "Unchecked": { short: "U", color: "bg-gray-400", text: "text-white" },
  "LOP": { short: "LP", color: "bg-red-700", text: "text-white" },
  "Pending": { short: "?", color: "bg-sky-500", text: "text-white" },
};

const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();

const isWeekend = (year, month, day) => {
  const d = new Date(year, month, day);
  return d.getDay() === 0 || d.getDay() === 6;
};

const getLocalDateStr = (y, m, d) => {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/* SVG Bar Chart Helper */
const Bar = ({ value, max, color, label, count }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-[12px] font-medium text-ink-subtle w-[100px] text-right truncate">{label}</span>
      <div className="flex-1 h-[24px] bg-surface-1 rounded-[6px] overflow-hidden relative border border-hairline-soft">
        <div
          className="h-full rounded-[6px] transition-all duration-700 ease-out"
          style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color }}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-ink">
          {count}
        </span>
      </div>
    </div>
  );
};

/* Donut Chart Helper */
const DonutChart = ({ data, size = 160 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-surface-1" />
        {data.map((item, i) => {
          const pct = total > 0 ? item.value / total : 0;
          const dashLength = pct * circumference;
          const el = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-accumulatedOffset * circumference / total}
              strokeLinecap="butt"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          );
          accumulatedOffset += item.value;
          return el;
        })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[22px] font-extrabold text-ink leading-tight">{total}</span>
        <span className="text-[11px] font-semibold text-ink-subtle">Total Records</span>
      </div>
    </div>
  );
};

/* Trend Sparkline Helper */
const Sparkline = ({ data, width = 240, height = 60, color = "#10b981" }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = height - (v / max) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
};

const locationCache = new Map();

const reverseGeocode = async (lat, lng) => {
  if (!lat || !lng) return null;
  const key = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;
  if (locationCache.has(key)) {
    return locationCache.get(key);
  }

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`, {
      headers: { "Accept-Language": "en" }
    });
    const data = await res.json();
    if (data && data.address) {
      const parts = [
        data.address.amenity || data.address.building || data.address.suburb || data.address.neighbourhood || data.address.road,
        data.address.city || data.address.town || data.address.village || data.address.county,
        data.address.state
      ].filter(Boolean);

      const resolvedName = parts.length > 0 ? parts.slice(0, 2).join(', ') : (data.display_name ? data.display_name.split(',').slice(0, 2).join(',') : null);
      if (resolvedName) {
        locationCache.set(key, resolvedName);
        return resolvedName;
      }
    }
  } catch (e) {
    // Fallback if offline or network error
  }

  const fallback = `GPS Pin (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
  locationCache.set(key, fallback);
  return fallback;
};

const LocationLabel = ({ loc, className = "" }) => {
  const [address, setAddress] = useState(() => {
    if (!loc) return null;
    if (typeof loc === "string") return loc;
    if (loc.address) return loc.address;
    if (loc.name) return loc.name;
    if (loc.city) return `${loc.city}${loc.state ? `, ${loc.state}` : ''}`;
    return null;
  });

  useEffect(() => {
    if (!loc) return;
    if (typeof loc === "string") { setAddress(loc); return; }
    if (loc.address) { setAddress(loc.address); return; }
    if (loc.name) { setAddress(loc.name); return; }
    if (loc.city) { setAddress(`${loc.city}${loc.state ? `, ${loc.state}` : ''}`); return; }

    if (loc.latitude && loc.longitude) {
      let isMounted = true;
      reverseGeocode(loc.latitude, loc.longitude).then(addr => {
        if (isMounted && addr) setAddress(addr);
      });
      return () => { isMounted = false; };
    }
  }, [loc]);

  if (!address && (!loc?.latitude || !loc?.longitude)) {
    return <span className="text-ink-tertiary italic text-[11px]">—</span>;
  }

  const query = (loc?.latitude && loc?.longitude)
    ? `${loc.latitude},${loc.longitude}`
    : encodeURIComponent(address || "");

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-dark hover:underline group cursor-pointer ${className}`}
      title="Click to view location in Google Maps"
    >
      <MapPin className="h-3.5 w-3.5 text-brand group-hover:scale-110 transition-transform shrink-0" />
      <span className="truncate max-w-[210px]">
        {address || `${loc?.latitude?.toFixed(4)}, ${loc?.longitude?.toFixed(4)}`}
      </span>
      <ExternalLink className="h-3 w-3 text-brand/70 group-hover:text-brand group-hover:opacity-100 transition-opacity shrink-0" />
    </a>
  );
};

/* ════════════════════════════════
   MAIN UNIFIED REPORTS COMPONENT
   ════════════════════════════════ */
export default function AttendanceReports() {
  const { user } = useAuth();
  const { read } = useGenericAPI();

  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab View Switcher: "daily" | "analytics" | "matrix"
  const [reportTab, setReportTab] = useState("daily");
  const [selectedDailyDate, setSelectedDailyDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailModal, setDetailModal] = useState(null);

  const daysCount = useMemo(() => getDaysInMonth(month, year), [month, year]);
  const dayNumbers = useMemo(() => Array.from({ length: daysCount }, (_, i) => i + 1), [daysCount]);

  // Fetch employees
  useEffect(() => {
    let isMounted = true;
    const fetchEmployees = async () => {
      try {
        const res = await read("employees", {
          fields: "basicInfo.firstName,basicInfo.lastName,professionalInfo.department,professionalInfo.designation",
          populateFields: { "professionalInfo.department": "name", "professionalInfo.designation": "title" },
          limit: 500,
          filter: { "professionalInfo.isActive": { $ne: false } }
        });
        if (!isMounted) return;
        setEmployees(res?.data || []);

        const depts = [...new Set(
          (res?.data || [])
            .map(e => e.professionalInfo?.department?.name)
            .filter(Boolean)
        )].sort();
        setDepartments(depts);
      } catch (e) {
        console.error(e);
      }
    };
    fetchEmployees();
    return () => { isMounted = false; };
  }, [user?.id]);

  // Fetch attendance records for selected month
  const fetchAttendance = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00.000Z`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysCount).padStart(2, "0")}T23:59:59.999Z`;

      const res = await read("attendances", {
        filter: { date: { $gte: startDate, $lte: endDate } },
        limit: 50000
      });
      setAttendanceData(res?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, month, year, daysCount]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Build employee -> day -> record map
  const empDayMap = useMemo(() => {
    const map = {};
    attendanceData.forEach(rec => {
      const empId = rec.employee?._id || rec.employee;
      const dateStr = new Date(rec.date).toISOString().split("T")[0];
      if (!map[empId]) map[empId] = {};
      map[empId][dateStr] = rec;
    });
    return map;
  }, [attendanceData]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const name = `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`.toLowerCase();
      const dept = emp.professionalInfo?.department?.name || "";

      if (deptFilter !== "all" && dept !== deptFilter) return false;
      if (searchQuery && !name.includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [employees, deptFilter, searchQuery]);

  // Summary Metrics & Aggregates
  const analytics = useMemo(() => {
    const totalDays = daysCount;
    let presentCount = 0, absentCount = 0, lateCount = 0, leaveCount = 0, totalHours = 0, overtimeHours = 0;
    const statusCounts = {};
    const deptCounts = {};
    const dailyTrendMap = {};

    for (let d = 1; d <= daysCount; d++) {
      dailyTrendMap[d] = 0;
    }

    attendanceData.forEach(rec => {
      const status = rec.status || "Present";
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (["Present", "Check-Out", "Work From Home"].includes(status)) presentCount++;
      else if (status === "Late Entry") { presentCount++; lateCount++; }
      else if (status === "Absent" || status === "Unchecked") absentCount++;
      else if (status === "Leave" || status === "LOP") leaveCount++;
      else if (status === "Half Day") { presentCount += 0.5; absentCount += 0.5; }

      if (rec.workHours) totalHours += rec.workHours;
      if (rec.overtimeHours) overtimeHours += rec.overtimeHours;

      // Department breakdown
      const dept = rec.employee?.professionalInfo?.department?.name || "General";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;

      // Daily trend
      if (rec.date) {
        const dayNum = new Date(rec.date).getDate();
        if (["Present", "Check-Out", "Late Entry", "Work From Home"].includes(status)) {
          dailyTrendMap[dayNum] = (dailyTrendMap[dayNum] || 0) + 1;
        }
      }
    });

    const totalTracked = attendanceData.length || 1;
    const attendanceRate = totalTracked > 0 ? Math.round((presentCount / totalTracked) * 100) : 0;
    const avgHoursPerDay = presentCount > 0 ? (totalHours / presentCount).toFixed(1) : "0.0";

    const donutData = Object.entries(statusCounts).map(([st, cnt]) => ({
      label: st,
      value: cnt,
      color: STATUS_COLORS[st] || "#94a3b8"
    }));

    const trendArray = Object.values(dailyTrendMap);

    return {
      attendanceRate,
      avgHoursPerDay,
      lateCount,
      overtimeHours: overtimeHours.toFixed(1),
      donutData,
      statusCounts,
      deptCounts,
      trendArray,
      totalPresent: Math.round(presentCount),
      totalAbsent: Math.round(absentCount),
      totalLeave: leaveCount
    };
  }, [attendanceData, daysCount]);

  // CSV Export Handler
  const exportCSV = () => {
    const headers = ["Employee", "Department", ...dayNumbers.map(d => `${d}`), "Present", "Absent", "Late", "Leave", "Work Hrs"];
    const rows = filteredEmployees.map(emp => {
      const empId = emp._id;
      const name = `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`;
      const dept = emp.professionalInfo?.department?.name || "—";
      let present = 0, absent = 0, late = 0, leave = 0, totalHrs = 0;

      const dayCols = dayNumbers.map(day => {
        const dateStr = getLocalDateStr(year, month, day);
        const rec = empDayMap[empId]?.[dateStr];
        if (!rec) {
          if (!isWeekend(year, month, day) && new Date(year, month, day) <= new Date()) absent++;
          return isWeekend(year, month, day) ? "W" : "";
        }
        const s = rec.status;
        if (["Present", "Check-Out", "Work From Home"].includes(s)) present++;
        else if (s === "Late Entry") { present++; late++; }
        else if (s === "Absent" || s === "Unchecked") absent++;
        else if (s === "Leave" || s === "LOP") leave++;
        else if (s === "Half Day") { present += 0.5; absent += 0.5; }
        if (rec.workHours) totalHrs += rec.workHours;

        return MATRIX_STATUS_MAP[s]?.short || s?.charAt(0) || "";
      });

      return [name, dept, ...dayCols, present, absent, late, leave, totalHrs.toFixed(0)];
    });

    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_Report_${MONTH_NAMES[month]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <PageLoader />;

  return (
    <div data-module="hr" className="h-full flex flex-col gap-3 overflow-y-auto scrollbar-thin bg-canvas text-ink p-3 sm:p-4" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* ─── HEADER COMMAND STRIP (Strict 1 Line) ─── */}
      <div className="flex items-center justify-between gap-3 bg-surface p-2.5 sm:p-3 rounded-tracker-card border border-hairline shadow-xs shrink-0 flex-nowrap overflow-x-auto scrollbar-none">
        {/* Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
            <BarChart3 className="h-4 w-4" />
          </div>
          <h1 className="text-sm sm:text-base font-extrabold text-ink tracking-tight whitespace-nowrap">
            Attendance Reports
          </h1>
        </div>

        {/* Integrated View Switcher Tabs (Order: 1. Daily, 2. Monthly Matrix, 3. Summary Analytics) */}
        <div className="flex items-center gap-1 bg-surface-1 p-1 rounded-xl border border-hairline-soft shrink-0">
          <button
            onClick={() => setReportTab("daily")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${reportTab === "daily"
              ? "bg-surface text-brand shadow-xs font-black"
              : "text-ink-muted hover:text-ink"
              }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Daily Register
          </button>

          <button
            onClick={() => setReportTab("matrix")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${reportTab === "matrix"
              ? "bg-surface text-brand shadow-xs font-black"
              : "text-ink-muted hover:text-ink"
              }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Monthly Matrix
          </button>

          <button
            onClick={() => setReportTab("analytics")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${reportTab === "analytics"
              ? "bg-surface text-brand shadow-xs font-black"
              : "text-ink-muted hover:text-ink"
              }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Summary Analytics
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Month Selector */}
          <MonthNavigator month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />

          {/* Export Button */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-surface hover:bg-surface-1 border border-hairline text-ink hover:text-brand transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ─── CONTROLS BAR (Filters & Date Selectors) ─── */}
      {(reportTab === "daily" || reportTab === "matrix") && (
        <div className="flex items-center justify-between flex-wrap gap-2.5 bg-surface px-3 py-2 rounded-xl border border-hairline-soft shrink-0">
          {/* Date Selector for Daily View */}
          {reportTab === "daily" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-ink-subtle">Selected Date:</span>
              <input
                type="date"
                value={selectedDailyDate}
                onChange={e => {
                  if (e.target.value) {
                    setSelectedDailyDate(e.target.value);
                    const d = new Date(e.target.value);
                    setMonth(d.getMonth());
                    setYear(d.getFullYear());
                  }
                }}
                className="px-2.5 py-1 text-xs font-extrabold bg-surface border border-hairline rounded-lg text-ink outline-none cursor-pointer shadow-2xs"
              />
              <button
                onClick={() => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  setSelectedDailyDate(todayStr);
                  setMonth(new Date().getMonth());
                  setYear(new Date().getFullYear());
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-surface-1 hover:bg-surface border border-hairline-soft text-brand transition-colors cursor-pointer"
              >
                Today
              </button>
            </div>
          ) : (
            <div className="text-xs font-bold text-ink-muted">
              Showing monthly matrix grid for <strong className="text-ink">{MONTH_NAMES[month]} {year}</strong>
            </div>
          )}

          {/* Quick Search & Dept Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle h-3.5 w-3.5" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs font-semibold bg-surface border border-hairline rounded-lg w-36 sm:w-44 outline-none focus:ring-2 ring-brand/20"
              />
            </div>

            <FilterDropdown
              label="All Departments"
              value={deptFilter === "all" ? null : deptFilter}
              onChange={(val) => setDeptFilter(val || "all")}
              options={[
                { value: "all", label: "All Departments" },
                ...departments.map(d => ({ value: d, label: d }))
              ]}
              searchable={false}
              type="default"
              className="!min-w-[140px] !py-1 !text-xs"
            />
          </div>
        </div>
      )}

      {/* ─── SUMMARY STAT CARDS (Compact KPI Mini Cards) ─── */}
      {reportTab === "analytics" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div className="bg-surface p-3 rounded-xl border border-hairline shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-ink-subtle block tracking-wider">Attendance Rate</span>
              <span className="text-base sm:text-lg font-black text-ink tracking-tight tabular-nums">{analytics.attendanceRate}%</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-surface p-3 rounded-xl border border-hairline shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-ink-subtle block tracking-wider">Avg Hours / Day</span>
              <span className="text-base sm:text-lg font-black text-ink tracking-tight tabular-nums">{analytics.avgHoursPerDay}h</span>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-surface p-3 rounded-xl border border-hairline shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-ink-subtle block tracking-wider">Late Entries</span>
              <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 tracking-tight tabular-nums">{analytics.lateCount}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-surface p-3 rounded-xl border border-hairline shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-ink-subtle block tracking-wider">Total Overtime</span>
              <span className="text-base sm:text-lg font-black text-ink tracking-tight tabular-nums">{analytics.overtimeHours}h</span>
            </div>
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 1: DAILY REGISTER (1 LINE PER EMPLOYEE) ─── */}
      {reportTab === "daily" && (
        <div className="bg-surface rounded-tracker-card border border-hairline shadow-xs overflow-hidden shrink-0">
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-surface-1/50 border-b border-hairline-soft flex-wrap">
            <h3 className="text-xs font-extrabold text-ink flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-brand" />
              Daily Register — {new Date(selectedDailyDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
            <div className="text-[11px] font-semibold text-ink-muted">
              Showing <strong className="text-ink">{filteredEmployees.length}</strong> Employees
            </div>
          </div>

          <div className="overflow-x-auto max-h-[560px]">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-surface-1 border-b border-hairline">
                <tr className="text-left font-bold text-ink-subtle">
                  <th className="px-4 py-3 min-w-[180px]">Employee</th>
                  <th className="px-3 py-3 min-w-[110px]">Status</th>
                  <th className="px-3 py-3 min-w-[110px]">Check In</th>
                  <th className="px-3 py-3 min-w-[110px]">Check Out</th>
                  <th className="px-3 py-3 min-w-[85px]">Work Hrs</th>
                  <th className="px-3 py-3 min-w-[200px]">Punch Location</th>
                  <th className="px-3 py-3 min-w-[180px] whitespace-nowrap">Punch Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {filteredEmployees.map((emp, idx) => {
                  const empId = emp._id;
                  const name = `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`.trim() || "Employee";
                  const dept = emp.professionalInfo?.department?.name || "General";
                  const rec = empDayMap[empId]?.[selectedDailyDate];
                  const selDateObj = new Date(selectedDailyDate);
                  const isWeekendDay = isWeekend(selDateObj.getFullYear(), selDateObj.getMonth(), selDateObj.getDate());
                  const isFutureDay = selDateObj > new Date();
                  const punches = rec?.punches || [];

                  const firstIn = rec?.checkIn || (punches.length > 0 ? punches[0]?.checkIn : null);
                  const lastOut = rec?.checkOut || (punches.length > 0 ? punches[punches.length - 1]?.checkOut : null);
                  const inLoc = rec?.checkInLocation || (punches.length > 0 ? punches[0]?.checkInLocation : null) || rec?.location;
                  const outLoc = rec?.checkOutLocation || (punches.length > 0 ? punches[punches.length - 1]?.checkOutLocation : null);

                  const status = rec?.status || (isWeekendDay ? "Weekend" : isFutureDay ? "Upcoming" : "Absent");

                  const fmtTime = (d) => {
                    if (!d) return "—";
                    return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                  };

                  return (
                    <tr
                      key={empId}
                      onClick={() => setDetailModal({
                        dateStr: selectedDailyDate,
                        day: selDateObj.getDate(),
                        month: selDateObj.getMonth(),
                        year: selDateObj.getFullYear(),
                        empName: name,
                        dept,
                        status,
                        record: rec,
                        isWeekend: isWeekendDay,
                        isFuture: isFutureDay
                      })}
                      className={`hover:bg-brand/5 transition-colors cursor-pointer whitespace-nowrap ${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-1/30'}`}
                    >
                      {/* Employee */}
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-ink text-xs">{name}</span>
                          <span className="text-[11px] text-ink-subtle">{dept}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${status === "Present" || status === "Check-Out" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" :
                          status === "Late Entry" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400" :
                            status === "Leave" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400" :
                              status === "Weekend" ? "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400" :
                                "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                          }`}>
                          {status}
                        </span>
                      </td>

                      {/* First Check In */}
                      <td className="px-3 py-2.5 font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        <div className="flex items-center gap-1.5">
                          <LogIn className="h-3.5 w-3.5 shrink-0" />
                          <span>{firstIn ? fmtTime(firstIn) : "—"}</span>
                        </div>
                      </td>

                      {/* Last Check Out */}
                      <td className="px-3 py-2.5 font-bold tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <LogOut className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className={lastOut ? "text-ink" : (firstIn ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-ink-tertiary")}>
                            {lastOut ? fmtTime(lastOut) : (firstIn ? "Active Now" : "—")}
                          </span>
                        </div>
                      </td>

                      {/* Work Hours */}
                      <td className="px-3 py-2.5 font-extrabold tabular-nums text-ink">
                        {rec?.workHours ? `${rec.workHours.toFixed(1)}h` : (firstIn ? "Calc..." : "—")}
                      </td>

                      {/* Punch Location */}
                      <td className="px-3 py-2.5 text-ink-subtle">
                        <LocationLabel loc={inLoc || outLoc} />
                      </td>

                      {/* Punch Activity Summary (Strict 1 Line) */}
                      <td className="px-3 py-2.5">
                        {punches.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-surface-1 text-[11px] font-extrabold border border-hairline-soft text-ink-subtle">
                              {punches.length} {punches.length === 1 ? 'Session' : 'Sessions'}
                            </span>
                            <span className="text-[11px] font-semibold text-ink-muted">
                              {lastOut ? `Ended ${fmtTime(lastOut)}` : <strong className="text-emerald-600 font-extrabold">Session Active</strong>}
                            </span>
                          </div>
                        ) : (
                          <span className="text-ink-tertiary italic text-[11px]">
                            {firstIn ? `Single punch session` : "No punch activity"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-ink-subtle text-xs font-semibold">
                      No employees found for {selectedDailyDate} matching current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 1: ANALYTICS DASHBOARD ─── */}
      {reportTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 shrink-0">

          {/* Status Distribution Donut */}
          <div className="bg-surface p-5 rounded-tracker-card border border-hairline shadow-xs flex flex-col items-center justify-between min-h-[300px]">
            <h3 className="text-sm font-bold text-ink self-start flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand" />
              Status Distribution
            </h3>
            <div className="my-4">
              <DonutChart data={analytics.donutData} size={170} />
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-xs font-semibold text-ink-muted">
              {analytics.donutData.map((d, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>{d.label}: <strong className="text-ink">{d.value}</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-surface p-5 rounded-tracker-card border border-hairline shadow-xs flex flex-col justify-between min-h-[300px]">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-brand" />
              Department Breakdown
            </h3>
            <div className="space-y-3 flex-1 justify-center flex flex-col">
              {Object.keys(analytics.deptCounts).length === 0 ? (
                <p className="text-xs text-ink-subtle text-center py-6">No department data available</p>
              ) : (
                Object.entries(analytics.deptCounts).map(([dept, count], idx) => (
                  <Bar
                    key={idx}
                    label={dept}
                    value={count}
                    max={Math.max(...Object.values(analytics.deptCounts), 1)}
                    color="var(--brand)"
                    count={`${count} logs`}
                  />
                ))
              )}
            </div>
          </div>

          {/* Daily Attendance Trend Sparkline */}
          <div className="bg-surface p-5 rounded-tracker-card border border-hairline shadow-xs flex flex-col justify-between min-h-[300px]">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-brand" />
              Daily Attendance Trend
            </h3>
            <p className="text-xs text-ink-subtle mb-4">Daily present employee trend across {MONTH_NAMES[month]} {year}</p>

            <div className="flex-1 flex items-center justify-center py-4 bg-surface-1/50 rounded-xl border border-hairline-soft">
              <Sparkline data={analytics.trendArray} width={260} height={90} color="var(--brand)" />
            </div>

            <div className="flex items-center justify-between text-xs text-ink-muted font-semibold mt-3 pt-2 border-t border-hairline-soft">
              <span>1 {MONTH_SHORT[month]}</span>
              <span>{daysCount} {MONTH_SHORT[month]}</span>
            </div>
          </div>

          {/* Detailed Status Breakdown Bars */}
          <div className="lg:col-span-3 bg-surface p-5 rounded-tracker-card border border-hairline shadow-xs">
            <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand" />
              Monthly Status Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(STATUS_COLORS).map(([st, col]) => {
                const count = analytics.statusCounts[st] || 0;
                return (
                  <Bar
                    key={st}
                    label={st}
                    value={count}
                    max={Math.max(...Object.values(analytics.statusCounts), 1)}
                    color={col}
                    count={`${count} records`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 2: MONTHLY MATRIX GRID ─── */}
      {reportTab === "matrix" && (
        <div className="bg-surface rounded-tracker-card border border-hairline shadow-xs flex flex-col overflow-hidden shrink-0">
          {/* Legend Strip */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 bg-surface-1/50 border-b border-hairline-soft flex-wrap text-xs">
            <span className="font-bold text-ink-subtle">Legend:</span>
            <div className="flex items-center gap-3 flex-wrap">
              {Object.entries(MATRIX_STATUS_MAP).slice(0, 8).map(([key, val]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center justify-center w-5 h-4 rounded text-[10px] font-bold ${val.color} ${val.text}`}>
                    {val.short}
                  </span>
                  <span className="text-ink-muted text-[11px] font-medium">{key}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Full-width Scrollable Matrix Table */}
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full border-collapse text-xs" style={{ minWidth: `${220 + daysCount * 36}px` }}>
              <thead className="sticky top-0 z-20 bg-surface-1">
                <tr>
                  <th className="sticky left-0 z-30 bg-surface-1 text-left px-4 py-3 font-bold text-ink border-b border-r border-hairline min-w-[200px]">
                    Employee Details
                  </th>
                  {dayNumbers.map(day => {
                    const weekend = isWeekend(year, month, day);
                    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                    return (
                      <th key={day} className={`px-0 py-2.5 text-center font-bold border-b border-hairline min-w-[34px]
                        ${weekend ? 'text-red-500 bg-red-500/10' : 'text-ink-subtle'}
                        ${isToday ? 'bg-brand/20 text-brand font-black' : ''}`}
                      >
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-[10px] uppercase">{["S", "M", "T", "W", "T", "F", "S"][new Date(year, month, day).getDay()]}</span>
                          <span className="text-[11px]">{day}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-2 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 border-b border-l border-hairline min-w-[42px]">P</th>
                  <th className="px-2 py-3 text-center font-bold text-red-500 border-b border-hairline min-w-[42px]">A</th>
                  <th className="px-2 py-3 text-center font-bold text-blue-500 border-b border-hairline min-w-[42px]">L</th>
                  <th className="px-2 py-3 text-center font-bold text-ink-subtle border-b border-hairline min-w-[48px]">Hrs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {filteredEmployees.map((emp, idx) => {
                  const empId = emp._id;
                  const name = `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`.trim() || "Employee";
                  const dept = emp.professionalInfo?.department?.name || "General";
                  let pCount = 0, aCount = 0, lCount = 0, totalHrs = 0;

                  return (
                    <tr key={empId} className={`${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-1/30'} hover:bg-brand/5 transition-colors`}>
                      <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 border-r border-hairline-soft">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-ink text-xs truncate max-w-[170px]">{name}</span>
                          <span className="text-[11px] text-ink-subtle truncate max-w-[170px]">{dept}</span>
                        </div>
                      </td>
                      {dayNumbers.map(day => {
                        const dateStr = getLocalDateStr(year, month, day);
                        const rec = empDayMap[empId]?.[dateStr];
                        const weekend = isWeekend(year, month, day);
                        const isFuture = new Date(year, month, day) > new Date();
                        const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                        let cellContent = "";
                        let cellClass = "";

                        if (rec) {
                          const sm = MATRIX_STATUS_MAP[rec.status] || { short: "?", color: "bg-gray-300", text: "text-white" };
                          cellContent = sm.short;
                          cellClass = `${sm.color} ${sm.text}`;

                          if (["Present", "Check-Out", "Work From Home", "Late Entry"].includes(rec.status)) pCount++;
                          else if (rec.status === "Half Day") { pCount += 0.5; aCount += 0.5; }
                          else if (["Absent", "Unchecked"].includes(rec.status)) aCount++;
                          else if (["Leave", "LOP"].includes(rec.status)) lCount++;

                          if (rec.workHours) totalHrs += rec.workHours;
                        } else if (weekend) {
                          cellContent = "W";
                          cellClass = "bg-slate-200/50 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500";
                        } else if (isFuture) {
                          cellContent = "·";
                          cellClass = "text-ink-tertiary";
                        } else {
                          cellContent = "A";
                          cellClass = "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400";
                          aCount++;
                        }

                        return (
                          <td key={day} className={`text-center px-0 py-2 ${isToday ? 'bg-brand/5' : ''}`}>
                            <span
                              onClick={() => setDetailModal({
                                dateStr,
                                day,
                                month,
                                year,
                                empName: name,
                                dept,
                                status: rec?.status || (weekend ? "Weekend" : isFuture ? "Upcoming" : "Absent"),
                                record: rec,
                                isWeekend: weekend,
                                isFuture
                              })}
                              className={`inline-flex items-center justify-center w-[25px] h-[22px] rounded text-[10px] font-bold cursor-pointer hover:scale-110 hover:shadow-xs transition-all ${cellClass}`}
                              title={`Click to view per-day details for ${name}`}
                            >
                              {cellContent}
                            </span>
                          </td>
                        );
                      })}
                      <td className="text-center border-l border-hairline-soft px-1.5 py-2 font-bold text-emerald-600 dark:text-emerald-400">{Math.round(pCount)}</td>
                      <td className="text-center px-1.5 py-2 font-bold text-red-500">{Math.round(aCount)}</td>
                      <td className="text-center px-1.5 py-2 font-bold text-blue-500">{lCount}</td>
                      <td className="text-center px-1.5 py-2 font-bold text-ink-subtle">{totalHrs > 0 ? `${totalHrs.toFixed(0)}h` : "—"}</td>
                    </tr>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={daysCount + 5} className="text-center py-12 text-ink-subtle text-xs font-semibold">
                      No employees found matching current search filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── PER-DAY DETAILS SLIDE-OVER DRAWER MODAL ─── */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="absolute inset-0" onClick={() => setDetailModal(null)} />
          <div className="relative w-full max-w-md bg-surface h-full shadow-2xl flex flex-col p-6 animate-slide-in overflow-y-auto border-l border-hairline">

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-hairline">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand">PER-DAY ATTENDANCE DETAILS</span>
                <h3 className="text-base font-bold text-ink">
                  {detailModal.empName}
                </h3>
                <p className="text-xs text-ink-subtle mt-0.5">
                  {new Date(detailModal.year, detailModal.month, detailModal.day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} • {detailModal.dept}
                </p>
              </div>
              <button
                onClick={() => setDetailModal(null)}
                className="p-2 rounded-xl bg-surface-1 hover:bg-slate-200/50 dark:hover:bg-zinc-800 text-ink-subtle hover:text-ink transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Status & Highlights */}
            {(() => {
              const rec = detailModal.record;
              const punches = rec?.punches || [];
              const firstIn = rec?.checkIn || (punches.length > 0 ? punches[0]?.checkIn : null);
              const lastOut = rec?.checkOut || (punches.length > 0 ? punches[punches.length - 1]?.checkOut : null);
              const inLoc = rec?.checkInLocation || (punches.length > 0 ? punches[0]?.checkInLocation : null) || rec?.location;
              const outLoc = rec?.checkOutLocation || (punches.length > 0 ? punches[punches.length - 1]?.checkOutLocation : null);

              const fmtTime = (d) => {
                if (!d) return "—";
                return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
              };

              const formatLoc = (loc) => {
                if (!loc) return null;
                if (typeof loc === "string") return loc;
                if (loc.address) return loc.address;
                if (loc.latitude && loc.longitude) return `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
                return JSON.stringify(loc);
              };

              return (
                <div className="py-5 space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between bg-surface-1 p-3.5 rounded-xl border border-hairline-soft">
                    <span className="text-xs font-semibold text-ink-muted">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${detailModal.status === "Present" || detailModal.status === "Check-Out" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" :
                      detailModal.status === "Late Entry" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400" :
                        detailModal.status === "Leave" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400" :
                          detailModal.status === "Weekend" ? "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400" :
                            "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                      }`}>
                      {detailModal.status}
                    </span>
                  </div>

                  {/* Time Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-1 p-3.5 rounded-xl border border-hairline-soft">
                      <span className="text-[10px] font-extrabold text-ink-subtle uppercase block mb-1">First Check In</span>
                      <span className="text-sm font-bold text-ink tabular-nums flex items-center gap-1.5">
                        <LogIn className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        {fmtTime(firstIn)}
                      </span>
                    </div>
                    <div className="bg-surface-1 p-3.5 rounded-xl border border-hairline-soft">
                      <span className="text-[10px] font-extrabold text-ink-subtle uppercase block mb-1">Last Check Out</span>
                      <span className={`text-sm font-bold tabular-nums flex items-center gap-1.5 ${lastOut ? 'text-ink' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        <LogOut className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        {lastOut ? fmtTime(lastOut) : (firstIn ? "Active Now" : "—")}
                      </span>
                    </div>
                  </div>

                  {/* Work Hours & Overtime */}
                  <div className="bg-surface-1 p-3.5 rounded-xl border border-hairline-soft flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-ink-subtle uppercase block mb-0.5">Total Work Hours</span>
                      <span className="text-sm font-extrabold text-ink tabular-nums">
                        {rec?.workHours ? `${rec.workHours.toFixed(1)}h` : (firstIn ? "Calculating..." : "—")}
                      </span>
                    </div>
                    {rec?.overtimeHours > 0 && (
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        +{rec.overtimeHours.toFixed(1)}h OT
                      </span>
                    )}
                  </div>

                  {/* Location Information */}
                  <div className="bg-surface-1 p-3.5 rounded-xl border border-hairline-soft space-y-2">
                    <span className="text-[10px] font-extrabold text-ink-subtle uppercase flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                      Punch Location
                    </span>
                    {inLoc || outLoc ? (
                      <div className="space-y-1.5 text-xs">
                        {inLoc && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-ink-subtle text-[11px] shrink-0">Check-in:</span>
                            <LocationLabel loc={inLoc} />
                          </div>
                        )}
                        {outLoc && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-ink-subtle text-[11px] shrink-0">Check-out:</span>
                            <LocationLabel loc={outLoc} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-subtle italic">No GPS location recorded for this punch session.</p>
                    )}
                  </div>

                  {/* Multi-Punch Sessions Breakdown */}
                  <div className="pt-3 border-t border-hairline-soft space-y-3">
                    <h4 className="text-xs font-extrabold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-brand" />
                      Punch Sessions Log {punches.length > 0 && `(${punches.length})`}
                    </h4>

                    {punches.length > 0 ? (
                      <div className="space-y-2">
                        {punches.map((p, pIdx) => (
                          <div key={pIdx} className="p-3 bg-surface rounded-xl border border-hairline-soft text-xs flex items-center justify-between gap-2">
                            <span className="font-bold text-ink-subtle text-[11px]">Session #{pIdx + 1}</span>
                            <div className="flex items-center gap-2 tabular-nums">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {fmtTime(p.checkIn)}
                              </span>
                              <span className="text-ink-subtle">➔</span>
                              <span className={p.checkOut ? "font-bold text-amber-600 dark:text-amber-400" : "font-extrabold text-emerald-500"}>
                                {p.checkOut ? fmtTime(p.checkOut) : "Active"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5 text-ink-subtle text-xs bg-surface-1/50 rounded-xl border border-hairline-soft">
                        {firstIn ? `Check-in recorded at ${fmtTime(firstIn)}` : "No punch records logged for this date."}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
