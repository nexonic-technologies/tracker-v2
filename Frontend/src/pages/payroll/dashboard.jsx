import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/authProvider.jsx";
import useGenericAPI from "../../components/useGenericAPI";
import StatCard from "../../components/Common/StatCard";
import MonthNavigator from "../../components/Common/MonthNavigator";
import PageLoader from "../../components/Common/PageLoader";
import {
  BadgeDollarSign, TrendingUp, Users, AlertTriangle, DollarSign,
  CheckCircle, Clock
} from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const fmtCurrency = (n) => {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

const STATUS_COLORS = {
  Draft: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300" },
  Processing: { bg: "bg-sky-100 dark:bg-sky-900/20", text: "text-sky-700 dark:text-sky-300" },
  Processed: { bg: "bg-amber-100 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300" },
  Approved: { bg: "bg-emerald-100 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300" },
  Paid: { bg: "bg-blue-100 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-300" },
};

const PayrollDashboard = () => {
  const { user } = useAuth();
  const { read } = useGenericAPI();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payrolls, setPayrolls] = useState([]);
  const [payrollRun, setPayrollRun] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [payrollRes, runRes] = await Promise.all([
          read("payrolls", {
            filter: { month, year },
            populateFields: { employeeId: "basicInfo.firstName,basicInfo.lastName,professionalInfo.department" },
            limit: 5000
          }),
          read("payroll_runs", { filter: { month, year }, limit: 1, sort: { createdAt: -1 } })
        ]);
        setPayrolls(payrollRes?.data || []);
        setPayrollRun(runRes?.data?.[0] || null);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [month, year, read]);

  const analytics = useMemo(() => {
    const totalGross = payrolls.reduce((s, p) => s + (p.grossSalary || 0), 0);
    const totalNet = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
    const totalDeductions = totalGross - totalNet;
    const totalOvertime = payrolls.reduce((s, p) => s + (p.overtimePay || 0), 0);

    const statusCounts = {};
    payrolls.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });

    const deptTotals = {};
    payrolls.forEach(p => {
      const dept = p.employeeId?.professionalInfo?.department?.name || "Unknown";
      if (!deptTotals[dept]) deptTotals[dept] = { gross: 0, net: 0, count: 0 };
      deptTotals[dept].gross += p.grossSalary || 0;
      deptTotals[dept].net += p.netSalary || 0;
      deptTotals[dept].count++;
    });

    return { totalGross, totalNet, totalDeductions, totalOvertime, statusCounts, deptTotals, count: payrolls.length };
  }, [payrolls]);

  const handleMonthChange = (m, y) => { setMonth(m + 1); setYear(y); };

  if (loading) return <PageLoader />;

  return (
    <div data-module="payroll" className="h-full flex flex-col gap-3 overflow-y-auto bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BadgeDollarSign className="h-6 w-6 text-ink" />
          <h1 className="text-[20px] font-semibold text-ink">Payroll Dashboard</h1>
        </div>
        <MonthNavigator month={month - 1} year={year} onChange={handleMonthChange} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Employees" value={analytics.count} icon={Users} color="blue" />
        <StatCard title="Total Gross" value={fmtCurrency(analytics.totalGross)} icon={DollarSign} color="green" />
        <StatCard title="Total Net" value={fmtCurrency(analytics.totalNet)} icon={TrendingUp} color="purple" />
        <StatCard title="Deductions" value={fmtCurrency(analytics.totalDeductions)} icon={AlertTriangle} color="red" />
        <StatCard title="Overtime Pay" value={fmtCurrency(analytics.totalOvertime)} icon={Clock} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm">
          <h3 className="text-[14px] font-medium text-ink mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(analytics.statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[status]?.bg || ''} ${STATUS_COLORS[status]?.text || ''}`}>{status}</span>
                <span className="text-[14px] font-bold text-ink">{count}</span>
              </div>
            ))}
            {Object.keys(analytics.statusCounts).length === 0 && <p className="text-[12px] text-ink-tertiary text-center py-4">No data</p>}
          </div>
        </div>
        <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm">
          <h3 className="text-[14px] font-medium text-ink mb-4">Department Payroll</h3>
          <div className="space-y-2.5">
            {Object.entries(analytics.deptTotals).sort((a, b) => b[1].net - a[1].net).slice(0, 8).map(([dept, stats]) => (
              <div key={dept}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-ink truncate max-w-[140px]">{dept}</span>
                  <span className="text-[11px] font-medium text-ink-subtle">{fmtCurrency(stats.net)}</span>
                </div>
                <div className="h-[5px] bg-surface-1 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500 transition-all duration-700"
                    style={{ width: `${analytics.totalNet > 0 ? (stats.net / analytics.totalNet) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-tracker-card border border-hairline shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline flex items-center justify-between">
          <h3 className="text-[14px] font-medium text-ink">Employee Payroll</h3>
          <span className="text-[11px] text-ink-tertiary">{payrolls.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ minWidth: "750px" }}>
            <thead className="bg-surface-1">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-ink-subtle">Employee</th>
                <th className="text-right px-3 py-2.5 font-medium text-ink-subtle">Present/Working</th>
                <th className="text-right px-3 py-2.5 font-medium text-ink-subtle">LOP</th>
                <th className="text-right px-3 py-2.5 font-medium text-ink-subtle">Gross</th>
                <th className="text-right px-3 py-2.5 font-medium text-ink-subtle">Net</th>
                <th className="text-center px-3 py-2.5 font-medium text-ink-subtle">Status</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map((p, idx) => {
                const name = p.employeeId?.basicInfo ? `${p.employeeId.basicInfo.firstName || ""} ${p.employeeId.basicInfo.lastName || ""}` : "Employee";
                const sc = STATUS_COLORS[p.status] || STATUS_COLORS.Draft;
                return (
                  <tr key={p._id} className={`${idx % 2 === 0 ? '' : 'bg-surface-1/20'} hover:bg-accent/5 transition`}>
                    <td className="px-4 py-2.5 font-medium text-ink">{name}</td>
                    <td className="px-3 py-2.5 text-right text-ink-subtle">{p.presentDays}/{p.workingDays}</td>
                    <td className="px-3 py-2.5 text-right text-red-500">{p.lopDays || 0}</td>
                    <td className="px-3 py-2.5 text-right text-ink">{fmtCurrency(p.grossSalary)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmtCurrency(p.netSalary)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text}`}>{p.status}</span>
                    </td>
                  </tr>
                );
              })}
              {payrolls.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-ink-tertiary">No payroll records for {MONTH_NAMES[month - 1]} {year}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
