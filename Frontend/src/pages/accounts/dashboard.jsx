import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  BarChart3,
  DollarSign,
  FileText,
  Calendar,
  CreditCard,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";

function formatCurrency(amount) {
  return `₹${(amount || 0).toLocaleString("en-IN")}`;
}

export default function AccountsDashboard() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [period_closures, setperiod_closures] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [closuresRes, expensesRes, paymentsRes] = await Promise.all([
        axiosInstance.post("/populate/read/period_closures", { limit: 1000, sort: { createdAt: -1 } }),
        axiosInstance.post("/populate/read/expenses", { limit: 1000, sort: { createdAt: -1 } }),
        axiosInstance.post("/populate/read/payments", { limit: 1000, sort: { createdAt: -1 } })
      ]);

      setperiod_closures(closuresRes.data?.data || []);
      setExpenses(expensesRes.data?.data || []);
      setPayments(paymentsRes.data?.data || []);
    } catch (error) {
      toast.error("Failed to load Accounts Dashboard metrics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.dayTotal || 0), 0);
  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingApprovalsCount = expenses.filter((e) => e.status === "pending").length;
  const closedPeriodsCount = period_closures.filter((c) => c.status === "Closed").length;

  const stats = [
    {
      label: "Total Expenses",
      value: formatCurrency(totalExpenses),
      color: "#f59e0b",
      icon: DollarSign,
      link: "/accounts/reports/expenses"
    },
    {
      label: "Total Payments",
      value: formatCurrency(totalPayments),
      color: "#10b981",
      icon: CreditCard,
      link: "/accounts/reports/payments"
    },
    {
      label: "Pending Approvals",
      value: pendingApprovalsCount,
      color: "#ef4444",
      icon: Clock,
      link: "/accounts/reports/expenses"
    },
    {
      label: "Closed Periods",
      value: closedPeriodsCount,
      color: "#64748b",
      icon: Calendar,
      link: "/accounts/reports/period-closures"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-module="accounts-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="lmx-page-eyebrow mb-1">ACCOUNTS & FINANCE</p>
          <h1 className="text-[28px] font-semibold text-ink flex items-center gap-2.5 tracking-tight">
            <BarChart3 size={22} className="text-brand" />
            Accounts Dashboard
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">Financial summary, expense approvals, and accounting KPIs</p>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link key={idx} to={stat.link} className="pay-stat-card block group hover:border-brand transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="pay-stat-card__label">{stat.label}</p>
                <div className="p-1.5 rounded-lg bg-surface-1 group-hover:bg-brand/10 transition-colors">
                  <Icon size={15} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="pay-stat-card__value" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/accounts/ledger" className="pay-card p-5 hover:border-brand transition-all block group">
          <div className="flex items-center justify-between mb-3">
            <div className="lmx-icon-tile group-hover:bg-brand group-hover:text-white transition-colors">
              <FileText size={20} />
            </div>
            <ArrowUpRight size={18} className="text-ink-subtle group-hover:text-brand transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-ink mb-1">General Ledger</h3>
          <p className="text-xs text-ink-muted">View ledger entries, client balances, and transactions.</p>
        </Link>

        <Link to="/accounts/payments" className="pay-card p-5 hover:border-brand transition-all block group">
          <div className="flex items-center justify-between mb-3">
            <div className="lmx-icon-tile group-hover:bg-brand group-hover:text-white transition-colors">
              <CreditCard size={20} />
            </div>
            <ArrowUpRight size={18} className="text-ink-subtle group-hover:text-brand transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-ink mb-1">Payment Journal</h3>
          <p className="text-xs text-ink-muted">Record payments, manage payment methods and receipts.</p>
        </Link>

        <Link to="/accounts/reports/expenses" className="pay-card p-5 hover:border-brand transition-all block group">
          <div className="flex items-center justify-between mb-3">
            <div className="lmx-icon-tile group-hover:bg-brand group-hover:text-white transition-colors">
              <TrendingUp size={20} />
            </div>
            <ArrowUpRight size={18} className="text-ink-subtle group-hover:text-brand transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-ink mb-1">Financial Reports</h3>
          <p className="text-xs text-ink-muted">Access Expense, Payment, and Period Closure reports.</p>
        </Link>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expense Requests */}
        <div className="pay-card overflow-hidden">
          <div className="p-4 border-b border-hairline-soft flex items-center justify-between bg-surface-1">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              Recent Expense Activity
            </h3>
            <Link to="/accounts/reports/expenses" className="text-xs font-medium text-brand hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-hairline-soft max-h-64 overflow-y-auto">
            {expenses.slice(0, 5).map((exp) => (
              <div key={exp._id} className="p-3 px-4 flex items-center justify-between hover:bg-canvas/40 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-ink">{exp.employeeId?.name || "Employee"}</p>
                  <p className="text-[11px] text-ink-muted">{exp.clientId?.name || "General Expense"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-brand">{formatCurrency(exp.dayTotal)}</p>
                  <span className="text-[10px] font-semibold capitalize text-ink-subtle">{exp.status}</span>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="p-6 text-center text-xs text-ink-muted">No recent expenses found.</div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="pay-card overflow-hidden">
          <div className="p-4 border-b border-hairline-soft flex items-center justify-between bg-surface-1">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Recent Payments Received
            </h3>
            <Link to="/accounts/reports/payments" className="text-xs font-medium text-brand hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-hairline-soft max-h-64 overflow-y-auto">
            {payments.slice(0, 5).map((pay) => (
              <div key={pay._id} className="p-3 px-4 flex items-center justify-between hover:bg-canvas/40 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-ink">{pay.clientId?.name || "Client"}</p>
                  <p className="text-[11px] text-ink-muted">{pay.paymentMethod || "Payment"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600">{formatCurrency(pay.amount)}</p>
                  <span className="text-[10px] font-semibold text-ink-subtle">{pay.status}</span>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="p-6 text-center text-xs text-ink-muted">No recent payments found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
