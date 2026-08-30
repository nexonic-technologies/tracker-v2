import { useState, useEffect, useCallback } from "react";
import { PayrollService, EmployeeService } from "@services";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  ArrowLeft,
  BadgeDollarSign,
  Receipt,
  Sparkles,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  History,
  TrendingUp,
  User
} from "lucide-react";
import ProfileImage from "@components/Common/ProfileImage";
import { useCapability } from "@hooks/useCapability";

const EARNING_TYPES = [
  { value: "fixed", label: "Fixed Amount (₹)" },
  { value: "variable", label: "Variable (₹)" },
  { value: "percentage_of_basic", label: "% of Basic" }
];

const DEDUCTION_TYPES = [
  { value: "fixed", label: "Fixed Amount (₹)" },
  { value: "percentage_of_basic", label: "% of Basic" },
  { value: "percentage_of_gross", label: "% of Gross" },
  { value: "statutory", label: "Statutory / Tax" }
];

const blankEarning = () => ({ name: "", type: "fixed", amount: 0, taxable: true, isProratable: true });
const blankDeduction = () => ({ name: "", type: "fixed", amount: 0, ceiling: "" });

function fmt(n) { return (n || 0).toLocaleString("en-IN"); }

function resolveName(val, fallback = "") {
  if (!val) return fallback;
  if (typeof val === "object") return val.name || val.title || val.label || fallback;
  return String(val);
}

function computePreview(form) {
  const annualCtc = parseFloat(form.ctc) || 0;
  const earnings = form.earnings || [];
  const deductions = form.deductions || [];

  const basicItem = earnings.find(x => x.name.toLowerCase() === "basic");
  const basicAmt = parseFloat(basicItem?.amount) || 0;

  const grossPerMonth = earnings.reduce((s, e) => {
    const amt = parseFloat(e.amount) || 0;
    if (e.type === "percentage_of_basic") {
      return s + (basicAmt * amt / 100);
    }
    return s + amt;
  }, 0);

  const totalDeductions = deductions.reduce((s, d) => {
    const amt = parseFloat(d.amount) || 0;
    if (d.type === "percentage_of_basic") {
      const base = d.ceiling ? Math.min(basicAmt, parseFloat(d.ceiling)) : basicAmt;
      return s + (base * amt / 100);
    }
    if (d.type === "percentage_of_gross") {
      const base = d.ceiling ? Math.min(grossPerMonth, parseFloat(d.ceiling)) : grossPerMonth;
      return s + (base * amt / 100);
    }
    return s + amt;
  }, 0);

  const netPerMonth = Math.max(0, grossPerMonth - totalDeductions);
  const annualGross = grossPerMonth * 12;
  const annualNet = netPerMonth * 12;

  return {
    annualCtc,
    grossPerMonth: Math.round(grossPerMonth * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPerMonth: Math.round(netPerMonth * 100) / 100,
    annualGross: Math.round(annualGross),
    annualNet: Math.round(annualNet)
  };
}

export default function SalaryStructuresTab() {
  const { isSuperAdmin, hasAnyCapability } = useCapability();
  const canCreate = isSuperAdmin || hasAnyCapability(['salary_structures:create']);
  const canUpdate = isSuperAdmin || hasAnyCapability(['salary_structures:update']);

  const [view, setView] = useState("list"); // "list" | "form" | "detail"
  const [structures, setStructures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editEmpId, setEditEmpId] = useState(null);
  const [selectedStructureGroup, setSelectedStructureGroup] = useState(null);
  const [expanded, setExpanded] = useState({});

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [sRes, eRes] = await Promise.all([
        PayrollService.getStructures({
          sort: { employeeId: 1, version: -1 }, limit: 500,
          populateFields: { employeeId: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.empId,professionalInfo.designation,professionalInfo.department" }
        }),
        EmployeeService.getEmployees({
          filter: { status: "Active" },
          fields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.empId,professionalInfo.designation,professionalInfo.department"
        })
      ]);
      setStructures(sRes.data || []);
      setEmployees(eRes.data || []);
    } catch {
      toast.error("Failed to load salary structures");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const grouped = structures.reduce((acc, s) => {
    const key = s.employeeId?._id || s.employeeId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const handleOpenCreate = () => {
    setEditEmpId(null);
    setView("form");
  };

  const handleOpenRevise = (empId) => {
    setEditEmpId(empId);
    setView("form");
  };

  const handleOpenDetail = (versions) => {
    setSelectedStructureGroup(versions);
    setView("detail");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48 pay-card">
      <Loader2 size={24} className="animate-spin text-brand-solid" />
    </div>
  );

  /* ─────────────────────────────────────────────────────────────
   * VIEW: FORM (2026-Grade In-Page Salary Structure Builder)
   * ───────────────────────────────────────────────────────────── */
  if (view === "form") {
    return (
      <SalaryStructureFormView
        employees={employees}
        preselectedEmpId={editEmpId}
        onBack={() => setView("list")}
        onSaved={() => {
          setView("list");
          fetchAll();
        }}
      />
    );
  }

  /* ─────────────────────────────────────────────────────────────
   * VIEW: DETAIL (2026-Grade Structure Timeline & Audit View)
   * ───────────────────────────────────────────────────────────── */
  if (view === "detail" && selectedStructureGroup) {
    return (
      <SalaryStructureDetailView
        versions={selectedStructureGroup}
        canUpdate={canUpdate}
        onRevise={(empId) => {
          setEditEmpId(empId);
          setView("form");
        }}
        onBack={() => setView("list")}
      />
    );
  }

  /* ─────────────────────────────────────────────────────────────
   * VIEW: LIST (High-Density Structured Cards)
   * ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Action & Filter Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[13px] text-ink-muted">
            <strong className="text-ink">{Object.keys(grouped).length}</strong> Employee Salary Structure{Object.keys(grouped).length !== 1 ? "s" : ""}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreate}
            className="tracker-btn-brand flex items-center gap-2 text-[13px] py-2 px-4 shadow-sm"
          >
            <Plus size={15} />
            <span>Add Structure</span>
          </button>
        )}
      </div>

      {/* Grouped Structure List */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([empKey, versions]) => {
          const current = versions[0];
          const emp = current.employeeId;
          const isOpen = expanded[empKey];

          return (
            <div key={empKey} className="pay-card overflow-hidden border border-hairline hover:border-brand-solid/25 transition">
              <div
                className="p-4 flex items-center justify-between cursor-pointer select-none bg-surface hover:bg-surface-1/40 transition-colors"
                onClick={() => setExpanded(x => ({ ...x, [empKey]: !x[empKey] }))}
              >
                <div className="flex items-center gap-3.5">
                  <ProfileImage
                    profileImage={emp?.basicInfo?.profileImage}
                    firstName={emp?.basicInfo?.firstName}
                    lastName={emp?.basicInfo?.lastName}
                    px={40}
                  />
                  <div>
                    <p className="text-[14px] font-bold text-ink leading-tight">
                      {emp?.basicInfo?.firstName} {emp?.basicInfo?.lastName}
                    </p>
                    <p className="text-[11px] text-ink-subtle mt-0.5">
                      {emp?.professionalInfo?.empId || "EMP"} {emp?.professionalInfo?.designation ? `· ${resolveName(emp.professionalInfo.designation)}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Annual CTC</p>
                    <p className="pay-amount-sm pay-amount-gross font-bold text-[15px]">₹{fmt(current.ctc)}</p>
                  </div>

                  <span className="pay-status-chip pay-status-chip--approved text-[11px] font-semibold">
                    v{current.version} · Active
                  </span>

                  <span className="text-[12px] text-ink-muted hidden md:inline">
                    Effective {new Date(current.effectiveFrom).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenDetail(versions)}
                      className="tracker-btn-ghost text-[12px] py-1.5 px-3 border border-hairline flex items-center gap-1"
                      title="View full breakdown and version timeline"
                    >
                      <span>Details</span>
                    </button>

                    {canUpdate && (
                      <button
                        onClick={() => handleOpenRevise(emp?._id || empKey)}
                        className="tracker-btn-accent text-[12px] py-1.5 px-3"
                      >
                        Revise
                      </button>
                    )}
                  </div>

                  <div className="p-1 rounded text-ink-muted">
                    {isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                  </div>
                </div>
              </div>

              {/* Collapsible Quick Peek */}
              {isOpen && (
                <div className="border-t border-hairline bg-surface-1/30 px-5 py-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="pay-card p-3 bg-surface">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                        <TrendingUp size={13} /> Monthly Earnings Breakdown
                      </p>
                      <div className="space-y-1.5">
                        {(current.earnings || []).map((e, i) => (
                          <div key={i} className="flex items-center justify-between text-[12px] py-0.5 border-b border-hairline-soft last:border-0">
                            <span className="text-ink-muted">{e.name}</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {e.type === "percentage_of_basic" ? `${e.amount}% of Basic` : `₹${fmt(e.amount)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pay-card p-3 bg-surface">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                        <Receipt size={13} /> Monthly Deductions Breakdown
                      </p>
                      <div className="space-y-1.5">
                        {(current.deductions || []).map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-[12px] py-0.5 border-b border-hairline-soft last:border-0">
                            <span className="text-ink-muted">{d.name}</span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                              {d.type === "fixed" ? `₹${fmt(d.amount)}` : `${d.amount}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(grouped).length === 0 && (
          <div className="pay-card p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-2xl bg-surface-1 text-ink-subtle">
              <BadgeDollarSign size={32} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-ink">No Salary Structures Defined</h3>
              <p className="text-[13px] text-ink-muted mt-1 max-w-md mx-auto">
                Configure structured compensation packages for employees before computing monthly payroll.
              </p>
            </div>
            {canCreate && (
              <button
                onClick={handleOpenCreate}
                className="tracker-btn-brand text-[13px] py-2 px-4 flex items-center gap-2 mt-2"
              >
                <Plus size={15} /> Add First Salary Structure
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * 2026-GRADE SALARY STRUCTURE BUILDER FORM VIEW (No Modal Popup!)
 * ───────────────────────────────────────────────────────────────────────── */
function SalaryStructureFormView({ employees, preselectedEmpId, onBack, onSaved }) {
  const [form, setForm] = useState({
    employeeId: preselectedEmpId || "",
    ctc: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    pfEmployeePercent: 12,
    pfCeiling: 15000,
    esiApplicable: true,
    overtimeRate: 0,
    earnings: [
      { name: "Basic", type: "fixed", amount: 0, taxable: true, isProratable: true },
      { name: "HRA", type: "fixed", amount: 0, taxable: true, isProratable: true },
      { name: "Transport", type: "fixed", amount: 0, taxable: false, isProratable: true },
      { name: "Medical", type: "fixed", amount: 0, taxable: false, isProratable: true },
      { name: "Special Allowance", type: "fixed", amount: 0, taxable: true, isProratable: true },
    ],
    deductions: [
      { name: "PF Employee", type: "statutory", amount: 12, ceiling: 15000 },
      { name: "ESI Employee", type: "statutory", amount: 0.75, ceiling: "" },
      { name: "TDS", type: "statutory", amount: 0, ceiling: "" },
    ]
  });

  const [submitting, setSubmitting] = useState(false);
  const preview = computePreview(form);

  const selectedEmp = employees.find(e => e._id === form.employeeId);

  const setEarning = (i, k, v) => setForm(f => {
    const e = [...f.earnings];
    e[i] = { ...e[i], [k]: v };
    return { ...f, earnings: e };
  });

  const setDeduction = (i, k, v) => setForm(f => {
    const d = [...f.deductions];
    d[i] = { ...d[i], [k]: v };
    return { ...f, deductions: d };
  });

  const addEarning = () => setForm(f => ({ ...f, earnings: [...f.earnings, blankEarning()] }));
  const addDeduction = () => setForm(f => ({ ...f, deductions: [...f.deductions, blankDeduction()] }));
  const removeEarning = (i) => setForm(f => ({ ...f, earnings: f.earnings.filter((_, x) => x !== i) }));
  const removeDeduction = (i) => setForm(f => ({ ...f, deductions: f.deductions.filter((_, x) => x !== i) }));

  // Auto-distribute standard 50-30-20 formula based on CTC
  const handleAutoDistribute = () => {
    const ctc = parseFloat(form.ctc) || 0;
    if (ctc <= 0) {
      toast.error("Please enter a valid Annual CTC first");
      return;
    }
    const monthlyGross = Math.round(ctc / 12);
    const basic = Math.round(monthlyGross * 0.50);
    const hra = Math.round(basic * 0.40);
    const transport = 1600;
    const medical = 1250;
    const special = Math.max(0, monthlyGross - (basic + hra + transport + medical));

    setForm(prev => ({
      ...prev,
      earnings: [
        { name: "Basic", type: "fixed", amount: basic, taxable: true, isProratable: true },
        { name: "HRA", type: "fixed", amount: hra, taxable: true, isProratable: true },
        { name: "Transport", type: "fixed", amount: transport, taxable: false, isProratable: true },
        { name: "Medical", type: "fixed", amount: medical, taxable: false, isProratable: true },
        { name: "Special Allowance", type: "fixed", amount: special, taxable: true, isProratable: true },
      ]
    }));
    toast.success("Standard 50/40 CTC structure generated!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId) return toast.error("Please select an employee");
    if (!form.ctc || parseFloat(form.ctc) <= 0) return toast.error("Annual CTC is required");

    try {
      setSubmitting(true);
      await PayrollService.createStructure({
        ...form,
        ctc: parseFloat(form.ctc),
        pfEmployeePercent: parseFloat(form.pfEmployeePercent) || 12,
        pfCeiling: parseFloat(form.pfCeiling) || 15000,
        overtimeRate: parseFloat(form.overtimeRate) || 0,
        earnings: form.earnings.map(e => ({ ...e, amount: parseFloat(e.amount) || 0 })),
        deductions: form.deductions.map(d => ({
          ...d,
          amount: parseFloat(d.amount) || 0,
          ceiling: d.ceiling ? parseFloat(d.ceiling) : undefined
        }))
      });
      toast.success("Salary structure saved successfully!");
      onSaved();
    } catch (err) {
      console.error("Failed to save structure", err);
      toast.error(err.response?.data?.message || "Failed to save salary structure");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Breadcrumb & Navigation Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-hairline">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-hairline bg-surface hover:bg-surface-1 text-ink transition shadow-xs"
            title="Back to structures list"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="lmx-page-eyebrow">PAYROLL / SALARY STRUCTURES</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-solid/10 text-brand-solid">
                {preselectedEmpId ? "REVISION" : "NEW POLICY"}
              </span>
            </div>
            <h2 className="text-[20px] font-bold text-ink tracking-tight flex items-center gap-2">
              <Calculator size={19} className="text-brand-solid" />
              {preselectedEmpId ? "Revise Compensation Package" : "Salary Structure Builder"}
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
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            <span>{submitting ? "Saving Structure…" : "Save Salary Structure"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Inputs + Live Financial Simulator */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Form Fields (7 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Employee & Basic CTC Card */}
          <div className="pay-card p-5 border border-hairline space-y-4">
            <h3 className="text-[14px] font-bold text-ink flex items-center gap-2 pb-2 border-b border-hairline">
              <User size={16} className="text-brand-solid" />
              1. Employee & Base Compensation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.employeeId}
                  onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                  className="lmx-input w-full text-[13px]"
                  disabled={!!preselectedEmpId}
                  required
                >
                  <option value="">Select Employee…</option>
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>
                      {e.basicInfo?.firstName} {e.basicInfo?.lastName} ({e.professionalInfo?.empId || "ID"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    Annual CTC (₹) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoDistribute}
                    className="text-[10px] font-bold text-brand-solid hover:underline flex items-center gap-0.5"
                  >
                    <Sparkles size={10} /> Auto-Split
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="0"
                  value={form.ctc}
                  onChange={e => setForm(f => ({ ...f, ctc: e.target.value }))}
                  placeholder="e.g. 600000"
                  className="lmx-input w-full font-mono text-[13px] font-bold text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Effective From <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.effectiveFrom}
                  onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))}
                  className="lmx-input w-full text-[13px]"
                />
              </div>
            </div>

            {selectedEmp && (
              <div className="p-3 rounded-xl bg-surface-1 border border-hairline flex items-center gap-3">
                <ProfileImage
                  profileImage={selectedEmp.basicInfo?.profileImage}
                  firstName={selectedEmp.basicInfo?.firstName}
                  lastName={selectedEmp.basicInfo?.lastName}
                  px={36}
                />
                <div>
                  <p className="text-[13px] font-bold text-ink leading-tight">
                    {selectedEmp.basicInfo?.firstName} {selectedEmp.basicInfo?.lastName}
                  </p>
                  <p className="text-[11px] text-ink-subtle">
                    {selectedEmp.professionalInfo?.empId} · {resolveName(selectedEmp.professionalInfo?.department, "General")} · {resolveName(selectedEmp.professionalInfo?.designation, "Staff")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Earnings Breakdown Card */}
          <div className="pay-card p-5 border border-hairline space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <h3 className="text-[14px] font-bold text-ink flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
                2. Monthly Earnings Components
              </h3>
              <button
                type="button"
                onClick={addEarning}
                className="text-[11px] font-bold text-brand-solid hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Add Component
              </button>
            </div>

            <div className="space-y-2.5">
              {form.earnings.map((e, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-surface-1/60 border border-hairline">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Component Name (e.g. Basic)"
                      value={e.name}
                      onChange={ev => setEarning(idx, "name", ev.target.value)}
                      className="lmx-input w-full text-[12px] font-semibold"
                    />
                  </div>

                  <div className="col-span-3">
                    <select
                      value={e.type}
                      onChange={ev => setEarning(idx, "type", ev.target.value)}
                      className="lmx-input w-full text-[12px]"
                    >
                      {EARNING_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      placeholder="Amount / %"
                      value={e.amount}
                      onChange={ev => setEarning(idx, "amount", ev.target.value)}
                      className="lmx-input w-full font-mono text-[12px] font-semibold text-right"
                    />
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeEarning(idx)}
                      disabled={form.earnings.length <= 1}
                      className="p-1 rounded text-ink-subtle hover:text-rose-600 disabled:opacity-30"
                      title="Remove row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deductions Breakdown Card */}
          <div className="pay-card p-5 border border-hairline space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <h3 className="text-[14px] font-bold text-ink flex items-center gap-2">
                <Receipt size={16} className="text-rose-600 dark:text-rose-400" />
                3. Monthly Deductions & Statutory Taxes
              </h3>
              <button
                type="button"
                onClick={addDeduction}
                className="text-[11px] font-bold text-brand-solid hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Add Deduction
              </button>
            </div>

            <div className="space-y-2.5">
              {form.deductions.map((d, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-surface-1/60 border border-hairline">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Deduction Name"
                      value={d.name}
                      onChange={ev => setDeduction(idx, "name", ev.target.value)}
                      className="lmx-input w-full text-[12px] font-semibold"
                    />
                  </div>

                  <div className="col-span-3">
                    <select
                      value={d.type}
                      onChange={ev => setDeduction(idx, "type", ev.target.value)}
                      className="lmx-input w-full text-[12px]"
                    >
                      {DEDUCTION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount / %"
                      value={d.amount}
                      onChange={ev => setDeduction(idx, "amount", ev.target.value)}
                      className="lmx-input w-full font-mono text-[12px] font-semibold text-right"
                    />
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeDeduction(idx)}
                      className="p-1 rounded text-ink-subtle hover:text-rose-600"
                      title="Remove row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Compensation Simulator (Sticky 4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="pay-card p-5 border border-hairline sticky top-4 space-y-4 bg-gradient-to-b from-surface to-surface-1/40 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle flex items-center gap-1.5">
                <Calculator size={14} className="text-brand-solid" /> Compensation Simulator
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                Live Dynamic
              </span>
            </div>

            {/* In-Hand Monthly Takehome Display */}
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">Est. Monthly In-Hand</p>
              <p className="text-[28px] font-black tracking-tight mt-0.5">
                ₹{fmt(preview.netPerMonth)}
              </p>
              <p className="text-[11px] text-white/80 mt-1">
                Annual In-Hand: ₹{fmt(preview.annualNet)}
              </p>
            </div>

            {/* Financial Breakdown Table */}
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between py-1 border-b border-hairline-soft">
                <span className="text-ink-muted">Annual Cost to Company (CTC)</span>
                <span className="font-mono font-bold text-ink">₹{fmt(preview.annualCtc)}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-hairline-soft">
                <span className="text-ink-muted">Monthly Gross Salary</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{fmt(preview.grossPerMonth)}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-hairline-soft">
                <span className="text-ink-muted">Monthly Total Deductions</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">− ₹{fmt(preview.totalDeductions)}</span>
              </div>
            </div>

            {/* Statutory Compliance Checklist */}
            <div className="p-3.5 rounded-xl bg-surface border border-hairline space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle">Statutory Compliance</p>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-ink">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>PF Wage Ceiling: ₹15,000 / month</span>
                </div>
                <div className="flex items-center gap-2 text-ink">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>ESI Limit: {preview.grossPerMonth <= 21000 ? "Eligible (<= ₹21k)" : "Exempt (> ₹21k)"}</span>
                </div>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full tracker-btn-brand py-2.5 text-[13px] flex items-center justify-center gap-2 shadow-md"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              <span>{submitting ? "Saving Structure…" : "Confirm & Save Structure"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * 2026-GRADE SALARY STRUCTURE DETAIL & VERSION TIMELINE VIEW (No Modal!)
 * ───────────────────────────────────────────────────────────────────────── */
function SalaryStructureDetailView({ versions, canUpdate, onRevise, onBack }) {
  const current = versions[0];
  const emp = current?.employeeId;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-hairline">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-hairline bg-surface hover:bg-surface-1 text-ink transition shadow-xs"
            title="Back to list"
          >
            <ArrowLeft size={16} />
          </button>
          <ProfileImage
            profileImage={emp?.basicInfo?.profileImage}
            firstName={emp?.basicInfo?.firstName}
            lastName={emp?.basicInfo?.lastName}
            px={42}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="lmx-page-eyebrow">PAYROLL / STRUCTURE DETAIL</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                v{current.version} Active
              </span>
            </div>
            <h2 className="text-[20px] font-bold text-ink tracking-tight">
              {emp?.basicInfo?.firstName} {emp?.basicInfo?.lastName}
            </h2>
            <p className="text-[12px] text-ink-muted">
              {emp?.professionalInfo?.empId} · {resolveName(emp?.professionalInfo?.department, "General")} · {resolveName(emp?.professionalInfo?.designation, "Staff")}
            </p>
          </div>
        </div>

        {canUpdate && (
          <button
            onClick={() => onRevise(emp?._id)}
            className="tracker-btn-accent flex items-center gap-1.5 text-[13px] py-2 px-4 shadow-sm"
          >
            <TrendingUp size={14} /> Revise Structure
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="pay-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Annual CTC</p>
          <p className="text-[22px] font-bold text-ink mt-0.5">₹{fmt(current.ctc)}</p>
          <p className="text-[11px] text-ink-muted mt-1">Effective from {new Date(current.effectiveFrom).toLocaleDateString("en-IN")}</p>
        </div>

        <div className="pay-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Gross Monthly</p>
          <p className="text-[22px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            ₹{fmt(Math.round(current.ctc / 12))}
          </p>
          <p className="text-[11px] text-ink-muted mt-1">Standard computed salary</p>
        </div>

        <div className="pay-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Revision History</p>
          <p className="text-[22px] font-bold text-brand-solid mt-0.5">
            {versions.length} Version{versions.length !== 1 ? "s" : ""}
          </p>
          <p className="text-[11px] text-ink-muted mt-1">Audit tracked</p>
        </div>
      </div>

      {/* Current Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Earnings */}
        <div className="pay-card p-5 border border-hairline space-y-3">
          <h3 className="text-[14px] font-bold text-ink flex items-center gap-2 pb-2 border-b border-hairline">
            <TrendingUp size={16} className="text-emerald-600" /> Active Earnings Components
          </h3>
          <div className="space-y-2">
            {(current.earnings || []).map((e, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-1 text-[13px]">
                <div>
                  <p className="font-semibold text-ink">{e.name}</p>
                  <p className="text-[10px] text-ink-subtle">{e.type === "percentage_of_basic" ? "% of Basic" : "Fixed component"}</p>
                </div>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {e.type === "percentage_of_basic" ? `${e.amount}%` : `₹${fmt(e.amount)}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Deductions */}
        <div className="pay-card p-5 border border-hairline space-y-3">
          <h3 className="text-[14px] font-bold text-ink flex items-center gap-2 pb-2 border-b border-hairline">
            <Receipt size={16} className="text-rose-600" /> Active Deductions Components
          </h3>
          <div className="space-y-2">
            {(current.deductions || []).map((d, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-1 text-[13px]">
                <div>
                  <p className="font-semibold text-ink">{d.name}</p>
                  <p className="text-[10px] text-ink-subtle">{d.type}</p>
                </div>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {d.type === "fixed" ? `₹${fmt(d.amount)}` : `${d.amount}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Versions Timeline */}
      {versions.length > 1 && (
        <div className="pay-card p-5 border border-hairline space-y-3">
          <h3 className="text-[14px] font-bold text-ink flex items-center gap-2 pb-2 border-b border-hairline">
            <History size={16} className="text-brand-solid" /> Previous Version Timeline
          </h3>
          <div className="divide-y divide-hairline">
            {versions.slice(1).map(v => (
              <div key={v._id} className="py-3 flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-3">
                  <span className="pay-status-chip pay-status-chip--processed text-[10px]">v{v.version}</span>
                  <div>
                    <p className="font-semibold text-ink">₹{fmt(v.ctc)} / year</p>
                    <p className="text-[11px] text-ink-muted">
                      Effective: {new Date(v.effectiveFrom).toLocaleDateString("en-IN")} → {v.effectiveTo ? new Date(v.effectiveTo).toLocaleDateString("en-IN") : "Superseded"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
