import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import TableGenerator from "@components/Common/TableGenerator";
import toast from "react-hot-toast";
import { StatusBadge } from "@components/StatusBadge";
import { MdAdd, MdPrint, MdClose, MdPersonAdd, MdDelete } from "react-icons/md";
const MD = { MdAdd, MdPrint, MdClose, MdPersonAdd, MdDelete };
import SearchableDropdown from "@components/Common/SearchableDropdown";


const Grn = () => {
  const [grns, setGrns] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState(null);

  // Vendor quick add state
  const [quickVendorOpen, setQuickVendorOpen] = useState(false);
  const [qvName, setQvName] = useState("");
  const [qvContact, setQvContact] = useState("");
  const [qvGst, setQvGst] = useState("");

  // PO Form State
  const [vendorId, setVendorId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState([
    { categoryId: "", name: "", model: "", serialNumberPrefix: "", quantity: 1, unitPrice: 0, taxRate: 0 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchGrns(), fetchVendors(), fetchCategories()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrns = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/assets_purchases", {
        limit: 1000,
        populateFields: {
          vendorId: "name,gstIN,contactPerson,email,phone,address"
        }
      });
      // Sort descending by purchase date
      const sorted = (res.data?.data || []).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
      setGrns(sorted);
    } catch (error) {
      console.error("Error loading POs:", error);
      toast.error("Failed to load Purchase Orders list.");
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/assets_vendors", {
        filter: { status: "Active" },
        limit: 1000
      });
      const data = res.data?.data || [];
      setVendors(data);
    } catch (error) {
      console.error("Error loading vendors:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/assets_categories", {
        filter: { isActive: true },
        limit: 1000
      });
      const data = res.data?.data || [];
      setCategories(data);
      // Prepopulate first category on form load if items array is reset
      if (data.length > 0 && items[0] && !items[0].categoryId) {
        setItems([{ ...items[0], categoryId: data[0]._id }]);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const handleOpenAddModal = () => {
    setVendorId(vendors[0]?._id || "");
    setPoNumber("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setRemarks("");
    setItems([
      {
        categoryId: categories[0]?._id || "",
        name: "",
        model: "",
        serialNumberPrefix: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0
      }
    ]);
    setAddModalOpen(true);
  };

  // Dynamic row editing
  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        categoryId: categories[0]?._id || "",
        name: "",
        model: "",
        serialNumberPrefix: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0
      }
    ]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    items.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const tax = Number(item.taxRate) || 0;
      const rowSub = qty * price;
      const rowTax = rowSub * (tax / 100);
      subtotal += rowSub;
      taxTotal += rowTax;
    });
    return {
      subtotal,
      taxTotal,
      grandTotal: subtotal + taxTotal
    };
  };

  const totals = calculateTotals();

  // Create Quick Vendor
  const handleQuickAddVendor = async (e) => {
    e.preventDefault();
    if (!qvName.trim()) {
      toast.error("Vendor Name is required");
      return;
    }
    try {
      const res = await axiosInstance.post("/populate/create/assets_vendors", {
        name: qvName.trim(),
        contactPerson: qvContact.trim() || undefined,
        gstIN: qvGst.trim().toUpperCase() || undefined,
        status: "Active"
      });
      const newVendor = res.data?.data;
      toast.success("Vendor created successfully!");

      // Update vendor lists and preselect
      await fetchVendors();
      setVendorId(newVendor._id);

      // Reset Quick add form
      setQvName("");
      setQvContact("");
      setQvGst("");
      setQuickVendorOpen(false);
    } catch (error) {
      console.error("Error quick adding vendor:", error);
      toast.error(error.response?.data?.message || "Failed to add vendor.");
    }
  };

  // Submit PO
  const handleSubmitPO = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error("Please select a vendor.");
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      if (!items[i].categoryId || !items[i].name.trim() || items[i].quantity < 1 || items[i].unitPrice < 0) {
        toast.error(`Please complete item row #${i + 1} with valid inputs.`);
        return;
      }
    }

    setSubmitting(true);
    const payload = {
      vendorId,
      poNumber: poNumber.trim() || undefined,
      purchaseDate,
      remarks: remarks.trim() || undefined,
      items: items.map(it => ({
        categoryId: it.categoryId,
        name: it.name.trim(),
        model: it.model.trim() || undefined,
        serialNumberPrefix: it.serialNumberPrefix.trim() || undefined,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate)
      })),
      totalAmount: totals.grandTotal,
      status: "Draft"
    };

    try {
      await axiosInstance.post("/populate/create/assets_purchases", payload);
      toast.success("Purchase Order / GRN created successfully");
      fetchGrns();
      setAddModalOpen(false);
    } catch (error) {
      console.error("Error creating PO:", error);
      toast.error(error.response?.data?.message || "Failed to create Purchase Order.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle status update transitions
  const handleTransitionStatus = async (grn, targetStatus) => {
    const actionText = targetStatus === "Received" ? "Marking as Received will generate assets and stock ledger entries. Continue?" : `Transition PO status to "${targetStatus}"?`;
    if (!window.confirm(actionText)) return;

    try {
      await axiosInstance.put(`/populate/update/assets_purchases/${grn._id}`, { status: targetStatus });
      toast.success(`Purchase Order status updated to "${targetStatus}"`);
      if (targetStatus === "Received") {
        toast.success("Assets successfully generated and ledger updated!", { duration: 5000 });
      }
      fetchGrns();
    } catch (error) {
      console.error("Error updating PO status:", error);
      toast.error(error.response?.data?.message || "Invalid status transition.");
    }
  };

  // Print triggering helper
  const handleOpenPrint = (grn) => {
    setSelectedGrn(grn);
    setPrintModalOpen(true);
  };

  const triggerPrintWindow = () => {
    window.print();
  };

  // Format table data for rendering
  const tableData = grns.map(g => {
    const vName = g.vendorId?.name || "—";
    return {
      _id: g._id,
      poNumber: g.poNumber,
      vendor: vName,
      purchaseDate: g.purchaseDate,
      totalAmount: `$${g.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      status: g.status,
      paymentStatus: g.paymentStatus || "Unpaid",
      rawDoc: g
    };
  });

  return (
    <div className="tracker-page" data-module="hr">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">GRN Entries</h1>
          <p className="text-sm text-ink-muted mt-1">Manage purchase orders and goods receipt notes to receive asset stocks.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="tracker-btn-accent flex items-center gap-1.5 px-4 py-2"
        >
          <MD.MdAdd className="text-lg" />
          Add GRN / PO
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-accent border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="tracker-card-plain overflow-hidden">
          <TableGenerator
            title="Purchase Orders and GRN List"
            data={tableData}
            hiddenColumns={["_id", "rawDoc"]}
            customColumns={["poNumber", "vendor", "purchaseDate", "totalAmount", "status", "paymentStatus"]}
            customRender={{
              status: (row) => <StatusBadge status={row.status} />,
              paymentStatus: (row) => <StatusBadge status={row.paymentStatus} />,
              __actions: (row) => {
                const grn = row.rawDoc;
                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenPrint(grn)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white transition-colors"
                      title="Print Invoice / PO"
                    >
                      <MD.MdPrint size={15} />
                    </button>

                    {grn.status === "Draft" && (
                      <button
                        onClick={() => handleTransitionStatus(grn, "Pending Approval")}
                        className="px-2 py-1 text-xs font-semibold rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-colors"
                      >
                        Submit
                      </button>
                    )}

                    {grn.status === "Pending Approval" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleTransitionStatus(grn, "Approved")}
                          className="px-2 py-1 text-xs font-semibold rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleTransitionStatus(grn, "Cancelled")}
                          className="px-2 py-1 text-xs font-semibold rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {grn.status === "Approved" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleTransitionStatus(grn, "Received")}
                          className="px-2 py-1 text-xs font-semibold rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors"
                        >
                          Receive
                        </button>
                        <button
                          onClick={() => handleTransitionStatus(grn, "Cancelled")}
                          className="px-2 py-1 text-xs font-semibold rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
            }}
          />
        </div>
      )}

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-tracker-lg border border-hairline max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-tracker-overlay animate-fade-in animate-fade-in-up p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-hairline">
              <h3 className="text-base font-bold text-ink">New Purchase Order / Goods Receipt Note</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-ink-subtle hover:text-ink">
                <MD.MdClose className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmitPO} className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Vendor Supplier *</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableDropdown
                        placeholder="Select Vendor"
                        value={vendorId}
                        options={vendors.map(v => ({ value: v._id, label: v.name }))}
                        onChange={(val) => setVendorId(val)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickVendorOpen(true)}
                      className="px-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-hairline rounded-tracker-md hover:bg-indigo-500 hover:text-white transition-colors"
                      title="Quick Add Vendor"
                    >
                      <MD.MdPersonAdd size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">PO Number (Optional)</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="lmx-input"
                    placeholder="Auto-generated if blank"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="lmx-input"
                  />
                </div>
              </div>

              {/* Items Grid builder */}
              <div>
                <span className="block text-xs font-bold text-ink mb-3 uppercase tracking-wider">Purchase Items Table</span>
                <div className="border border-hairline rounded-tracker-md overflow-hidden bg-canvas/30 p-3 space-y-3">
                  {items.map((item, idx) => {
                    const rowSubtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    const rowTax = rowSubtotal * ((Number(item.taxRate) || 0) / 100);
                    const rowTotal = rowSubtotal + rowTax;

                    return (
                      <div key={idx} className="bg-surface border border-hairline-soft rounded-tracker-md p-3.5 space-y-3 shadow-sm relative">
                        <div className="flex justify-between items-center pb-2 border-b border-hairline-soft">
                          <span className="text-xs font-semibold text-[#7C3AED]">Item Row #{idx + 1}</span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-rose-500 hover:text-rose-700 flex items-center gap-1 text-xs"
                            >
                              <MD.MdDelete size={15} />
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Category *</label>
                            <SearchableDropdown
                              placeholder="Select Category"
                              value={item.categoryId}
                              options={categories.map(c => ({ value: c._id, label: c.name }))}
                              onChange={(val) => handleItemChange(idx, "categoryId", val)}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Item Name *</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                              className="lmx-input py-1.5 px-2"
                              placeholder="e.g. ThinkPad L14 or Monitor"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Model</label>
                            <input
                              type="text"
                              value={item.model}
                              onChange={(e) => handleItemChange(idx, "model", e.target.value)}
                              className="lmx-input py-1.5 px-2"
                              placeholder="e.g. G3 / Gen 4"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Serial Number Prefix</label>
                            <input
                              type="text"
                              value={item.serialNumberPrefix}
                              onChange={(e) => handleItemChange(idx, "serialNumberPrefix", e.target.value)}
                              className="lmx-input py-1.5 px-2"
                              placeholder="e.g. SN-THINK-"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Qty *</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                              className="lmx-input py-1.5 px-2"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Unit Cost *</label>
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                              className="lmx-input py-1.5 px-2"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Tax %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.taxRate}
                              onChange={(e) => handleItemChange(idx, "taxRate", e.target.value)}
                              className="lmx-input py-1.5 px-2"
                            />
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-ink-muted pt-1">
                          Sub: <span className="font-semibold text-ink">${rowSubtotal.toLocaleString()}</span> + Tax: <span className="font-semibold text-ink">${rowTax.toLocaleString()}</span> = <span className="font-bold text-[#7C3AED]">${rowTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="w-full py-2.5 border border-dashed border-[#7C3AED] text-[#7C3AED] text-xs font-semibold rounded-tracker-md bg-[#EDE9FE]/20 hover:bg-[#EDE9FE]/55 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MD.MdAdd className="text-sm" />
                    Append Another Item Row
                  </button>
                </div>
              </div>

              {/* Remarks and Invoice Summary block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-hairline">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Remarks / Notes</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    className="lmx-input resize-none"
                    placeholder="Enter any comments, terms, or delivery conditions here..."
                  />
                </div>

                <div className="bg-surface-1 border border-hairline rounded-tracker-lg p-4 space-y-2">
                  <div className="flex justify-between text-xs text-ink-muted">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-ink">${totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs text-ink-muted">
                    <span>GST / Taxes:</span>
                    <span className="font-semibold text-ink">${totals.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-hairline my-2 pt-2 flex justify-between text-sm font-bold text-ink">
                    <span>Grand Total:</span>
                    <span className="text-[#7C3AED]">${totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="tracker-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="tracker-btn-accent"
                >
                  {submitting ? "Creating..." : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Vendor Drawer overlay */}
      {quickVendorOpen && (
        <div className="fixed inset-0 tracker-overlay z-[60] flex items-center justify-center p-4">
          <div className="bg-surface rounded-tracker-lg border border-hairline max-w-md w-full shadow-tracker-overlay p-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-hairline">
              <h4 className="text-sm font-bold text-ink">Quick Create Vendor</h4>
              <button onClick={() => setQuickVendorOpen(false)} className="text-ink-subtle hover:text-ink">
                <MD.MdClose className="text-lg" />
              </button>
            </div>
            <form onSubmit={handleQuickAddVendor} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={qvName}
                  onChange={(e) => setQvName(e.target.value)}
                  className="lmx-input py-1.5"
                  placeholder="e.g. WorkHub Supplies Ltd"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Contact Person</label>
                <input
                  type="text"
                  value={qvContact}
                  onChange={(e) => setQvContact(e.target.value)}
                  className="lmx-input py-1.5"
                  placeholder="e.g. Sales Agent"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={qvGst}
                  onChange={(e) => setQvGst(e.target.value)}
                  className="lmx-input py-1.5"
                  placeholder="e.g. 33AAAAA1111A1Z1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setQuickVendorOpen(false)}
                  className="tracker-btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tracker-btn-accent py-1.5 px-3 text-xs"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print invoice Preview Modal */}
      {printModalOpen && selectedGrn && (
        <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-gray-900 rounded-lg max-w-4xl w-full p-8 shadow-tracker-overlay print-modal-content my-8 relative">

            {/* Header controls inside modal - hidden during print */}
            <div className="absolute top-4 right-4 flex gap-2 print:hidden z-10">
              <button
                onClick={triggerPrintWindow}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-4 rounded text-xs flex items-center gap-1.5"
              >
                <MD.MdPrint size={15} />
                Print / Save PDF
              </button>
              <button
                onClick={() => setPrintModalOpen(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1.5 px-3 rounded text-xs"
              >
                Close Preview
              </button>
            </div>

            {/* Print styling block */}
            <style>{`
              @media print {
                /* Hide everything except the print-modal-content */
                body * {
                  visibility: hidden;
                }
                .print-modal-content, .print-modal-content * {
                  visibility: visible;
                }
                .print-modal-content {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  padding: 0;
                  box-shadow: none;
                  border: none;
                  background: white !important;
                  color: black !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
                @page {
                  size: A4;
                  margin: 1.5cm;
                }
              }
            `}</style>

            {/* Letterhead Print Layout */}
            <div className="border-b-2 border-gray-900 pb-5 mb-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-indigo-700">WORKHUB INVENTORY CO.</h2>
                <p className="text-xs text-gray-500 mt-1">Enterprise Asset Procurement Division</p>
                <p className="text-xs text-gray-500">Corporate HQ, Tech Park Area</p>
              </div>
              <div className="text-right">
                <h1 className="text-xl font-bold uppercase text-gray-800">Purchase Order</h1>
                <p className="text-sm font-semibold text-gray-700 mt-1">PO #: {selectedGrn.poNumber}</p>
                <p className="text-xs text-gray-500">Date: {new Date(selectedGrn.purchaseDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
              <div>
                <span className="block font-bold text-gray-700 uppercase tracking-wider mb-2">Vendor Details:</span>
                <span className="block font-bold text-sm text-gray-900">{selectedGrn.vendorId?.name || "Unknown Supplier"}</span>
                {selectedGrn.vendorId?.contactPerson && <span className="block mt-0.5 text-gray-600">Attn: {selectedGrn.vendorId.contactPerson}</span>}
                {selectedGrn.vendorId?.phone && <span className="block text-gray-600">Phone: {selectedGrn.vendorId.phone}</span>}
                {selectedGrn.vendorId?.email && <span className="block text-gray-600">Email: {selectedGrn.vendorId.email}</span>}
                {selectedGrn.vendorId?.gstIN && <span className="block mt-1 font-semibold text-gray-700">GSTIN: {selectedGrn.vendorId.gstIN}</span>}
              </div>

              <div>
                <span className="block font-bold text-gray-700 uppercase tracking-wider mb-2">Ship To / Billing Info:</span>
                <span className="block font-bold text-sm text-gray-900">WorkHub Offices</span>
                <span className="block text-gray-600">Primary Logistics Hub & Warehouse</span>
                <span className="block text-gray-600">Coimbatore, Tamil Nadu</span>
                <span className="block mt-1 font-semibold text-gray-700">Receipt Status: {selectedGrn.status}</span>
                {selectedGrn.paymentStatus && <span className="block font-semibold text-gray-700">Payment: {selectedGrn.paymentStatus}</span>}
              </div>
            </div>

            {/* Line items Table */}
            <div className="mb-8">
              <table className="w-full text-xs text-left border-collapse border-b border-gray-300">
                <thead>
                  <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-700 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Item Name & Model</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Tax Rate</th>
                    <th className="py-2.5 px-3 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(selectedGrn.items || []).map((item, idx) => {
                    const sub = item.quantity * item.unitPrice;
                    const tax = sub * (item.taxRate / 100);
                    const matchedCat = categories.find(c => c._id === item.categoryId);
                    const catName = matchedCat ? matchedCat.name : "Category";

                    return (
                      <tr key={idx} className="text-gray-800">
                        <td className="py-3 px-3">{idx + 1}</td>
                        <td className="py-3 px-3 font-semibold text-gray-900">{catName}</td>
                        <td className="py-3 px-3">
                          <span className="font-semibold block">{item.name}</span>
                          {item.model && <span className="text-[10px] text-gray-500 block">Model: {item.model}</span>}
                          {item.serialNumberPrefix && <span className="text-[10px] text-gray-500 block">SN Prefix: {item.serialNumberPrefix}</span>}
                        </td>
                        <td className="py-3 px-3 text-right">{item.quantity}</td>
                        <td className="py-3 px-3 text-right">${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-3 text-right">{item.taxRate}%</td>
                        <td className="py-3 px-3 text-right font-bold text-gray-900">${(sub + tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total balance and Remarks */}
            <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-gray-200">
              <div>
                <span className="block font-bold text-gray-700 uppercase tracking-wider mb-2">Remarks / Special Instructions:</span>
                <p className="text-gray-600 leading-relaxed italic bg-gray-50 p-3 rounded border border-gray-200">
                  {selectedGrn.remarks || "No special instructions provided for this purchase order."}
                </p>
              </div>

              <div className="space-y-2 text-right">
                <div className="flex justify-between text-gray-600">
                  <span className="ml-auto font-medium">Subtotal:</span>
                  <span className="w-32 font-semibold text-gray-900">${(selectedGrn.items || []).reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="ml-auto font-medium">GST / Taxes:</span>
                  <span className="w-32 font-semibold text-gray-900">${(selectedGrn.items || []).reduce((acc, it) => acc + (it.quantity * it.unitPrice * (it.taxRate / 100)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-sm text-gray-900">
                  <span className="ml-auto">Grand Total:</span>
                  <span className="w-32 text-indigo-700 text-base">${selectedGrn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-dashed border-gray-300 text-center text-[10px] text-gray-400">
              <p>This is a computer generated document. Signed electronically under WorkHub Inventory Policies.</p>
              <p className="mt-1">© {new Date().getFullYear()} WorkHub Corp. All rights reserved.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Grn;
