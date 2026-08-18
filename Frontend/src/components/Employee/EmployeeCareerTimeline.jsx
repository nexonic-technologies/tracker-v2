import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import toast from "react-hot-toast";
import {
  TrendingUp, ArrowRightLeft, DollarSign, Award,
  Building2, UserCheck, Shield, GitMerge, Landmark, RefreshCw
} from "lucide-react";

/* ── Change type metadata ───────────────────────── */
const CHANGE_META = {
  InitialBaseline:  { label: "Joined",             icon: Landmark,       color: "bg-blue-500",    ring: "ring-blue-200 dark:ring-blue-800" },
  Promotion:        { label: "Promotion",          icon: TrendingUp,     color: "bg-emerald-500", ring: "ring-emerald-200 dark:ring-emerald-800" },
  Transfer:         { label: "Transfer",           icon: ArrowRightLeft, color: "bg-indigo-500",  ring: "ring-indigo-200 dark:ring-indigo-800" },
  SalaryRevision:   { label: "Salary Revision",   icon: DollarSign,     color: "bg-violet-500",  ring: "ring-violet-200 dark:ring-violet-800" },
  DesignationChange:{ label: "Designation Change",icon: Award,          color: "bg-amber-500",   ring: "ring-amber-200 dark:ring-amber-800" },
  DepartmentChange: { label: "Department Change", icon: Building2,      color: "bg-cyan-500",    ring: "ring-cyan-200 dark:ring-cyan-800" },
  ManagerChange:    { label: "Manager Change",    icon: UserCheck,      color: "bg-pink-500",    ring: "ring-pink-200 dark:ring-pink-800" },
  RoleChange:       { label: "Role Change",       icon: Shield,         color: "bg-orange-500",  ring: "ring-orange-200 dark:ring-orange-800" },
  StatusChange:     { label: "Status Change",     icon: GitMerge,       color: "bg-rose-500",    ring: "ring-rose-200 dark:ring-rose-800" },
};

/* ── Helper: render before/after diff ──────────── */
const renderDiff = (prev, next) => {
  if (prev === null || prev === undefined) {
    return <span className="text-emerald-600 font-medium">{JSON.stringify(next)}</span>;
  }
  if (typeof prev === "object" && typeof next === "object") {
    return (
      <span className="text-xs font-mono">
        <span className="text-rose-400 line-through">{JSON.stringify(prev)}</span>
        {" → "}
        <span className="text-emerald-500">{JSON.stringify(next)}</span>
      </span>
    );
  }
  return (
    <span className="text-xs">
      <span className="text-rose-400 line-through">{String(prev)}</span>
      {" → "}
      <span className="text-emerald-500 font-medium">{String(next)}</span>
    </span>
  );
};

/* ── Main Component ─────────────────────────────── */
const EmployeeCareerTimeline = ({ record, employeeId }) => {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTimeline = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const res = await axiosInstance.post("/populate/read/employee_life_cycle_histories", {
        filter: { employeeId, isDeleted: { $ne: true } },
        sort: { effectiveDate: -1 },
        limit: 200,
        populateFields: {
          changedBy: "basicInfo.firstName,basicInfo.lastName,professionalInfo.empId",
        },
      });
      setEvents(res.data?.data || []);
    } catch {
      toast.error("Failed to load career timeline.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  /* ── Render ──────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/40">
            <TrendingUp size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-ink text-base">Career Timeline</h3>
            <p className="text-ink-muted text-xs">
              {events.length} lifecycle event{events.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </div>
        <button
          onClick={fetchTimeline}
          className="p-2 rounded-lg hover:bg-surface-2 transition text-ink-muted"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="tracker-card p-10 flex flex-col items-center gap-3 text-ink-muted">
          <TrendingUp size={36} strokeWidth={1.2} />
          <p className="text-sm">No lifecycle events recorded yet.</p>
          <p className="text-xs">Events are recorded automatically when HR updates employee records.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-divide" />

          <div className="space-y-1">
            {events.map((event, idx) => {
              const meta = CHANGE_META[event.changeType] || CHANGE_META.StatusChange;
              const Icon = meta.icon;
              const isLast = idx === events.length - 1;

              return (
                <div key={event._id} className="relative flex gap-4 pl-14 pb-6">
                  {/* Icon node */}
                  <div
                    className={`absolute left-2.5 top-0 w-5 h-5 rounded-full ${meta.color} ring-2 ${meta.ring} ring-offset-1 ring-offset-canvas flex items-center justify-center flex-shrink-0 z-10`}
                  >
                    <Icon size={10} className="text-white" />
                  </div>

                  {/* Content card */}
                  <div className={`tracker-card flex-1 p-4 ${isLast ? "border-dashed" : ""}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <span className="text-sm font-semibold text-ink">{meta.label}</span>
                        {event.reason && (
                          <span className="ml-2 text-xs text-ink-muted italic">— {event.reason}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-ink">
                          {new Date(event.effectiveDate).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric"
                          })}
                        </p>
                        {event.changedBy && (
                          <p className="text-xs text-ink-muted">
                            by {event.changedBy.basicInfo?.firstName || "System"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Diff rendering */}
                    {(event.previousValue !== null || event.newValue !== undefined) && (
                      <div className="mt-2 pt-2 border-t border-divide">
                        <div className="text-xs text-ink-muted space-y-1">
                          {typeof event.newValue === "object" && event.newValue !== null
                            ? Object.entries(event.newValue).map(([key, val]) => (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="font-medium text-ink capitalize">
                                    {key.replace(/([A-Z])/g, " $1").trim()}:
                                  </span>
                                  {renderDiff(
                                    event.previousValue?.[key],
                                    val
                                  )}
                                </div>
                              ))
                            : (
                                <div className="flex items-center gap-2">
                                  {renderDiff(event.previousValue, event.newValue)}
                                </div>
                              )
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeCareerTimeline;
