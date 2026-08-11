import { useState, useEffect } from "react";
import { useAuth } from "../../context/authProvider";
import { useUserRole } from "../../hooks/useUserRole";
import axiosInstance from "../../api/axiosInstance";
import toast from "react-hot-toast";
import { Plus, X, BadgeDollarSign, Calendar, Building2, Trash2, Check, AlertCircle } from "lucide-react";
import { RoleBasedExpenses } from "../../components/role";
import TableGenerator from "../../components/Common/TableGenerator";

/* ── Status chip using CSS vars only ── */
const StatusChip = ({ value }) => {
  const cls = {
    approved: "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]",
    rejected: "bg-[var(--tracker-danger-light)]  text-[var(--tracker-danger)]",
    pending:  "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize ${cls[value] || cls.pending}`}>
      {value || "pending"}
    </span>
  );
};

/* ── Expense type chip ── */
const TypeChip = ({ value }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[var(--module-payroll-light)] text-[var(--module-payroll)] capitalize">
    {value}
  </span>
);

/* ── Section label ── */
const FieldLabel = ({ children }) => (
  <label className="block text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-muted mb-1.5">
    {children}
  </label>
);

const EXPENSE_TYPES = [
  { value: "travel",          label: "Travel" },
  { value: "accommodation",   label: "Accommodation" },
  { value: "food",            label: "Food" },
  { value: "miscellaneous",   label: "Miscellaneous" },
];

const blankExpense = () => ({ expenseType: "travel", amount: "", description: "" });
const blankDay     = () => ({
  clientId: "",
  date: new Date().toISOString().split("T")[0],
  expenses: [blankExpense()],
});

/* ════════════════════════════════════════ */
const ExpenseTracker = () => {
  const { user }    = useAuth();
  const { policies, userId } = useUserRole();
  const [expenses, setExpenses]       = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [clients, setClients]         = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [dailyEntries, setDailyEntries] = useState([blankDay()]);
  const [activeTab, setActiveTab]     = useState("my"); // "my" or "pending"
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [comment, setComment]         = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (userId) {
      refreshData();
    }
  }, [userId, policies]);

  const refreshData = () => {
    fetchExpenses();
    if (policies.expenses?.update) {
      fetchPendingExpenses();
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/expenses", {
        populateFields: {
          employeeId: "basicInfo.firstName,basicInfo.lastName",
          clientId: "name"
        },
        sort: { createdAt: -1 },
        limit: 100,
      });
      setExpenses(res.data.data || []);
    } catch { toast.error("Failed to fetch expenses"); }
  };

  const fetchPendingExpenses = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/expenses", {
        filter: {
          status: "pending",
          viewMode: "approvals"
        },
        populateFields: {
          employeeId: "basicInfo.firstName,basicInfo.lastName",
          clientId: "name"
        },
        sort: { createdAt: -1 },
        limit: 100,
      });
      setPendingExpenses(res.data.data || []);
    } catch { toast.error("Failed to fetch pending approvals"); }
  };

  const fetchClients = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/clients");
      setClients(res.data.data || []);
    } catch { toast.error("Failed to fetch clients"); }
  };

  /* ── entry helpers ── */
  const setDay = (di, field, value) =>
    setDailyEntries((prev) => prev.map((d, i) => i === di ? { ...d, [field]: value } : d));

  const setExpLine = (di, ei, field, value) =>
    setDailyEntries((prev) => prev.map((d, i) => i !== di ? d : {
      ...d,
      expenses: d.expenses.map((e, j) => j === ei ? { ...e, [field]: value } : e),
    }));

  const addDay     = () => setDailyEntries((p) => [...p, blankDay()]);
  const removeDay  = (di) => setDailyEntries((p) => p.filter((_, i) => i !== di));
  const addLine    = (di) => setDailyEntries((p) => p.map((d, i) => i === di ? { ...d, expenses: [...d.expenses, blankExpense()] } : d));
  const removeLine = (di, ei) => setDailyEntries((p) => p.map((d, i) => i !== di ? d : { ...d, expenses: d.expenses.filter((_, j) => j !== ei) }));

  const dayTotal = (di) =>
    dailyEntries[di].expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const submitExpenses = async () => {
    try {
      setLoading(true);
      for (const day of dailyEntries) {
        if (!day.clientId) { toast.error("Select a client for each day"); setLoading(false); return; }
        const items = day.expenses.map((e) => ({ ...e, amount: parseFloat(e.amount) || 0 }));
        await axiosInstance.post("/populate/create/expenses", {
          clientId:      day.clientId,
          date:          day.date,
          expenses:      items,
          dayTotal:      items.reduce((s, e) => s + e.amount, 0),
          totalExpenses: items.length,
        });
      }
      toast.success("Expenses submitted!");
      setShowForm(false);
      setDailyEntries([blankDay()]);
      refreshData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to submit");
    } finally { setLoading(false); }
  };

  const handleApprovalAction = async (status) => {
    if (!selectedExpense) return;
    try {
      setActionLoading(true);
      await axiosInstance.put(`/populate/update/expenses/${selectedExpense._id}`, {
        status,
        rejectionReason: status === "rejected" ? comment : undefined
      });
      toast.success(`Expense claim ${status === "approved" ? "approved" : "rejected"}!`);
      setSelectedExpense(null);
      setComment("");
      refreshData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update expense status");
    } finally {
      setActionLoading(false);
    }
  };

  /* ── TableGenerator custom renders ── */
  const customRender = {
    status:   (r) => <StatusChip value={r.status} />,
    clientId: (r) => <span className="text-[13px] text-ink font-medium">{r.clientId?.name || "—"}</span>,
    employeeId: (r) => (
      <span className="text-[13px] text-ink font-medium">
        {r.employeeId ? `${r.employeeId.basicInfo?.firstName || ''} ${r.employeeId.basicInfo?.lastName || ''}`.trim() : "—"}
      </span>
    ),
    dayTotal: (r) => (
      <span className="text-[13px] font-semibold text-[var(--module-payroll)]">
        ₹{(r.dayTotal || 0).toLocaleString("en-IN")}
      </span>
    ),
    totalExpenses: (r) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--module-payroll-light)] text-[var(--module-payroll)]">
        {r.totalExpenses} item{r.totalExpenses !== 1 ? "s" : ""}
      </span>
    ),
    date: (r) => (
      <span className="text-[13px] text-ink-muted">
        {r.date ? new Date(r.date).toLocaleDateString() : "—"}
      </span>
    ),
    submittedAt: (r) => (
      <span className="text-[13px] text-ink-muted">
        {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "—"}
      </span>
    ),
    createdAt: (r) => (
      <span className="text-[13px] text-ink-muted">
        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
      </span>
    ),
  };

  /* ════════════════════════════════════════ */
  return (
    <div className="space-y-6" data-module="payroll">

      {/* ── Role-based stat strip ── */}
      <RoleBasedExpenses onRefresh={refreshData} />

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="lmx-page-eyebrow mb-1">PAYROLL</p>
          <h1 className="text-[28px] font-semibold text-ink flex items-center gap-2.5 tracking-tight">
            <BadgeDollarSign size={22} className="text-[var(--module-payroll)]" />
            Travel Expenses
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">Submit and track your daily travel expense claims</p>
        </div>
        <button onClick={() => setShowForm(true)} className="tracker-btn-accent flex items-center gap-2">
          <Plus size={15} /> Add Expenses
        </button>
      </div>

      {/* ── Tabs selector (only visible if user can update/approve expenses) ── */}
      {policies.expenses?.update && (
        <div className="flex gap-2 border-b border-hairline pb-px mb-2">
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "my"
                ? "border-[var(--module-payroll)] text-[var(--module-payroll)]"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            My Expenses
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "pending"
                ? "border-[var(--module-payroll)] text-[var(--module-payroll)]"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            Pending Approvals
          </button>
        </div>
      )}

      {/* ── Expense table ── */}
      <TableGenerator
        title={activeTab === "my" ? "My Expenses" : "Pending Approvals"}
        data={activeTab === "my" ? expenses : pendingExpenses}
        customRender={customRender}
        customColumns={
          activeTab === "my"
            ? ["date", "clientId", "totalExpenses", "dayTotal", "status", "createdAt"]
            : ["employeeId", "date", "clientId", "totalExpenses", "dayTotal", "status", "submittedAt"]
        }
        enableActions={false}
        onRowClick={(row) => setSelectedExpense(row)}
      />

      {/* ── Add expense modal ── */}
      {showForm && (
        <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-tracker-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            style={{ boxShadow: "var(--tracker-shadow-overlay)" }}>

            {/* Modal header — payroll gradient */}
            <div className="flex items-center justify-between px-6 py-5 text-white rounded-t-[16px] bg-gradient-to-br from-[#064E3B] to-[#059669]">
              <div>
                <h2 className="text-[17px] font-semibold">Add Daily Expenses</h2>
                <p className="text-[13px] text-white/75 mt-0.5">
                  {dailyEntries.length} day{dailyEntries.length !== 1 ? "s" : ""} ·{" "}
                  ₹{dailyEntries.reduce((s, _, di) => s + dayTotal(di), 0).toLocaleString("en-IN")} total
                </p>
              </div>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto p-5 space-y-4 scrollbar-hide">
              {dailyEntries.map((day, di) => (
                <div key={di} className="tracker-card p-4 space-y-4">

                  {/* Day header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[var(--module-payroll-light)] text-[var(--module-payroll)] flex items-center justify-center text-[11px] font-bold">
                        {di + 1}
                      </span>
                      <span className="text-[13px] font-semibold text-ink">
                        Day {di + 1}
                        <span className="ml-2 text-[var(--module-payroll)] font-bold">
                          ₹{dayTotal(di).toLocaleString("en-IN")}
                        </span>
                      </span>
                    </div>
                    {dailyEntries.length > 1 && (
                      <button onClick={() => removeDay(di)}
                        className="w-7 h-7 flex items-center justify-center rounded-tracker-md text-[var(--tracker-danger)] bg-[var(--tracker-danger-light)] hover:bg-[var(--tracker-danger)] hover:text-white transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Client + Date row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Client</FieldLabel>
                      <div className="relative">
                        <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
                        <select value={day.clientId} onChange={(e) => setDay(di, "clientId", e.target.value)}
                          className="lmx-input pl-8 appearance-none">
                          <option value="">Select client…</option>
                          {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Date</FieldLabel>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
                        <input type="date" value={day.date} onChange={(e) => setDay(di, "date", e.target.value)}
                          className="lmx-input pl-8" />
                      </div>
                    </div>
                  </div>

                  {/* Expense line items */}
                  <div className="space-y-2">
                    {day.expenses.map((exp, ei) => (
                      <div key={ei} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-end p-3 rounded-tracker-md bg-surface-1 border border-hairline-soft">
                        <div>
                          <FieldLabel>Type</FieldLabel>
                          <select value={exp.expenseType}
                            onChange={(e) => setExpLine(di, ei, "expenseType", e.target.value)}
                            className="lmx-input py-1.5 text-[13px]">
                            {EXPENSE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <FieldLabel>Amount (₹)</FieldLabel>
                          <input type="number" value={exp.amount} min="0" step="0.01"
                            placeholder="0.00"
                            onChange={(e) => setExpLine(di, ei, "amount", e.target.value)}
                            className="lmx-input py-1.5 text-[13px]" />
                        </div>
                        <div>
                          <FieldLabel>Description</FieldLabel>
                          <input type="text" value={exp.description}
                            placeholder="e.g. Cab to client office"
                            onChange={(e) => setExpLine(di, ei, "description", e.target.value)}
                            className="lmx-input py-1.5 text-[13px]" />
                        </div>
                        <button
                          onClick={() => removeLine(di, ei)}
                          disabled={day.expenses.length === 1}
                          className="mb-0.5 w-7 h-[38px] flex items-center justify-center rounded-tracker-md text-[var(--tracker-danger)] bg-[var(--tracker-danger-light)] hover:bg-[var(--tracker-danger)] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add expense line */}
                  <button onClick={() => addLine(di)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-tracker-md border border-dashed border-hairline text-[13px] font-medium text-ink-muted hover:border-[var(--module-payroll)] hover:text-[var(--module-payroll)] hover:bg-[var(--module-payroll-light)] transition-colors">
                    <Plus size={13} /> Add expense line
                  </button>
                </div>
              ))}

              {/* Add another day */}
              <button onClick={addDay}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-tracker-card border-2 border-dashed border-hairline text-[13px] font-medium text-ink-muted hover:border-[var(--module-payroll)] hover:text-[var(--module-payroll)] hover:bg-[var(--module-payroll-light)] transition-colors">
                <Plus size={15} /> Add another day
              </button>
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-hairline-soft flex items-center justify-end gap-3 bg-surface">
              <button onClick={() => setShowForm(false)} className="tracker-btn-secondary">Cancel</button>
              <button onClick={submitExpenses} disabled={loading} className="tracker-btn-accent flex items-center gap-2 disabled:opacity-60">
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : <BadgeDollarSign size={15} />}
                {loading ? "Submitting…" : `Submit ${dailyEntries.length} Day${dailyEntries.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detailed Expense View Modal ── */}
      {selectedExpense && (
        <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-tracker-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            style={{ boxShadow: "var(--tracker-shadow-overlay)" }}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 text-white bg-gradient-to-br from-[#1E293B] to-[#475569]">
              <div>
                <h2 className="text-[17px] font-semibold">Expense Claim Details</h2>
                {selectedExpense.employeeId && (
                  <p className="text-[13px] text-white/75 mt-0.5">
                    Submitted by: {selectedExpense.employeeId.basicInfo?.firstName} {selectedExpense.employeeId.basicInfo?.lastName}
                  </p>
                )}
              </div>
              <button onClick={() => { setSelectedExpense(null); setComment(""); }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-5 scrollbar-hide">
              <div className="grid grid-cols-2 gap-4 text-sm bg-surface-1 p-4 rounded-tracker-lg border border-hairline-soft">
                <div>
                  <span className="block text-[11px] font-bold text-ink-subtle uppercase">Client</span>
                  <span className="font-semibold text-ink">{selectedExpense.clientId?.name || "—"}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-ink-subtle uppercase">Claim Date</span>
                  <span className="font-semibold text-ink">{selectedExpense.date ? new Date(selectedExpense.date).toLocaleDateString() : "—"}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-ink-subtle uppercase">Status</span>
                  <span className="mt-1 block"><StatusChip value={selectedExpense.status} /></span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-ink-subtle uppercase">Total Amount</span>
                  <span className="font-bold text-[var(--module-payroll)] text-[15px]">
                    ₹{(selectedExpense.dayTotal || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Items Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">Line Items</h3>
                <div className="border border-hairline rounded-tracker-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-2 border-b border-hairline text-ink-muted font-semibold">
                        <th className="p-3">Type</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline-soft">
                      {selectedExpense.expenses?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-1">
                          <td className="p-3 font-semibold capitalize"><TypeChip value={item.expenseType} /></td>
                          <td className="p-3 text-ink">{item.description || "No description"}</td>
                          <td className="p-3 text-right font-bold text-ink">₹{item.amount?.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rejection/Audit Notes */}
              {selectedExpense.rejectionReason && (
                <div className="p-4 rounded-tracker-md bg-[var(--tracker-danger-light)] border border-color-mix text-xs text-[var(--tracker-danger)] flex gap-2.5">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Rejection Reason:</span>
                    <span>{selectedExpense.rejectionReason}</span>
                  </div>
                </div>
              )}

              {/* Comments Field (visible for pending approvals tab if user can update) */}
              {selectedExpense.status === "pending" && activeTab === "pending" && policies.expenses?.update && (
                <div className="space-y-1.5 pt-2">
                  <FieldLabel>Approver Remarks / Rejection Comment</FieldLabel>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter remarks or rejection reasons here..."
                    className="lmx-input w-full min-h-[70px] py-2 px-3 text-[13px] resize-none"
                    maxLength={300}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-hairline-soft flex items-center justify-end gap-3 bg-surface">
              <button onClick={() => { setSelectedExpense(null); setComment(""); }} className="tracker-btn-secondary">Close</button>
              
              {selectedExpense.status === "pending" && activeTab === "pending" && policies.expenses?.update && (
                <div className="flex gap-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleApprovalAction("rejected")}
                    className="px-4 py-2 text-sm font-semibold rounded-tracker-md text-[var(--tracker-danger)] bg-[var(--tracker-danger-light)] hover:bg-[var(--tracker-danger)] hover:text-white transition-all disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleApprovalAction("approved")}
                    className="px-4 py-2 text-sm font-semibold rounded-tracker-md text-white bg-[var(--tracker-success)] hover:bg-[var(--tracker-success-dark)] transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check size={14} /> Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;
