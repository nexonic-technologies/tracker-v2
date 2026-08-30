import { useState, useEffect, useCallback } from "react";
import { PayrollService, EmployeeService } from "@services";
import toast from "react-hot-toast";
import {
  Play,
  CheckCircle2,
  BadgeDollarSign,
  Loader2,
  Eye,
  ArrowLeft,
  Calendar,
  Users,
  Search,
  Printer,
  Mail
} from "lucide-react";
import ProfileImage from "@components/Common/ProfileImage";
import { useCapability } from "@hooks/useCapability";
import ProfessionalPayslipVoucher from "./ProfessionalPayslipVoucher";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_CHIP = {
  Draft: "pay-status-chip pay-status-chip--draft",
  Processing: "pay-status-chip pay-status-chip--processing",
  Computed: "pay-status-chip pay-status-chip--processed",
  Approved: "pay-status-chip pay-status-chip--approved",
  Paid: "pay-status-chip pay-status-chip--paid",
};

function fmt(n) { return (n || 0).toLocaleString("en-IN"); }

function resolveName(val, fallback = "") {
  if (!val) return fallback;
  if (typeof val === "object") return val.name || val.title || val.label || fallback;
  if (typeof val === "string") {
    if (/^[0-9a-fA-F]{24}$/.test(val)) return fallback;
    return val;
  }
  return String(val);
}

export default function PayrollRunsTab() {
  const { isSuperAdmin, hasAnyCapability } = useCapability();
  const canCreate = isSuperAdmin || hasAnyCapability(['payroll_runs:create']);
  const canApprove = isSuperAdmin || hasAnyCapability(['payroll_runs:approve']);
  const canPay = isSuperAdmin || hasAnyCapability(['payroll_runs:update', 'payroll_runs:create']);

  const [view, setView] = useState("list"); // "list" | "create" | "detail" | "payslip"
  const [runs, setRuns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

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
          fields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.empId,professionalInfo.department,professionalInfo.designation"
        })
      ]);
      setRuns(rRes.data || []);
      setEmployees(eRes.data || []);
    } catch {
      toast.error("Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleApprove = async (runId) => {
    try {
      await PayrollService.updateRun(runId, { status: "Approved" });
      toast.success("Payroll run approved successfully");
      fetchRuns();
      if (selectedRun && selectedRun._id === runId) {
        setSelectedRun(prev => ({ ...prev, status: "Approved" }));
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Approve failed");
    }
  };

  const handlePay = async (runId) => {
    try {
      await PayrollService.updateRun(runId, { status: "Paid" });
      toast.success("Marked as Paid — all employee payslips generated!");
      fetchRuns();
      if (selectedRun && selectedRun._id === runId) {
        setSelectedRun(prev => ({ ...prev, status: "Paid" }));
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Pay failed");
    }
  };

  const stats = [
    { label: "Total Runs", value: runs.length },
    { label: "Processing", value: runs.filter(r => r.status === "Processing").length },
    { label: "Pending Approval", value: runs.filter(r => r.status === "Computed").length },
    { label: "Paid", value: runs.filter(r => r.status === "Paid").length },
  ];

  if (loading && runs.length === 0) return (
    <div className="flex items-center justify-center h-48 pay-card">
      <Loader2 size={24} className="animate-spin text-brand-solid" />
    </div>
  );

  /* ─────────────────────────────────────────────────────────────
   * VIEW: CREATE (2026-Grade In-Page Run Generator)
   * ───────────────────────────────────────────────────────────── */
  if (view === "create") {
    return (
      <PayrollRunCreateView
        employees={employees}
        onBack={() => setView("list")}
        onCreated={() => {
          setView("list");
          fetchRuns();
        }}
      />
    );
  }

  /* ─────────────────────────────────────────────────────────────
   * VIEW: RUN DETAIL (2026-Grade In-Page Run Management View)
   * ───────────────────────────────────────────────────────────── */
  if (view === "detail" && selectedRun) {
    return (
      <PayrollRunDetailView
        run={selectedRun}
        canApprove={canApprove}
        canPay={canPay}
        onApprove={() => handleApprove(selectedRun._id)}
        onPay={() => handlePay(selectedRun._id)}
        onViewPayslip={(slip) => {
          setSelectedPayslip(slip);
          setView("payslip");
        }}
        onBack={() => setView("list")}
      />
    );
  }

  /* ─────────────────────────────────────────────────────────────
   * VIEW: PAYSLIP VOUCHER (2026-Grade Full Digital Voucher View)
   * ───────────────────────────────────────────────────────────── */
  if (view === "payslip" && selectedPayslip) {
    return (
      <ProfessionalPayslipVoucher
        record={selectedPayslip}
        onBack={() => setView(selectedRun ? "detail" : "list")}
      />
    );
  }

  /* ─────────────────────────────────────────────────────────────
   * VIEW: LIST
   * ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="pay-card p-3.5">
            <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">{s.label}</p>
            <p className="text-[22px] font-bold text-ink leading-tight mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Control & Filter Row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-[13px] text-ink-muted">
          <strong className="text-ink">{runs.length}</strong> payroll run{runs.length !== 1 ? "s" : ""} recorded
        </p>
        {canCreate && (
          <button
            onClick={() => setView("create")}
            className="tracker-btn-brand flex items-center gap-2 text-[13px] py-2 px-4 shadow-sm"
          >
            <Play size={14} />
            <span>Process New Run</span>
          </button>
        )}
      </div>

      {/* Runs Listing Cards */}
      <div className="space-y-3">
        {runs.length === 0 && (
          <div className="pay-card p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-2xl bg-surface-1 text-ink-subtle">
              <BadgeDollarSign size={32} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-ink">No Payroll Runs Initiated</h3>
              <p className="text-[13px] text-ink-muted mt-1 max-w-md mx-auto">
                Initiate monthly payroll processing to calculate earnings, deductions, overtime, and generate digital payslips.
              </p>
            </div>
            {canCreate && (
              <button
                onClick={() => setView("create")}
                className="tracker-btn-brand text-[13px] py-2 px-4 flex items-center gap-2 mt-2"
              >
                <Play size={14} /> Start First Payroll Run
              </button>
            )}
          </div>
        )}

        {runs.map(run => (
          <div key={run._id} className="pay-card p-4 border border-hairline hover:border-brand-solid/25 transition">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-solid/10 text-brand-solid">
                  <BadgeDollarSign size={20} />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-ink">
                    {MONTHS[(run.month || 1) - 1]} {run.year}
                  </p>
                  <p className="text-[12px] text-ink-muted">
                    {run.totalEmployees} employee{run.totalEmployees !== 1 ? "s" : ""}
                    {run.initiatedBy ? ` · Initiated by ${run.initiatedBy.basicInfo?.firstName} ${run.initiatedBy.basicInfo?.lastName}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">Net Payout</p>
                  <p className="pay-amount-lg font-bold text-[17px]">₹{fmt(run.totalNet)}</p>
                </div>
                <span className={STATUS_CHIP[run.status] || STATUS_CHIP.Draft}>{run.status}</span>
              </div>
            </div>

            {run.status === "Processing" && run.totalEmployees > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1 text-[11px] text-ink-muted">
                  <span>Processing calculations…</span>
                  <span>{run.processedCount}/{run.totalEmployees}</span>
                </div>
                <div className="pay-progress">
                  <div
                    className="pay-progress__fill"
                    style={{ width: `${Math.round((run.processedCount / run.totalEmployees) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-hairline-soft">
              <button
                onClick={() => {
                  setSelectedRun(run);
                  setView("detail");
                }}
                className="tracker-btn-ghost flex items-center gap-1.5 text-[12px] py-1.5 px-3 border border-hairline"
              >
                <Eye size={13} /> View Run Details
              </button>

              <div className="flex items-center gap-2">
                {run.status === "Computed" && canApprove && (
                  <button
                    onClick={() => handleApprove(run._id)}
                    className="tracker-btn-accent flex items-center gap-1.5 text-[12px] py-1.5 px-3.5 shadow-xs"
                  >
                    <CheckCircle2 size={13} /> Approve Run
                  </button>
                )}
                {run.status === "Approved" && canPay && (
                  <button
                    onClick={() => handlePay(run._id)}
                    className="tracker-btn-brand flex items-center gap-1.5 text-[12px] py-1.5 px-3.5 shadow-xs"
                  >
                    <BadgeDollarSign size={13} /> Mark Paid
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
 * 2026-GRADE CREATE PAYROLL RUN PAGE VIEW (No Modal Popup!)
 * ───────────────────────────────────────────────────────────────────────── */
function PayrollRunCreateView({ employees, onBack, onCreated }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const selectAll = () => setSelected(employees.map(e => e._id));
  const deselectAll = () => setSelected([]);

  const filteredEmployees = employees.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.basicInfo?.firstName?.toLowerCase().includes(q) ||
      e.basicInfo?.lastName?.toLowerCase().includes(q) ||
      e.professionalInfo?.empId?.toLowerCase().includes(q) ||
      e.professionalInfo?.department?.toLowerCase().includes(q)
    );
  });

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      await PayrollService.createRun({
        month, year,
        employeeIds: selected.length > 0 ? selected : []
      });
      toast.success(`Payroll run for ${MONTHS[month - 1]} ${year} initiated successfully!`);
      onCreated();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to start payroll run");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-hairline">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-hairline bg-surface hover:bg-surface-1 text-ink transition shadow-xs"
            title="Back to runs"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="lmx-page-eyebrow">PAYROLL / RUNS</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-solid/10 text-brand-solid">
                NEW BATCH
              </span>
            </div>
            <h2 className="text-[20px] font-bold text-ink tracking-tight flex items-center gap-2">
              <Play size={18} className="text-brand-solid" />
              Initialize Monthly Payroll Batch
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
            onClick={handleCreate}
            disabled={submitting}
            className="tracker-btn-brand flex items-center gap-2 text-[13px] py-2 px-5 shadow-sm"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            <span>{submitting ? "Computing Batch…" : "Run Calculations"}</span>
          </button>
        </div>
      </div>

      {/* Two-Column Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Employee Cohort Selection (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="pay-card p-5 border border-hairline space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-hairline">
              <div>
                <h3 className="text-[14px] font-bold text-ink flex items-center gap-2">
                  <Users size={16} className="text-brand-solid" />
                  Target Employees Selection
                </h3>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Select specific cohort or leave empty to process all active employees.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[12px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-brand-solid font-semibold hover:underline"
                >
                  Select All ({employees.length})
                </button>
                <span className="text-ink-subtle">·</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-ink-subtle hover:text-ink"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter employees by name, ID, or department…"
                className="lmx-input w-full pl-9 text-[13px]"
              />
            </div>

            {/* Employee Checkbox List */}
            <div className="max-h-[380px] overflow-y-auto space-y-1.5 border border-hairline rounded-xl p-2 bg-surface-1/40">
              {filteredEmployees.map(e => {
                const isSelected = selected.includes(e._id);
                return (
                  <label
                    key={e._id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? "bg-brand-solid/5 border-brand-solid/30 text-ink"
                        : "bg-surface border-hairline hover:bg-surface-1 text-ink-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(e._id)}
                        className="accent-[var(--brand-solid)] w-4 h-4 rounded"
                      />
                      <ProfileImage
                        profileImage={e.basicInfo?.profileImage}
                        firstName={e.basicInfo?.firstName}
                        lastName={e.basicInfo?.lastName}
                        px={32}
                      />
                      <div>
                        <p className="text-[13px] font-bold text-ink leading-tight">
                          {e.basicInfo?.firstName} {e.basicInfo?.lastName}
                        </p>
                        <p className="text-[11px] text-ink-subtle">
                          {e.professionalInfo?.empId} · {resolveName(e.professionalInfo?.department, "General")}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-medium text-ink-muted">
                      {resolveName(e.professionalInfo?.designation, "Active")}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Period Selector & Summary Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="pay-card p-5 border border-hairline space-y-4">
            <h3 className="text-[14px] font-bold text-ink flex items-center gap-2 pb-2 border-b border-hairline">
              <Calendar size={16} className="text-brand-solid" /> Period Configuration
            </h3>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">Month</label>
              <select
                value={month}
                onChange={e => setMonth(+e.target.value)}
                className="lmx-input w-full text-[13px] font-semibold"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">Financial Year</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(+e.target.value)}
                min="2020"
                max="2099"
                className="lmx-input w-full text-[13px] font-semibold"
              />
            </div>

            <div className="p-4 rounded-xl bg-surface-1 border border-hairline space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-muted">Target Batch</span>
                <strong className="text-ink">{MONTHS[month - 1]} {year}</strong>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-muted">Target Headcount</span>
                <strong className="text-brand-solid">{selected.length > 0 ? selected.length : employees.length} employees</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="w-full tracker-btn-brand py-2.5 text-[13px] flex items-center justify-center gap-2 shadow-md"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              <span>{submitting ? "Computing…" : "Process Payroll Run"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * 2026-GRADE PAYROLL RUN DETAIL COCKPIT VIEW (No Modal Popup!)
 * ───────────────────────────────────────────────────────────────────────── */
function PayrollRunDetailView({ run, canApprove, canPay, onApprove, onPay, onViewPayslip, onBack }) {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    PayrollService.getPayrolls({
      filter: { payrollRunId: run._id },
      populateFields: {
        employeeId: "basicInfo,professionalInfo,accountDetails,personalDocuments,authInfo.workEmail",
        salaryStructureId: "version,effectiveFrom,effectiveTo,ctc,components"
      },
      limit: 1000
    }).then(r => setPayrolls(r.data || []))
      .catch(() => toast.error("Failed to load payroll records"))
      .finally(() => setLoading(false));
  }, [run._id]);

  const filtered = payrolls.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    const emp = p.employeeId;
    return (
      emp?.basicInfo?.firstName?.toLowerCase().includes(q) ||
      emp?.basicInfo?.lastName?.toLowerCase().includes(q) ||
      emp?.professionalInfo?.empId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-hairline">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-hairline bg-surface hover:bg-surface-1 text-ink transition shadow-xs"
            title="Back to runs list"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="lmx-page-eyebrow">PAYROLL / BATCH DETAIL</span>
              <span className={STATUS_CHIP[run.status] || STATUS_CHIP.Draft}>{run.status}</span>
            </div>
            <h2 className="text-[20px] font-bold text-ink tracking-tight">
              Payroll Run · {MONTHS[(run.month || 1) - 1]} {run.year}
            </h2>
            <p className="text-[12px] text-ink-muted">
              {run.totalEmployees} employees calculated · Net ₹{fmt(run.totalNet)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {run.status === "Computed" && canApprove && (
            <button
              onClick={onApprove}
              className="tracker-btn-accent flex items-center gap-1.5 text-[13px] py-2 px-4 shadow-sm"
            >
              <CheckCircle2 size={15} /> Approve Batch
            </button>
          )}

          {run.status === "Approved" && canPay && (
            <button
              onClick={onPay}
              className="tracker-btn-brand flex items-center gap-1.5 text-[13px] py-2 px-4 shadow-sm"
            >
              <BadgeDollarSign size={15} /> Disburse & Mark Paid
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="pay-card p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Total Gross</p>
          <p className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{fmt(run.totalGross || run.totalNet * 1.15)}</p>
        </div>
        <div className="pay-card p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Total Net Payout</p>
          <p className="text-[20px] font-bold text-ink mt-0.5">₹{fmt(run.totalNet)}</p>
        </div>
        <div className="pay-card p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Headcount</p>
          <p className="text-[20px] font-bold text-brand-solid mt-0.5">{run.totalEmployees}</p>
        </div>
        <div className="pay-card p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Batch Status</p>
          <p className="text-[20px] font-bold text-ink mt-0.5">{run.status}</p>
        </div>
      </div>

      {/* Employee Records Table */}
      <div className="pay-card p-5 border border-hairline space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-[14px] font-bold text-ink flex items-center gap-2">
            <Users size={16} className="text-brand-solid" />
            Processed Employee Payslips ({payrolls.length})
          </h3>

          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by employee name or ID…"
              className="lmx-input w-full pl-8 text-[12px]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-brand-solid" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-ink-muted text-[13px] py-8">No records match search criteria.</p>
        ) : (
          <div className="overflow-x-auto border border-hairline rounded-xl">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-surface-1 text-[11px] font-bold text-ink-subtle uppercase tracking-wider border-b border-hairline">
                  <th className="py-2.5 px-3.5">Employee</th>
                  <th className="py-2.5 px-3">Present / Days</th>
                  <th className="py-2.5 px-3">Gross Salary</th>
                  <th className="py-2.5 px-3">Deductions</th>
                  <th className="py-2.5 px-3">Net Salary</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {filtered.map(p => {
                  const emp = p.employeeId;
                  return (
                    <tr key={p._id} className="hover:bg-surface-1/40 transition">
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <ProfileImage
                            profileImage={emp?.basicInfo?.profileImage}
                            firstName={emp?.basicInfo?.firstName}
                            lastName={emp?.basicInfo?.lastName}
                            px={30}
                          />
                          <div>
                            <p className="font-bold text-ink leading-tight">
                              {emp?.basicInfo?.firstName} {emp?.basicInfo?.lastName}
                            </p>
                            <p className="text-[11px] text-ink-subtle">{emp?.professionalInfo?.empId || "EMP"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-medium text-ink">{p.presentDays || 0}</span>
                        <span className="text-ink-subtle"> / {p.workingDays || 0}d</span>
                        {p.lopDays > 0 && <span className="ml-1 text-[11px] text-rose-500 font-semibold">(LOP: {p.lopDays})</span>}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{fmt(p.grossSalary)}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400">
                        − ₹{fmt(p.totalDeductions || (p.grossSalary - p.netSalary))}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold text-ink">
                        ₹{fmt(p.netSalary)}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className={STATUS_CHIP[p.status] || STATUS_CHIP.Draft}>{p.status}</span>
                      </td>

                      <td className="py-2.5 px-3.5 text-right">
                        <button
                          onClick={() => onViewPayslip(p)}
                          className="tracker-btn-ghost text-[12px] py-1 px-2.5 border border-hairline inline-flex items-center gap-1"
                        >
                          <Eye size={12} /> View Payslip
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
