import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "@api/axiosInstance";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

const QuotationFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    quotationNumber: "",
    clientId: "",
    clientName: "",
    contactPerson: "",
    clientAddress: "",
    validUntil: "",
    issueDate: new Date().toISOString().split('T')[0],
    currency: "INR",
    items: [],
    discountPercent: 0,
    taxPercent: 18,
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
    terms: "",
    notes: "",
    status: "Draft",
    followUpDate: ""
  });

  // Fetch clients and products
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [clientsRes, productsRes] = await Promise.all([
          axiosInstance.post("/populate/read/clients", { limit: 500 }),
          axiosInstance.post("/populate/read/products", { limit: 500 })
        ]);
        setClients(clientsRes.data?.data || []);
        setProducts(productsRes.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch dropdown data:", err);
      }
    };
    fetchDropdownData();
  }, []);

  // Fetch existing quotation for edit
  useEffect(() => {
    if (editId) {
      const fetchQuotation = async () => {
        try {
          const res = await axiosInstance.get(`/populate/read/quotations/${editId}`);
          const data = res.data?.data;
          if (data) {
            setFormData({
              quotationNumber: data.quotationNumber || "",
              clientId: data.clientId?._id || data.clientId || "",
              clientName: data.clientName || "",
              contactPerson: data.contactPerson || "",
              clientAddress: data.clientAddress || "",
              validUntil: data.validUntil ? data.validUntil.split('T')[0] : "",
              issueDate: data.issueDate ? data.issueDate.split('T')[0] : new Date().toISOString().split('T')[0],
              currency: data.currency || "INR",
              items: data.items || [],
              discountPercent: data.discountPercent || 0,
              taxPercent: data.taxPercent || 18,
              subtotal: data.subtotal || 0,
              discountAmount: data.discountAmount || 0,
              taxAmount: data.taxAmount || 0,
              totalAmount: data.totalAmount || 0,
              terms: data.terms || "",
              notes: data.notes || "",
              status: data.status || "Draft",
              followUpDate: data.followUpDate ? data.followUpDate.split('T')[0] : ""
            });
          }
        } catch (err) {
          console.error("Failed to fetch quotation:", err);
          toast.error("Failed to load quotation");
        }
      };
      fetchQuotation();
    } else {
      // Generate quotation number for new
      generateQuotationNumber();
    }
  }, [editId]);

  const generateQuotationNumber = async () => {
    try {
      const res = await axiosInstance.get("/populate/read/quotations");
      const quotations = res.data?.data || [];
      const count = quotations.length + 1;
      const prefix = "QT";
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const number = `${prefix}-${dateStr}-${String(count).padStart(4, '0')}`;
      setFormData(prev => ({ ...prev, quotationNumber: number }));
    } catch (err) {
      const fallback = `QT-${Date.now()}`;
      setFormData(prev => ({ ...prev, quotationNumber: fallback }));
    }
  };

  const handleClientChange = async (clientId) => {
    const client = clients.find(c => c._id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        clientId,
        clientName: client.name || "",
        contactPerson: client.contactInfo?.[0]?.name || "",
        clientAddress: client.address ? `${client.address.street || ""}, ${client.address.city || ""}, ${client.address.state || ""} ${client.address.zip || ""}`.trim() : ""
      }));
    }
  };

  const handleProductChange = (itemIndex, productId) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      const updatedItems = [...formData.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        productId,
        productName: product.name,
        description: product.description || "",
        unitPrice: product.price,
        quantity: updatedItems[itemIndex].quantity || 1
      };
      setFormData(prev => ({ ...prev, items: updatedItems }));
      calculateTotals(updatedItems);
    }
  };

  const handleItemChange = (itemIndex, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], [field]: value };
    setFormData(prev => ({ ...prev, items: updatedItems }));
    calculateTotals(updatedItems);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: "",
        productName: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        total: 0
      }]
    }));
  };

  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: updatedItems }));
    calculateTotals(updatedItems);
  };

  const calculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => {
      return sum + ((item.unitPrice || 0) * (item.quantity || 1));
    }, 0);

    const discountAmount = (subtotal * (formData.discountPercent || 0)) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * (formData.taxPercent || 0)) / 100;
    const totalAmount = afterDiscount + taxAmount;

    // Update item totals
    const itemsWithTotals = items.map(item => ({
      ...item,
      total: (item.unitPrice || 0) * (item.quantity || 1)
    }));

    setFormData(prev => ({
      ...prev,
      items: itemsWithTotals,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientId) {
      toast.error("Please select a client");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        clientId: formData.clientId,
        items: formData.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: 0,
          tax: 0,
          total: item.total
        }))
      };

      if (editId) {
        await axiosInstance.put(`/populate/update/quotations/${editId}`, payload);
        toast.success("Quotation updated successfully");
      } else {
        await axiosInstance.post("/populate/create/quotations", payload);
        toast.success("Quotation created successfully");
      }
      navigate("/CRM/Quotations");
    } catch (err) {
      console.error("Failed to save quotation:", err);
      toast.error("Failed to save quotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f5f6fa] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/CRM/Quotations")}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-[#111111]">
              {editId ? "Edit Quotation" : "New Quotation"}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quotation Number</label>
              <input
                type="text"
                value={formData.quotationNumber}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
              <select
                value={formData.clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Client</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client Address</label>
              <input
                type="text"
                value={formData.clientAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, clientAddress: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
                <option value="Converted to Invoice">Converted to Invoice</option>
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Quotation Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select Product</option>
                        {products.map(product => (
                          <option key={product._id} value={product._id}>{product.name} - ₹{product.price}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        rows="2"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Line Total</label>
                      <input
                        type="number"
                        value={item.total}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-indigo-50 text-indigo-700 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discountPercent}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData(prev => ({ ...prev, discountPercent: val }));
                    calculateTotals(formData.items);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.taxPercent}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData(prev => ({ ...prev, taxPercent: val }));
                    calculateTotals(formData.items);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3 bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">₹{formData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="font-medium">-₹{formData.discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span className="font-medium">₹{formData.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                <span>Total Amount</span>
                <span>₹{formData.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
              <textarea
                rows="3"
                value={formData.terms}
                onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate("/CRM/Quotations")}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : (editId ? "Update Quotation" : "Save Quotation")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuotationFormPage;
