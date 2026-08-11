/**
 * Settings Page — Dashboard Builder
 *
 * Visual drag-and-drop dashboard builder for admins.
 * Configures role dashboards purely via JSON metadata (§2.11, §2.13).
 */
import React, { useState } from 'react';
import WidgetLibrary from '../../engine/dashboard/builder/WidgetLibrary';
import CanvasRenderer from '../../engine/dashboard/builder/CanvasRenderer';
import ConfigPanel from '../../engine/dashboard/config/ConfigPanel';
import { useBuilderState } from '../../engine/dashboard/builder/hooks/useBuilderState';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { Save, RefreshCw, Eye, Layout, Shield, RotateCcw } from 'lucide-react';
import DashboardRenderer from '../../engine/dashboard/DashboardRenderer';

export default function DashboardBuilder() {
  const {
    role,
    schema,
    selectedWidgetId,
    selectedWidget,
    setRole,
    setSelectedWidgetId,
    addWidget,
    updateWidget,
    deleteWidget,
  } = useBuilderState('admin');

  const [isPreview, setIsPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Fetch active system roles from backend database
  React.useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await axiosInstance.post('/populate/read/roles', {
          filter: { isActive: true },
          select: 'name level _id',
        });
        const fetched = res.data?.data || [];
        if (fetched.length > 0) {
          const mapped = fetched.map((r) => ({
            id: (r.name || '').toLowerCase().replace(/\s+/g, ''),
            label: r.name,
          }));
          setAvailableRoles(mapped);
        }
      } catch (err) {
        console.warn('[DashboardBuilder] Role fetch error, using default roles:', err.message);
      } finally {
        setRolesLoading(false);
      }
    }
    fetchRoles();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Phase 5: POST schema JSON to backend API
      const res = await axiosInstance.post('/dashboard/schema', {
        role,
        schema,
      });

      if (res.data?.success) {
        toast.success(`Dashboard schema saved to backend for role: ${role.toUpperCase()}`);
      } else {
        toast.error(res.data?.message || 'Failed to save layout');
      }
    } catch (err) {
      console.error('[DashboardBuilder] Save error:', err);
      toast.error(err.response?.data?.message || 'Failed to save dashboard layout');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset ${role.toUpperCase()} dashboard schema to system defaults?`)) {
      return;
    }
    setResetting(true);
    try {
      await axiosInstance.delete(`/dashboard/schema/${encodeURIComponent(role)}`);
      toast.success(`Dashboard schema reset to defaults for role: ${role.toUpperCase()}`);
      // Re-trigger role state to load default fixture
      setRole(role);
    } catch (err) {
      toast.error('Failed to reset dashboard layout');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height)-2rem)] bg-[var(--tracker-canvas)] rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] overflow-hidden">
      {/* Top Command Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--tracker-surface)] border-b border-[var(--tracker-border)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--tracker-radius-sm)] bg-[var(--module-hr-light)] text-[var(--module-hr)]">
            <Layout size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--tracker-ink)]">Dashboard Builder</h2>
            <p className="text-[11px] text-[var(--tracker-ink-subtle)]">
              Configure dashboard widgets & layout for role: <span className="font-semibold text-[var(--brand-solid)]">{role.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Role Selector & Actions */}
        <div className="flex items-center gap-3">
          {/* Target Role Selector */}
          <div className="flex items-center gap-1.5 bg-[var(--tracker-surface-1)] px-2.5 py-1 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)]">
            <Shield size={14} className="text-[var(--tracker-ink-subtle)]" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="text-xs font-semibold bg-transparent text-[var(--tracker-ink)] outline-none cursor-pointer"
            >
              {availableRoles.length > 0 ? (
                availableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))
              ) : (
                <>
                  <option value="superadmin">Superadmin</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </>
              )}
            </select>
          </div>

          {/* Toggle Preview mode */}
          <button
            onClick={() => setIsPreview(!isPreview)}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--tracker-radius-sm)] text-xs font-medium border transition-colors ${
              isPreview
                ? 'bg-[var(--brand-solid)] text-white border-[var(--brand-solid)]'
                : 'bg-[var(--tracker-surface)] text-[var(--tracker-ink)] border-[var(--tracker-border)] hover:bg-[var(--tracker-surface-1)]'
            }`}
          >
            <Eye size={14} />
            <span>{isPreview ? 'Edit Layout' : 'Preview'}</span>
          </button>

          {/* Reset Layout Button */}
          <button
            onClick={handleReset}
            disabled={resetting}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--tracker-radius-sm)] text-xs font-medium bg-[var(--tracker-surface)] text-[var(--tracker-ink-subtle)] hover:text-red-600 border border-[var(--tracker-border)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
            title="Reset to default system layout"
          >
            {resetting ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            <span>Reset</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            type="button"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--tracker-radius-sm)] text-xs font-medium bg-[var(--brand-solid)] text-white hover:brightness-105 transition-all shadow-sm"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* Main Studio Surface */}
      {isPreview ? (
        <div className="flex-1 p-6 overflow-y-auto bg-[var(--tracker-canvas)]">
          <DashboardRenderer schema={schema} />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Catalog */}
          <WidgetLibrary onAddWidget={addWidget} />

          {/* Center Canvas */}
          <CanvasRenderer
            widgets={schema.widgets || []}
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={setSelectedWidgetId}
          />

          {/* Right Panel: Config Panel */}
          <ConfigPanel
            widget={selectedWidget}
            onChange={updateWidget}
            onDelete={deleteWidget}
            onClose={() => setSelectedWidgetId(null)}
          />
        </div>
      )}
    </div>
  );
}
