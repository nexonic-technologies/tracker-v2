import { useState, useEffect, useCallback } from "react";
import { PayrollService } from "@services";
import toast from "react-hot-toast";
import { Calendar, Lock, Unlock, Eye, Plus, X, Loader2, AlertCircle } from "lucide-react";

const STATUS_CHIP = {
  Open: "bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  'In Progress': "bg-amber-100 text-amber-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  Closed: "bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  Reopened: "bg-rose-100 text-rose-700 text-[11px] font-semibold px-2.5 py-1 rounded-full"
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

export default function period_closuresTab() {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailClosure, setDetailClosure] = useState(null);
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

  const stats = [
    { label: "Total Periods", value: closures.length, color: "var(--module-payroll)" },
    { label: "Open", value: closures.filter(c => c.status === "Open").length, color: "#10b981" },
    { label: "In Progress", value: closures.filter(c => c.status === "In Progress").length, color: "#f59e0b" },
    { label: "Closed", value: closures.filter(c => c.status === "Closed").length, color: "#64748b" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--module-payroll)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="pay-stat-card">
            <p className="pay-stat-card__label">{stat.label}</p>
            <p className="pay-stat-card__value" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

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
            {[...new Set(closures.map(c => c.financialYearLabel))].map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        </div>

        <button onClick={() => setShowCreate(true)} className="tracker-btn-accent flex items-center gap-2">
          <Plus size={14} /> New Period Closure
        </button>
      </div>

      <div className="space-y-3">
        {closures.length === 0 && (
          <div className="pay-card p-8 text-center">
            <Calendar size={32} className="mx-auto mb-3 lmx-icon-tile" />
            <p className="text-[14px] font-semibold text-ink">No period closures yet</p>
            <p className="text-[13px] text-ink-muted mt-1">Click "New Period Closure" to create your first period</p>
          </div>
        )}

        {closures.map(closure => (
          <div key={closure._id} className="pay-card p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="lmx-icon-tile">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-ink">{closure.periodLabel}</p>
                  <p className="text-[12px] text-ink-muted">
                    {formatDate(closure.startDate)} - {formatDate(closure.endDate)}
                    <span className="mx-2">·</span>
                    {closure.financialYearLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={STATUS_CHIP[closure.status] || STATUS_CHIP.Open}>{closure.status}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-hairline-soft">
              <div className="flex flex-wrap gap-2">
                {Object.entries(closure.modules || {}).map(([moduleName, moduleData]) => (
                  <div
                    key={moduleName}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] ${moduleData.closed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                  >
                    {moduleData.closed ? <Lock size={11} /> : <Unlock size={11} />}
                    {MODULE_LABELS[moduleName] || moduleName}
                  </div>
                ))}
              </div>
            </div>

            {closure.summary && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] text-ink-muted">
                <div>
                  <span className="block text-ink-subtle">Payroll Records</span>
                  <span className="font-medium text-ink">{closure.summary.totalPayrollRecords || 0}</span>
                </div>
                <div>
                  <span className="block text-ink-subtle">Expenses</span>
                  <span className="font-medium text-ink">{formatCurrency(closure.summary.totalExpenseAmount)}</span>
                </div>
                <div>
                  <span className="block text-ink-subtle">Attendance</span>
                  <span className="font-medium text-ink">{closure.summary.totalAttendanceRecords || 0}</span>
                </div>
                <div>
                  <span className="block text-ink-subtle">Time Tracking</span>
                  <span className="font-medium text-ink">{closure.summary.totalTimeTrackingHours || 0}h</span>
                </div>
                <div>
                  <span className="block text-ink-subtle">Quotations</span>
                  <span className="font-medium text-ink">{closure.summary.totalQuotations || 0}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-hairline-soft">
              <button
                onClick={() => setDetailClosure(closure)}
                className="tracker-btn-ghost flex items-center gap-1.5 text-[12px] py-1.5"
              >
                <Eye size={13} /> View Details
              </button>
              {closure.status === 'Open' && (
                <button
                  onClick={() => handleQuickClose(closure)}
                  className="tracker-btn-accent flex items-center gap-1.5 text-[12px] py-1.5 px-3"
                >
                  <Lock size={13} /> Close Period
                </button>
              )}
              {closure.status === 'Closed' && (
                <button
                  onClick={() => handleReopen(closure)}
                  className="tracker-btn-secondary flex items-center gap-1.5 text-[12px] py-1.5 px-3"
                >
                  <Unlock size={13} /> Reopen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateClosureModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchClosures(); }}
        />
      )}

      {detailClosure && (
        <ClosureDetailDrawer
          closure={detailClosure}
          onClose={() => setDetailClosure(null)}
          onUpdated={() => { setDetailClosure(null); fetchClosures(); }}
        />
      )}
    </div>
  );

  async function handleQuickClose(closure) {
    try {
      await PayrollService.updatePeriodClosure(closure._id, { status: 'Closed' });
      toast.success("Period closed successfully");
      fetchClosures();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to close period");
    }
  }

  async function handleReopen(closure) {
    const reason = prompt("Please provide a reason for reopening this period:");
    if (!reason) return;

    try {
      await PayrollService.updatePeriodClosure(closure._id, {
        status: 'Reopened',
        reopenReason: reason
      });
      toast.success("Period reopened successfully");
      fetchClosures();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reopen period");
    }
  }
}

function CreateClosureModal({ onClose, onCreated }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
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
    <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface rounded-tracker-xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: "var(--tracker-shadow-overlay)" }}>
        <div className="pay-gradient-hero px-6 py-5 text-white flex items-center justify-between rounded-t-[16px]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">NEW PERIOD CLOSURE</p>
            <p className="text-[17px] font-semibold mt-0.5">Define Period</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="lmx-input"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="lmx-input"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-2">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-800">
              Financial year will be automatically derived from the start date based on your organization settings.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-hairline-soft flex items-center justify-end gap-3">
          <button onClick={onClose} className="tracker-btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="tracker-btn-accent flex items-center gap-2 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {submitting ? "Creating..." : "Create Closure"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClosureDetailDrawer({ closure, onClose, onUpdated }) {
  const [closingModule, setClosingModule] = useState(null);
  const [moduleRemarks, setModuleRemarks] = useState("");

  const handleModuleClose = async (moduleName) => {
    try {
      await PayrollService.updatePeriodClosure(closure._id, {
        [`modules.${moduleName}.closed`]: true,
        [`modules.${moduleName}.closedAt`]: new Date().toISOString(),
        [`modules.${moduleName}.remarks`]: moduleRemarks
      });
      toast.success(`${MODULE_LABELS[moduleName]} closed successfully`);
      setClosingModule(null);
      setModuleRemarks("");
      onUpdated();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to close module");
    }
  };

  return (
    <div className="fixed inset-0 tracker-overlay z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface rounded-tracker-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "var(--tracker-shadow-overlay)" }}>
        <div className="pay-gradient-hero px-6 py-5 text-white flex items-center justify-between rounded-t-[16px]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">PERIOD DETAILS</p>
            <p className="text-[17px] font-semibold mt-0.5">{closure.periodLabel}</p>
            <p className="text-[13px] text-white/70 mt-0.5">
              {formatDate(closure.startDate)} - {formatDate(closure.endDate)} · {closure.financialYearLabel}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <div className="flex items-center justify-between p-4 bg-surface-1 rounded-lg">
            <div>
              <p className="text-[11px] text-ink-subtle uppercase tracking-[0.4px]">Overall Status</p>
              <p className="text-[15px] font-semibold text-ink mt-1">{closure.status}</p>
            </div>
            <span className={STATUS_CHIP[closure.status] || STATUS_CHIP.Open}>{closure.status}</span>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-3">Module Controls</p>
            <div className="space-y-2">
              {Object.entries(closure.modules || {}).map(([moduleName, moduleData]) => (
                <div key={moduleName} className="flex items-center justify-between p-3 border border-hairline rounded-lg">
                  <div className="flex items-center gap-3">
                    {moduleData.closed ? <Lock size={16} className="text-slate-500" /> : <Unlock size={16} className="text-emerald-500" />}
                    <div>
                      <p className="text-[13px] font-medium text-ink">{MODULE_LABELS[moduleName] || moduleName}</p>
                      {moduleData.closedAt && (
                        <p className="text-[11px] text-ink-muted">
                          Closed {formatDate(moduleData.closedAt)}
                          {moduleData.closedBy?.name && ` by ${moduleData.closedBy.name}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {!moduleData.closed && closure.status !== 'Closed' && (
                    <button
                      onClick={() => setClosingModule(moduleName)}
                      className="tracker-btn-ghost text-[12px] py-1.5 px-3"
                    >
                      Close
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {closure.summary && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-3">Period Summary</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-1 rounded-lg">
                  <p className="text-[11px] text-ink-subtle">Payroll Records</p>
                  <p className="text-[16px] font-semibold text-ink mt-1">{closure.summary.totalPayrollRecords || 0}</p>
                </div>
                <div className="p-3 bg-surface-1 rounded-lg">
                  <p className="text-[11px] text-ink-subtle">Total Expenses</p>
                  <p className="text-[16px] font-semibold text-ink mt-1">{formatCurrency(closure.summary.totalExpenseAmount)}</p>
                </div>
                <div className="p-3 bg-surface-1 rounded-lg">
                  <p className="text-[11px] text-ink-subtle">Attendance Records</p>
                  <p className="text-[16px] font-semibold text-ink mt-1">{closure.summary.totalAttendanceRecords || 0}</p>
                </div>
                <div className="p-3 bg-surface-1 rounded-lg">
                  <p className="text-[11px] text-ink-subtle">Time Tracking Hours</p>
                  <p className="text-[16px] font-semibold text-ink mt-1">{closure.summary.totalTimeTrackingHours || 0}h</p>
                </div>
                <div className="p-3 bg-surface-1 rounded-lg col-span-2">
                  <p className="text-[11px] text-ink-subtle">Quotations</p>
                  <p className="text-[16px] font-semibold text-ink mt-1">{closure.summary.totalQuotations || 0}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-3">Audit Trail</p>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-ink-muted">Created</span>
                <span className="text-ink">{formatDate(closure.createdAt)}</span>
              </div>
              {closure.createdBy?.name && (
                <div className="flex justify-between">
                  <span className="text-ink-muted">Created By</span>
                  <span className="text-ink">{closure.createdBy.name}</span>
                </div>
              )}
              {closure.closedAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Closed</span>
                    <span className="text-ink">{formatDate(closure.closedAt)}</span>
                  </div>
                  {closure.closedBy?.name && (
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Closed By</span>
                      <span className="text-ink">{closure.closedBy.name}</span>
                    </div>
                  )}
                </>
              )}
              {closure.reopenedAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Reopened</span>
                    <span className="text-ink">{formatDate(closure.reopenedAt)}</span>
                  </div>
                  {closure.reopenReason && (
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Reason</span>
                      <span className="text-ink">{closure.reopenReason}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-hairline-soft flex justify-end">
          <button onClick={onClose} className="tracker-btn-secondary">Close</button>
        </div>

        {closingModule && (
          <div className="absolute inset-0 bg-surface/95 flex items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-4">
              <p className="text-[14px] font-semibold text-ink">
                Close {MODULE_LABELS[closingModule]} Module
              </p>
              <textarea
                placeholder="Add remarks (optional)"
                value={moduleRemarks}
                onChange={(e) => setModuleRemarks(e.target.value)}
                className="lmx-input resize-none h-20"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setClosingModule(null); setModuleRemarks(""); }}
                  className="tracker-btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleModuleClose(closingModule)}
                  className="tracker-btn-accent flex-1"
                >
                  Confirm Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
