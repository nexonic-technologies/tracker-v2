import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGenericAPI from "../../../components/useGenericAPI";
import PageLoader from "../../../components/Common/PageLoader";
import {
  ChevronLeft, BadgeDollarSign, Calendar, User, Clock,
  ArrowUp, ArrowDown, FileText, Download
} from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmtCurrency = (n) => {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

const STATUS_COLORS = {
  Draft:      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  Processing: "bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300",
  Processed:  "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  Approved:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  Paid:       "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
};

export default function PayslipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { readDetailed } = useGenericAPI();
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPayroll = useCallback(async () => {
    try {
      const res = await readDetailed("payrolls", { id });
      if (res?.data) setPayroll(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id, readDetailed]);

  useEffect(() => { if (id) fetchPayroll(); }, [id, fetchPayroll]);

  if (loading) return <PageLoader />;
  if (!payroll) return (
    <div className="flex flex-col items-center justify-center h-64 bg-canvas">
      <p className="text-ink-subtle text-sm">Payslip not found</p>
      <button onClick={() => navigate(-1)} className="mt-3 text-sm text-accent hover:underline cursor-pointer">Go Back</button>
    </div>
  );

  const empName = payroll.employeeId?.basicInfo
    ? `${payroll.employeeId.basicInfo.firstName || ""} ${payroll.employeeId.basicInfo.lastName || ""}`
    : "Employee";
  const empId = payroll.employeeId?.professionalInfo?.empId || "";
  const dept = payroll.employeeId?.professionalInfo?.department?.name || "";
  const desg = payroll.employeeId?.professionalInfo?.designation?.title || "";

  const earnings = payroll.earnedBreakdown instanceof Map
    ? Object.fromEntries(payroll.earnedBreakdown)
    : payroll.earnedBreakdown || {};
  const deductions = payroll.deductionBreakdown instanceof Map
    ? Object.fromEntries(payroll.deductionBreakdown)
    : payroll.deductionBreakdown || {};

  const totalEarnings = Object.values(earnings).reduce((s, v) => s + (v || 0), 0) + (payroll.overtimePay || 0);
  const totalDeductions = Object.values(deductions).reduce((s, v) => s + (v || 0), 0);

  return (
    <div data-module="payroll" className="max-w-[900px] mx-auto p-4 lg:p-6 bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition mb-5 px-3 py-2 rounded-[8px] border border-hairline bg-surface cursor-pointer">
        <ChevronLeft className="h-3.5 w-3.5" /> Back
      </button>

      {/* ─── PAYSLIP HEADER ─── */}
      <div className="bg-surface rounded-tracker-card border border-hairline shadow-sm overflow-hidden">
        {/* Top band */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-800 dark:to-indigo-800 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BadgeDollarSign className="h-7 w-7" />
              <div>
                <h1 className="text-[18px] font-semibold">Payslip</h1>
                <p className="text-[12px] text-white/70">{MONTHS[(payroll.month || 1) - 1]} {payroll.year}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${STATUS_COLORS[payroll.status] || ''}`}>
              {payroll.status}
            </span>
          </div>
        </div>

        {/* Employee Info */}
        <div className="px-6 py-4 border-b border-hairline grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Employee</p>
            <p className="text-[14px] font-semibold text-ink mt-0.5">{empName}</p>
            {empId && <p className="text-[11px] text-ink-subtle">{empId}</p>}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Department</p>
            <p className="text-[13px] text-ink mt-0.5">{dept || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Designation</p>
            <p className="text-[13px] text-ink mt-0.5">{desg || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Days</p>
            <p className="text-[13px] text-ink mt-0.5">
              {payroll.presentDays}/{payroll.workingDays} working
              {payroll.lopDays > 0 && <span className="text-red-500 ml-1">({payroll.lopDays} LOP)</span>}
            </p>
          </div>
        </div>

        {/* ─── EARNINGS & DEDUCTIONS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Earnings */}
          <div className="px-6 py-5 md:border-r border-hairline">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUp className="h-4 w-4 text-emerald-500" />
              <h3 className="text-[13px] font-semibold text-ink uppercase tracking-wider">Earnings</h3>
            </div>
            <div className="space-y-2.5">
              {Object.entries(earnings).map(([key, value]) => (
                <div key={key} className="flex justify-between text-[13px]">
                  <span className="text-ink-subtle">{key}</span>
                  <span className="font-medium text-ink">{fmtCurrency(value)}</span>
                </div>
              ))}
              {payroll.overtimePay > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-ink-subtle">Overtime Pay ({payroll.overtimeHours || 0}h)</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">{fmtCurrency(payroll.overtimePay)}</span>
                </div>
              )}
              <div className="h-px bg-hairline-soft mt-2" />
              <div className="flex justify-between text-[14px] font-bold pt-1">
                <span className="text-ink">Total Earnings</span>
                <span className="text-emerald-600 dark:text-emerald-400">{fmtCurrency(totalEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="px-6 py-5 border-t md:border-t-0 border-hairline">
            <div className="flex items-center gap-2 mb-4">
              <ArrowDown className="h-4 w-4 text-red-500" />
              <h3 className="text-[13px] font-semibold text-ink uppercase tracking-wider">Deductions</h3>
            </div>
            <div className="space-y-2.5">
              {Object.entries(deductions).map(([key, value]) => (
                <div key={key} className="flex justify-between text-[13px]">
                  <span className="text-ink-subtle">{key}</span>
                  <span className="font-medium text-red-500">{fmtCurrency(value)}</span>
                </div>
              ))}
              {Object.keys(deductions).length === 0 && (
                <p className="text-[12px] text-ink-tertiary">No deductions</p>
              )}
              <div className="h-px bg-hairline-soft mt-2" />
              <div className="flex justify-between text-[14px] font-bold pt-1">
                <span className="text-ink">Total Deductions</span>
                <span className="text-red-500">{fmtCurrency(totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── NET PAY ─── */}
        <div className="bg-surface-1 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">Net Salary</p>
            <p className="text-[11px] text-ink-tertiary mt-0.5">Gross {fmtCurrency(payroll.grossSalary)} − Deductions {fmtCurrency(totalDeductions)}</p>
          </div>
          <p className="text-[28px] font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(payroll.netSalary)}</p>
        </div>

        {/* ─── AUDIT INFO ─── */}
        <div className="px-6 py-3 border-t border-hairline grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-ink-tertiary">
          {payroll.processedAt && <p>Processed: {new Date(payroll.processedAt).toLocaleDateString("en-IN")}</p>}
          {payroll.approvedAt && <p>Approved: {new Date(payroll.approvedAt).toLocaleDateString("en-IN")}</p>}
          {payroll.paidAt && <p>Paid: {new Date(payroll.paidAt).toLocaleDateString("en-IN")}</p>}
          {payroll.frozenAt && <p>Frozen: {new Date(payroll.frozenAt).toLocaleDateString("en-IN")}</p>}
        </div>
      </div>
    </div>
  );
}
