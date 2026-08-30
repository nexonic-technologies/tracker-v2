import { useState, useEffect, useCallback } from "react";
import { PayrollService } from "@services";
import toast from "react-hot-toast";
import {
  Calendar,
  Lock,
  Unlock,
  Eye,
  Plus,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck
} from "lucide-react";
import { useCapability } from "@hooks/useCapability";

const STATUS_CHIP = {
  Open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  'In Progress': "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  Closed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  Reopened: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] font-semibold px-2.5 py-1 rounded-full"
};

const MODULE_LABELS = {
  payroll: "Payroll",
  attendance: "Attendance",
  expenses: "Expenses",
  timeTracking: "Time Tracking",
  quotations: "Quotations"
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount) {
  return `₹${(amount || 0).toLocaleString("en-IN")}`;
}

export default function PeriodClosuresTab() {
  const { isSuperAdmin, hasAnyCapability } = useCapability();
  const canCreate = isSuperAdmin || hasAnyCapability(['period_closures:create']);
  const canUpdate = isSuperAdmin || hasAnyCapability(['period_closures:update']);

  const [view, setView] = useState("list"); // "list" | "create" | "detail"
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClosure, setSelectedClosure] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFY, setFilterFY] = useState("");

  const fetchClosures = useCallback(async () => {
    try {
      setLoading(true);
      const filter = {};
      if (filterStatus) filter.status = filterStatus;
      if (filterFY) filter.financialYearLabel = filterFY;

      const res = await PayrollService.getperiod_closures({
        filter,
        limit: 1000,
        sort: { createdAt: -1 }
      });
      setClosures(res.data || []);
    } catch (error) {
      toast.error("Failed to load period closures");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterFY]);

  useEffect(() => {
    fetchClosures();
  }, [fetchClosures]);

  const handleQuickClose = async (closureId) => {
    try {
      await PayrollService.updatePeriodClosure(closureId, { status: 'Closed' });
      toast.success("Period closed successfully");
      fetchClosures();
      if (selectedClosure && selectedClosure._id === closureId) {
        setSelectedClosure(prev => ({ ...prev, status: 'Closed' }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to close period");
    }
  };

  const handleReopen = async (closureId) => {
    const reason = prompt("Please provide a reason for reopening this period:");
    if (!reason) return;

    try {
      await PayrollService.updatePeriodClosure(closureId, {
        status: 'Reopened',
        reopenReason: reason
      });
      toast.success("Period reopened successfully");
      fetchClosures();
      if (selectedClosure && selectedClosure._id === closureId) {
        setSelectedClosure(prev => ({ ...prev, status: 'Reopened', reopenReason: reason }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reopen period");
    }
  };

  const stats = [
    { label: "Total Periods", value: closures.length },
    { label: "Open", value: closures.filter(c => c.status === "Open").length },
    { label: "In Progress", value: closures.filter(c => c.status === "In Progress").length },
    { label: "Closed", value: closures.filter(c => c.status === "Closed").length }
  ];

  if (loading && closures.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 pay-card">
        <Loader2 size={24} className="animate-spin text-brand-solid" />
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
   * VIEW: CREATE (2026-Grade In-Page Period Closure Creator)
   * ───────────────────────────────────────────────────────────── */
  if (view === "create") {
    return (
      <PeriodClosureCreateView
        onBack={() => setView("list")}
        onCreated={() => {
          setView("list");
          fetchClosures();
        }}
      />
    );
  }

  /* ─────────────────────────────────────────────────────────────
   * VIEW: DETAIL (2026-Grade Period Closure Detail & Audit View)
   * ───────────────────────────────────────────────────────────── */
  if (view === "detail" && selectedClosure) {
    return (
      <PeriodClosureDetailView
        closure={selectedClosure}
        canUpdate={canUpdate}
        onClosePeriod={() => handleQuickClose(selectedClosure._id)}
        onReopenPeriod={() => handleReopen(selectedClosure._id)}
        onBack={() => setView("list")}
      />
    );
  }

  /* ─────────────────────────────────────────────────────────────
   * VIEW: LIST
   * ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="pay-card p-3.5">
            <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">{s.label}</p>
            <p className="text-[22px] font-bold text-ink leading-tight mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="lmx-input text-[12px]"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
            <option value="Reopened">Reopened</option>
          </select>

          <select
            value={filterFY}
            onChange={(e) => setFilterFY(e.target.value)}
            className="lmx-input text-[12px]"
          >
            <option value="">All Financial Years</option>
            {[...new Set(closures.map(c => c.financialYearLabel))].filter(Boolean).map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        </div>

        {canCreate && (
          <button
            onClick={() => setView("create")}
            className="tracker-btn-brand flex items-center gap-2 text-[13px] py-2 px-4 shadow-sm"
          >
            <Plus size={15} />
            <span>New Period Closure</span>
          </button>
        )}
      </div>

      {/* Listing Cards */}
      <div className="space-y-3">
        {closures.length === 0 && (
          <div className="pay-card p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-2xl bg-surface-1 text-ink-subtle">
              <Calendar size={32} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-ink">No Period Closures Defined</h3>
              <p className="text-[13px] text-ink-muted mt-1 max-w-md mx-auto">
                Create accounting and payroll period closures to lock past transactional records.
              </p>
            </div>
            {canCreate && (
              <button
                onClick={() => setView("create")}
                className="tracker-btn-brand text-[13px] py-2 px-4 flex items-center gap-2 mt-2"
              >
                <Plus size={15} /> Add First Period Closure
              </button>
            )}
          </div>
        )}

        {closures.map(closure => (
          <div key={closure._id} className="pay-card p-4 border border-hairline hover:border-brand-solid/25 transition">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-solid/10 text-brand-solid">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-ink">{closure.periodLabel}</p>
                  <p className="text-[12px] text-ink-muted">
                    {formatDate(closure.startDate)} – {formatDate(closure.endDate)}
                    <span className="mx-2">·</span>
                    {closure.financialYearLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={STATUS_CHIP[closure.status] || STATUS_CHIP.Open}>{closure.status}</span>
              </div>
            </div>

            {/* Modules Pill Grid */}
            <div className="mt-3 pt-3 border-t border-hairline-soft">
              <div className="flex flex-wrap gap-2">
                {Object.entries(closure.modules || {}).map(([moduleName, moduleData]) => (
                  <div
                    key={moduleName}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                      moduleData.closed
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    {moduleData.closed ? <Lock size={11} /> : <Unlock size={11} />}
                    {MODULE_LABELS[moduleName] || moduleName}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Metrics */}
            {closure.summary && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] text-ink-muted">
                <div className="p-2 rounded-lg bg-surface-1">
                  <span className="block text-ink-subtle">Payroll Records</span>
                  <span className="font-bold text-ink">{closure.summary.totalPayrollRecords || 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-1">
                  <span className="block text-ink-subtle">Expenses</span>
                  <span className="font-bold text-ink">{formatCurrency(closure.summary.totalExpenseAmount)}</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-1">
                  <span className="block text-ink-subtle">Attendance</span>
                  <span className="font-bold text-ink">{closure.summary.totalAttendanceRecords || 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-1">
                  <span className="block text-ink-subtle">Time Tracking</span>
                  <span className="font-bold text-ink">{closure.summary.totalTimeTrackingHours || 0}h</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-1">
                  <span className="block text-ink-subtle">Quotations</span>
                  <span className="font-bold text-ink">{closure.summary.totalQuotations || 0}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-hairline-soft">
              <button
                onClick={() => {
                  setSelectedClosure(closure);
                  setView("detail");
                }}
                className="tracker-btn-ghost flex items-center gap-1.5 text-[12px] py-1.5 px-3 border border-hairline"
              >
                <Eye size={13} /> View Period Audit
              </button>

              <div className="flex items-center gap-2">
                {closure.status === 'Open' && canUpdate && (
                  <button
                    onClick={() => handleQuickClose(closure._id)}
                    className="tracker-btn-accent flex items-center gap-1.5 text-[12px] py-1.5 px-3.5 shadow-xs"
                  >
                    <Lock size={13} /> Close Period
                  </button>
                )}
                {closure.status === 'Closed' && canUpdate && (
                  <button
                    onClick={() => handleReopen(closure._id)}
                    className="tracker-btn-secondary flex items-center gap-1.5 text-[12px] py-1.5 px-3.5 shadow-xs"
                  >
                    <Unlock size={13} /> Reopen Period
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * 2026-GRADE CREATE PERIOD CLOSURE PAGE VIEW (No Modal Popup!)
 * ───────────────────────────────────────────────────────────────────────── */
function PeriodClosureCreateView({ onBack, onCreated }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    try {
      setSubmitting(true);
      await PayrollService.createPeriodClosure({ startDate, endDate });
      toast.success("Period closure created successfully");
      onCreated();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create period closure");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-hairline">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-hairline bg-surface hover:bg-surface-1 text-ink transition shadow-xs"
            title="Back to closures"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="lmx-page-eyebrow">PAYROLL / CLOSURES</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-solid/10 text-brand-solid">
                NEW LOCK PERIOD
              </span>
            </div>
            <h2 className="text-[20px] font-bold text-ink tracking-tight flex items-center gap-2">
              <Calendar size={18} className="text-brand-solid" />
              Define New Period Closure
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="tracker-btn-ghost text-[13px] py-2 px-4 border border-hairline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="tracker-btn-brand flex items-center gap-2 text-[13px] py-2 px-5 shadow-sm"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            <span>{submitting ? "Creating…" : "Create Period"}</span>
          </button>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="pay-card p-6 border border-hairline space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
              Period Start Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="lmx-input w-full text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
              Period End Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="lmx-input w-full text-[13px]"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-1 border border-hairline space-y-2">
          <p className="text-[12px] font-bold text-ink">Modules to be Locked upon Closure:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12px] text-ink-muted">
            <span className="flex items-center gap-1.5">✓ Payroll Processing</span>
            <span className="flex items-center gap-1.5">✓ Attendance Records</span>
            <span className="flex items-center gap-1.5">✓ Travel Expenses</span>
            <span className="flex items-center gap-1.5">✓ Time Tracking Logs</span>
            <span className="flex items-center gap-1.5">✓ Sales Quotations</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full tracker-btn-brand py-2.5 text-[13px] flex items-center justify-center gap-2 shadow-md"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
          <span>{submitting ? "Creating Period Closure…" : "Initialize Period Closure"}</span>
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * 2026-GRADE PERIOD CLOSURE DETAIL AUDIT VIEW (No Modal Popup!)
 * ───────────────────────────────────────────────────────────────────────── */
function PeriodClosureDetailView({ closure, canUpdate, onClosePeriod, onReopenPeriod, onBack }) {
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-hairline">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-hairline bg-surface hover:bg-surface-1 text-ink transition shadow-xs"
            title="Back to closures"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="lmx-page-eyebrow">PAYROLL / CLOSURE AUDIT</span>
              <span className={STATUS_CHIP[closure.status] || STATUS_CHIP.Open}>{closure.status}</span>
            </div>
            <h2 className="text-[20px] font-bold text-ink tracking-tight">
              {closure.periodLabel} ({closure.financialYearLabel})
            </h2>
            <p className="text-[12px] text-ink-muted">
              {formatDate(closure.startDate)} to {formatDate(closure.endDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {closure.status === 'Open' && canUpdate && (
            <button
              onClick={onClosePeriod}
              className="tracker-btn-accent flex items-center gap-1.5 text-[13px] py-2 px-4 shadow-sm"
            >
              <Lock size={14} /> Close Period
            </button>
          )}

          {closure.status === 'Closed' && canUpdate && (
            <button
              onClick={onReopenPeriod}
              className="tracker-btn-secondary flex items-center gap-1.5 text-[13px] py-2 px-4 shadow-sm"
            >
              <Unlock size={14} /> Reopen Period
            </button>
          )}
        </div>
      </div>

      {/* Modules Locking Status Grid */}
      <div className="pay-card p-5 border border-hairline space-y-4">
        <h3 className="text-[14px] font-bold text-ink pb-2 border-b border-hairline">
          Module Locking & Audit Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(closure.modules || {}).map(([moduleName, moduleData]) => (
            <div key={moduleName} className="p-3.5 rounded-xl border border-hairline bg-surface-1/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[13px] text-ink">{MODULE_LABELS[moduleName] || moduleName}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  moduleData.closed
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {moduleData.closed ? 'LOCKED' : 'UNLOCKED'}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted">
                {moduleData.closed ? `Locked on ${formatDate(moduleData.closedAt)}` : 'Active for edits and entries'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Metrics */}
      {closure.summary && (
        <div className="pay-card p-5 border border-hairline space-y-3">
          <h3 className="text-[14px] font-bold text-ink pb-2 border-b border-hairline">
            Snapshot at Closure
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[13px]">
            <div className="p-3 rounded-xl bg-surface-1">
              <p className="text-[11px] text-ink-subtle uppercase">Payroll Runs</p>
              <p className="text-[18px] font-bold text-ink mt-0.5">{closure.summary.totalPayrollRecords || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-1">
              <p className="text-[11px] text-ink-subtle uppercase">Expenses Payout</p>
              <p className="text-[18px] font-bold text-ink mt-0.5">{formatCurrency(closure.summary.totalExpenseAmount)}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-1">
              <p className="text-[11px] text-ink-subtle uppercase">Attendance Logs</p>
              <p className="text-[18px] font-bold text-ink mt-0.5">{closure.summary.totalAttendanceRecords || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-1">
              <p className="text-[11px] text-ink-subtle uppercase">Logged Hours</p>
              <p className="text-[18px] font-bold text-ink mt-0.5">{closure.summary.totalTimeTrackingHours || 0}h</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-1">
              <p className="text-[11px] text-ink-subtle uppercase">Quotations</p>
              <p className="text-[18px] font-bold text-ink mt-0.5">{closure.summary.totalQuotations || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Reopening Audit Log */}
      {closure.reopenReason && (
        <div className="pay-card p-4 border border-hairline bg-rose-50/50 dark:bg-rose-950/20 text-[13px] space-y-1">
          <p className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <AlertCircle size={15} /> Reopened Audit Note
          </p>
          <p className="text-ink-muted pl-5">{closure.reopenReason}</p>
        </div>
      )}
    </div>
  );
}
