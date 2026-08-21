import React from 'react';
import { Calendar, Clock, LayoutGrid, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MODULES } from '../../constants/uiTokens';
import { useAuth } from '../../context/authProvider';
import { usePermissions } from '../../hooks/usePermissions';
import DashboardRenderer from '../../engine/dashboard/DashboardRenderer';
import { useDashboardSchema } from '../../engine/dashboard/hooks/useDashboardSchema';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { schema, loading, error, dateRange, setDateRange, refresh } = useDashboardSchema();

  const canManageLayout = can('update', 'dashboard_schemas') || can('create', 'dashboard_schemas');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 space-y-3 animate-fade-in" data-module={MODULES.project.id}>
        <div className="w-8 h-8 border-3 border-[var(--tracker-border)] border-t-[var(--brand-solid)] rounded-full animate-spin" />
        <p className="text-xs text-[var(--tracker-ink-subtle)]">Loading dashboard layout...</p>
      </div>
    );
  }

  const hasWidgets = schema?.widgets && schema.widgets.length > 0;

  return (
    <div className="space-y-3.5 animate-fade-in" data-module={MODULES.project.id}>
      {/* ─── CONTROLS & DATE RANGE TOOLBAR ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-hairline-soft">
        {/* Date Presets */}
        <div className="flex items-center gap-1 bg-surface-1 p-1 rounded-tracker-md border border-hairline">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setDateRange({ range: r.id })}
              className={`px-3 py-1 rounded-tracker-sm text-xs font-semibold transition-all cursor-pointer ${
                dateRange?.range === r.id
                  ? 'bg-surface shadow-xs text-ink font-bold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted bg-surface-1 px-2.5 py-1 rounded-tracker-md border border-hairline">
            <Calendar size={13} className="text-ink-subtle" />
            <input
              type="date"
              value={dateRange?.startDate || ''}
              onChange={(e) => setDateRange({ startDate: e.target.value, endDate: dateRange?.endDate, range: 'custom' })}
              className="bg-transparent text-[11.5px] text-ink focus:outline-none w-[115px] cursor-pointer"
              title="Start Date"
            />
            <span className="text-ink-subtle text-[11px]">to</span>
            <input
              type="date"
              value={dateRange?.endDate || ''}
              onChange={(e) => setDateRange({ startDate: dateRange?.startDate, endDate: e.target.value, range: 'custom' })}
              className="bg-transparent text-[11.5px] text-ink focus:outline-none w-[115px] cursor-pointer"
              title="End Date"
            />
          </div>

          <button
            onClick={refresh}
            className="p-1.5 rounded-tracker-md border border-hairline bg-surface hover:bg-surface-1 text-ink-muted hover:text-ink transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <Clock size={14} />
          </button>
        </div>
      </div>

      {/* ─── DYNAMIC DASHBOARD BUILDER RENDERER ─── */}
      {hasWidgets ? (
        <DashboardRenderer schema={schema} />
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-surface rounded-tracker-card border border-hairline text-center space-y-4 shadow-xs">
          <div className="p-3.5 bg-surface-2 rounded-2xl text-[var(--brand-solid)] border border-hairline">
            <LayoutGrid size={28} />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-semibold text-ink">No Dashboard Layout Configured</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              {canManageLayout
                ? 'No active widget configuration found for this role. Use the Dashboard Builder to design and publish a layout with live metrics, quick actions, and trend graphs.'
                : 'No dashboard layout has been configured for your role yet. Please contact your organization administrator to set up your dashboard view.'}
            </p>
          </div>
          {canManageLayout && (
            <button
              onClick={() => navigate('/admin/dashboard/builder')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--brand-solid)] hover:opacity-90 rounded-tracker-md transition-all shadow-xs cursor-pointer"
            >
              <PlusCircle size={14} />
              Open Dashboard Builder
            </button>
          )}
        </div>
      )}
    </div>
  );
}
