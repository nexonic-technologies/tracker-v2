import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../api/axiosInstance";
import toast from "react-hot-toast";
import { DollarSign } from "lucide-react";
import ReportHeader from "../../../components/accounts/reports/ReportHeader";
import ReportFilters from "../../../components/accounts/reports/ReportFilters";
import EmptyState from "../../../components/accounts/reports/EmptyState";

const STATUS_CHIP = {
  approved: "bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  pending: "bg-amber-100 text-amber-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  rejected: "bg-rose-100 text-rose-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  confirmed: "bg-blue-100 text-blue-700 text-[11px] font-semibold px-2.5 py-1 rounded-full",
  Confirmed: "bg-blue-100 text-blue-700 text-[11px] font-semibold px-2.5 py-1 rounded-full"
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount) {
  return `₹${(amount || 0).toLocaleString("en-IN")}`;
}

export default function PaymentReportsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [period_closures, setperiod_closures] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [closuresRes, paymentsRes] = await Promise.all([
        axiosInstance.post("/populate/read/period_closures", { limit: 1000, sort: { createdAt: -1 } }),
        axiosInstance.post("/populate/read/payments", { limit: 1000, sort: { createdAt: -1 } })
      ]);

      setperiod_closures(closuresRes.data?.data || []);
      setPayments(paymentsRes.data?.data || []);
    } catch (error) {
      toast.error("Failed to load payment reports data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPayments = payments.filter((p) => {
    if (filterStatus && (p.status || "").toLowerCase() !== filterStatus.toLowerCase()) return false;
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
    <div className="space-y-6" data-module="accounts-payment-reports">
      {/* Header */}
      <ReportHeader
        title="Payment Reports"
        description="Client payment confirmations, payment methods, and transaction references"
        icon={DollarSign}
        onExport={() => toast.success("Exporting payment reports...")}
      />

      {/* Filters */}
      <ReportFilters
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterPeriod={filterPeriod}
        setFilterPeriod={setFilterPeriod}
        periodOptions={periodOptions}
        statusOptions={[
          { value: "", label: "All Statuses" },
          { value: "confirmed", label: "Confirmed" },
          { value: "pending", label: "Pending" },
          { value: "rejected", label: "Rejected" }
        ]}
      />

      {/* Payment Reports List Card */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No payment reports found"
          description="There are no payment records matching your filter criteria."
        />
      ) : (
        <div className="pay-card overflow-hidden shadow-sm border border-hairline-soft">
          <div className="p-4 border-b border-hairline-soft flex items-center justify-between bg-surface-1">
            <h3 className="text-[14px] font-semibold text-ink">Payment Confirmation Report</h3>
            <span className="text-xs text-ink-muted">{filteredPayments.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-canvas/50 text-[10px] font-black text-ink-subtle uppercase tracking-widest border-b border-hairline">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {filteredPayments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-canvas/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-ink-muted">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-ink">
                      {payment.clientId?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-brand">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {payment.paymentMethod || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">
                      {payment.referenceNo || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={STATUS_CHIP[payment.status] || STATUS_CHIP.pending}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
