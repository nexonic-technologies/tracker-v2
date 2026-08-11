import { useState, useEffect, useCallback } from "react";
import { PayrollService } from "@services";
import { useAuth } from "@providers/AuthProvider";
import toast from "react-hot-toast";
import { BadgeDollarSign, Loader2 } from "lucide-react";
import { PayslipModal } from "@pages/Payroll/index";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_CHIP = {
  Draft: "pay-status-chip pay-status-chip--draft",
  Processing: "pay-status-chip pay-status-chip--processing",
  Processed: "pay-status-chip pay-status-chip--processed",
  Approved: "pay-status-chip pay-status-chip--approved",
  Paid: "pay-status-chip pay-status-chip--paid",
};

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
        limit: 12
      });
      setPayrolls(res.data || []);
    } catch { toast.error("Failed to load payslips"); }
    finally { setLoading(false); }
  }, [user?.id, user?._id, year]);

  useEffect(() => { fetch(); }, [fetch]);

  const years = Array.from({ length: 4 }, (_, i) => thisYear - i);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <p className="text-[13px] text-ink-muted">Year</p>
        <div className="flex gap-1.5">
          {years.map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-3 py-1.5 rounded-tracker-md text-[12px] font-semibold transition-colors ${y === year
                  ? "pay-status-chip pay-status-chip--approved"
                  : "tracker-btn-ghost py-1"
                }`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--module-payroll)" }} />
        </div>
      ) : payrolls.length === 0 ? (
        <div className="pay-card p-10 text-center">
          <div className="lmx-icon-tile w-12 h-12 mx-auto mb-3">
            <BadgeDollarSign size={22} />
          </div>
          <p className="text-[14px] font-semibold text-ink">No payslips for {year}</p>
          <p className="text-[13px] text-ink-muted mt-1">Payslips appear here once HR processes payroll</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {payrolls.map(p => (
            <button key={p._id} onClick={() => setSelected(p)}
              className="pay-card p-4 text-left hover:shadow-[var(--tracker-shadow-raised)] transition-shadow w-full">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[15px] font-semibold text-ink">
                  {MONTHS[(p.month || 1) - 1]} {p.year}
                </p>
                <span className={STATUS_CHIP[p.status] || STATUS_CHIP.Draft}>{p.status}</span>
              </div>
              <div className="pay-summary-band flex items-center justify-between mt-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4px]" style={{ color: "var(--pay-ink-label)" }}>Gross</p>
                  <p className="pay-amount-sm pay-amount-gross mt-0.5">₹{(p.grossSalary || 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4px]" style={{ color: "var(--pay-ink-label)" }}>Net</p>
                  <p className="pay-amount-lg mt-0.5">₹{(p.netSalary || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-[11px] text-ink-subtle">
                <span>{p.presentDays || 0}/{p.workingDays || 0} days</span>
                {p.lopDays > 0 && <span className="pay-amount-deduct">LOP: {p.lopDays}d</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <PayslipModal rec={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
