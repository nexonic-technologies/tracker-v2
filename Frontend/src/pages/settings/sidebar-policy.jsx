import React, { useState, useEffect, useMemo } from 'react';
import axiosInstance from '@api/axiosInstance';
import {
  ShieldCheck, LayoutList, RefreshCw, Save, Search, Check,
  SlidersHorizontal, CheckSquare, Square, FileCode, Layers, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const SidebarPolicy = () => {
  const [sidebars, setSidebars] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* Search States */
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [capSearch, setCapSearch] = useState('');

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [sidRes, capRes] = await Promise.all([
        axiosInstance.get('/populate/list/sidebars?limit=100&sort={"order":1}'),
        axiosInstance.post('/populate/read/capabilities', { filter: { status: 'active' }, limit: 1000 })
      ]);
      const items = (sidRes.data.data || []).map(item => ({ ...item, _id: item._id?.$oid || item._id }));
      setSidebars(items);
      setCapabilities(capRes.data.data || []);
      if (items.length > 0 && !selectedItem) {
        setSelectedItem({ ...items[0] });
      }
    } catch (err) {
      console.error("Failed to load sidebar policy data", err);
      toast.error("Failed to load sidebar menu items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelect = (item) => {
    setSelectedItem({ ...item });
  };

  const toggleCapability = (capId) => {
    setSelectedItem(prev => {
      if (!prev) return prev;
      const list = prev.capabilities || [];
      const exists = list.includes(capId);
      const newList = exists ? list.filter(x => x !== capId) : [...list, capId];
      return { ...prev, capabilities: newList };
    });
  };

  const handleSelectAllCaps = () => {
    if (!selectedItem) return;
    const allCapIds = capabilities.map(c => c._id?.$oid || c._id);
    setSelectedItem(prev => ({ ...prev, capabilities: allCapIds }));
  };

  const handleClearAllCaps = () => {
    if (!selectedItem) return;
    setSelectedItem(prev => ({ ...prev, capabilities: [] }));
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await axiosInstance.put(`/populate/update/sidebars/${selectedItem._id}`, {
        allowedDepartments: [],
        allowedDesignations: [],
        capabilities: selectedItem.capabilities
      });

      setSidebars(prev => prev.map(x => x._id === selectedItem._id ? selectedItem : x));
      toast.success(`Saved permissions for "${selectedItem.title}"`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save sidebar permissions");
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshCache = async () => {
    setRefreshing(true);
    try {
      await axiosInstance.post('/config/refresh-policy');
      toast.success("Policy cache refreshed successfully!");
    } catch (e) {
      toast.error("Failed to refresh policy cache");
    } finally {
      setRefreshing(false);
    }
  };

  /* Filtered Sidebars & Capabilities */
  const filteredSidebars = useMemo(() => {
    if (!sidebarSearch) return sidebars;
    const q = sidebarSearch.toLowerCase();
    return sidebars.filter(s =>
      (s.title || '').toLowerCase().includes(q) ||
      (s.mainRoute || '').toLowerCase().includes(q)
    );
  }, [sidebars, sidebarSearch]);

  const filteredCapabilities = useMemo(() => {
    if (!capSearch) return capabilities;
    const q = capSearch.toLowerCase();
    return capabilities.filter(c =>
      (c.label || c.name || c.key || '').toLowerCase().includes(q) ||
      (c.moduleName || '').toLowerCase().includes(q)
    );
  }, [capabilities, capSearch]);

  return (
    <div className="flex flex-col h-full bg-canvas p-4 sm:p-6 space-y-5 overflow-y-auto" data-module="hr">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tracker-lg bg-[var(--module-accent-light, #eff6ff)] border border-[var(--module-accent-light, #eff6ff)] flex items-center justify-center text-[var(--module-accent, #3b82f6)] shadow-xs">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="lmx-page-eyebrow mb-0.5">SETTINGS & SECURITY</p>
            <h1 className="text-[20px] font-bold text-ink tracking-tight flex items-center gap-2">
              Sidebar Access Policy
            </h1>
          </div>
        </div>

        <button
          onClick={handleRefreshCache}
          disabled={refreshing}
          className="tracker-btn-accent inline-flex items-center gap-1.5 text-[12px] px-3.5 py-1.5 cursor-pointer"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh Policy Cache
        </button>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">

        {/* ── Left Column: Sidebar Items List ── */}
        <div className="lg:col-span-4 tracker-card-plain p-4 flex flex-col space-y-3 h-full max-h-[750px]">
          <div className="flex items-center justify-between pb-2 border-b border-hairline-soft">
            <div className="flex items-center gap-2">
              <LayoutList size={15} className="text-[var(--module-accent)]" />
              <h2 className="text-[13px] font-bold text-ink">Sidebar Menu Items</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-1 text-ink-subtle">
              {sidebars.length} items
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
            <input
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
              placeholder="Search menu items..."
              className="lmx-input pl-8 py-1.5 text-[12px] w-full"
            />
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredSidebars.map(item => {
              const isSelected = selectedItem?._id === item._id;
              const capCount = item.capabilities?.length || 0;
              return (
                <div
                  key={item._id}
                  onClick={() => handleSelect(item)}
                  className={`p-2.5 rounded-tracker-md border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[var(--module-accent-light, #eff6ff)] border-[var(--module-accent)] text-[var(--module-accent)] shadow-xs'
                      : 'bg-surface hover:bg-surface-1 border-hairline-soft text-ink hover:border-hairline'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-[12px] font-bold truncate ${isSelected ? 'text-[var(--module-accent)]' : 'text-ink'}`}>
                      {item.title}
                    </p>
                    <p className="text-[10px] text-ink-subtle truncate mt-0.5 font-mono">
                      {item.mainRoute || '/'}
                    </p>
                  </div>
                  {capCount > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      isSelected
                        ? 'bg-[var(--module-accent)] text-white'
                        : 'bg-surface-2 text-ink-muted'
                    }`}>
                      {capCount} caps
                    </span>
                  )}
                </div>
              );
            })}

            {filteredSidebars.length === 0 && (
              <p className="text-center py-12 text-[12px] text-ink-subtle">No matching menu items found</p>
            )}
          </div>
        </div>

        {/* ── Right Column: Permission Config Panel ── */}
        <div className="lg:col-span-8 tracker-card-plain p-4 flex flex-col space-y-4 h-full">
          {selectedItem ? (
            <>
              {/* Selected Item Banner */}
              <div className="p-3.5 rounded-tracker-lg bg-surface-1 border border-hairline-soft flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-bold text-ink">
                      Configuring Access: <span className="text-[var(--module-accent)]">{selectedItem.title}</span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-ink-subtle mt-0.5 flex items-center gap-1.5">
                    <FileCode size={12} /> Route: <span className="font-mono">{selectedItem.mainRoute}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--module-accent-light,#eff6ff)] text-[var(--module-accent,#3b82f6)] border border-[var(--module-accent-light,#eff6ff)]">
                    {selectedItem.capabilities?.length || 0} Capabilities Required
                  </span>
                </div>
              </div>

              {/* Capability Filter & Actions Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="relative flex-1 max-w-xs">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
                  <input
                    value={capSearch}
                    onChange={e => setCapSearch(e.target.value)}
                    placeholder="Search capabilities..."
                    className="lmx-input pl-8 py-1 text-[12px] w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllCaps}
                    className="px-2.5 py-1 rounded text-[11px] font-bold bg-surface-1 border border-hairline hover:bg-surface-2 text-ink-muted transition cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAllCaps}
                    className="px-2.5 py-1 rounded text-[11px] font-bold bg-surface-1 border border-hairline hover:bg-surface-2 text-ink-muted transition cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Capabilities Grid */}
              <div className="flex-1 border border-hairline-soft rounded-tracker-md bg-canvas p-3 max-h-[480px] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredCapabilities.map(cap => {
                    const capId = cap._id?.$oid || cap._id;
                    const isChecked = selectedItem.capabilities?.includes(capId);
                    const label = cap.label || cap.name || cap.key;

                    return (
                      <div
                        key={capId}
                        onClick={() => toggleCapability(capId)}
                        className={`p-2 rounded-tracker-md border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-[var(--module-accent-light,#eff6ff)] border-[var(--module-accent)] text-[var(--module-accent)]'
                            : 'bg-surface hover:bg-surface-1 border-hairline-soft text-ink-muted hover:text-ink'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                            isChecked ? 'bg-[var(--module-accent)] border-transparent text-white' : 'border-hairline bg-surface'
                          }`}>
                            {isChecked && <Check size={10} />}
                          </div>
                          <span className="text-[12px] font-semibold truncate">{label}</span>
                        </div>

                        {cap.moduleName && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-surface-2 text-ink-subtle shrink-0">
                            {cap.moduleName}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {filteredCapabilities.length === 0 && (
                    <div className="col-span-2 py-12 text-center text-[12px] text-ink-subtle">
                      No matching capabilities found
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-hairline-soft">
                <div className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
                  <Info size={12} />
                  <span>Select capabilities required for users to access this menu item.</span>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="tracker-btn-accent inline-flex items-center gap-1.5 text-[12px] px-5 py-2 cursor-pointer"
                >
                  <Save size={13} className={saving ? 'animate-spin' : ''} />
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-ink-subtle">
              <LayoutList size={36} className="text-ink-subtle/30 mb-2" />
              <p className="text-[13px] font-bold text-ink">No Menu Item Selected</p>
              <p className="text-[11px] mt-0.5">Select a sidebar item on the left to configure access control rules.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SidebarPolicy;
