import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import toast from "react-hot-toast";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form fields state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [depreciationRate, setDepreciationRate] = useState(0);
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("/populate/read/assets_categories", { limit: 1000 });
      setCategories(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load asset categories");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setName("");
    setCode("");
    setDescription("");
    setDepreciationRate(0);
    setWarrantyMonths(12);
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name);
    setCode(cat.code);
    setDescription(cat.description || "");
    setDepreciationRate(cat.depreciationRate || 0);
    setWarrantyMonths(cat.warrantyMonths || 12);
    setIsActive(cat.isActive !== false);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !code) {
      toast.error("Name and Code are required");
      return;
    }

    setSubmitting(true);
    const payload = {
      name,
      code: code.toUpperCase().trim(),
      description,
      depreciationRate: Number(depreciationRate),
      warrantyMonths: Number(warrantyMonths),
      isActive
    };

    try {
      if (editingCategory) {
        await axiosInstance.put(`/populate/update/assets_categories/${editingCategory._id}`, payload);
        toast.success("Category updated successfully");
      } else {
        await axiosInstance.post("/populate/create/assets_categories", payload);
        toast.success("Category created successfully");
      }
      fetchCategories();
      setModalOpen(false);
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error(error.response?.data?.message || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await axiosInstance.delete(`/populate/delete/assets_categories/${id}`);
      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error(error.response?.data?.message || "Failed to delete category");
    }
  };

  return (
    <div className="tracker-page" data-module="hr">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">Asset Categories</h1>
          <p className="text-sm text-ink-muted mt-1">Configure asset classifications and procurement policies.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg shadow-md transition-all duration-200"
        >
          Add Category
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-indigo-200 dark:border-indigo-800 border-t-indigo-500 animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface dark:bg-surface border border-dashed border-gray-200 dark:border-white/[0.08] rounded-xl text-center">
          <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">No Categories Configured</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">Define your hardware and software types to get started.</p>
        </div>
      ) : (
        <div className="bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.06] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.01]">
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Depreciation Rate</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Warranty (Months)</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-gray-50/30 dark:hover:bg-white/[0.005] transition-colors">
                    <td className="px-5 py-4 text-xs font-bold text-gray-900 dark:text-white">{cat.name}</td>
                    <td className="px-5 py-4 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{cat.code}</td>
                    <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">{cat.description || "—"}</td>
                    <td className="px-5 py-4 text-xs text-gray-800 dark:text-gray-200 text-right font-medium">{cat.depreciationRate || 0}%</td>
                    <td className="px-5 py-4 text-xs text-gray-800 dark:text-gray-200 text-right font-medium">{cat.warrantyMonths || 12}m</td>
                    <td className="px-5 py-4 text-xs text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cat.isActive !== false
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                        }`}>
                        {cat.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(cat)}
                        className="px-2.5 py-1 bg-gray-50 dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-gray-200 dark:border-white/[0.08] hover:border-indigo-200 dark:hover:border-indigo-800/30 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat._id)}
                        className="px-2.5 py-1 bg-gray-50 dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-white/[0.08] hover:border-red-200 dark:hover:border-red-800/30 rounded-md transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {editingCategory ? "Edit Asset Category" : "Add Asset Category"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Laptop"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Category Code
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. LPT"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Org standard laptops and workstations"
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Depreciation Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={depreciationRate}
                    onChange={(e) => setDepreciationRate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Warranty (Months)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheckbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isActiveCheckbox" className="text-xs text-gray-700 dark:text-gray-300 font-semibold cursor-pointer">
                  Category is Active & available for new assets
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 border border-gray-200 dark:border-white/[0.08] text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-xs font-bold text-white rounded-lg shadow-md transition-colors"
                >
                  {submitting ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
