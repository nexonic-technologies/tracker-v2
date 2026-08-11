/**
 * Dashboard Engine — Collection Widget (§2.1 Registry Widget #2)
 *
 * Scrollable list of items — tasks, leaves, approvals, action center.
 * Variant-driven: same component, different render per config.variant.
 *
 * Config shape:
 *   variant: "action-queue" | "task-list" | "simple-list"
 *   maxItems: number
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import {
  Clock, AlertTriangle, CheckCircle2,
  ChevronRight, Calendar, FileText, XCircle,
} from 'lucide-react';

/** Urgency → color mapping for action center items */
const urgencyColor = (score) => {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'negative';
  if (score >= 40) return 'warning';
  return 'neutral';
};

/** Type → icon mapping for action items */
const typeIcons = {
  emergency_leave: AlertTriangle,
  leave_request: Calendar,
  regularization: FileText,
  wfh_request: FileText,
  compoff_request: FileText,
  overdue_task_gt2: AlertTriangle,
  overdue_task_1: Clock,
  critical_ticket_unassigned: AlertTriangle,
  critical_ticket_assigned: AlertTriangle,
  payroll_pending: Clock,
};

/** Type → default route target */
const typeRoutes = {
  emergency_leave: '/attendance',
  leave_request: '/attendance',
  regularization: '/attendance',
  wfh_request: '/attendance',
  compoff_request: '/attendance',
  overdue_task_gt2: '/tasks',
  overdue_task_1: '/tasks',
  critical_ticket_unassigned: '/tickets',
  critical_ticket_assigned: '/tickets',
  payroll_pending: '/payroll',
};

/** Action Queue variant — urgency-scored items */
function ActionQueueView({ items, maxItems = 10 }) {
  const navigate = useNavigate();
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="flex flex-col gap-1.5">
      {displayItems.map((item, i) => {
        const Icon = typeIcons[item.type] || FileText;
        const color = urgencyColor(item.urgencyScore || 30);
        const targetRoute = item.link || item.route || typeRoutes[item.type] || '/dashboard';

        return (
          <div
            key={item.id || i}
            onClick={() => targetRoute && navigate(targetRoute)}
            className="flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer group border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60"
          >
            {/* Urgency icon badge */}
            <div className={`dsh-bg-${color} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={16} strokeWidth={2} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[var(--tracker-ink,#1e293b)] truncate leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {item.title}
              </p>
              <p className="text-[11px] text-[var(--tracker-ink-subtle,#64748b)] truncate mt-0.5">
                {item.subtitle}
                {item.department && <span className="ml-1 font-medium">· {item.department}</span>}
              </p>
            </div>

            {/* Inline Action Buttons */}
            {item.actions && item.actions.length > 0 && (
              <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {item.actions.includes('approve') && (
                  <button
                    onClick={() => targetRoute && navigate(targetRoute)}
                    className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-xs"
                    title="Approve & View Details"
                    type="button"
                  >
                    <CheckCircle2 size={15} />
                  </button>
                )}
              </div>
            )}

            <ChevronRight size={15} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </div>
        );
      })}
    </div>
  );
}

/** Task List variant — personal tasks sorted by priority */
function TaskListView({ items, maxItems = 5 }) {
  const displayItems = (items || []).slice(0, maxItems);

  const priorityColors = {
    1: 'negative',   // Critical
    2: 'negative',   // High
    3: 'warning',    // Medium
    4: 'positive',   // Low
    5: 'neutral',    // None
  };

  return (
    <div className="flex flex-col gap-0.5">
      {displayItems.map((task, i) => {
        const isOverdue = task.endDate && new Date(task.endDate) < new Date();
        const color = isOverdue ? 'negative' : (priorityColors[task.priorityLevel] || 'neutral');

        return (
          <div
            key={task._id || i}
            className="flex items-center gap-3 py-2.5 px-1 rounded-[var(--tracker-radius-sm)] hover:bg-[var(--tracker-surface-1)] transition-colors cursor-pointer"
          >
            {/* Priority dot */}
            <span className={`w-2 h-2 rounded-full flex-shrink-0 bg-[var(--dsh-${color})]`} />

            {/* Task info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--tracker-ink)] truncate leading-tight">
                {task.title}
              </p>
              <p className="text-[11px] text-[var(--tracker-ink-subtle)] mt-0.5">
                {isOverdue ? (
                  <span className="text-[var(--dsh-negative)] font-semibold">Overdue</span>
                ) : task.endDate ? (
                  `Due ${new Date(task.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                ) : 'No deadline'}
                {task.status && <span className="ml-1">· {task.status}</span>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.config - widget configuration
 * @param {*} props.data - resolved data payload (array of items)
 */
function CollectionWidget({ config, data }) {
  const { variant = 'simple-list', maxItems = 10 } = config;
  const items = Array.isArray(data) ? data : [];

  switch (variant) {
    case 'action-queue':
      return <ActionQueueView items={items} maxItems={maxItems} />;
    case 'task-list':
      return <TaskListView items={items} maxItems={maxItems} />;
    default:
      return <ActionQueueView items={items} maxItems={maxItems} />;
  }
}

// Self-register
const manifest = {
  id: 'collection',
  name: 'Collection Widget',
  icon: 'List',
  category: WIDGET_CATEGORIES.COLLECTIONS,
  configurable: true,
  supportedDataTypes: ['array'],
  sizeConstraints: { minW: 3, maxW: 12, minH: 3, maxH: 8, defaultW: 6, defaultH: 4 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
    { type: 'metricPicker', name: 'dataSource', label: 'Data source' },
    { type: 'select', name: 'variant', label: 'Display style', options: [
      { value: 'action-queue', label: 'Action Queue' },
      { value: 'task-list', label: 'Task List' },
      { value: 'simple-list', label: 'Simple List' },
    ]},
    { type: 'number', name: 'maxItems', label: 'Maximum items', defaultValue: 10 },
  ],
  defaultConfig: {
    variant: 'action-queue',
    maxItems: 10,
  },
};

registerWidget('collection', CollectionWidget, manifest);
export default CollectionWidget;
