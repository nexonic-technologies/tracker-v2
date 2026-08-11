import {
  Calendar, Clock, Plus, Users, UserPlus,
  FileText, Briefcase, CheckSquare, ClipboardList, LogIn,
} from 'lucide-react';

/**
 * Dynamic dashboard configuration keyed by role name (lowercase).
 *
 * Add a new role here — no JSX changes needed.
 * Each entry defines:
 *   - variant: which data/layout variant to use ("admin" | "manager" | "employee")
 *   - quickActions: links shown in the Quick Actions panel
 *   - heroActions: CTA buttons shown in the hero section
 *
 * The `variant` controls which DashboardBody sub-component renders.
 */

export const ROLE_CONFIG = {
  superadmin: {
    variant: 'admin',
    quickActions: [
      { to: '/Settings', icon: FileText, label: 'Company Settings' },
      { to: '/HR', icon: UserPlus, label: 'Add Employee' },
      { to: '/Attendance/leaves', icon: Calendar, label: 'All Leaves' },
      { to: '/Master-Data', icon: Briefcase, label: 'Master Data' },
    ],
    heroActions: [
      { to: '/tasks', icon: Plus, label: 'My Tasks', variant: 'secondary' },
    ],
  },

  admin: {
    variant: 'admin',
    quickActions: [
      { to: '/Settings', icon: FileText, label: 'Company Settings' },
      { to: '/HR', icon: UserPlus, label: 'Add Employee' },
      { to: '/Attendance/leaves', icon: Calendar, label: 'All Leaves' },
      { to: '/Master-Data', icon: Briefcase, label: 'Master Data' },
    ],
    heroActions: [
      { to: '/tasks', icon: Plus, label: 'My Tasks', variant: 'secondary' },
    ],
  },

  manager: {
    variant: 'manager',
    quickActions: [
      { to: '/Attendance/leaves', icon: Calendar, label: 'Approve Leaves' },
      { to: '/tasks', icon: Plus, label: 'Assign Task' },
      { to: '/Attendance/Daily-tracker', icon: Clock, label: 'Team Tracker' },
      { to: '/HR', icon: Users, label: 'Team Directory' },
    ],
    heroActions: [
      { to: '/tasks', icon: Plus, label: 'My Tasks', variant: 'secondary' },
    ],
  },

  employee: {
    variant: 'employee',
    quickActions: [
      { to: '/Attendance/leaves', icon: Calendar, label: 'Apply Leave' },
      { to: '/tasks/my-tasks', icon: CheckSquare, label: 'View Tasks' },
      { to: '/Attendance/Daily-tracker', icon: Clock, label: 'Daily Tracker' },
      { to: '/Attendance/leave-regularization', icon: ClipboardList, label: 'Regularize' },
    ],
    heroActions: [
      { to: '/Attendance/Daily-tracker', icon: LogIn, label: null, variant: 'primary', dynamic: 'clockLabel' },
      { to: '/tasks', icon: Plus, label: 'My Tasks', variant: 'secondary' },
    ],
  },
};

/** Fallback config for unknown roles — shows read-only hero + tasks button */
export const DEFAULT_ROLE_CONFIG = {
  variant: 'default',
  quickActions: [],
  heroActions: [
    { to: '/tasks', icon: Plus, label: 'My Tasks', variant: 'secondary' },
  ],
};

/** Returns the config for a given role name, falling back to DEFAULT. */
export function getRoleConfig(roleName) {
  if (!roleName) return DEFAULT_ROLE_CONFIG;
  return ROLE_CONFIG[roleName.toLowerCase()] ?? DEFAULT_ROLE_CONFIG;
}

// ─── Widget Registry ──────────────────────────────────────────────────────────
/**
 * WIDGET_REGISTRY — canonical list of all dashboard widgets.
 *
 * The backend stores only the `id` strings per role.
 * This file maps those IDs to display metadata for the settings UI.
 *
 * Groups:
 *   'org'      — org-level stats (admin/manager)
 *   'employee' — personal stats (employee)
 *   'panels'   — list/table panels
 */

export const WIDGET_GROUPS = {
  org: { label: 'Organisation Stats', color: 'blue' },
  employee: { label: 'My Stats', color: 'green' },
  panels: { label: 'Panels & Tables', color: 'purple' },
  // V2 groups — new dashboard architecture
  v2_core: { label: 'V2 — Core Sections', color: 'blue' },
  v2_stats: { label: 'V2 — Stat Cards', color: 'green' },
  v2_panels: { label: 'V2 — Action Panels', color: 'purple' },
};

export const WIDGET_REGISTRY = [
  // — Org-level stats (V1) —
  {
    id: 'stat_total_employees',
    label: 'Total Employees',
    description: 'Count of all active employees',
    group: 'org',
    needsData: ['employees'],
  },
  {
    id: 'stat_present_today',
    label: 'Present Today',
    description: 'Employees checked in today',
    group: 'org',
    needsData: ['attendances'],
  },
  {
    id: 'stat_on_leave',
    label: 'On Leave',
    description: 'Employees currently on leave',
    group: 'org',
    needsData: ['employees', 'attendances'],
  },
  {
    id: 'stat_pending_leaves',
    label: 'Pending Leave Count',
    description: 'Number of pending leave approvals',
    group: 'org',
    needsData: ['leaves'],
  },

  // — Personal stats (V1) —
  {
    id: 'stat_attendance_status',
    label: 'Attendance Status',
    description: "Today's check-in / check-out status",
    group: 'employee',
    needsData: ['attendances'],
  },
  {
    id: 'stat_leave_balance',
    label: 'Leave Balance',
    description: 'Remaining leave days',
    group: 'employee',
    needsData: ['leaves'],
  },
  {
    id: 'stat_my_tasks',
    label: 'My Tasks',
    description: 'Open tasks assigned to me',
    group: 'employee',
    needsData: ['tasks'],
  },

  // — Panels & tables (V1) —
  {
    id: 'quick_actions',
    label: 'Quick Actions',
    description: 'Shortcut links for common actions',
    group: 'panels',
    needsData: [],
  },
  {
    id: 'pending_leaves_list',
    label: 'Pending Leave Requests',
    description: 'List of leaves awaiting approval',
    group: 'panels',
    needsData: ['leaves'],
  },
  {
    id: 'recent_tasks_table',
    label: 'Recent Tasks Table',
    description: 'Paginated table of recent tasks',
    group: 'panels',
    needsData: ['tasks'],
  },
  {
    id: 'priority_tasks',
    label: 'My Priority Tasks',
    description: 'High-priority tasks assigned to me',
    group: 'panels',
    needsData: ['tasks'],
  },
  {
    id: 'recent_activity',
    label: 'Recent Activity Feed',
    description: 'Timeline of recent team activity',
    group: 'panels',
    needsData: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V2 Dashboard Widgets — New architecture (coexist with V1 until migration)
  // ═══════════════════════════════════════════════════════════════════════════

  // — V2 Core Sections —
  {
    id: 'v2_alert_banner',
    label: 'Alert Banner',
    description: 'Shows critical alerts: overdue tasks, emergency leaves, unassigned tickets',
    group: 'v2_core',
    needsData: ['tasks', 'leaves', 'tickets'],
  },
  {
    id: 'v2_workforce_pulse',
    label: 'Workforce Pulse',
    description: 'Real-time attendance pulse: present, leave, WFH, late, unchecked breakdown',
    group: 'v2_core',
    needsData: ['attendances', 'employees'],
  },
  {
    id: 'v2_employee_header',
    label: 'Employee Dashboard Header',
    description: "Employee's own clock status, top tasks, and leave balance",
    group: 'v2_core',
    needsData: ['attendances', 'tasks', 'employees'],
  },
  {
    id: 'v2_action_center',
    label: 'Action Center',
    description: 'Urgency-scored queue of items needing manager/admin attention',
    group: 'v2_core',
    needsData: ['leaves', 'regularizations', 'tasks', 'tickets'],
  },
  {
    id: 'v2_team_attendance_grid',
    label: 'Team Attendance Grid',
    description: "Manager's at-a-glance team attendance status",
    group: 'v2_core',
    needsData: ['attendances', 'employees'],
  },

  // — V2 Stat Cards —
  {
    id: 'v2_stat_pending_approvals',
    label: 'Pending Approvals',
    description: 'Count of pending leave/regularization/WFH/comp-off requests',
    group: 'v2_stats',
    needsData: ['leaves', 'regularizations'],
  },
  {
    id: 'v2_stat_overdue_tasks',
    label: 'Overdue Tasks',
    description: 'Tasks past deadline with department breakdown',
    group: 'v2_stats',
    needsData: ['tasks'],
  },
  {
    id: 'v2_stat_open_tickets',
    label: 'Open Tickets',
    description: 'Count of unresolved tickets assigned to team/org',
    group: 'v2_stats',
    needsData: ['tickets'],
  },
  {
    id: 'v2_stat_attendance_issues',
    label: 'Attendance Issues',
    description: 'Count of late entries, LOP, and unchecked employees today',
    group: 'v2_stats',
    needsData: ['attendances'],
  },
  {
    id: 'v2_stat_payroll_status',
    label: 'Payroll Status',
    description: 'Current month payroll processing status',
    group: 'v2_stats',
    needsData: ['payroll_runs'],
  },
  {
    id: 'v2_stat_payroll_cost',
    label: 'Payroll Cost',
    description: 'Total payroll cost for current month',
    group: 'v2_stats',
    needsData: ['payroll_runs'],
  },

  // — V2 MD/Executive Panels —
  {
    id: 'v2_stat_workforce_health',
    label: 'Workforce Health Gauge',
    description: 'MD-level workforce health percentage with status indicator',
    group: 'v2_stats',
    needsData: ['attendances', 'employees'],
  },
  {
    id: 'v2_stat_financial_exposure',
    label: 'Financial Exposure',
    description: 'Total payroll exposure with LOP impact count',
    group: 'v2_stats',
    needsData: ['payroll_runs', 'payrolls'],
  },

  // — V2 Employee Panels —
  {
    id: 'v2_employee_tasks',
    label: 'My Top Tasks',
    description: 'Top 3-5 tasks sorted by urgency (overdue → priority → deadline)',
    group: 'v2_panels',
    needsData: ['tasks'],
  },
  {
    id: 'v2_employee_leave_balance',
    label: 'Per-Type Leave Balance',
    description: 'Leave balance broken down by leave type',
    group: 'v2_panels',
    needsData: ['employees'],
  },
];

/** Quick lookup: id → widget definition */
export const WIDGET_MAP = Object.fromEntries(
  WIDGET_REGISTRY.map((w) => [w.id, w])
);

