import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate deterministic MongoDB ObjectId from string seed
function makeObjectId(seed) {
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  return hash.substring(0, 24);
}

// Master Menu & Capability Specification
const MENU_SCHEMA = [
  // I. Dashboard
  {
    id: makeObjectId('parent:dashboard'),
    title: 'Dashboard',
    mainRoute: '/dashboard',
    icon: { iconName: 'MdDashboard', iconPackage: 'react-icons/md' },
    moduleKey: 'core',
    isParent: false,
    hasChildren: false,
    order: 0,
    capBase: 'dashboard',
    label: 'Dashboard',
    actions: ['view']
  },
  // II. Feeds
  {
    id: makeObjectId('parent:feed'),
    title: 'Feeds',
    mainRoute: '/feed',
    icon: { iconName: 'MdRssFeed', iconPackage: 'react-icons/md' },
    moduleKey: 'feed',
    isParent: false,
    hasChildren: false,
    order: 1,
    capBase: 'feed',
    label: 'Feeds',
    actions: ['view', 'create', 'update', 'delete']
  },
  // III. Tracker (Parent)
  {
    id: makeObjectId('parent:tracker'),
    title: 'Tracker',
    mainRoute: '#',
    icon: { iconName: 'MdAccessTimeFilled', iconPackage: 'react-icons/md' },
    moduleKey: 'attendance',
    isParent: true,
    hasChildren: true,
    order: 2,
    capBase: 'tracker',
    label: 'Tracker Group',
    actions: ['view'],
    children: [
      { title: 'Attendance', route: '/attendance', icon: { iconName: 'MdCoPresent', iconPackage: 'react-icons/md' }, capBase: 'attendance', label: 'Attendance Check-In', actions: ['view', 'create', 'update'] },
      { title: 'Leave & Regularization', route: '/attendance/leave-regularization', icon: { iconName: 'MdEditCalendar', iconPackage: 'react-icons/md' }, capBase: 'regularizations', label: 'Leave & Regularization', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Reports', route: '/attendance/reports', icon: { iconName: 'MdAssessment', iconPackage: 'react-icons/md' }, capBase: 'attendance_reports', label: 'Attendance Reports', actions: ['view'] },
      { title: 'Policies', route: '/attendance/policies', icon: { iconName: 'MdPolicy', iconPackage: 'react-icons/md' }, capBase: 'attendance_policies', label: 'Attendance Policies', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Shift Roster', route: '/attendance/shift-roster', icon: { iconName: 'MdCalendarMonth', iconPackage: 'react-icons/md' }, capBase: 'shift_roster', label: 'Shift Roster', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Approvals', route: '/attendance/pending-approvals', icon: { iconName: 'MdApproval', iconPackage: 'react-icons/md' }, capBase: 'pending_approvals', label: 'Pending Approvals', actions: ['view', 'approve'] },
      { title: 'Monthly Summary', route: '/attendance/monthly-summary', icon: { iconName: 'MdCalendarToday', iconPackage: 'react-icons/md' }, capBase: 'attendance_summary', label: 'Monthly Summary', actions: ['view'] },
      { title: 'Activities', route: '/attendance/daily-tracker', icon: { iconName: 'MdListAlt', iconPackage: 'react-icons/md' }, capBase: 'daily_activities', label: 'Daily Activities', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Travel Expenses', route: '/attendance/travel-expenses', icon: { iconName: 'MdCardTravel', iconPackage: 'react-icons/md' }, capBase: 'travel_expenses', label: 'Travel Expenses', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  // IV. HRMS (Parent)
  {
    id: makeObjectId('parent:hrms'),
    title: 'HRMS',
    mainRoute: '#',
    icon: { iconName: 'MdPeople', iconPackage: 'react-icons/md' },
    moduleKey: 'hrms',
    isParent: true,
    hasChildren: true,
    order: 3,
    capBase: 'hrms',
    label: 'HRMS Group',
    actions: ['view'],
    children: [
      { title: 'HR Management', route: '/hrms', icon: { iconName: 'MdGroup', iconPackage: 'react-icons/md' }, capBase: 'hrms', label: 'HR Management', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Bank Advice', route: '/hrms/bank-advice', icon: { iconName: 'MdAccountBalance', iconPackage: 'react-icons/md' }, capBase: 'bank_advice', label: 'Bank Advice Statement', actions: ['view'] },
      { title: 'Daily Attendance', route: '/hrms/daily-attendance', icon: { iconName: 'MdEventAvailable', iconPackage: 'react-icons/md' }, capBase: 'daily_attendance_audit', label: 'Daily Attendance Audit', actions: ['view'] },
      { title: 'ESI Returns', route: '/hrms/esi-return', icon: { iconName: 'MdHealthAndSafety', iconPackage: 'react-icons/md' }, capBase: 'esi_returns', label: 'ESI Return Statement', actions: ['view'] },
      { title: 'Headcount Analytics', route: '/hrms/headcount-analytics', icon: { iconName: 'MdTrendingUp', iconPackage: 'react-icons/md' }, capBase: 'headcount_analytics', label: 'Headcount Analytics', actions: ['view'] },
      { title: 'Lifecycle', route: '/hrms/lifecycle-audit', icon: { iconName: 'MdTimeline', iconPackage: 'react-icons/md' }, capBase: 'lifecycle_audit', label: 'Lifecycle Audit', actions: ['view'] },
      { title: 'Monthly Payroll', route: '/hrms/monthly-payroll', icon: { iconName: 'MdReceiptLong', iconPackage: 'react-icons/md' }, capBase: 'monthly_payroll', label: 'Monthly Payroll Runs', actions: ['view', 'create', 'update'] },
      { title: 'Onboarding SLA', route: '/hrms/onboarding-sla', icon: { iconName: 'MdSpeed', iconPackage: 'react-icons/md' }, capBase: 'onboarding_sla', label: 'Onboarding SLA Tracker', actions: ['view'] },
      { title: 'PF ECR', route: '/hrms/pf-ecr', icon: { iconName: 'MdSecurity', iconPackage: 'react-icons/md' }, capBase: 'pf_ecr', label: 'Statutory PF ECR', actions: ['view'] },
      { title: 'Reports', route: '/hrms/reports', icon: { iconName: 'MdBarChart', iconPackage: 'react-icons/md' }, capBase: 'hrms_reports', label: 'HRMS Reports Hub', actions: ['view'] }
    ]
  },
  // V. HelpDesk (Parent)
  {
    id: makeObjectId('parent:helpdesk'),
    title: 'HelpDesk',
    mainRoute: '#',
    icon: { iconName: 'MdHeadsetMic', iconPackage: 'react-icons/md' },
    moduleKey: 'tickets',
    isParent: true,
    hasChildren: true,
    order: 4,
    capBase: 'tickets',
    label: 'HelpDesk Group',
    actions: ['view'],
    children: [
      { title: 'Tickets', route: '/tickets', icon: { iconName: 'MdConfirmationNumber', iconPackage: 'react-icons/md' }, capBase: 'tickets', label: 'All Tickets', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'My Tickets', route: '/tickets/my-tickets', icon: { iconName: 'MdAssignmentInd', iconPackage: 'react-icons/md' }, capBase: 'my_tickets', label: 'My Tickets', actions: ['view', 'create', 'update'] },
      { title: 'Reports', route: '/tickets/reports', icon: { iconName: 'MdPieChart', iconPackage: 'react-icons/md' }, capBase: 'tickets_reports', label: 'Helpdesk Reports', actions: ['view'] }
    ]
  },
  // VI. Tasks (Parent)
  {
    id: makeObjectId('parent:tasks'),
    title: 'Tasks',
    mainRoute: '#',
    icon: { iconName: 'MdAssignment', iconPackage: 'react-icons/md' },
    moduleKey: 'tasks',
    isParent: true,
    hasChildren: true,
    order: 5,
    capBase: 'tasks',
    label: 'Tasks Group',
    actions: ['view'],
    children: [
      { title: 'Project Management', route: '/tasks', icon: { iconName: 'MdAccountTree', iconPackage: 'react-icons/md' }, capBase: 'tasks', label: 'Project Management', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'My Tasks', route: '/tasks/my-tasks', icon: { iconName: 'MdTask', iconPackage: 'react-icons/md' }, capBase: 'my_tasks', label: 'My Tasks', actions: ['view', 'create', 'update'] },
      { title: 'Client Tasks', route: '/tasks/client-tasks', icon: { iconName: 'MdBusinessCenter', iconPackage: 'react-icons/md' }, capBase: 'client_tasks', label: 'Client Tasks', actions: ['view', 'create', 'update'] },
      { title: 'Activity Timeline', route: '/tasks/activity-timeline', icon: { iconName: 'MdHistory', iconPackage: 'react-icons/md' }, capBase: 'tasks_timeline', label: 'Activity Timeline', actions: ['view'] },
      { title: 'Reports', route: '/tasks/reports', icon: { iconName: 'MdAnalytics', iconPackage: 'react-icons/md' }, capBase: 'tasks_reports', label: 'Task Reports', actions: ['view'] }
    ]
  },
  // VII. CRM (Parent)
  {
    id: makeObjectId('parent:crm'),
    title: 'CRM',
    mainRoute: '#',
    icon: { iconName: 'MdStorefront', iconPackage: 'react-icons/md' },
    moduleKey: 'crm',
    isParent: true,
    hasChildren: true,
    order: 6,
    capBase: 'crm',
    label: 'CRM Group',
    actions: ['view'],
    children: [
      { title: 'CRM Dashboard', route: '/crm', icon: { iconName: 'MdDashboardCustomize', iconPackage: 'react-icons/md' }, capBase: 'crm', label: 'CRM Dashboard', actions: ['view'] },
      { title: 'Contacts', route: '/crm/contacts', icon: { iconName: 'MdContactPage', iconPackage: 'react-icons/md' }, capBase: 'contacts', label: 'Contacts', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Ledger', route: '/crm/ledger', icon: { iconName: 'MdMenuBook', iconPackage: 'react-icons/md' }, capBase: 'crm_ledger', label: 'CRM Ledger', actions: ['view'] },
      { title: 'Order Acknowledgment', route: '/crm/order-acknowledgement', icon: { iconName: 'MdFactCheck', iconPackage: 'react-icons/md' }, capBase: 'order_acknowledgements', label: 'Order Acknowledgment', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Orders', route: '/crm/orders', icon: { iconName: 'MdShoppingCart', iconPackage: 'react-icons/md' }, capBase: 'orders', label: 'Orders', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Payments', route: '/crm/payments', icon: { iconName: 'MdPayment', iconPackage: 'react-icons/md' }, capBase: 'crm_payments', label: 'CRM Payments', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Quotations', route: '/crm/quotations', icon: { iconName: 'MdRequestQuote', iconPackage: 'react-icons/md' }, capBase: 'quotations', label: 'Quotations', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  // VIII. Profile
  {
    id: makeObjectId('parent:profile'),
    title: 'Profile',
    mainRoute: '/profile',
    icon: { iconName: 'MdPerson', iconPackage: 'react-icons/md' },
    moduleKey: 'core',
    isParent: false,
    hasChildren: false,
    order: 7,
    capBase: 'profile',
    label: 'User Profile',
    actions: ['view', 'update']
  },
  // IX. Policies
  {
    id: makeObjectId('parent:policies'),
    title: 'Policies',
    mainRoute: '/policies',
    icon: { iconName: 'MdGavel', iconPackage: 'react-icons/md' },
    moduleKey: 'core',
    isParent: false,
    hasChildren: false,
    order: 8,
    capBase: 'company_policies',
    label: 'Company Policies',
    actions: ['view']
  },
  // X. Assets Management (Parent)
  {
    id: makeObjectId('parent:assets'),
    title: 'Assets Management',
    mainRoute: '#',
    icon: { iconName: 'MdDevicesOther', iconPackage: 'react-icons/md' },
    moduleKey: 'assets',
    isParent: true,
    hasChildren: true,
    order: 9,
    capBase: 'assets',
    label: 'Assets Group',
    actions: ['view'],
    children: [
      { title: 'Category', route: '/assets/categories', icon: { iconName: 'MdCategory', iconPackage: 'react-icons/md' }, capBase: 'assets_categories', label: 'Asset Categories', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'GRN', route: '/assets/grn', icon: { iconName: 'MdInventory', iconPackage: 'react-icons/md' }, capBase: 'assets_grn', label: 'Goods Received Note (GRN)', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Register', route: '/assets/register', icon: { iconName: 'MdAppRegistration', iconPackage: 'react-icons/md' }, capBase: 'assets_register', label: 'Asset Register', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Allocations', route: '/assets/allocations', icon: { iconName: 'MdAssignmentTurnedIn', iconPackage: 'react-icons/md' }, capBase: 'assets_allocations', label: 'Asset Allocations', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Incidents', route: '/assets/incidents', icon: { iconName: 'MdReportProblem', iconPackage: 'react-icons/md' }, capBase: 'assets_incidents', label: 'Asset Incidents', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Invoices', route: '/assets/invoices', icon: { iconName: 'MdReceipt', iconPackage: 'react-icons/md' }, capBase: 'assets_invoices', label: 'Asset Invoices', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Payments', route: '/assets/payments', icon: { iconName: 'MdPayments', iconPackage: 'react-icons/md' }, capBase: 'assets_payments', label: 'Asset Payments', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Repair', route: '/assets/repairs', icon: { iconName: 'MdBuild', iconPackage: 'react-icons/md' }, capBase: 'assets_repairs', label: 'Asset Repairs', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Vendor Registration', route: '/assets/vendors', icon: { iconName: 'MdStore', iconPackage: 'react-icons/md' }, capBase: 'assets_vendors', label: 'Vendor Registration', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Reports', route: '/assets/reports', icon: { iconName: 'MdShowChart', iconPackage: 'react-icons/md' }, capBase: 'assets_reports', label: 'Asset Reports', actions: ['view'] }
    ]
  },
  // XI. Payroll (Parent)
  {
    id: makeObjectId('parent:payroll'),
    title: 'Payroll',
    mainRoute: '#',
    icon: { iconName: 'MdMonetizationOn', iconPackage: 'react-icons/md' },
    moduleKey: 'attendance',
    isParent: true,
    hasChildren: true,
    order: 10,
    capBase: 'payroll',
    label: 'Payroll Group',
    actions: ['view'],
    children: [
      { title: 'Payroll Overview', route: '/payroll', icon: { iconName: 'MdAttachMoney', iconPackage: 'react-icons/md' }, capBase: 'payroll', label: 'Payroll Management', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Payroll Analytics', route: '/payroll/dashboard', icon: { iconName: 'MdInsights', iconPackage: 'react-icons/md' }, capBase: 'payroll_analytics', label: 'Payroll Analytics', actions: ['view'] }
    ]
  },
  // XII. Accounts (Parent)
  {
    id: makeObjectId('parent:accounts'),
    title: 'Accounts',
    mainRoute: '#',
    icon: { iconName: 'MdCalculate', iconPackage: 'react-icons/md' },
    moduleKey: 'accounts',
    isParent: true,
    hasChildren: true,
    order: 11,
    capBase: 'accounts',
    label: 'Accounts Group',
    actions: ['view'],
    children: [
      { title: 'Accounts Analytics', route: '/accounts', icon: { iconName: 'MdAutoGraph', iconPackage: 'react-icons/md' }, capBase: 'accounts_analytics', label: 'Accounts Analytics', actions: ['view'] },
      { title: 'Ledger', route: '/accounts/ledger', icon: { iconName: 'MdAccountBalanceWallet', iconPackage: 'react-icons/md' }, capBase: 'accounts_ledger', label: 'Financial Ledger', actions: ['view'] },
      { title: 'Payments', route: '/accounts/payments', icon: { iconName: 'MdPaid', iconPackage: 'react-icons/md' }, capBase: 'accounts_payments', label: 'Accounts Payments', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Productivity', route: '/accounts/productivity', icon: { iconName: 'MdQueryStats', iconPackage: 'react-icons/md' }, capBase: 'accounts_productivity', label: 'Productivity Analytics', actions: ['view'] },
      { title: 'Reports', route: '/accounts/reports', icon: { iconName: 'MdDescription', iconPackage: 'react-icons/md' }, capBase: 'accounts_reports', label: 'Accounts Reports', actions: ['view'] }
    ]
  },
  // XIII. Reports (Parent)
  {
    id: makeObjectId('parent:reports'),
    title: 'Reports',
    mainRoute: '#',
    icon: { iconName: 'MdEqualizer', iconPackage: 'react-icons/md' },
    moduleKey: 'core',
    isParent: true,
    hasChildren: true,
    order: 12,
    capBase: 'reports_hub',
    label: 'Executive Reports Group',
    actions: ['view'],
    children: [
      { title: 'MIS Report', route: '/reports/mis-report-cockpit', icon: { iconName: 'MdLeaderboard', iconPackage: 'react-icons/md' }, capBase: 'mis_report', label: 'MIS Executive Cockpit', actions: ['view'] },
      { title: 'Payroll Records', route: '/reports/payroll-submission', icon: { iconName: 'MdTableChart', iconPackage: 'react-icons/md' }, capBase: 'payroll_records_report', label: 'Payroll Submission Records', actions: ['view'] }
    ]
  },
  // XIV. Masters (Parent)
  {
    id: makeObjectId('parent:masters'),
    title: 'Masters',
    mainRoute: '#',
    icon: { iconName: 'MdFolderSpecial', iconPackage: 'react-icons/md' },
    moduleKey: 'core',
    isParent: true,
    hasChildren: true,
    order: 13,
    capBase: 'masters',
    label: 'Core Masters Group',
    actions: ['view'],
    children: [
      { title: 'Client', route: '/master-data/clients', icon: { iconName: 'MdBusiness', iconPackage: 'react-icons/md' }, capBase: 'clients', label: 'Client Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Employee', route: '/master-data/employees', icon: { iconName: 'MdBadge', iconPackage: 'react-icons/md' }, capBase: 'employees', label: 'Employee Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Agent', route: '/master-data/agents', icon: { iconName: 'MdSupportAgent', iconPackage: 'react-icons/md' }, capBase: 'agents', label: 'Agent Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Department', route: '/master-data/departments', icon: { iconName: 'MdDomain', iconPackage: 'react-icons/md' }, capBase: 'departments', label: 'Department Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Designation', route: '/master-data/designations', icon: { iconName: 'MdWork', iconPackage: 'react-icons/md' }, capBase: 'designations', label: 'Designation Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Role', route: '/master-data/roles', icon: { iconName: 'MdAdminPanelSettings', iconPackage: 'react-icons/md' }, capBase: 'roles', label: 'Role Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Leave Type', route: '/master-data/leave-types', icon: { iconName: 'MdFlightTakeoff', iconPackage: 'react-icons/md' }, capBase: 'leave_types', label: 'Leave Type Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Leave Policy', route: '/master-data/leave-policies', icon: { iconName: 'MdRule', iconPackage: 'react-icons/md' }, capBase: 'leave_policies', label: 'Leave Policy Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Leave Transaction', route: '/master-data/leave-transactions', icon: { iconName: 'MdSwapHoriz', iconPackage: 'react-icons/md' }, capBase: 'leave_transactions', label: 'Leave Transaction Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Shift', route: '/master-data/shifts', icon: { iconName: 'MdSchedule', iconPackage: 'react-icons/md' }, capBase: 'shifts', label: 'Shift Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'HR Policy', route: '/master-data/hr-policies', icon: { iconName: 'MdVerifiedUser', iconPackage: 'react-icons/md' }, capBase: 'hr_policies', label: 'HR Policy Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Workflow', route: '/master-data/workflows', icon: { iconName: 'MdSchema', iconPackage: 'react-icons/md' }, capBase: 'workflows', label: 'Workflow Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Attendance Policy', route: '/master-data/attendance-policies', icon: { iconName: 'MdFactCheck', iconPackage: 'react-icons/md' }, capBase: 'attendance_policies', label: 'Attendance Policy Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Holiday', route: '/master-data/holidays', icon: { iconName: 'MdCelebration', iconPackage: 'react-icons/md' }, capBase: 'holidays', label: 'Holiday Master', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  // XV. Project Masters (Parent)
  {
    id: makeObjectId('parent:project-masters'),
    title: 'Project Masters',
    mainRoute: '#',
    icon: { iconName: 'MdHub', iconPackage: 'react-icons/md' },
    moduleKey: 'core',
    isParent: true,
    hasChildren: true,
    order: 14,
    capBase: 'project_masters',
    label: 'Project Masters Group',
    actions: ['view'],
    children: [
      { title: 'Product', route: '/master-data/products', icon: { iconName: 'MdInventory2', iconPackage: 'react-icons/md' }, capBase: 'products', label: 'Product Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Project Type', route: '/master-data/project-types', icon: { iconName: 'MdFolder', iconPackage: 'react-icons/md' }, capBase: 'project_types', label: 'Project Type Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Job Type', route: '/master-data/job-types', icon: { iconName: 'MdWorkHistory', iconPackage: 'react-icons/md' }, capBase: 'job_types', label: 'Job Type Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Job Category', route: '/master-data/job-categories', icon: { iconName: 'MdCategory', iconPackage: 'react-icons/md' }, capBase: 'job_categories', label: 'Job Category Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Lead Type', route: '/master-data/lead-types', icon: { iconName: 'MdLeaderboard', iconPackage: 'react-icons/md' }, capBase: 'lead_types', label: 'Lead Type Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Milestones', route: '/master-data/milestones', icon: { iconName: 'MdFlag', iconPackage: 'react-icons/md' }, capBase: 'milestones', label: 'Milestones Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Reference Type', route: '/master-data/reference-types', icon: { iconName: 'MdBookmark', iconPackage: 'react-icons/md' }, capBase: 'reference_types', label: 'Reference Type Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Service Provider', route: '/master-data/service-providers', icon: { iconName: 'MdHandshake', iconPackage: 'react-icons/md' }, capBase: 'service_providers', label: 'Service Provider Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Status Master', route: '/master-data/status-master', icon: { iconName: 'MdChecklist', iconPackage: 'react-icons/md' }, capBase: 'status_master', label: 'Status Master', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Task Type', route: '/master-data/task-types', icon: { iconName: 'MdFormatListBulleted', iconPackage: 'react-icons/md' }, capBase: 'task_types', label: 'Task Type Master', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  // XVI. Settings (Parent)
  {
    id: makeObjectId('parent:settings'),
    title: 'Settings',
    mainRoute: '#',
    icon: { iconName: 'MdSettings', iconPackage: 'react-icons/md' },
    moduleKey: 'core',
    isParent: true,
    hasChildren: true,
    order: 15,
    capBase: 'settings',
    label: 'Settings Group',
    actions: ['view'],
    children: [
      { title: 'General Settings', route: '/settings/general', icon: { iconName: 'MdTune', iconPackage: 'react-icons/md' }, capBase: 'general_settings', label: 'General Settings', actions: ['view', 'update'] },
      { title: 'Dashboard Builder', route: '/settings/dashboard-builder', icon: { iconName: 'MdViewQuilt', iconPackage: 'react-icons/md' }, capBase: 'dashboard_builder', label: 'Dashboard Builder', actions: ['view', 'update'] },
      { title: 'Designation Permission', route: '/settings/designation-permissions', icon: { iconName: 'MdKey', iconPackage: 'react-icons/md' }, capBase: 'designation_permissions', label: 'Designation Permissions', actions: ['view', 'update'] },
      { title: 'Role Permission', route: '/settings/role-permissions', icon: { iconName: 'MdLockPerson', iconPackage: 'react-icons/md' }, capBase: 'role_permissions', label: 'Role Permissions', actions: ['view', 'update'] },
      { title: 'Menu', route: '/settings/menu', icon: { iconName: 'MdMenu', iconPackage: 'react-icons/md' }, capBase: 'menu', label: 'Menu Management', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Email Config', route: '/settings/email-config', icon: { iconName: 'MdEmail', iconPackage: 'react-icons/md' }, capBase: 'email_config', label: 'Email Configuration', actions: ['view', 'create', 'update', 'delete'] },
      { title: 'Company', route: '/settings/company', icon: { iconName: 'MdCorporateFare', iconPackage: 'react-icons/md' }, capBase: 'company', label: 'Company Profile', actions: ['view', 'update'] },
      { title: 'Capability', route: '/settings/capabilities', icon: { iconName: 'MdShield', iconPackage: 'react-icons/md' }, capBase: 'capabilities', label: 'Capability Registry', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  // XVII. Messages
  {
    id: makeObjectId('parent:messages'),
    title: 'Messages',
    mainRoute: '/messages',
    icon: { iconName: 'MdMessage', iconPackage: 'react-icons/md' },
    moduleKey: 'feed',
    isParent: false,
    hasChildren: false,
    order: 16,
    capBase: 'messages',
    label: 'Team Messages',
    actions: ['view', 'create', 'delete']
  },
  // XVIII. Teams
  {
    id: makeObjectId('parent:teams'),
    title: 'Teams',
    mainRoute: '/teams',
    icon: { iconName: 'MdGroups', iconPackage: 'react-icons/md' },
    moduleKey: 'hrms',
    isParent: false,
    hasChildren: false,
    order: 17,
    capBase: 'teams',
    label: 'Teams & Departments',
    actions: ['view', 'create', 'update', 'delete']
  }
];

// Generate all capability documents
const capabilities = [];
const capBaseToIds = new Map();
const seenKeys = new Set();

function addCapability(base, action, label, moduleKey, entityDesc) {
  const key = `${base}:${action}`;
  const id = makeObjectId(`cap:${key}`);
  
  let actionVerb = action.charAt(0).toUpperCase() + action.slice(1);
  if (action === 'view') actionVerb = 'View';
  if (action === 'approve') actionVerb = 'Approve/Reject';

  if (!capBaseToIds.has(base)) capBaseToIds.set(base, []);
  if (!capBaseToIds.get(base).some(existingId => String(existingId) === String(id))) {
    capBaseToIds.get(base).push(id);
  }

  if (seenKeys.has(key)) return;
  seenKeys.add(key);

  const capDoc = {
    _id: id,
    key: key,
    name: `${base}.${action}`,
    action: action,
    module: moduleKey,
    label: `${actionVerb} ${label}`,
    description: `Allows user to ${action} ${entityDesc || label.toLowerCase()}`,
    status: 'active',
    type: 'ui',
    createdAt: new Date("2026-08-18T10:00:00.000Z"),
    updatedAt: new Date("2026-08-18T10:00:00.000Z"),
    __v: 0
  };

  capabilities.push(capDoc);
}

// Populate capability list
for (const parent of MENU_SCHEMA) {
  for (const act of parent.actions) {
    addCapability(parent.capBase, act, parent.label, parent.moduleKey, parent.title);
  }
  if (parent.children) {
    for (const child of parent.children) {
      for (const act of child.actions) {
        addCapability(child.capBase, act, child.label, parent.moduleKey, child.title);
      }
    }
  }
}

// Generate Parent and Children sidebar arrays
const sidebarParents = [];
const sidebarChildren = [];

for (const parent of MENU_SCHEMA) {
  const pCaps = capBaseToIds.get(parent.capBase) || [];
  const parentDoc = {
    _id: parent.id,
    title: parent.title,
    icon: parent.icon,
    mainRoute: parent.mainRoute,
    visibility: 'protected',
    capabilities: pCaps,
    parentId: null,
    hasChildren: Boolean(parent.hasChildren),
    isParent: Boolean(parent.isParent),
    order: parent.order,
    moduleKey: parent.moduleKey,
    isActive: true,
    isDeleted: false
  };
  sidebarParents.push(parentDoc);

  if (parent.children) {
    parent.children.forEach((child, idx) => {
      const cCaps = capBaseToIds.get(child.capBase) || [];
      const childDoc = {
        _id: makeObjectId(`child:${parent.title}:${child.title}`),
        title: child.title,
        icon: child.icon,
        mainRoute: child.route,
        visibility: 'protected',
        capabilities: cCaps,
        parentId: parent.id,
        hasChildren: false,
        isParent: false,
        order: idx,
        moduleKey: parent.moduleKey,
        isActive: true,
        isDeleted: false
      };
      sidebarChildren.push(childDoc);
    });
  }
}

// Write JSON files in scripts/playground
const capPath = path.resolve(__dirname, 'capabilities.json');
const capUpdatedPath = path.resolve(__dirname, 'capablities-updated.json');
const parentPath = path.resolve(__dirname, 'sidebar-parent.json');
const childrenPath = path.resolve(__dirname, 'sidebar-childern.json');

fs.writeFileSync(capPath, JSON.stringify(capabilities, null, 2));
fs.writeFileSync(capUpdatedPath, JSON.stringify(capabilities, null, 2));
fs.writeFileSync(parentPath, JSON.stringify(sidebarParents, null, 2));
fs.writeFileSync(childrenPath, JSON.stringify(sidebarChildren, null, 2));

console.log(`Generated ${capabilities.length} capabilities across 18 parent domains and 62 navigation nodes.`);
console.log(`Saved to:`);
console.log(`  - ${capPath}`);
console.log(`  - ${capUpdatedPath}`);
console.log(`  - ${parentPath}`);
console.log(`  - ${childrenPath}`);
