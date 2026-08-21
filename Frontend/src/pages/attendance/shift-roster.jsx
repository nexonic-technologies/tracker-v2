import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/authProvider.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";
import useGenericAPI from "../../components/useGenericAPI.js";
import {
  Clock, ChevronLeft, ChevronRight, Users, Calendar, ArrowRightLeft
} from "lucide-react";

/* ════════════════════════════════
   HELPERS
   ════════════════════════════════ */
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getWeekDates = (offset = 0) => {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const isSameDay = (a, b) => a.toDateString() === b.toDateString();

const SHIFT_COLORS = [
  { bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  { bg: "bg-purple-50 dark:bg-purple-950/20", border: "border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  { bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  { bg: "bg-teal-50 dark:bg-teal-950/20", border: "border-teal-200 dark:border-teal-800", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500" },
];

/* ════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════ */
import ShiftEditorModal from "./ShiftEditorModal.jsx";

const ShiftRoster = () => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { read, create, update } = useGenericAPI();

  const canManageShifts = can('create', 'shifts') || can('update', 'shifts');

  const [weekOffset, setWeekOffset] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("all");
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  const handleSaveShift = async (formData) => {
    try {
      if (formData._id) {
        await update('shifts', formData._id, formData);
      } else {
        await create('shifts', formData);
      }
      setShowShiftModal(false);
      setEditingShift(null);
      // Refresh shifts
      const shiftRes = await read("shifts", { limit: 50, filter: { isActive: true } });
      setShifts(shiftRes?.data || []);
    } catch (err) {
      console.error('Failed to save shift profile:', err);
      alert('Error saving shift: ' + (err.message || 'Failed to persist shift profile'));
    }
  };

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = `${fmtDate(weekDates[0])} – ${fmtDate(weekDates[6])}`;

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const startStr = weekDates[0].toISOString();
        const endStr = weekDates[6].toISOString().replace("T00:", "T23:").replace(":00.000Z", ":59.999Z");

        const [empRes, shiftRes, assignRes, attRes] = await Promise.all([
          read("employees", {
            fields: "basicInfo.firstName,basicInfo.lastName,professionalInfo.department,professionalInfo.designation",
            populateFields: { "professionalInfo.department": "name", "professionalInfo.designation": "title" },
            limit: 500,
            filter: { "professionalInfo.isActive": { $ne: false } }
          }),
          read("shifts", { limit: 50, filter: { isActive: true } }),
          read("shiftassignments", {
            limit: 5000,
            filter: { isActive: true },
            populateFields: { shiftId: "name,startTime,endTime,workingHours" }
          }),
          read("attendances", {
            filter: { date: { $gte: startStr, $lte: endStr } },
            limit: 50000,
            fields: "employee,date,status,checkIn,checkOut,workHours"
          })
        ]);

        const emps = empRes?.data || [];
        setEmployees(emps);
        setShifts(shiftRes?.data || []);
        setAssignments(assignRes?.data || []);
        setAttendances(attRes?.data || []);

        const depts = [...new Set(emps.map(e => e.professionalInfo?.department?.name).filter(Boolean))].sort();
        setDepartments(depts);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [read, weekDates]);

  // Build shift color map
  const shiftColorMap = useMemo(() => {
    const map = {};
    shifts.forEach((s, i) => { map[s._id] = SHIFT_COLORS[i % SHIFT_COLORS.length]; });
    return map;
  }, [shifts]);

  // Build employee → shift assignment map
  const empShiftMap = useMemo(() => {
    const map = {};
    assignments.forEach(a => {
      const empId = a.employeeId?._id || a.employeeId;
      if (!map[empId]) map[empId] = a;
    });
    return map;
  }, [assignments]);

  // Build employee+date → attendance map
  const attMap = useMemo(() => {
    const map = {};
    attendances.forEach(r => {
      const empId = r.employee?._id || r.employee;
      const dateStr = new Date(r.date).toDateString();
      map[`${empId}_${dateStr}`] = r;
    });
    return map;
  }, [attendances]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const name = `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`.toLowerCase();
      const dept = emp.professionalInfo?.department?.name || "";
      if (deptFilter !== "all" && dept !== deptFilter) return false;
      if (searchQuery && !name.includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [employees, deptFilter, searchQuery]);

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-canvas text-ink">
      <div className="h-8 w-8 border-4 border-hairline border-t-accent rounded-full animate-spin" />
    </div>
  );

  return (
    <div data-module="hr" className="h-full flex flex-col gap-3 overflow-hidden bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* ─── HEADER ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-ink" />
          <h1 className="text-[20px] font-semibold text-ink">Shift Roster</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Shift Configure Button (Admin / Manager Capability Gated) */}
          {canManageShifts && (
            <button
              onClick={() => { setEditingShift(null); setShowShiftModal(true); }}
              className="px-3.5 py-1.5 text-[13px] font-semibold bg-brand text-brand-contrast rounded-[8px] hover:opacity-90 transition cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>+</span> Configure Shift Profiles
            </button>
          )}

          {/* Week Nav */}
          <div className="flex items-center gap-1 bg-surface border border-hairline rounded-[8px] px-1 py-0.5">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 hover:bg-surface-1 rounded-[6px] transition cursor-pointer">
              <ChevronLeft className="h-4 w-4 text-ink-subtle" />
            </button>
            <button onClick={() => setWeekOffset(0)} className={`px-3 py-1 text-[13px] font-medium rounded-[6px] transition cursor-pointer ${weekOffset === 0 ? 'bg-surface-1 text-ink' : 'text-ink-subtle hover:bg-surface-1'}`}>
              {weekOffset === 0 ? "This Week" : weekLabel}
            </button>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 hover:bg-surface-1 rounded-[6px] transition cursor-pointer">
              <ChevronRight className="h-4 w-4 text-ink-subtle" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── FILTERS + LEGEND ─── */}
      <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
        <input
          type="text" placeholder="Search employee..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="px-3 py-2 text-[13px] bg-surface border border-hairline rounded-[8px] text-ink placeholder:text-ink-tertiary w-[200px] outline-none focus:border-accent transition"
        />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 text-[13px] bg-surface border border-hairline rounded-[8px] text-ink outline-none focus:border-accent transition cursor-pointer"
        >
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Shift legend */}
        <div className="ml-auto flex items-center gap-3 text-[11px]">
          {shifts.map((s, i) => (
            <span key={s._id} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${SHIFT_COLORS[i % SHIFT_COLORS.length].dot}`} />
              <span className="text-ink-subtle">{s.name} ({s.startTime}–{s.endTime})</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── ROSTER GRID ─── */}
      <div className="flex-1 overflow-auto bg-surface rounded-tracker-card border border-hairline shadow-sm">
        <table className="w-full border-collapse text-[12px]" style={{ minWidth: "900px" }}>
          <thead className="sticky top-0 z-10 bg-surface-1">
            <tr>
              <th className="sticky left-0 z-20 bg-surface-1 text-left px-4 py-3 font-medium text-ink-subtle border-b border-r border-hairline min-w-[200px]">
                Employee
              </th>
              {weekDates.map((date, i) => {
                const isToday = isSameDay(date, new Date());
                const isSun = date.getDay() === 0;
                return (
                  <th key={i} className={`px-2 py-3 text-center font-medium border-b border-hairline min-w-[110px]
                    ${isToday ? 'bg-accent/10 text-accent' : isSun ? 'text-red-400' : 'text-ink-subtle'}`}
                  >
                    <div className="flex flex-col items-center leading-tight">
                      <span className="text-[10px]">{DAY_LABELS[i]}</span>
                      <span className="text-[13px]">{fmtDate(date)}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp, idx) => {
              const empId = emp._id;
              const name = `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`;
              const dept = emp.professionalInfo?.department?.name || "";
              const desg = emp.professionalInfo?.designation?.title || "";
              const assignment = empShiftMap[empId];
              const shiftData = assignment?.shiftId;
              const shiftId = shiftData?._id || assignment?.shiftId;
              const colors = shiftColorMap[shiftId] || SHIFT_COLORS[0];

              return (
                <tr key={empId} className={`${idx % 2 === 0 ? '' : 'bg-surface-1/20'} hover:bg-accent/5 transition`}>
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 border-b border-r border-hairline-soft">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-surface-1 flex items-center justify-center text-[11px] font-semibold text-ink-subtle flex-shrink-0">
                        {(emp.basicInfo?.firstName?.[0] || "").toUpperCase()}{(emp.basicInfo?.lastName?.[0] || "").toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-ink text-[12px] truncate">{name}</span>
                        <span className="text-[10px] text-ink-tertiary truncate">{desg || dept}</span>
                      </div>
                    </div>
                  </td>
                  {weekDates.map((date, i) => {
                    const isToday = isSameDay(date, new Date());
                    const isSun = date.getDay() === 0;
                    const att = attMap[`${empId}_${date.toDateString()}`];

                    const shiftName = shiftData?.name || "General";
                    const shiftTime = shiftData ? `${shiftData.startTime}–${shiftData.endTime}` : "9:00–18:00";

                    return (
                      <td key={i} className={`text-center border-b border-hairline-soft px-1.5 py-2 ${isToday ? 'bg-accent/5' : ''}`}>
                        {isSun ? (
                          <div className="text-[10px] text-red-400 dark:text-red-500 font-medium py-1">Week Off</div>
                        ) : (
                          <div className={`rounded-[8px] border px-2 py-1.5 ${colors.bg} ${colors.border}`}>
                            <div className={`text-[11px] font-medium ${colors.text} truncate`}>{shiftName}</div>
                            <div className="text-[10px] text-ink-tertiary">{shiftTime}</div>
                            {att && (
                              <div className={`mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full inline-block
                                ${att.status === "Present" || att.status === "Check-Out" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                                  att.status === "Late Entry" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                                    att.status === "Absent" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                                      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                              >
                                {att.status}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-ink-tertiary text-[14px]">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Shift Configuration Modal */}
      <ShiftEditorModal
        shiftData={editingShift}
        isOpen={showShiftModal}
        onClose={() => { setShowShiftModal(false); setEditingShift(null); }}
        onSave={handleSaveShift}
      />
    </div>
  );
};

export default ShiftRoster;
