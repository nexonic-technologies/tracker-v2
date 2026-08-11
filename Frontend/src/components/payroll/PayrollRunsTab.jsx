import { useState, useEffect, useCallback } from "react";
import { PayrollService, EmployeeService } from "@services";
import toast from "react-hot-toast";
import { Play, CheckCircle2, BadgeDollarSign, X, Loader2, Eye } from "lucide-react";
import ProfileImage from "@components/Common/ProfileImage";
import { PayslipModal } from "@pages/Payroll/index";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_CHIP = {
  Draft: "pay-status-chip pay-status-chip--draft",
  Processing: "pay-status-chip pay-status-chip--processing",
  Computed: "pay-status-chip pay-status-chip--processed",
  Approved: "pay-status-chip pay-status-chip--approved",
  Paid: "pay-status-chip pay-status-chip--paid",
};

function fmt(n) { return (n || 0).toLocaleString("en-IN"); }

export default function payroll_runsTab() {
  const [runs, setRuns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailRun, setDetailRun] = useState(null);
  const [detailSlip, setDetailSlip] = useState(null);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      const [rRes, eRes] = await Promise.all([
        PayrollService.getRuns({
          sort: { createdAt: -1 }, limit: 100,
          populateFields: { initiatedBy: "basicInfo.firstName,basicInfo.lastName", approvedBy: "basicInfo.firstName,basicInfo.lastName" }
        }),
        EmployeeService.getEmployees({
          filter: { status: "Active" },
          fields: "basicInfo.firstName,basicInfo.lastName,professionalInfo.empId"
        })
      ]);
      setRuns(rRes.data || []);
      setEmployees(eRes.data || []);
    } catch { toast.error("Failed to load payroll runs"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleApprove = async (run) => {
    try {
      await PayrollService.updateRun(run._id, { status: "Approved" });
      toast.success("Run approved");
      fetchRuns();
    } catch (e) { toast.error(e.response?.data?.message || "Approve failed"); }
  };

  const handlePay = async (run) => {
    try {
      await PayrollService.updateRun(run._id, { status: "Paid" });
      toast.success("Marked as Paid — all payslips updated");
      fetchRuns();
    } catch (e) { toast.error(e.response?.data?.message || "Pay failed"); }
  };

  const stats = [
    { label: "Total Runs", value: runs.length },
    { label: "Processing", value: runs.filter(r => r.status === "Processing").length },
    { label: "Pending Approval", value: runs.filter(r => r.status === "Computed").length },
    { label: "Paid", value: runs.filter(r => r.status === "Paid").length },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin" style={{ color: "var(--module-payroll)" }} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="pay-stat-card">
            <p className="pay-stat-card__label">{s.label}</p>
            <p className="pay-stat-card__value">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-muted">{runs.length} run{runs.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setShowCreate(true)} className="tracker-btn-accent flex items-center gap-2">
          <Play size={14} /> New Run
        </button>
      </div>

      <div className="space-y-3">
        {runs.length === 0 && (
          <div className="pay-card p-8 text-center">
            <BadgeDollarSign size={32} className="mx-auto mb-3 lmx-icon-tile" />
            <p className="text-[14px] font-semibold text-ink">No payroll runs yet</p>
            <p className="text-[13px] text-ink-muted mt-1">Click "New Run" to process your first payroll</p>
          </div>
        )}
        {runs.map(run => (
          <div key={run._id} className="pay-card p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="lmx-icon-tile">
                  <BadgeDollarSign size={18} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-ink">
                    {MONTHS[(run.month || 1) - 1]} {run.year}
                  </p>
                  <p className="text-[12px] text-ink-muted">
                    {run.totalEmployees} employee{run.totalEmployees !== 1 ? "s" : ""}
                    {run.initiatedBy ? ` · by ${run.initiatedBy.basicInfo?.firstName} ${run.initiatedBy.basicInfo?.lastName}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-right">
                  <p className="text-[11px] text-ink-subtle uppercase tracking-[0.4px]">Net Total</p>
                  <p className="pay-amount-lg">₹{fmt(run.totalNet)}</p>
                </div>
                <span className={STATUS_CHIP[run.status] || STATUS_CHIP.Draft}>{run.status}</span>
              </div>
            </div>

            {run.status === "Processing" && run.totalEmployees > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-ink-muted">Processing…</span>
                  <span className="text-[11px] text-ink-muted">{run.processedCount}/{run.totalEmployees}</span>
                </div>
                <div className="pay-progress">
                  <div className="pay-progress__fill"
                    style={{ width: `${Math.round((run.processedCount / run.totalEmployees) * 100)}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-hairline-soft">
              <button onClick={() => setDetailRun(run)}
                className="tracker-btn-ghost flex items-center gap-1.5 text-[12px] py-1.5">
                <Eye size={13} /> View
              </button>
              {run.status === "Computed" && (
                <button onClick={() => handleApprove(run)}
                  className="tracker-btn-accent flex items-center gap-1.5 text-[12px] py-1.5 px-3">
                  <CheckCircle2 size={13} /> Approve
                </button>
              )}
              {run.status === "Approved" && (
                <button onClick={() => handlePay(run)}
                  className="tracker-btn-accent flex items-center gap-1.5 text-[12px] py-1.5 px-3">
                  <BadgeDollarSign size={13} /> Mark Paid
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <RunCreateModal
          employees={employees}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchRuns(); }}
        />
      )}

      {detailRun && (
        <RunDetailDrawer
          run={detailRun}
          onClose={() => setDetailRun(null)}
          onViewSlip={setDetailSlip}
        />
      )}

      {detailSlip && <PayslipModal rec={detailSlip} onClose={() => setDetailSlip(null)} />}
    </div>
  );
}

function RunCreateModal({ employees, onClose, onCreated }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      await PayrollService.createRun({
        month, year,
        employeeIds: selected.length > 0 ? selected : []
      });
      toast.success(`Payroll run for ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1]} ${year} started`);
      onCreated();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to start run");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface rounded-tracker-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "var(--tracker-shadow-overlay)" }}>
        <div className="pay-gradient-hero px-6 py-5 text-white flex items-center justify-between rounded-t-[16px]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">NEW PAYROLL RUN</p>
            <p className="text-[17px] font-semibold mt-0.5">Select Period</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-1.5">Month</label>
              <select value={month} onChange={e => setMonth(+e.target.value)} className="lmx-input">
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-1.5">Year</label>
              <input type="number" value={year} onChange={e => setYear(+e.target.value)}
                className="lmx-input" min="2020" max="2099" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-2">
              Employees <span className="normal-case font-normal text-ink-subtle">(leave empty = all active)</span>
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-hairline rounded-tracker-md p-2">
              {employees.map(e => (
                <label key={e._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-tracker-md hover:bg-surface-1 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(e._id)}
                    onChange={() => toggle(e._id)}
                    className="accent-[var(--module-payroll)]" />
                  <ProfileImage profileImage={e.basicInfo?.profileImage}
                    firstName={e.basicInfo?.firstName} lastName={e.basicInfo?.lastName} px={24} />
                  <span className="text-[13px] text-ink">
                    {e.basicInfo?.firstName} {e.basicInfo?.lastName}
                    {e.professionalInfo?.empId ? <span className="text-ink-subtle ml-1">({e.professionalInfo.empId})</span> : null}
                  </span>
                </label>
              ))}
            </div>
            {selected.length > 0 && (
              <p className="text-[11px] text-ink-muted mt-1">{selected.length} selected</p>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-hairline-soft flex items-center justify-end gap-3">
          <button onClick={onClose} className="tracker-btn-secondary">Cancel</button>
          <button onClick={handleCreate} disabled={submitting}
            className="tracker-btn-accent flex items-center gap-2 disabled:opacity-60">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {submitting ? "Starting…" : "Start Run"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RunDetailDrawer({ run, onClose, onViewSlip }) {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PayrollService.getPayrolls({
      filter: { payrollRunId: run._id },
      populateFields: { employeeId: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.empId" }
    }).then(r => setPayrolls(r.data || []))
      .catch(() => toast.error("Failed to load payroll records"))
      .finally(() => setLoading(false));
  }, [run._id]);

  return (
    <div className="fixed inset-0 tracker-overlay z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface rounded-tracker-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "var(--tracker-shadow-overlay)" }}>
        <div className="pay-gradient-hero px-6 py-5 text-white flex items-center justify-between rounded-t-[16px]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">RUN DETAIL</p>
            <p className="text-[17px] font-semibold mt-0.5">
              {MONTHS[(run.month || 1) - 1]} {run.year}
            </p>
            <p className="text-[13px] text-white/70 mt-0.5">
              {run.totalEmployees} employees · Net ₹{(run.totalNet || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--module-payroll)" }} />
            </div>
          ) : payrolls.length === 0 ? (
            <p className="text-center text-ink-muted text-[13px] py-8">No payroll records in this run yet.</p>
          ) : (
            <div className="space-y-2">
              {payrolls.map(p => {
                const emp = p.employeeId;
                return (
                  <div key={p._id} className="flex items-center justify-between py-3 border-b border-hairline-soft last:border-0">
                    <div className="flex items-center gap-2.5">
                      <ProfileImage profileImage={emp?.basicInfo?.profileImage}
                        firstName={emp?.basicInfo?.firstName} lastName={emp?.basicInfo?.lastName} px={32} />
                      <div>
                        <p className="text-[13px] font-semibold text-ink leading-tight">
                          {emp?.basicInfo?.firstName} {emp?.basicInfo?.lastName}
                        </p>
                        <p className="text-[11px] text-ink-subtle">{emp?.professionalInfo?.empId || ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[11px] text-ink-subtle">Net</p>
                        <p className="pay-amount-md">₹{(p.netSalary || 0).toLocaleString("en-IN")}</p>
                      </div>
                      <span className={STATUS_CHIP[p.status] || STATUS_CHIP.Draft}>{p.status}</span>
                      <button onClick={() => onViewSlip(p)}
                        className="w-7 h-7 flex items-center justify-center rounded-tracker-md lmx-icon-tile hover:opacity-80 transition-opacity">
                        <Eye size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-hairline-soft flex justify-end">
          <button onClick={onClose} className="tracker-btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
