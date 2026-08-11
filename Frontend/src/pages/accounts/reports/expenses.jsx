import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../api/axiosInstance";
import toast from "react-hot-toast";
import { FileText, Lock, Unlock, Eye } from "lucide-react";
import ReportHeader from "../../../components/accounts/reports/ReportHeader";
import ReportFilters from "../../../components/accounts/reports/ReportFilters";
import EmptyState from "../../../components/accounts/reports/EmptyState";

const STATUS_CHIP = {
  approved: "bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  pending: "bg-amber-100 text-amber-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  rejected: "bg-rose-100 text-rose-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  confirmed: "bg-blue-100 text-blue-700 text-[11px] font-semibold px-2.5 py-1 rounded-full"
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount) {
  return `₹${(amount || 0).toLocaleString("en-IN")}`;
}

export default function ExpenseReportsPage() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [period_closures, setperiod_closures] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [closuresRes, expensesRes] = await Promise.all([
        axiosInstance.post("/populate/read/period_closures", { limit: 1000, sort: { createdAt: -1 } }),
        axiosInstance.post("/populate/read/expenses", { limit: 1000, sort: { createdAt: -1 } })
      ]);

      setperiod_closures(closuresRes.data?.data || []);
      setExpenses(expensesRes.data?.data || []);
    } catch (error) {
      toast.error("Failed to load expense reports data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const checkPeriodStatus = (date) => {
    if (!date) return { locked: false, closure: null };

    const targetDate = new Date(date);
    const closure = period_closures.find((c) => {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return (
        targetDate >= start &&
        targetDate <= end &&
        c.status === "Closed" &&
        c.modules?.expenses?.closed
      );
    });

    return { locked: !!closure, closure };
  };

  const filteredExpenses = expenses.filter((e) => {
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  });

  const periodOptions = [...new Set(period_closures.map((c) => c.periodLabel))].filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-module="accounts-expense-reports">
      {/* Header */}
      <ReportHeader
        title="Expense Reports"
        description="Expense approval reports, verification, and period closure lock status"
        icon={FileText}
        onExport={() => toast.success("Exporting expense reports...")}
      />

      {/* Filters */}
      <ReportFilters
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterPeriod={filterPeriod}
        setFilterPeriod={setFilterPeriod}
        periodOptions={periodOptions}
      />

      {/* Expense Reports List Card */}
      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No expense reports found"
          description="There are no expense records matching your filter criteria."
        />
      ) : (
        <div className="pay-card overflow-hidden shadow-sm border border-hairline-soft">
          <div className="p-4 border-b border-hairline-soft flex items-center justify-between bg-surface-1">
            <h3 className="text-[14px] font-semibold text-ink">Expense Approval Report</h3>
            <span className="text-xs text-ink-muted">{filteredExpenses.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-canvas/50 text-[10px] font-black text-ink-subtle uppercase tracking-widest border-b border-hairline">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Period Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {filteredExpenses.map((expense) => {
                  const periodStatus = checkPeriodStatus(expense.date);
                  return (
                    <tr key={expense._id} className="hover:bg-canvas/30 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-ink-muted">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-ink">
                        {expense.employeeId?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink">
                        {expense.clientId?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-brand">
                        {formatCurrency(expense.dayTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={STATUS_CHIP[expense.status] || STATUS_CHIP.pending}>
                          {expense.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {periodStatus.locked ? (
                          <span className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                            <Lock size={11} /> Locked
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                            <Unlock size={11} /> Open
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button className="tracker-btn-ghost text-[12px] py-1">
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
