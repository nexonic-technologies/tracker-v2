import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeDollarSign, Play, Users, Receipt, X, BarChart3, Calendar } from "lucide-react";
import { useUserRole } from "@hooks/useUserRole";
import PayrollRunsTab from "@components/payroll/PayrollRunsTab";
import SalaryStructuresTab from "@components/payroll/SalaryStructuresTab";
import MyPayslipsTab from "@components/payroll/MyPayslipsTab";
import PeriodClosuresTab from "@components/payroll/PeriodClosuresTab";
import ProfileImage from "@components/Common/ProfileImage";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TABS = [
  { key: "runs", label: "Payroll Runs", icon: Play, roles: ["hr admin", "admin", "superadmin", "super admin", "hr"] },
  { key: "structures", label: "Salary Structures", icon: Users, roles: ["hr admin", "admin", "superadmin", "super admin", "hr"] },
  { key: "closures", label: "Period Closures", icon: Calendar, roles: ["hr admin", "admin", "superadmin", "super admin", "hr", "finance manager", "finance"] },
  { key: "payslips", label: "My Payslips", icon: Receipt, roles: [] },
];

const PRIVILEGED = ["hr admin", "admin", "superadmin", "super admin", "hr"];

export default function PayrollPage() {
  const { userRole, loading: roleLoading } = useUserRole();
  const roleName = (userRole || "").toLowerCase();
  const isHR = PRIVILEGED.includes(roleName);

  const visibleTabs = TABS.filter(t => t.roles.length === 0 || t.roles.includes(roleName));
  const [active, setActive] = useState("");

  const resolvedActive = active || (roleLoading ? "" : isHR ? "runs" : "payslips");

  if (roleLoading) return (
    <div className="flex items-center justify-center h-64" data-module="payroll">
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--module-payroll)", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="space-y-4" data-module="payroll">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="lmx-page-eyebrow mb-0.5">PAYROLL</p>
          <h1 className="text-[22px] font-bold text-ink flex items-center gap-2 tracking-tight">
            <BadgeDollarSign size={20} style={{ color: "var(--module-payroll)" }} />
            Payroll Management
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {isHR ? "Manage salary structures, runs, and payslips" : "View your monthly payslips"}
          </p>
        </div>
      </div>

      <div className="lmx-tab-bar">
        {visibleTabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setActive(t.key)}
              className={`lmx-tab ${resolvedActive === t.key ? "lmx-tab-active" : ""}`}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {resolvedActive === "runs" && <PayrollRunsTab />}
      {resolvedActive === "structures" && <SalaryStructuresTab />}
      {resolvedActive === "closures" && <PeriodClosuresTab />}
      {resolvedActive === "payslips" && <MyPayslipsTab />}
    </div>
  );
}

export function PayslipModal({ rec, onClose }) {
  const emp = rec?.employeeId;
  const earned = rec?.earnedBreakdown
    ? (rec.earnedBreakdown instanceof Map ? Object.fromEntries(rec.earnedBreakdown) : rec.earnedBreakdown)
    : null;
  const deducted = rec?.deductionBreakdown
    ? (rec.deductionBreakdown instanceof Map ? Object.fromEntries(rec.deductionBreakdown) : rec.deductionBreakdown)
    : null;

  const earnedEntries = earned ? Object.entries(earned) : [];
  const deductedEntries = deducted ? Object.entries(deducted) : [];

  const STATUS_CHIP = {
    Draft: "pay-status-chip pay-status-chip--draft",
    Processing: "pay-status-chip pay-status-chip--processing",
    Processed: "pay-status-chip pay-status-chip--processed",
    Approved: "pay-status-chip pay-status-chip--approved",
    Paid: "pay-status-chip pay-status-chip--paid",
  };

  return (
    <div className="fixed inset-0 tracker-overlay z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface rounded-tracker-xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: "var(--tracker-shadow-overlay)" }}>

        <div className="pay-gradient-hero px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">PAYSLIP</p>
            <div className="flex items-center gap-2">
              {rec.status && <span className={`${STATUS_CHIP[rec.status]} !text-[10px]`}>{rec.status}</span>}
              <button onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>
          {emp && (
            <div className="flex items-center gap-3">
              <ProfileImage profileImage={emp.basicInfo?.profileImage}
                firstName={emp.basicInfo?.firstName} lastName={emp.basicInfo?.lastName} px={44} />
              <div>
                <p className="text-[16px] font-semibold">
                  {emp.basicInfo?.firstName} {emp.basicInfo?.lastName}
                </p>
                <p className="text-[13px] text-white/75">
                  {emp.professionalInfo?.empId} · {MONTHS[(rec.month || 1) - 1]} {rec.year}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {earnedEntries.length > 0 ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-subtle mb-2">Earnings</p>
              {earnedEntries.map(([name, val]) => (
                <div key={name} className="pay-row pay-row--earn">
                  <span className="pay-row__label">{name}</span>
                  <span className="pay-row__value pay-amount-earn">₹{(val || 0).toLocaleString("en-IN")}</span>
                </div>
              ))}
              {rec.overtimePay > 0 && (
                <div className="pay-row pay-row--earn">
                  <span className="pay-row__label">Overtime</span>
                  <span className="pay-row__value pay-amount-earn">₹{(rec.overtimePay || 0).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="pay-row pay-row--total">
                <span className="pay-row__label">Gross Salary</span>
                <span className="pay-row__value pay-amount-sm pay-amount-gross">₹{(rec.grossSalary || 0).toLocaleString("en-IN")}</span>
              </div>
            </>
          ) : (
            <div className="pay-row pay-row--total">
              <span className="pay-row__label">Gross Salary</span>
              <span className="pay-row__value pay-amount-sm pay-amount-gross">₹{(rec.grossSalary || 0).toLocaleString("en-IN")}</span>
            </div>
          )}

          {deductedEntries.length > 0 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-subtle mt-4 mb-2">Deductions</p>
              {deductedEntries.map(([name, val]) => val > 0 && (
                <div key={name} className="pay-row pay-row--deduct">
                  <span className="pay-row__label">{name}</span>
                  <span className="pay-row__value pay-amount-deduct">− ₹{(val || 0).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </>
          )}

          <div className="pay-row pay-row--net pay-row--total mt-2 pt-2 border-t-2 border-hairline">
            <span className="pay-row__label text-[15px] font-semibold text-ink">Net Salary</span>
            <span className="pay-row__value pay-amount-lg">₹{(rec.netSalary || 0).toLocaleString("en-IN")}</span>
          </div>

          <div className="mt-4 pt-3 border-t border-hairline-soft flex items-center justify-between text-[12px] text-ink-muted">
            <span>{rec.presentDays || 0} / {rec.workingDays || 0} days present</span>
            {rec.lopDays > 0 && (
              <span className="pay-amount-deduct font-semibold">LOP: {rec.lopDays} day{rec.lopDays !== 1 ? "s" : ""}</span>
            )}
            {rec.overtimeHours > 0 && (
              <span className="pay-amount-earn">OT: {rec.overtimeHours}h</span>
            )}
          </div>
        </div>

        <div className="px-5 pb-4 flex justify-end">
          <button onClick={onClose} className="tracker-btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
