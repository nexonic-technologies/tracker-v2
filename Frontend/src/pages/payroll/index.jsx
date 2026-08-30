import { useState } from "react";
import { BadgeDollarSign, Play, Users, Receipt, Calendar } from "lucide-react";
import { useCapability } from "@hooks/useCapability";
import PayrollRunsTab from "@components/payroll/PayrollRunsTab";
import SalaryStructuresTab from "@components/payroll/SalaryStructuresTab";
import MyPayslipsTab from "@components/payroll/MyPayslipsTab";
import PeriodClosuresTab from "@components/payroll/PeriodClosuresTab";

export default function PayrollPage() {
  const { isSuperAdmin, hasAnyCapability } = useCapability();
  const [active, setActive] = useState("");

  const visibleTabs = [
    (isSuperAdmin || hasAnyCapability(['payroll_runs:view', 'payroll_runs:create', 'payroll_runs:approve'])) && { key: "runs", label: "Payroll Runs", icon: Play },
    (isSuperAdmin || hasAnyCapability(['salary_structures:view', 'salary_structures:create', 'salary_structures:update'])) && { key: "structures", label: "Salary Structures", icon: Users },
    (isSuperAdmin || hasAnyCapability(['period_closures:view', 'period_closures:create', 'period_closures:update'])) && { key: "closures", label: "Period Closures", icon: Calendar },
    { key: "payslips", label: "My Payslips", icon: Receipt },
  ].filter(Boolean);

  const isPrivileged = isSuperAdmin || visibleTabs.some(t => t.key !== "payslips");
  const resolvedActive = active && visibleTabs.some(t => t.key === active)
    ? active
    : (visibleTabs[0]?.key || (isPrivileged ? "runs" : "payslips"));

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
            {isPrivileged ? "Manage salary structures, runs, and payslips" : "View your monthly payslips"}
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
