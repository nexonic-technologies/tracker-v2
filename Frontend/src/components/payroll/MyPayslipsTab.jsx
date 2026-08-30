import React, { useState, useEffect, useCallback } from "react";
import { PayrollService } from "@services";
import { useAuth } from "@providers/AuthProvider";
import toast from "react-hot-toast";
import {
  BadgeDollarSign,
  Loader2,
  Calendar,
  Eye,
  TrendingUp,
  Receipt,
  FileText
} from "lucide-react";
import ProfessionalPayslipVoucher from "./ProfessionalPayslipVoucher";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_CHIP = {
  Draft: "pay-status-chip pay-status-chip--draft",
  Processing: "pay-status-chip pay-status-chip--processing",
  Processed: "pay-status-chip pay-status-chip--processed",
  Approved: "pay-status-chip pay-status-chip--approved",
  Paid: "pay-status-chip pay-status-chip--paid",
};

function fmt(n) { return (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function MyPayslipsTab() {
  const { user } = useAuth();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetch = useCallback(async () => {
    const userId = user?.id || user?._id;
    if (!userId) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await PayrollService.getPayrolls({
        filter: { employeeId: userId, year },
        sort: { month: -1 },
        limit: 12,
        populateFields: {
          employeeId: "basicInfo,professionalInfo,accountDetails,personalDocuments,authInfo.workEmail",
          salaryStructureId: "version,effectiveFrom,effectiveTo,ctc,components"
        }
      });
      setPayrolls(res.data || []);
    } catch {
      toast.error("Failed to load payslips");
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?._id, year]);

  useEffect(() => { fetch(); }, [fetch]);

  const years = Array.from({ length: 4 }, (_, i) => thisYear - i);

  /* ─────────────────────────────────────────────────────────────
   * IN-PAGE 2026-GRADE PROFESSIONAL PAYSLIP VOUCHER VIEW
   * ───────────────────────────────────────────────────────────── */
  if (selected) {
    return (
      <ProfessionalPayslipVoucher
        record={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink-muted">Financial Year:</span>
          <div className="flex gap-1.5">
            {years.map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition ${
                  y === year
                    ? "bg-brand-solid text-white shadow-xs"
                    : "bg-surface border border-hairline text-ink-muted hover:text-ink"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[12px] text-ink-muted">
          Showing <strong className="text-ink">{payrolls.length}</strong> payslip voucher{payrolls.length !== 1 ? "s" : ""} for {year}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 pay-card">
          <Loader2 size={24} className="animate-spin text-brand-solid" />
        </div>
      ) : payrolls.length === 0 ? (
        <div className="pay-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="p-3 rounded-2xl bg-surface-1 text-ink-subtle">
            <BadgeDollarSign size={32} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">No Payslips Generated for {year}</h3>
            <p className="text-[13px] text-ink-muted mt-1 max-w-md mx-auto">
              Monthly payslips will appear here once processed and disbursed by the finance & HR team.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {payrolls.map(p => (
            <div
              key={p._id}
              onClick={() => setSelected(p)}
              className="pay-card p-4 border border-hairline hover:border-brand-solid/30 hover:shadow-xs transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[15px] font-bold text-ink group-hover:text-brand-solid transition">
                  {MONTHS[(p.month || 1) - 1]} {p.year}
                </p>
                <span className={STATUS_CHIP[p.status] || STATUS_CHIP.Draft}>{p.status}</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-1/60 border border-hairline-soft flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Gross</p>
                  <p className="font-mono font-semibold text-[13px] text-emerald-600 dark:text-emerald-400">
                    ₹{fmt(p.grossSalary)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Net Takehome</p>
                  <p className="font-mono font-bold text-[16px] text-ink">
                    ₹{fmt(p.netSalary)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 text-[11px] text-ink-subtle pt-2 border-t border-hairline-soft">
                <span>{p.presentDays || 0}/{p.workingDays || 0} days present</span>
                <span className="text-brand-solid font-semibold group-hover:underline flex items-center gap-0.5">
                  View Full Voucher →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
