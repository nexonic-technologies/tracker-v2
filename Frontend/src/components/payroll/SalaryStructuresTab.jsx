import { useState, useEffect, useCallback } from "react";
import { PayrollService, EmployeeService } from "@services";
import toast from "react-hot-toast";
import { Plus, X, Trash2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import ProfileImage from "@components/Common/ProfileImage";

const EARNING_TYPES = ["fixed", "variable", "percentage_of_basic"];
const DEDUCTION_TYPES = ["fixed", "percentage_of_basic", "percentage_of_gross", "statutory"];

const blankEarning = () => ({ name: "", type: "fixed", amount: 0, taxable: true, isProratable: true });
const blankDeduction = () => ({ name: "", type: "fixed", amount: 0, ceiling: "" });

function fmt(n) { return (n || 0).toLocaleString("en-IN"); }

function computePreview(form) {
  const grossPerMonth = form.earnings.reduce((s, e) => {
    const amt = parseFloat(e.amount) || 0;
    if (e.type === "percentage_of_basic") {
      const basic = form.earnings.find(x => x.name.toLowerCase() === "basic");
      const basicAmt = parseFloat(basic?.amount) || 0;
      return s + (basicAmt * amt / 100);
    }
    return s + amt;
  }, 0);

  const totalDeductions = form.deductions.reduce((s, d) => {
    const amt = parseFloat(d.amount) || 0;
    if (d.type === "percentage_of_basic") {
      const basic = form.earnings.find(x => x.name.toLowerCase() === "basic");
      const basicAmt = parseFloat(basic?.amount) || 0;
      const base = d.ceiling ? Math.min(basicAmt, parseFloat(d.ceiling)) : basicAmt;
      return s + (base * amt / 100);
    }
    if (d.type === "percentage_of_gross") {
      const base = d.ceiling ? Math.min(grossPerMonth, parseFloat(d.ceiling)) : grossPerMonth;
      return s + (base * amt / 100);
    }
    return s + amt;
  }, 0);

  return { gross: Math.round(grossPerMonth * 100) / 100, net: Math.round((grossPerMonth - totalDeductions) * 100) / 100 };
}

export default function salary_structuresTab() {
  const [structures, setStructures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [expanded, setExpanded] = useState({});

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [sRes, eRes] = await Promise.all([
        PayrollService.getStructures({
          sort: { employeeId: 1, version: -1 }, limit: 500,
          populateFields: { employeeId: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.empId" }
        }),
        EmployeeService.getEmployees({
          filter: { status: "Active" },
          fields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.empId"
        })
      ]);
      setStructures(sRes.data || []);
      setEmployees(eRes.data || []);
    } catch { toast.error("Failed to load salary structures"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const grouped = structures.reduce((acc, s) => {
    const key = s.employeeId?._id || s.employeeId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const handleRevise = (empId) => { setEditEmp(empId); setShowForm(true); };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin" style={{ color: "var(--module-payroll)" }} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-muted">{Object.keys(grouped).length} employee structure{Object.keys(grouped).length !== 1 ? "s" : ""}</p>
        <button onClick={() => { setEditEmp(null); setShowForm(true); }} className="tracker-btn-accent flex items-center gap-2">
          <Plus size={14} /> Add Structure
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([empKey, versions]) => {
          const current = versions[0];
          const emp = current.employeeId;
          const isOpen = expanded[empKey];

          return (
            <div key={empKey} className="pay-card overflow-visible">
              <div className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(x => ({ ...x, [empKey]: !x[empKey] }))}>
                <div className="flex items-center gap-3">
                  <ProfileImage profileImage={emp?.basicInfo?.profileImage}
                    firstName={emp?.basicInfo?.firstName} lastName={emp?.basicInfo?.lastName} px={36} />
                  <div>
                    <p className="text-[14px] font-semibold text-ink leading-tight">
                      {emp?.basicInfo?.firstName} {emp?.basicInfo?.lastName}
                    </p>
                    <p className="text-[11px] text-ink-subtle">{emp?.professionalInfo?.empId || ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-[11px] text-ink-subtle">CTC / year</p>
                    <p className="pay-amount-sm pay-amount-gross font-semibold">₹{fmt(current.ctc)}</p>
                  </div>
                  <span className="pay-status-chip pay-status-chip--approved text-[10px]">v{current.version} · Active</span>
                  <span className="text-[11px] text-ink-subtle">
                    {new Date(current.effectiveFrom).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                  <button onClick={e => { e.stopPropagation(); handleRevise(emp?._id || empKey); }}
                    className="tracker-btn-accent text-[12px] py-1 px-2.5">Revise</button>
                  {isOpen ? <ChevronDown size={16} className="text-ink-muted" /> : <ChevronRight size={16} className="text-ink-muted" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-hairline-soft px-4 pb-4 pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-subtle mb-2">Earnings</p>
                      {(current.earnings || []).map((e, i) => (
                        <div key={i} className="pay-row">
                          <span className="pay-row__label">{e.name}</span>
                          <span className="pay-row__value pay-amount-earn">
                            {e.type === "percentage_of_basic" ? `${e.amount}%` : `₹${fmt(e.amount)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-subtle mb-2">Deductions</p>
                      {(current.deductions || []).map((d, i) => (
                        <div key={i} className="pay-row">
                          <span className="pay-row__label">{d.name}</span>
                          <span className="pay-row__value pay-amount-deduct">
                            {d.type === "fixed" ? `₹${fmt(d.amount)}` : `${d.amount}%`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {versions.length > 1 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-subtle mb-2">Version History</p>
                      <div className="space-y-1">
                        {versions.slice(1).map(v => (
                          <div key={v._id} className="flex items-center justify-between py-1.5">
                            <span className="pay-status-chip pay-status-chip--processed text-[10px]">v{v.version}</span>
                            <span className="text-[12px] text-ink-muted">
                              {new Date(v.effectiveFrom).toLocaleDateString("en-IN")} →{" "}
                              {v.effectiveTo ? new Date(v.effectiveTo).toLocaleDateString("en-IN") : "—"}
                            </span>
                            <span className="pay-amount-sm pay-amount-gross">₹{fmt(v.ctc)} / yr</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(grouped).length === 0 && (
          <div className="pay-card p-8 text-center">
            <p className="text-[14px] font-semibold text-ink">No salary structures yet</p>
            <p className="text-[13px] text-ink-muted mt-1">Add a salary structure for each employee before running payroll</p>
          </div>
        )}
      </div>

      {showForm && (
        <SalaryStructureForm
          employees={employees}
          preselectedEmpId={editEmp}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchAll(); }}
        />
      )}
    </div>
  );
}

function SalaryStructureForm({ employees, preselectedEmpId, onClose, onSaved }) {
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

  const setEarning = (i, k, v) => setForm(f => { const e = [...f.earnings]; e[i] = { ...e[i], [k]: v }; return { ...f, earnings: e }; });
  const setDeducton = (i, k, v) => setForm(f => { const d = [...f.deductions]; d[i] = { ...d[i], [k]: v }; return { ...f, deductions: d }; });
  const addEarning = () => setForm(f => ({ ...f, earnings: [...f.earnings, blankEarning()] }));
  const addDeduction = () => setForm(f => ({ ...f, deductions: [...f.deductions, blankDeduction()] }));
  const removeEarning = (i) => setForm(f => ({ ...f, earnings: f.earnings.filter((_, x) => x !== i) }));
  const removeDeduction = (i) => setForm(f => ({ ...f, deductions: f.deductions.filter((_, x) => x !== i) }));

  const handleSubmit = async () => {
    if (!form.employeeId) return toast.error("Select an employee");
    if (!form.ctc) return toast.error("CTC is required");
    try {
      setSubmitting(true);
      await PayrollService.createStructure({
        ...form,
        ctc: parseFloat(form.ctc),
        pfEmployeePercent: parseFloat(form.pfEmployeePercent),
        pfCeiling: parseFloat(form.pfCeiling),
        overtimeRate: parseFloat(form.overtimeRate) || 0,
        earnings: form.earnings.map(e => ({ ...e, amount: parseFloat(e.amount) || 0 })),
        deductions: form.deductions.map(d => ({ ...d, amount: parseFloat(d.amount) || 0, ceiling: d.ceiling ? parseFloat(d.ceiling) : undefined }))
      });
      toast.success("Salary structure saved");
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface rounded-tracker-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "var(--tracker-shadow-overlay)" }}>
        <div className="pay-gradient-hero px-6 py-5 text-white flex items-center justify-between rounded-t-[16px]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">SALARY STRUCTURE</p>
            <p className="text-[17px] font-semibold mt-0.5">{preselectedEmpId ? "Revise Structure" : "New Structure"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-1.5">Employee *</label>
              <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                className="lmx-input" disabled={!!preselectedEmpId}>
                <option value="">Select…</option>
                {employees.map(e => (
                  <option key={e._id} value={e._id}>{e.basicInfo?.firstName} {e.basicInfo?.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-1.5">Annual CTC (₹) *</label>
              <input type="number" value={form.ctc} onChange={e => setForm(f => ({ ...f, ctc: e.target.value }))}
                className="lmx-input" min="0" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-1.5">Effective From *</label>
              <input type="date" value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))}
                className="lmx-input" />
            </div>
          </div>

          <div className="pay-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">Earnings</p>
              <button onClick={addEarning} className="tracker-btn-ghost flex items-center gap-1 text-[12px] py-1">
                <Plus size={12} /> Add
              </button>
            </div>
            {form.earnings.map((e, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  {i === 0 && <label className="block text-[10px] font-semibold uppercase tracking-[0.4px] text-ink-subtle mb-1">Name</label>}
                  <input value={e.name} onChange={ev => setEarning(i, "name", ev.target.value)} className="lmx-input text-[13px]" placeholder="e.g. Basic" />
                </div>
                <div className="col-span-3">
                  {i === 0 && <label className="block text-[10px] font-semibold uppercase tracking-[0.4px] text-ink-subtle mb-1">Type</label>}
                  <select value={e.type} onChange={ev => setEarning(i, "type", ev.target.value)} className="lmx-input text-[13px]">
                    {EARNING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  {i === 0 && <label className="block text-[10px] font-semibold uppercase tracking-[0.4px] text-ink-subtle mb-1">Amount</label>}
                  <input type="number" value={e.amount} onChange={ev => setEarning(i, "amount", ev.target.value)} className="lmx-input text-[13px]" min="0" />
                </div>
                <div className="col-span-1 flex items-center justify-center gap-1 pb-0.5">
                  {i === 0 && <div className="h-[18px]" />}
                  <input type="checkbox" title="Proratable" checked={e.isProratable !== false}
                    onChange={ev => setEarning(i, "isProratable", ev.target.checked)}
                    className="accent-[var(--module-payroll)] w-3.5 h-3.5" />
                </div>
                <div className="col-span-1 flex justify-end pb-0.5">
                  {form.earnings.length > 1 && (
                    <button onClick={() => removeEarning(i)} className="text-ink-subtle hover:text-[var(--pay-ink-deduct)] transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pay-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">Deductions</p>
              <button onClick={addDeduction} className="tracker-btn-ghost flex items-center gap-1 text-[12px] py-1">
                <Plus size={12} /> Add
              </button>
            </div>
            {form.deductions.map((d, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  {i === 0 && <label className="block text-[10px] font-semibold uppercase tracking-[0.4px] text-ink-subtle mb-1">Name</label>}
                  <input value={d.name} onChange={ev => setDeducton(i, "name", ev.target.value)} className="lmx-input text-[13px]" placeholder="e.g. PF Employee" />
                </div>
                <div className="col-span-3">
                  {i === 0 && <label className="block text-[10px] font-semibold uppercase tracking-[0.4px] text-ink-subtle mb-1">Type</label>}
                  <select value={d.type} onChange={ev => setDeducton(i, "type", ev.target.value)} className="lmx-input text-[13px]">
                    {DEDUCTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  {i === 0 && <label className="block text-[10px] font-semibold uppercase tracking-[0.4px] text-ink-subtle mb-1">Amount / %</label>}
                  <input type="number" value={d.amount} onChange={ev => setDeducton(i, "amount", ev.target.value)} className="lmx-input text-[13px]" min="0" />
                </div>
                <div className="col-span-1" />
                <div className="col-span-1 flex justify-end pb-0.5">
                  <button onClick={() => removeDeduction(i)} className="text-ink-subtle hover:text-[var(--pay-ink-deduct)] transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "PF Employee %", key: "pfEmployeePercent", type: "number" },
              { label: "PF Ceiling (₹)", key: "pfCeiling", type: "number" },
              { label: "OT Rate (₹/hr)", key: "overtimeRate", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-1.5">{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                  className="lmx-input" min="0" />
              </div>
            ))}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-1.5">ESI Applicable</label>
              <label className="flex items-center gap-2 mt-2.5 cursor-pointer">
                <input type="checkbox" checked={form.esiApplicable}
                  onChange={e => setForm(f => ({ ...f, esiApplicable: e.target.checked }))}
                  className="accent-[var(--module-payroll)] w-4 h-4" />
                <span className="text-[13px] text-ink">Enabled</span>
              </label>
            </div>
          </div>

          <div className="pay-summary-band flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.4px] mb-0.5" style={{ color: "var(--pay-ink-label)" }}>Est. Monthly Gross</p>
              <p className="pay-amount-sm pay-amount-gross font-semibold">₹{preview.gross.toLocaleString("en-IN")}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.4px] mb-0.5" style={{ color: "var(--pay-ink-label)" }}>Est. Monthly Net</p>
              <p className="pay-amount-lg">₹{preview.net.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-hairline-soft flex items-center justify-end gap-3">
          <button onClick={onClose} className="tracker-btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="tracker-btn-accent flex items-center gap-2 disabled:opacity-60">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {submitting ? "Saving…" : "Save Structure"}
          </button>
        </div>
      </div>
    </div>
  );
}
