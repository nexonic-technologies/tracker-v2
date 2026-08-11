import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import TableGenerator from "@components/Common/TableGenerator";
import toast from "react-hot-toast";
import { StatusBadge } from "@components/StatusBadge";
import { MdAdd, MdClose } from "react-icons/md";
import SearchableDropdown from "@components/Common/SearchableDropdown";


const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [invoiceId, setInvoiceId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [transactionRef, setTransactionRef] = useState("");
  const [status, setStatus] = useState("Success");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchPayments(), fetchInvoices()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/assets_payments", {
        limit: 1000,
        populateFields: {
          invoiceId: "invoiceNumber,totalAmount,status"
        }
      });
      // Sort payments by payment date descending
      const sorted = (res.data?.data || []).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
      setPayments(sorted);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments history ledger.");
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/assets_invoices", {
        limit: 1000
      });
      // Filter out paid or void invoices
      const activeInvs = (res.data?.data || []).filter(inv =>
        ["Pending", "Approved"].includes(inv.status)
      );
      setInvoices(activeInvs);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  const handleOpenAddModal = () => {
    setInvoiceId(invoices[0]?._id || "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setAmountPaid(invoices[0]?.totalAmount ? String(invoices[0].totalAmount) : "");
    setPaymentMode("Bank Transfer");
    setTransactionRef("");
    setStatus("Success");
    setModalOpen(true);
  };

  const handleInvoiceChange = (id) => {
    setInvoiceId(id);
    const inv = invoices.find(i => i._id === id);
    if (inv) {
      setAmountPaid(inv.totalAmount ? String(inv.totalAmount) : "");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceId || !amountPaid || !paymentDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    const payload = {
      invoiceId,
      paymentDate,
      amountPaid: Number(amountPaid),
      paymentMode,
      transactionRef: transactionRef.trim() || undefined,
      status
    };

    try {
      await axiosInstance.post("/populate/create/assets_payments", payload);
      toast.success("Payment transaction recorded successfully!");
      fetchInitialData();
      setModalOpen(false);
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error(error.response?.data?.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm("Are you sure you want to delete this payment entry? (Note: PO and invoice balances will not be automatically rolled back from client-side).")) return;
    try {
      await axiosInstance.delete(`/populate/delete/assets_payments/${row._id}`);
      toast.success("Payment entry deleted");
      fetchInitialData();
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment entry.");
    }
  };

  // Map payments table rows
  const tableData = payments.map(p => {
    const inv = p.invoiceId || {};
    return {
      _id: p._id,
      paymentDate: p.paymentDate,
      invoiceNumber: inv.invoiceNumber || "—",
      amountPaid: `$${p.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      paymentMode: p.paymentMode || "Bank Transfer",
      transactionRef: p.transactionRef || "—",
      status: p.status || "Success",
      rawDoc: p
    };
  });

  return (
    <div className="tracker-page" data-module="hr">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">Payments Directory</h1>
          <p className="text-sm text-ink-muted mt-1">Track financial transaction payments issued against vendor invoice bills.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="tracker-btn-accent flex items-center gap-1.5 px-4 py-2"
          disabled={invoices.length === 0}
        >
          <MdAdd className="text-lg" />
          Record Payment
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-accent border-t-transparent animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface dark:bg-surface border border-dashed border-gray-200 dark:border-white/[0.08] rounded-xl text-center">
          <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.251.11a3.371 3.371 0 003.749-.155L13 14m0 0l-.251-.11a3.371 3.371 0 00-3.749.155L9 14m3-8V3m0 12v3m0-12a3 3 0 110-6 3 3 0 010 6zm0 12a3 3 0 110-6 3 3 0 010 6z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">No Payments Recorded</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">Payable payments ledger will be built once you make transactions.</p>
        </div>
      ) : (
        <div className="tracker-card-plain overflow-hidden">
          <TableGenerator
            title="Recorded Payments Ledger"
            data={tableData}
            hiddenColumns={["_id", "rawDoc"]}
            customColumns={["paymentDate", "invoiceNumber", "amountPaid", "paymentMode", "transactionRef", "status"]}
            onDelete={handleDelete}
            customRender={{
              status: (row) => <StatusBadge status={row.status} />
            }}
          />
        </div>
      )}

      {/* Record Payment Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-tracker-lg border border-hairline max-w-md w-full shadow-tracker-overlay p-6 animate-fade-in animate-fade-in-up">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-hairline">
              <h3 className="text-base font-bold text-ink">Record Vendor Payment</h3>
              <button onClick={() => setModalOpen(false)} className="text-ink-subtle hover:text-ink">
                <MdClose className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Reference Invoice *</label>
                <SearchableDropdown
                  placeholder="Select Invoice"
                  value={invoiceId}
                  options={invoices.map(inv => ({
                    value: inv._id,
                    label: `${inv.invoiceNumber} (Amt: $${inv.totalAmount?.toLocaleString()})`
                  }))}
                  onChange={(val) => handleInvoiceChange(val)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Amount Paid *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="lmx-input"
                  placeholder="Payment sum in USD"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="lmx-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Payment Mode</label>
                <SearchableDropdown
                  value={paymentMode}
                  options={[
                    { value: "Bank Transfer", label: "Bank Transfer (NEFT/RTGS)" },
                    { value: "UPI", label: "UPI Payment" },
                    { value: "Credit Card", label: "Credit Card" },
                    { value: "Cash", label: "Cash payment" },
                    { value: "Cheque", label: "Cheque clearance" }
                  ]}
                  onChange={(val) => setPaymentMode(val)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Transaction Ref / UTR / Check #</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="lmx-input"
                  placeholder="e.g. UTR-9908182"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Transaction Status</label>
                <SearchableDropdown
                  value={status}
                  options={[
                    { value: "Success", label: "Success" },
                    { value: "Pending", label: "Pending Clearance" },
                    { value: "Failed", label: "Failed Transaction" }
                  ]}
                  onChange={(val) => setStatus(val)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="tracker-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="tracker-btn-accent"
                >
                  {submitting ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
