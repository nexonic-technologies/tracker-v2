import { useState, useEffect, useMemo } from "react";
import axiosInstance from "@api/axiosInstance";
import PageLoader from "@components/Common/PageLoader";
import StatCard from "@components/Common/StatCard";
import FloatingCard from "@components/Common/FloatingCard";
import TableGenerator from "@components/Common/TableGenerator";
import {
  FileText, Plus, Search, CheckCircle2, Clock,
  AlertCircle, DollarSign, RefreshCw, Send,
  Trash2, Receipt, Building
} from "lucide-react";
import toast from "react-hot-toast";

const INVOICE_STATUS_COLORS = {
  'Draft': 'bg-gray-100 text-gray-700 border-gray-200',
  'Issued': 'bg-blue-50 text-blue-700 border-blue-200',
  'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-200',
  'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Overdue': 'bg-rose-50 text-rose-700 border-rose-200',
  'Cancelled': 'bg-slate-100 text-slate-500 border-slate-200'
};

const fmtCurrency = (n) => {
  if (!n && n !== 0) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    clientId: "",
    contractId: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "Draft",
    discountAmount: 0,
    notes: "",
    terms: "Payment due within 30 days of invoice date.",
    lineItems: [
      { description: "Professional Software Development & Delivery Services", quantity: 1, unitPrice: 0, taxRate: 18, discount: 0, amount: 0 }
    ]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, clientsRes, ordersRes] = await Promise.all([
        axiosInstance.post("/populate/read/invoices", {
          limit: 1000,
          populate: [
            { path: "clientId", select: "name email" },
            { path: "contractId", select: "orderNumber totalOrderValue" }
          ],
          sort: { createdAt: -1 }
        }),
        axiosInstance.post("/populate/read/clients", { limit: 1000, select: "name _id Status" }),
        axiosInstance.post("/populate/read/order_acknowledgements", { limit: 1000, select: "orderNumber totalOrderValue clientId" })
      ]);

      setInvoices(invRes.data?.data || []);
      setClients(clientsRes.data?.data || []);
      setOrders(ordersRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setSelectedInvoice(null);
    setFormData({
      clientId: "",
      contractId: "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "Draft",
      discountAmount: 0,
      notes: "",
      terms: "Payment due within 30 days of invoice date.",
      lineItems: [
        { description: "Professional Software Development & Delivery Services", quantity: 1, unitPrice: 0, taxRate: 18, discount: 0, amount: 0 }
      ]
    });
    setModalOpen(true);
  };

  const handleAddLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { description: "", quantity: 1, unitPrice: 0, taxRate: 18, discount: 0, amount: 0 }
      ]
    }));
  };

  const handleRemoveLineItem = (index) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    const updated = [...formData.lineItems];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, lineItems: updated }));
  };

  // Computed subtotal and totals in modal
  const computedTotals = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;

    formData.lineItems.forEach(item => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.unitPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const disc = Number(item.discount) || 0;

      const base = qty * rate;
      const afterDisc = base - ((base * disc) / 100);
      const tax = (afterDisc * taxRate) / 100;

      subtotal += afterDisc;
      totalTax += tax;
    });

    const discount = Number(formData.discountAmount) || 0;
    const grandTotal = subtotal + totalTax - discount;

    return { subtotal, totalTax, grandTotal };
  }, [formData.lineItems, formData.discountAmount]);

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!formData.clientId) {
      toast.error("Please select a client account");
      return;
    }
    if (formData.lineItems.length === 0 || formData.lineItems.some(i => !i.description.trim() || i.unitPrice <= 0)) {
      toast.error("Please provide valid line item descriptions and unit prices");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        discountAmount: Number(formData.discountAmount) || 0,
        lineItems: formData.lineItems.map(item => ({
          ...item,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          taxRate: Number(item.taxRate) || 0,
          discount: Number(item.discount) || 0
        }))
      };

      const res = await axiosInstance.post("/populate/create/invoices", payload);
      if (res.data?.success) {
        toast.success(formData.status === "Issued" ? "Tax Invoice Issued & Posted to Client Ledger!" : "Invoice Draft Created");
        setModalOpen(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleIssueInvoice = async (invoiceId) => {
    try {
      toast.loading("Issuing invoice & posting to AR Ledger...", { id: "issue-inv" });
      await axiosInstance.put(`/populate/update/invoices/${invoiceId}`, { status: "Issued" });
      toast.success("Invoice Issued & Posted to Client Ledger!", { id: "issue-inv" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to issue invoice", { id: "issue-inv" });
    }
  };

  // Filtered List
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(inv =>
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.clientId?.name?.toLowerCase().includes(q) ||
      inv.status?.toLowerCase().includes(q)
    );
  }, [invoices, searchQuery]);

  // Aggregate Metrics (Revenue & AR Aging)
  const metrics = useMemo(() => {
    const totalInvoiced = invoices
      .filter(i => i.status !== "Draft" && i.status !== "Cancelled")
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    const totalCollected = invoices
      .filter(i => i.status !== "Draft" && i.status !== "Cancelled")
      .reduce((sum, i) => sum + (i.paidAmount || 0), 0);

    const totalOutstandingAR = invoices
      .filter(i => i.status !== "Draft" && i.status !== "Cancelled" && i.status !== "Paid")
      .reduce((sum, i) => sum + (i.balanceDue || 0), 0);

    const overdueAR = invoices
      .filter(i => (i.status === "Issued" || i.status === "Partially Paid") && new Date(i.dueDate) < new Date())
      .reduce((sum, i) => sum + (i.balanceDue || 0), 0);

    return { totalInvoiced, totalCollected, totalOutstandingAR, overdueAR };
  }, [invoices]);

  if (loading) return <PageLoader />;

  return (
    <div data-module="project" className="h-full flex flex-col gap-4 bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div>
          <p className="lmx-page-eyebrow mb-0.5">ACCOUNTS & REVENUE</p>
          <h1 className="text-[20px] font-bold text-ink flex items-center gap-2">
            <Receipt className="h-6 w-6 text-emerald-500" />
            Tax Invoices & Billing
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 hover:bg-surface-1 rounded-full transition cursor-pointer">
            <RefreshCw className="h-4 w-4 text-ink-subtle" />
          </button>
          
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 tracker-btn-brand text-[12px] font-semibold cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create Invoice
          </button>
        </div>
      </div>

      {/* ─── STATS COCKPIT ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Invoiced Revenue" value={fmtCurrency(metrics.totalInvoiced)} icon={FileText} color="blue" />
        <StatCard title="Total Collections" value={fmtCurrency(metrics.totalCollected)} icon={CheckCircle2} color="green" />
        <StatCard title="Outstanding AR" value={fmtCurrency(metrics.totalOutstandingAR)} icon={DollarSign} color="yellow" />
        <StatCard title="Overdue Balance" value={fmtCurrency(metrics.overdueAR)} icon={AlertCircle} color="red" />
      </div>

      {/* ─── SEARCH & FILTER BAR ─── */}
      <div className="flex items-center justify-between gap-4 bg-surface p-3 rounded-tracker-md border border-hairline">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" size={16} />
          <input
            type="text"
            placeholder="Search invoice number, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="lmx-input pl-10"
          />
        </div>
        <p className="text-xs text-ink-muted">
          Showing <span className="font-semibold text-ink">{filteredInvoices.length}</span> invoices
        </p>
      </div>

      {/* ─── INVOICE LIST TABLE ─── */}
      <div className="bg-surface rounded-tracker-xl border border-hairline shadow-card overflow-hidden">
        <TableGenerator
          data={filteredInvoices.map(inv => ({
            _id: inv._id,
            invoiceNumber: inv.invoiceNumber,
            client: inv.clientId?.name || "N/A",
            total: fmtCurrency(inv.totalAmount),
            paid: fmtCurrency(inv.paidAmount),
            balance: fmtCurrency(inv.balanceDue),
            dueDate: new Date(inv.dueDate).toLocaleDateString(),
            status: inv.status,
            invData: inv
          }))}
          hiddenColumns={["_id", "invData"]}
          customRender={{
            invoiceNumber: (row) => (
              <span
                className="font-mono font-bold text-brand hover:underline cursor-pointer"
                onClick={() => { setSelectedInvoice(row.invData); setDetailOpen(true); }}
              >
                {row.invoiceNumber}
              </span>
            ),
            status: (row) => (
              <span className={`px-2.5 py-1 text-xs rounded-full font-semibold border ${INVOICE_STATUS_COLORS[row.status] || "bg-gray-100 text-gray-800"}`}>
                {row.status}
              </span>
            ),
            total: (row) => <span className="font-bold text-ink">{row.total}</span>,
            balance: (row) => (
              <span className={`font-bold ${row.invData.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {row.balance}
              </span>
            )
          }}
          onEdit={(row) => { setSelectedInvoice(row.invData); setDetailOpen(true); }}
        />
      </div>

      {/* ─── CREATE INVOICE MODAL ─── */}
      {modalOpen && (
        <FloatingCard
          title="Issue Tax Invoice"
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSaveInvoice} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Client Account *</label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="lmx-input mt-1"
                >
                  <option value="">Select Customer Account...</option>
                  {clients.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Contract / OA Link</label>
                <select
                  value={formData.contractId}
                  onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                  className="lmx-input mt-1"
                >
                  <option value="">Direct Invoice (No OA Linked)</option>
                  {orders.map(o => (
                    <option key={o._id} value={o._id}>
                      {o.orderNumber} — ₹{(o.totalOrderValue || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Issue Date *</label>
                <input
                  type="date"
                  required
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="lmx-input mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Payment Due Date *</label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="lmx-input mt-1"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Invoice Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="lmx-input mt-1"
                >
                  <option value="Draft">Draft (Save without ledger posting)</option>
                  <option value="Issued">Issued (Post AR Credit immediately to Client Ledger)</option>
                </select>
              </div>
            </div>

            {/* Line Items Builder */}
            <div className="border-t border-hairline pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Line Items</h4>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.lineItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-surface-1 rounded-tracker-md border border-hairline-soft space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Item / Service description *"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(idx, "description", e.target.value)}
                        className="lmx-input flex-1"
                        required
                      />
                      {formData.lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-ink-subtle uppercase">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(idx, "quantity", e.target.value)}
                          className="lmx-input mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-ink-subtle uppercase">Unit Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleLineItemChange(idx, "unitPrice", e.target.value)}
                          className="lmx-input mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-ink-subtle uppercase">Tax (%)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.taxRate}
                          onChange={(e) => handleLineItemChange(idx, "taxRate", e.target.value)}
                          className="lmx-input mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-ink-subtle uppercase">Disc (%)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.discount}
                          onChange={(e) => handleLineItemChange(idx, "discount", e.target.value)}
                          className="lmx-input mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-surface-2 p-3 rounded-tracker-md text-right space-y-1 text-xs">
                <p>Subtotal: <span className="font-semibold">{fmtCurrency(computedTotals.subtotal)}</span></p>
                <p>GST / Tax: <span className="font-semibold">{fmtCurrency(computedTotals.totalTax)}</span></p>
                <p className="text-sm font-bold text-ink">Grand Total: <span className="text-emerald-600">{fmtCurrency(computedTotals.grandTotal)}</span></p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="tracker-btn-secondary px-5"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="tracker-btn-brand px-6 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>{saving ? "Processing..." : (formData.status === "Issued" ? "Issue & Post to Ledger" : "Save Draft")}</span>
              </button>
            </div>
          </form>
        </FloatingCard>
      )}

      {/* ─── INVOICE DETAIL MODAL ─── */}
      {detailOpen && selectedInvoice && (
        <FloatingCard
          title={`Tax Invoice: ${selectedInvoice.invoiceNumber}`}
          onClose={() => { setDetailOpen(false); setSelectedInvoice(null); }}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-surface-1 p-3 rounded-tracker-md border border-hairline">
              <div>
                <p className="text-ink-subtle uppercase font-bold text-[10px]">Client Account</p>
                <p className="font-semibold text-ink text-sm mt-0.5">{selectedInvoice.clientId?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-ink-subtle uppercase font-bold text-[10px]">Invoice Status</p>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${INVOICE_STATUS_COLORS[selectedInvoice.status]}`}>
                  {selectedInvoice.status}
                </span>
              </div>
              <div>
                <p className="text-ink-subtle uppercase font-bold text-[10px]">Issue Date</p>
                <p className="font-medium text-ink">{new Date(selectedInvoice.issueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-ink-subtle uppercase font-bold text-[10px]">Due Date</p>
                <p className="font-medium text-ink">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 border-t border-hairline pt-3">
              <h4 className="font-bold text-ink uppercase text-[11px]">Billed Scope Items</h4>
              <div className="space-y-1.5">
                {selectedInvoice.lineItems?.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-hairline-soft">
                    <div>
                      <p className="font-semibold text-ink">{item.description}</p>
                      <p className="text-[10px] text-ink-subtle">Qty: {item.quantity} x {fmtCurrency(item.unitPrice)} (Tax: {item.taxRate}%)</p>
                    </div>
                    <span className="font-bold text-ink">{fmtCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-1 text-right bg-surface-2 p-3 rounded-tracker-md">
                <p>Total Billed: <span className="font-bold text-ink">{fmtCurrency(selectedInvoice.totalAmount)}</span></p>
                <p>Paid Amount: <span className="font-bold text-emerald-600">{fmtCurrency(selectedInvoice.paidAmount)}</span></p>
                <p className="text-sm font-bold">Balance Due: <span className="text-rose-600">{fmtCurrency(selectedInvoice.balanceDue)}</span></p>
              </div>
            </div>

            {selectedInvoice.status === "Draft" && (
              <div className="flex justify-end pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => { setDetailOpen(false); handleIssueInvoice(selectedInvoice._id); }}
                  className="tracker-btn-brand px-6 flex items-center gap-2"
                >
                  <Send size={16} />
                  <span>Issue Invoice & Post to Ledger</span>
                </button>
              </div>
            )}
          </div>
        </FloatingCard>
      )}
    </div>
  );
}
