/**
 * Dashboard Engine — Task Action Widget
 *
 * Dedicated widget for Task Management:
 * - Direct Create Task button
 * - View My Tasks button
 * - Overdue task indicator
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import { CheckSquare, Plus, ListTodo, AlertCircle, ArrowRight } from 'lucide-react';

function TaskActionWidget({ config, data }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col justify-between h-full space-y-3 p-1">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-[var(--tracker-surface-1)] text-[var(--module-project)]">
          <CheckSquare size={20} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-[var(--tracker-ink)]">Task Operations</h4>
          <p className="text-[11px] text-[var(--tracker-ink-subtle)]">Manage sprint & project tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate('/tasks/form')}
          type="button"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--tracker-radius-md)] bg-[var(--module-project)] hover:opacity-90 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Plus size={14} /> New Task
        </button>

        <button
          onClick={() => navigate('/tasks/my-tasks')}
          type="button"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)] hover:bg-[var(--tracker-surface-2)] text-[var(--tracker-ink)] text-xs font-semibold border border-[var(--tracker-border)] transition-all cursor-pointer"
        >
          <ListTodo size={14} /> My Tasks
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--tracker-ink-subtle)] pt-1 border-t border-[var(--tracker-border)]">
        <span className="flex items-center gap-1">
          <AlertCircle size={12} className="text-[var(--tracker-danger)]" /> Check Deadlines
        </span>
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-1 text-[var(--module-project)] hover:underline font-semibold cursor-pointer"
          type="button"
        >
          All Tasks <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

const manifest = {
  id: 'taskAction',
  name: 'Task Operations Widget',
  icon: 'CheckSquare',
  category: WIDGET_CATEGORIES.ACTIONS,
  configurable: true,
  supportedDataTypes: ['object'],
  sizeConstraints: { minW: 3, maxW: 6, minH: 2, maxH: 4, defaultW: 4, defaultH: 3 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
  ],
  defaultConfig: {
    title: 'Task Actions',
  },
};

registerWidget('taskAction', TaskActionWidget, manifest);
export default TaskActionWidget;
