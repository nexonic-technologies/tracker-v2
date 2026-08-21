/**
 * Dashboard Engine — Config Fields (§2.6)
 *
 * Form field components for the self-generating property panel.
 */
import React from 'react';

export function TextField({ field, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[var(--tracker-ink-muted)]">
        {field.label}
      </label>
      <input
        type="text"
        value={value || ''}
        placeholder={field.placeholder || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs px-3 py-2 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:border-[var(--brand-solid)]"
      />
    </div>
  );
}

export function NumberField({ field, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[var(--tracker-ink-muted)]">
        {field.label}
      </label>
      <input
        type="number"
        value={value ?? field.defaultValue ?? ''}
        placeholder={field.placeholder || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full text-xs px-3 py-2 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:border-[var(--brand-solid)]"
      />
    </div>
  );
}

export function SelectField({ field, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[var(--tracker-ink-muted)]">
        {field.label}
      </label>
      <select
        value={value || field.defaultValue || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs px-3 py-2 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:border-[var(--brand-solid)] cursor-pointer"
      >
        {(field.options || []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MetricPicker({ field, value, onChange }) {
  const sources = [
    { value: 'pulse', label: 'Pulse — Full Attendance Summary' },
    { value: 'stats.pendingApprovals', label: 'Stats — Pending Approvals Count' },
    { value: 'stats.overdueTasks', label: 'Stats — Overdue Tasks Count' },
    { value: 'stats.openTickets', label: 'Stats — Open Tickets Count' },
    { value: 'stats.criticalTickets', label: 'Stats — Critical Tickets Count' },
    { value: 'stats.workforceHealth', label: 'Stats — Workforce Health %' },
    { value: 'stats.attendanceIssues', label: 'Stats — Attendance Issues Count' },
    { value: 'stats.payrollStatus', label: 'Stats — Payroll Status' },
    { value: 'stats.payrollCost', label: 'Stats — Payroll Cost (₹)' },
    { value: 'stats.financialExposure', label: 'Stats — Financial Exposure (₹)' },
    { value: 'stats.ticketTrends', label: 'Trends — Ticket Lifecycle (Created/Resolved/Closed)' },
    { value: 'stats.taskTrends', label: 'Trends — Task Velocity (Created/Completed/Overdue)' },
    { value: 'stats.attendanceTrends', label: 'Trends — Attendance % Over Time' },
    { value: 'employee.attendance', label: 'Employee — Shift Attendance' },
    { value: 'employee.tasks', label: 'Employee — Assigned Tasks' },
    { value: 'employee.leaveBalance', label: 'Employee — Leave Balance' },
    { value: 'actionCenter', label: 'Collections — Action Center Items' },
    { value: 'teamGrid', label: 'Collections — Team Attendance Grid' },
    { value: 'celebrations', label: 'Collections — Celebrations' },
  ];

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[var(--tracker-ink-muted)]">
        {field.label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs px-3 py-2 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:border-[var(--brand-solid)] cursor-pointer"
      >
        <option value="">Select Data Source...</option>
        {sources.map((src) => (
          <option key={src.value} value={src.value}>
            {src.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ActionsSelector({ field, value = [], onChange }) {
  const currentValues = Array.isArray(value) ? value : [];
  const options = field.options || [];

  const toggleAction = (actionId) => {
    if (currentValues.includes(actionId)) {
      onChange(currentValues.filter(id => id !== actionId));
    } else {
      onChange([...currentValues, actionId]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[var(--tracker-ink-muted)]">
        {field.label}
      </label>
      <div className="space-y-1.5 p-2 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] max-h-48 overflow-y-auto">
        {options.map((opt) => {
          const isChecked = currentValues.includes(opt.value);
          return (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-xs text-[var(--tracker-ink)] cursor-pointer hover:text-[var(--brand-solid)] select-none"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleAction(opt.value)}
                className="rounded text-[var(--brand-solid)] focus:ring-0 cursor-pointer"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

