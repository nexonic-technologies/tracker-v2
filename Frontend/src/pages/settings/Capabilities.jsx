import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axiosInstance from '@api/axiosInstance';
import toast from 'react-hot-toast';
import {
  Shield,
  Plus,
  Search,
  Layers,
  Sparkles,
  Edit3,
  Trash2,
  X,
  Check,
  Copy,
  CheckCheck,
  RefreshCw,
  Compass,
  AlertCircle,
  Eye,
  KeyRound,
  LayoutGrid,
  List,
  Zap,
  CheckCircle2
} from 'lucide-react';

const MODULE_COLORS = {
  payroll: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  attendance: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  hrms: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  tasks: { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  crm: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  assets: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  accounts: { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  settings: { bg: 'bg-slate-50 dark:bg-slate-800/60', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
  masters: { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
  reports: { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  default: { bg: 'bg-surface-1', text: 'text-ink-muted', border: 'border-hairline' }
};

const ACTION_COLORS = {
  view: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  read: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  create: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  update: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  delete: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  approve: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  manage: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  menu: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
};

const STANDARD_MODULES = [
  'attendance',
  'payroll',
  'hrms',
  'tasks',
  'crm',
  'assets',
  'accounts',
  'tickets',
  'settings',
  'masters',
  'reports',
  'feed',
  'messages',
  'teams'
];

export default function Capabilities() {
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCap, setEditingCap] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Filters & View State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grouped'

  // Form Data
  const [formData, setFormData] = useState({
    key: '',
    module: '',
    label: '',
    description: '',
    type: 'business',
    action: 'view',
    resourceKey: '',
    status: 'active'
  });

  const fetchCapabilities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.post('/populate/read/capabilities', {
        limit: 2000,
        sort: { module: 1, key: 1 }
      });
      setCapabilities(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch capabilities', err);
      toast.error('Failed to load capabilities registry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = capabilities.length;
    const active = capabilities.filter(c => c.status === 'active').length;
    const uiCount = capabilities.filter(c => c.type === 'ui').length;
    const businessCount = capabilities.filter(c => c.type === 'business').length;
    const uniqueModules = new Set(capabilities.map(c => c.module?.toLowerCase()).filter(Boolean)).size;
    return { total, active, uiCount, businessCount, uniqueModules };
  }, [capabilities]);

  // Unique Modules for Filter
  const availableModules = useMemo(() => {
    const mods = new Set(capabilities.map(c => c.module?.toLowerCase()).filter(Boolean));
    return Array.from(mods).sort();
  }, [capabilities]);

  // Filtered Capabilities
  const filteredCapabilities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return capabilities.filter(cap => {
      const matchesSearch = !q || (
        cap.key?.toLowerCase().includes(q) ||
        cap.label?.toLowerCase().includes(q) ||
        cap.module?.toLowerCase().includes(q) ||
        cap.description?.toLowerCase().includes(q) ||
        cap.action?.toLowerCase().includes(q) ||
        cap.resourceKey?.toLowerCase().includes(q)
      );

      const matchesModule = selectedModule === 'ALL' || cap.module?.toLowerCase() === selectedModule.toLowerCase();
      const matchesType = selectedType === 'ALL' || cap.type === selectedType;
      const matchesAction = selectedAction === 'ALL' || cap.action === selectedAction;

      return matchesSearch && matchesModule && matchesType && matchesAction;
    });
  }, [capabilities, searchQuery, selectedModule, selectedType, selectedAction]);

  // Grouped by Module
  const groupedCapabilities = useMemo(() => {
    const groups = {};
    filteredCapabilities.forEach(cap => {
      const mod = cap.module?.toLowerCase() || 'other';
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(cap);
    });
    return groups;
  }, [filteredCapabilities]);

  // Open Modal
  const handleOpenModal = (cap = null) => {
    if (cap) {
      setEditingCap(cap);
      setFormData({
        key: cap.key || '',
        module: cap.module || '',
        label: cap.label || '',
        description: cap.description || '',
        type: cap.type || 'business',
        action: cap.action || 'view',
        resourceKey: cap.resourceKey || '',
        status: cap.status || 'active'
      });
    } else {
      setEditingCap(null);
      setFormData({
        key: '',
        module: selectedModule !== 'ALL' ? selectedModule : '',
        label: '',
        description: '',
        type: 'business',
        action: 'view',
        resourceKey: '',
        status: 'active'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCap(null);
  };

  // Auto-generate key helper
  const handleAutoGenerateKey = () => {
    if (!formData.module || !formData.action) {
      toast.error('Please specify Module and Action first');
      return;
    }
    const cleanMod = formData.module.toLowerCase().replace(/\s+/g, '_');
    const cleanAct = formData.action.toLowerCase().replace(/\s+/g, '_');
    const cleanRes = formData.resourceKey ? `_${formData.resourceKey.toLowerCase().replace(/\s+/g, '_')}` : '';
    setFormData(prev => ({
      ...prev,
      key: `${cleanMod}${cleanRes}:${cleanAct}`
    }));
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.key?.trim() || !formData.module?.trim() || !formData.label?.trim()) {
      toast.error('Please fill in all required fields (Key, Module, Label)');
      return;
    }

    setSaving(true);
    const submitData = {
      ...formData,
      key: formData.key.trim(),
      module: formData.module.trim().toLowerCase(),
      label: formData.label.trim(),
      action: formData.action.trim().toLowerCase(),
      resourceKey: formData.resourceKey?.trim() || undefined
    };

    try {
      if (editingCap) {
        await axiosInstance.put(`/populate/update/capabilities/${editingCap._id}`, submitData);
        toast.success(`Capability "${submitData.key}" updated successfully!`);
      } else {
        await axiosInstance.post('/populate/create/capabilities', submitData);
        toast.success(`Capability "${submitData.key}" created successfully!`);
      }
      await fetchCapabilities();
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save capability', err);
      toast.error(err.response?.data?.message || 'Error saving capability');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (capId, capKey) => {
    try {
      await axiosInstance.delete(`/populate/delete/capabilities/${capId}`);
      toast.success(`Capability "${capKey}" deleted`);
      setDeleteConfirmId(null);
      await fetchCapabilities();
    } catch (err) {
      console.error('Failed to delete capability', err);
      toast.error(err.response?.data?.message || 'Error deleting capability');
    }
  };

  // Copy Key to Clipboard
  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success(`Copied "${key}" to clipboard!`, { duration: 1500 });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-4 pb-12" data-module="settings">
      {/* ─── PAGE HEADER ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="lmx-page-eyebrow">SETTINGS & ACCESS CONTROL</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-solid/10 text-brand-solid border border-brand-solid/20">
              <Sparkles size={10} /> CBAC v2.4
            </span>
          </div>
          <h1 className="text-[24px] font-bold text-ink flex items-center gap-2 tracking-tight">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-brand-solid to-brand-to text-white shadow-sm shadow-brand-solid/25">
              <Shield size={20} />
            </div>
            Capabilities Registry
          </h1>
          <p className="text-[13px] text-ink-muted mt-1">
            Centrally manage granular route visibility and functional tab/action permission keys across all applications.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCapabilities}
            disabled={loading}
            className="tracker-btn-ghost flex items-center gap-1.5 text-[13px] py-2 px-3 border border-hairline"
            title="Refresh registry"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="tracker-btn-brand flex items-center gap-2 text-[13px] py-2 px-4 shadow-sm"
          >
            <Plus size={16} />
            <span>Add Capability</span>
          </button>
        </div>
      </div>

      {/* ─── STATS CARDS ROW ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="pay-card p-3 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-solid/10 text-brand-solid">
            <KeyRound size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">Total Keys</p>
            <p className="text-[20px] font-bold text-ink leading-tight">{stats.total}</p>
          </div>
        </div>

        <div className="pay-card p-3 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">Active</p>
            <p className="text-[20px] font-bold text-ink leading-tight">{stats.active}</p>
          </div>
        </div>

        <div className="pay-card p-3 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Compass size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">UI Routes</p>
            <p className="text-[20px] font-bold text-ink leading-tight">{stats.uiCount}</p>
          </div>
        </div>

        <div className="pay-card p-3 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Zap size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">Tab Actions</p>
            <p className="text-[20px] font-bold text-ink leading-tight">{stats.businessCount}</p>
          </div>
        </div>

        <div className="pay-card p-3 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Layers size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">Modules</p>
            <p className="text-[20px] font-bold text-ink leading-tight">{stats.uniqueModules}</p>
          </div>
        </div>
      </div>

      {/* ─── COMMAND-GRADE FILTER & CONTROLS BAR ─── */}
      <div className="pay-card p-3 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by key, label, module, action, or description..."
              className="lmx-input pl-9 pr-8 text-[13px] w-full bg-surface-1/60 focus:bg-surface"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink p-0.5 rounded"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Module Select */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-surface-1/70 p-1 rounded-lg border border-hairline">
              <span className="text-[11px] font-semibold text-ink-subtle px-1.5 uppercase tracking-wider">Module:</span>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="bg-transparent text-[12px] font-medium text-ink outline-none cursor-pointer pr-1"
              >
                <option value="ALL">All Modules ({capabilities.length})</option>
                {availableModules.map(mod => {
                  const count = capabilities.filter(c => c.module?.toLowerCase() === mod).length;
                  return (
                    <option key={mod} value={mod}>
                      {mod.toUpperCase()} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center bg-surface-1/70 p-0.5 rounded-lg border border-hairline text-[12px]">
              <button
                onClick={() => setSelectedType('ALL')}
                className={`px-2.5 py-1 rounded-md transition font-medium ${selectedType === 'ALL' ? 'bg-surface text-ink shadow-xs' : 'text-ink-subtle hover:text-ink'}`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedType('business')}
                className={`px-2.5 py-1 rounded-md transition font-medium ${selectedType === 'business' ? 'bg-surface text-ink shadow-xs' : 'text-ink-subtle hover:text-ink'}`}
              >
                Business Tab
              </button>
              <button
                onClick={() => setSelectedType('ui')}
                className={`px-2.5 py-1 rounded-md transition font-medium ${selectedType === 'ui' ? 'bg-surface text-ink shadow-xs' : 'text-ink-subtle hover:text-ink'}`}
              >
                UI Nav
              </button>
            </div>

            {/* View Switcher */}
            <div className="hidden sm:flex items-center bg-surface-1/70 p-0.5 rounded-lg border border-hairline text-[12px]">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-surface text-brand-solid shadow-xs' : 'text-ink-subtle hover:text-ink'}`}
                title="Table View"
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`p-1.5 rounded-md transition ${viewMode === 'grouped' ? 'bg-surface text-brand-solid shadow-xs' : 'text-ink-subtle hover:text-ink'}`}
                title="Grouped by Module"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-hairline-soft">
          <span className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider mr-1">Action:</span>
          {['ALL', 'view', 'read', 'create', 'update', 'delete', 'approve', 'manage'].map(act => (
            <button
              key={act}
              onClick={() => setSelectedAction(act)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition border ${
                selectedAction === act
                  ? 'bg-brand-solid text-white border-brand-solid shadow-xs'
                  : 'bg-surface text-ink-subtle border-hairline hover:text-ink hover:bg-surface-1'
              }`}
            >
              {act === 'ALL' ? 'All Actions' : act}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-ink-subtle">
            Showing <strong className="text-ink">{filteredCapabilities.length}</strong> of {capabilities.length}
          </span>
        </div>
      </div>

      {/* ─── MAIN CONTENT LISTING ─── */}
      {loading ? (
        <div className="pay-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw size={28} className="animate-spin text-brand-solid" />
          <p className="text-[14px] font-medium text-ink">Loading capabilities registry...</p>
          <p className="text-[12px] text-ink-subtle">Resolving CBAC policies and action mappings</p>
        </div>
      ) : filteredCapabilities.length === 0 ? (
        <div className="pay-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="p-3 rounded-2xl bg-surface-1 text-ink-subtle">
            <AlertCircle size={32} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">No Capabilities Found</h3>
            <p className="text-[13px] text-ink-muted mt-1 max-w-md mx-auto">
              {searchQuery || selectedModule !== 'ALL' || selectedType !== 'ALL' || selectedAction !== 'ALL'
                ? 'No capabilities match your current search and filter criteria. Try resetting filters.'
                : 'No capabilities have been registered in the database yet.'}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {(searchQuery || selectedModule !== 'ALL' || selectedType !== 'ALL' || selectedAction !== 'ALL') && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedModule('ALL'); setSelectedType('ALL'); setSelectedAction('ALL'); }}
                className="tracker-btn-ghost text-[12px] py-1.5 px-3 border border-hairline"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={() => handleOpenModal()}
              className="tracker-btn-brand text-[12px] py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus size={14} /> Add First Capability
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* ─── TABULAR VIEW (INFORMATION-DENSE 2026-GRADE) ─── */
        <div className="pay-card overflow-hidden border border-hairline shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-1/80 border-b border-hairline text-[11px] font-bold text-ink-subtle uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Capability Key</th>
                  <th className="py-2.5 px-3.5">Label & Context</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft text-[13px]">
                {filteredCapabilities.map(cap => {
                  const modColor = MODULE_COLORS[cap.module?.toLowerCase()] || MODULE_COLORS.default;
                  const actColor = ACTION_COLORS[cap.action?.toLowerCase()] || 'bg-surface-1 text-ink-muted border-hairline';
                  const isCopied = copiedKey === cap.key;

                  return (
                    <tr
                      key={cap._id}
                      className="group hover:bg-surface-1/40 transition-colors"
                    >
                      {/* Key */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <code className="px-2 py-0.5 rounded-md font-mono text-[12px] font-semibold bg-surface-1 text-brand-solid border border-hairline group-hover:border-brand-solid/30 transition">
                            {cap.key}
                          </code>
                          <button
                            onClick={() => handleCopyKey(cap.key)}
                            className="p-1 rounded text-ink-subtle hover:text-brand-solid hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy key"
                          >
                            {isCopied ? <CheckCheck size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      {/* Label & Description */}
                      <td className="py-2.5 px-3.5 min-w-[220px]">
                        <p className="font-semibold text-ink leading-snug">{cap.label}</p>
                        {cap.description ? (
                          <p className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">{cap.description}</p>
                        ) : (
                          <p className="text-[11px] text-ink-tertiary italic mt-0.5">No description</p>
                        )}
                      </td>

                      {/* Module */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${modColor.bg} ${modColor.text} ${modColor.border}`}>
                          {cap.module}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          cap.type === 'ui'
                            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                            : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                        }`}>
                          {cap.type === 'ui' ? <Compass size={11} /> : <Zap size={11} />}
                          {cap.type === 'ui' ? 'UI Nav' : 'Business'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${actColor}`}>
                          {cap.action || 'view'}
                        </span>
                      </td>

                      {/* Resource Key */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {cap.resourceKey ? (
                          <code className="text-[11px] text-ink-muted font-mono bg-surface-1 px-1.5 py-0.5 rounded border border-hairline">
                            {cap.resourceKey}
                          </code>
                        ) : (
                          <span className="text-[12px] text-ink-tertiary">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          cap.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cap.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {cap.status === 'active' ? 'Active' : 'Deprecated'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenModal(cap)}
                            className="p-1.5 rounded-lg text-ink-subtle hover:text-brand-solid hover:bg-brand-solid/10 transition"
                            title="Edit capability"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(cap._id)}
                            className="p-1.5 rounded-lg text-ink-subtle hover:text-rose-600 hover:bg-rose-500/10 transition"
                            title="Delete capability"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── GROUPED BY MODULE VIEW ─── */
        <div className="space-y-4">
          {Object.entries(groupedCapabilities).map(([modName, modCaps]) => {
            const modColor = MODULE_COLORS[modName] || MODULE_COLORS.default;
            return (
              <div key={modName} className="pay-card overflow-hidden border border-hairline">
                <div className={`px-4 py-3 border-b border-hairline flex items-center justify-between flex-wrap gap-2 ${modColor.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[12px] font-bold uppercase tracking-wider border ${modColor.text} ${modColor.border} bg-surface`}>
                      {modName}
                    </span>
                    <span className="text-[12px] text-ink-muted">
                      {modCaps.length} capabilit{modCaps.length !== 1 ? 'ies' : 'y'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setFormData(prev => ({ ...prev, module: modName }));
                      handleOpenModal();
                    }}
                    className="text-[11px] font-semibold text-brand-solid hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Add to {modName}
                  </button>
                </div>

                <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {modCaps.map(cap => {
                    const actColor = ACTION_COLORS[cap.action?.toLowerCase()] || 'bg-surface-1 text-ink-muted border-hairline';
                    const isCopied = copiedKey === cap.key;

                    return (
                      <div
                        key={cap._id}
                        className="p-3 rounded-xl border border-hairline bg-surface hover:border-brand-solid/30 hover:shadow-xs transition group relative flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <code className="text-[11px] font-mono font-bold text-brand-solid bg-surface-1 px-1.5 py-0.5 rounded border border-hairline">
                              {cap.key}
                            </code>
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${actColor}`}>
                                {cap.action}
                              </span>
                              <button
                                onClick={() => handleCopyKey(cap.key)}
                                className="p-1 text-ink-subtle hover:text-brand-solid"
                                title="Copy key"
                              >
                                {isCopied ? <CheckCheck size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                          <p className="text-[13px] font-semibold text-ink leading-tight">{cap.label}</p>
                          {cap.description && (
                            <p className="text-[11px] text-ink-muted line-clamp-2 mt-1">{cap.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-hairline-soft">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            cap.type === 'ui' ? 'bg-sky-500/10 text-sky-700' : 'bg-purple-500/10 text-purple-700'
                          }`}>
                            {cap.type === 'ui' ? 'UI Route' : 'Tab Action'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenModal(cap)}
                              className="p-1 text-ink-subtle hover:text-brand-solid rounded"
                              title="Edit"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(cap._id)}
                              className="p-1 text-ink-subtle hover:text-rose-600 rounded"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 2026-GRADE MODAL (ADD / EDIT CAPABILITY) ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div
            className="w-full max-w-xl bg-surface border border-hairline rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-hairline bg-surface-1/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-solid/10 text-brand-solid border border-brand-solid/20">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-ink leading-tight">
                    {editingCap ? 'Edit Capability' : 'Register New Capability'}
                  </h3>
                  <p className="text-[12px] text-ink-muted mt-0.5">
                    {editingCap ? `Modifying capability key ${editingCap.key}` : 'Create a fine-grained access key for CBAC evaluation'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-2 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-[13px]">
              {/* Module & Action Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                    Module <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="module-datalist"
                      required
                      value={formData.module}
                      onChange={(e) => setFormData({ ...formData, module: e.target.value.toLowerCase() })}
                      placeholder="e.g., payroll, attendance, hrms"
                      className="lmx-input w-full text-[13px]"
                    />
                    <datalist id="module-datalist">
                      {STANDARD_MODULES.map(m => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                  <span className="text-[10px] text-ink-subtle mt-0.5 block">Target system module name</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                    Action Verb <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="action-datalist"
                      required
                      value={formData.action}
                      onChange={(e) => setFormData({ ...formData, action: e.target.value.toLowerCase() })}
                      placeholder="e.g., view, create, update, approve"
                      className="lmx-input w-full text-[13px]"
                    />
                    <datalist id="action-datalist">
                      <option value="view" />
                      <option value="create" />
                      <option value="update" />
                      <option value="delete" />
                      <option value="approve" />
                      <option value="manage" />
                      <option value="menu" />
                    </datalist>
                  </div>
                  <span className="text-[10px] text-ink-subtle mt-0.5 block">Operation or route action</span>
                </div>
              </div>

              {/* Capability Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    Capability Key <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateKey}
                    className="text-[11px] font-semibold text-brand-solid hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={11} /> Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g., payroll_runs:view or attendance:team:view"
                  className="lmx-input w-full font-mono text-[13px] text-brand-solid font-semibold"
                />
                <span className="text-[10px] text-ink-subtle mt-0.5 block">
                  Unique string identifier evaluated in <code className="font-mono text-ink">useCapability()</code> and policy engines.
                </span>
              </div>

              {/* Label */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Display Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., View Payroll Runs Tab, Create Job Openings"
                  className="lmx-input w-full text-[13px]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Explain what capabilities or UI elements this permission unlocks for the user..."
                  className="lmx-input w-full text-[13px] py-2"
                />
              </div>

              {/* Type, Resource Key & Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                    Capability Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="lmx-input w-full text-[12px] font-medium"
                  >
                    <option value="business">Business (Tab / Action)</option>
                    <option value="ui">UI (Sidebar Navigation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                    Resource Key (Opt)
                  </label>
                  <input
                    type="text"
                    value={formData.resourceKey}
                    onChange={(e) => setFormData({ ...formData, resourceKey: e.target.value })}
                    placeholder="e.g., payroll_runs, attendances"
                    className="lmx-input w-full text-[12px] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="lmx-input w-full text-[12px] font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3 rounded-xl bg-surface-1/60 border border-hairline space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle flex items-center gap-1">
                    <Eye size={11} /> Live Preview in Role Permissions Matrix
                  </span>
                  <span className="text-[10px] text-ink-subtle font-mono">
                    {formData.type === 'ui' ? 'Sidebar Link Gate' : 'Granular Tab / Action Gate'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-[12px] font-mono font-bold text-brand-solid bg-surface px-2 py-0.5 rounded border border-hairline">
                    {formData.key || 'module:action'}
                  </code>
                  <span className="text-[12px] font-semibold text-ink">
                    {formData.label || 'Capability Display Title'}
                  </span>
                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    ACTION_COLORS[formData.action] || 'bg-surface text-ink-muted border-hairline'
                  }`}>
                    {formData.action || 'view'}
                  </span>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="tracker-btn-ghost text-[13px] py-2 px-4 border border-hairline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="tracker-btn-brand flex items-center gap-2 text-[13px] py-2 px-5 shadow-sm"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{editingCap ? 'Save Changes' : 'Create Capability'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION DIALOG ─── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface border border-hairline rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-500/10">
                <AlertCircle size={22} />
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-ink">Delete Capability?</h4>
                <p className="text-[12px] text-ink-muted">This action permanently removes this capability key from the registry.</p>
              </div>
            </div>
            <p className="text-[13px] text-ink-muted bg-surface-1 p-3 rounded-xl border border-hairline">
              Any roles or policy gates referencing this key will no longer match. Ensure no active UI tabs or API routes rely on this key.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="tracker-btn-ghost text-[13px] py-2 px-4 border border-hairline"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const cap = capabilities.find(c => c._id === deleteConfirmId);
                  handleDelete(deleteConfirmId, cap?.key);
                }}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
