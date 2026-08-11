import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../api/axiosInstance";
import toast from "react-hot-toast";
import { Calendar, Lock, Unlock } from "lucide-react";
import ReportHeader from "../../../components/accounts/reports/ReportHeader";
import EmptyState from "../../../components/accounts/reports/EmptyState";

const STATUS_CHIP = {
  Open: "bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  Closed: "bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  Pending: "bg-amber-100 text-amber-700 text-[11px] font-semibold px-2.5 py-1 rounded-full"
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount) {
  return `₹${(amount || 0).toLocaleString("en-IN")}`;
}

export default function PeriodClosureReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period_closures, setperiod_closures] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const closuresRes = await axiosInstance.post("/populate/read/period_closures", {
        limit: 1000,
        sort: { createdAt: -1 }
      });
      setperiod_closures(closuresRes.data?.data || []);
    } catch (error) {
      toast.error("Failed to load period closure data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-module="accounts-period-closures">
      {/* Header */}
      <ReportHeader
        title="Period Closure Reports"
        description="Period verification status, approval audit, and locked financial module states"
        icon={Calendar}
      />

      {/* Period Closures Content */}
      {period_closures.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No period closures defined"
          description="Contact finance team to set up period closures for accounting cycles."
        />
      ) : (
        <div className="space-y-4">
          {period_closures.map((closure) => (
            <div key={closure._id} className="pay-card p-4 border border-hairline-soft shadow-sm hover:shadow transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="lmx-icon-tile">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{closure.periodLabel}</p>
                    <p className="text-[12px] text-ink-muted">
                      {formatDate(closure.startDate)} - {formatDate(closure.endDate)}
                      <span className="mx-2">·</span>
                      {closure.financialYearLabel}
                    </p>
                  </div>
                </div>

                <span className={STATUS_CHIP[closure.status] || STATUS_CHIP.Open}>
                  {closure.status}
                </span>
              </div>

              {/* Module lock status */}
              <div className="mt-3 pt-3 border-t border-hairline-soft">
                <p className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2">Module Lock Status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(closure.modules || {}).map(([moduleName, moduleData]) => (
                    <div
                      key={moduleName}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${moduleData.closed ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                    >
                      {moduleData.closed ? <Lock size={11} /> : <Unlock size={11} />}
                      <span className="capitalize">{moduleName}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Metrics */}
              {closure.summary && (
                <div className="mt-3 pt-3 border-t border-hairline-soft grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px] bg-canvas/30 p-2.5 rounded-lg">
                  <div>
                    <span className="block text-ink-subtle">Expenses</span>
                    <span className="font-semibold text-ink">{formatCurrency(closure.summary.totalExpenseAmount)}</span>
                  </div>
                  <div>
                    <span className="block text-ink-subtle">Payroll Records</span>
                    <span className="font-semibold text-ink">{closure.summary.totalPayrollRecords || 0}</span>
                  </div>
                  <div>
                    <span className="block text-ink-subtle">Attendance</span>
                    <span className="font-semibold text-ink">{closure.summary.totalAttendanceRecords || 0}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
