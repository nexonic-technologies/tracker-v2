import React, { useState, useEffect } from 'react';
import { Package, Plus, RefreshCw, CheckCircle, Lock } from 'lucide-react';
import axiosInstance from '@api/axiosInstance';
import toast from 'react-hot-toast';

export default function ModuleManagementPage() {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);

  const [formData, setFormData] = useState({
    moduleId: '',
    name: '',
    description: '',
    category: 'Core',
    status: 'Active',
  });

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/modules');
      setModules(res.data.modules || []);
    } catch (err) {
      console.error('Failed to fetch platform modules:', err);
      toast.error('Failed to load modules from Global Control Plane');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleOpenModal = (mod = null) => {
    if (mod) {
      setEditingModule(mod);
      setFormData({
        moduleId: mod.moduleId || mod.id,
        name: mod.name,
        description: mod.description || '',
        category: mod.category || 'Core',
        status: mod.status || 'Active',
      });
    } else {
      setEditingModule(null);
      setFormData({
        moduleId: '',
        name: '',
        description: '',
        category: 'Core',
        status: 'Active',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingModule) {
        await axiosInstance.put(`/admin/modules/${editingModule._id}`, formData);
        toast.success(`Module ${formData.name} updated successfully`);
      } else {
        await axiosInstance.post('/admin/modules', formData);
        toast.success(`Module ${formData.name} registered successfully`);
      }
      setIsModalOpen(false);
      fetchModules();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save module');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-5 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Platform Module Catalog & Licensing Governance
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Define system-wide feature modules, entitlement capabilities, and licensing definitions available for tenant subscription packages.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Register New Module
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-neutral-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          Loading Module Catalog...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => (
            <div key={mod._id || mod.moduleId} className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                    {mod.moduleId}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                    mod.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}>
                    {mod.status === 'Active' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Lock className="w-3 h-3 text-neutral-400" />}
                    {mod.status || 'Active'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-2">{mod.name}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{mod.description || 'No description provided.'}</p>
              </div>

              <div className="pt-3 border-t dark:border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-400">Category: <strong className="text-neutral-700 dark:text-neutral-300">{mod.category || 'Core'}</strong></span>
                <button
                  onClick={() => handleOpenModal(mod)}
                  className="px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition"
                >
                  Edit Module
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {editingModule ? 'Edit Platform Module' : 'Register New Module'}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Module ID Key *</label>
              <input
                type="text"
                required
                disabled={!!editingModule}
                value={formData.moduleId}
                onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
                placeholder="e.g. hrms, payroll, crm"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Module Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. HRMS & Core Personnel"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Summary of capabilities unlocked by this module..."
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm h-20 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-neutral-800">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Save Module</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
