import { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import TableGenerator from "../../components/Common/TableGenerator";
import toast from "react-hot-toast";
import { StatusBadge } from "../../components/StatusBadge";
import { MdAdd, MdClose } from "react-icons/md";
import SearchableDropdown from "../../components/Common/SearchableDropdown";


const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [purchaseId, setPurchaseId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [subTotal, setSubTotal] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [totalAmount, setTotalAmount] = useState("");
  const [status, setStatus] = useState("Pending");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchInvoices(), fetchPurchaseOrders()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/assets_invoices", {
        limit: 1000,
        populateFields: {
          purchaseId: "poNumber,vendorId"
        }
      });
      // Further populate vendor names since double-populate ref is tricky in generic query, 
      // we can map them client-side if needed, but since purchaseId.vendorId contains the vendor object ID, 
      // let's fetch vendor details or display the PO details cleanly.
      setInvoices(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices list.");
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/assets_purchases", {
        limit: 1000,
        populateFields: {
          vendorId: "name"
        }
      });
      // Show only Approved, Received, or Pending Approval POs
      const activePOs = (res.data?.data || []).filter(po =>
        ["Approved", "Received", "Pending Approval"].includes(po.status)
      );
      setPurchaseOrders(activePOs);
    } catch (error) {
      console.error("Error fetching POs:", error);
    }
  };

  const handleOpenAddModal = () => {
    setPurchaseId(purchaseOrders[0]?._id || "");
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setSubTotal("");
    setTaxAmount("0");
    setTotalAmount("");
    setStatus("Pending");
    setModalOpen(true);
  };

  const handlePoChange = (id) => {
    setPurchaseId(id);
    const po = purchaseOrders.find(p => p._id === id);
    if (po) {
      // Auto-populate values from the selected PO to save manual entries!
      setSubTotal(po.totalAmount ? String(po.totalAmount) : "");
      setTotalAmount(po.totalAmount ? String(po.totalAmount) : "");
    }
  };

  const calculateTotal = (sub, tax) => {
    const s = Number(sub) || 0;
    const t = Number(tax) || 0;
    setTotalAmount(String(s + t));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseId || !invoiceNumber || !invoiceDate || !dueDate || !subTotal || !totalAmount) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    const payload = {
      purchaseId,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate,
      subTotal: Number(subTotal),
      taxAmount: Number(taxAmount),
      totalAmount: Number(totalAmount),
      status
    };

    try {
      await axiosInstance.post("/populate/create/assets_invoices", payload);
      toast.success("Invoice recorded successfully");
      fetchInvoices();
      setModalOpen(false);
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error(error.response?.data?.message || "Failed to record invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete invoice "${row.invoiceNumber}"?`)) return;
    try {
      await axiosInstance.delete(`/populate/delete/assets_invoices/${row._id}`);
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error(error.response?.data?.message || "Failed to delete invoice.");
    }
  };

  const handleUpdateStatus = async (id, targetStatus) => {
    try {
      await axiosInstance.put(`/populate/update/assets_invoices/${id}`, { status: targetStatus });
      toast.success(`Invoice status updated to "${targetStatus}"`);
      fetchInvoices();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status.");
    }
  };

  // Map invoices table rows
  const tableData = invoices.map(inv => {
    const po = inv.purchaseId || {};
    return {
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      poNumber: po.poNumber || "—",
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      totalAmount: `$${inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      status: inv.status || "Pending",
      rawDoc: inv
    };
  });

  return (
    <div className="tracker-page" data-module="hr">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">Invoice Registry</h1>
          <p className="text-sm text-ink-muted mt-1">Track bills and invoices matched against active purchase orders.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="tracker-btn-accent flex items-center gap-1.5 px-4 py-2"
          disabled={purchaseOrders.length === 0}
        >
          <MdAdd className="text-lg" />
          Record Invoice
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-accent border-t-transparent animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface dark:bg-surface border border-dashed border-gray-200 dark:border-white/[0.08] rounded-xl text-center">
          <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">No Invoices Logged</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">Match vendor invoices against purchase orders to track payables.</p>
        </div>
      ) : (
        <div className="tracker-card-plain overflow-hidden">
          <TableGenerator
            title="Vendor Invoices"
            data={tableData}
            hiddenColumns={["_id", "rawDoc"]}
            customColumns={["invoiceNumber", "poNumber", "invoiceDate", "dueDate", "totalAmount", "status"]}
            onDelete={handleDelete}
            customRender={{
              status: (row) => <StatusBadge status={row.status} />,
              __actions: (row) => {
                const inv = row.rawDoc;
                return (
                  <div className="flex gap-1">
                    {inv.status === "Pending" && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(inv._id, "Approved")}
                          className="px-2 py-1 text-xs font-semibold rounded bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(inv._id, "Void")}
                          className="px-2 py-1 text-xs font-semibold rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                        >
                          Void
                        </button>
                      </>
                    )}
                    {inv.status === "Approved" && (
                      <button
                        onClick={() => handleUpdateStatus(inv._id, "Void")}
                        className="px-2 py-1 text-xs font-semibold rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                      >
                        Void
                      </button>
                    )}
                  </div>
                );
              }
            }}
          />
        </div>
      )}

      {/* Record Invoice Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-tracker-lg border border-hairline max-w-lg w-full shadow-tracker-overlay p-6 animate-fade-in animate-fade-in-up">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-hairline">
              <h3 className="text-base font-bold text-ink">Record Vendor Invoice Bill</h3>
              <button onClick={() => setModalOpen(false)} className="text-ink-subtle hover:text-ink">
                <MdClose className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Associated Purchase Order *</label>
                <SearchableDropdown
                  placeholder="Select Purchase Order"
                  value={purchaseId}
                  options={purchaseOrders.map(po => ({
                    value: po._id,
                    label: `${po.poNumber} — ${po.vendorId?.name || "Vendor"} (Amt: $${po.totalAmount?.toLocaleString()})`
                  }))}
                  onChange={(val) => handlePoChange(val)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Invoice Number / Bill Ref *</label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="lmx-input"
                  placeholder="e.g. INV-9908"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="lmx-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="lmx-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink-muted mb-1.5 uppercase">Sub Total *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={subTotal}
                    onChange={(e) => { setSubTotal(e.target.value); calculateTotal(e.target.value, taxAmount); }}
                    className="lmx-input"
                    placeholder="Subtotal cost"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-muted mb-1.5 uppercase">Tax Amount</label>
                  <input
                    type="number"
                    min="0"
                    value={taxAmount}
                    onChange={(e) => { setTaxAmount(e.target.value); calculateTotal(subTotal, e.target.value); }}
                    className="lmx-input"
                    placeholder="Taxes if any"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-muted mb-1.5 uppercase">Total Amount *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="lmx-input bg-surface-1 font-semibold text-[#7C3AED]"
                    placeholder="Calculated total"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Initial Invoice Status</label>
                <SearchableDropdown
                  value={status}
                  options={[
                    { value: "Pending", label: "Pending Review" },
                    { value: "Approved", label: "Approved for Payment" }
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
                  {submitting ? "Saving..." : "Record Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
