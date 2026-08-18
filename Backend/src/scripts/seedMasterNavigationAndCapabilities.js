// Backend/src/scripts/seedMasterNavigationAndCapabilities.js
/**
 * Unified Master Seeder for Capabilities & Sidebars
 * Generated strictly from:
 *  - Ref Docs/DB Ref/Sidebar.md
 *  - Ref Docs/DB Ref/Capabilities.md
 * 
 * Supports:
 * 1. Global Platform DB (tracker_global / main DB)
 * 2. Dedicated Tenant DBs (admin, client, new domains) with module entitlement filtering
 * 3. CLI execution or programmatic invocation during tenant provisioning
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import dns from 'dns';
import { fileURLToPath } from 'url';

dns.setServers(['8.8.8.8', '4.4.4.4']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

dotenv.config({ path: path.resolve(ROOT_DIR, '.env') });
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tracker';

// Deterministic ObjectId helper
function makeObjectId(seed) {
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  return new mongoose.Types.ObjectId(hash.substring(0, 24));
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER 18-DOMAIN & 62-NODE NAVIGATION REGISTRY SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export const MASTER_NAVIGATION_TREE = [
  // I. Dashboard
  {
    seedKey: 'dashboard',
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
    seedKey: 'feed',
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
  // III. Tracker
  {
    seedKey: 'tracker',
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
      { seedKey: 'tracker:attendance', title: 'Attendance', route: '/attendance', icon: { iconName: 'MdCoPresent', iconPackage: 'react-icons/md' }, capBase: 'attendance', label: 'Attendance Check-In', actions: ['view', 'create', 'update'] },
      { seedKey: 'tracker:leave-regularization', title: 'Leave & Regularization', route: '/attendance/leave-regularization', icon: { iconName: 'MdEditCalendar', iconPackage: 'react-icons/md' }, capBase: 'regularizations', label: 'Leave & Regularization', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'tracker:reports', title: 'Reports', route: '/attendance/reports', icon: { iconName: 'MdAssessment', iconPackage: 'react-icons/md' }, capBase: 'attendance_reports', label: 'Attendance Reports', actions: ['view'] },
      { seedKey: 'tracker:policies', title: 'Policies', route: '/attendance/policies', icon: { iconName: 'MdPolicy', iconPackage: 'react-icons/md' }, capBase: 'attendance_policies', label: 'Attendance Policies', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'tracker:shift-roster', title: 'Shift Roster', route: '/attendance/shift-roster', icon: { iconName: 'MdCalendarMonth', iconPackage: 'react-icons/md' }, capBase: 'shift_roster', label: 'Shift Roster', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'tracker:pending-approvals', title: 'Approvals', route: '/attendance/pending-approvals', icon: { iconName: 'MdApproval', iconPackage: 'react-icons/md' }, capBase: 'pending_approvals', label: 'Pending Approvals', actions: ['view', 'approve'] },
      { seedKey: 'tracker:monthly-summary', title: 'Monthly Summary', route: '/attendance/monthly-summary', icon: { iconName: 'MdCalendarToday', iconPackage: 'react-icons/md' }, capBase: 'attendance_summary', label: 'Monthly Summary', actions: ['view'] },
      { seedKey: 'tracker:daily-tracker', title: 'Activities', route: '/attendance/daily-tracker', icon: { iconName: 'MdListAlt', iconPackage: 'react-icons/md' }, capBase: 'daily_activities', label: 'Daily Activities', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'tracker:travel-expenses', title: 'Travel Expenses', route: '/attendance/travel-expenses', icon: { iconName: 'MdCardTravel', iconPackage: 'react-icons/md' }, capBase: 'travel_expenses', label: 'Travel Expenses', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  // IV. HRMS
  {
    seedKey: 'hrms',
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
      { seedKey: 'hrms:hr-management', title: 'HR Management', route: '/hrms', icon: { iconName: 'MdGroup', iconPackage: 'react-icons/md' }, capBase: 'hrms', label: 'HR Management', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'hrms:bank-advice', title: 'Bank Advice', route: '/hrms/bank-advice', icon: { iconName: 'MdAccountBalance', iconPackage: 'react-icons/md' }, capBase: 'bank_advice', label: 'Bank Advice Statement', actions: ['view'] },
      { seedKey: 'hrms:daily-attendance', title: 'Daily Attendance', route: '/hrms/daily-attendance', icon: { iconName: 'MdEventAvailable', iconPackage: 'react-icons/md' }, capBase: 'daily_attendance_audit', label: 'Daily Attendance Audit', actions: ['view'] },
      { seedKey: 'hrms:esi-return', title: 'ESI Returns', route: '/hrms/esi-return', icon: { iconName: 'MdHealthAndSafety', iconPackage: 'react-icons/md' }, capBase: 'esi_returns', label: 'ESI Return Statement', actions: ['view'] },
      { seedKey: 'hrms:headcount-analytics', title: 'Headcount Analytics', route: '/hrms/headcount-analytics', icon: { iconName: 'MdTrendingUp', iconPackage: 'react-icons/md' }, capBase: 'headcount_analytics', label: 'Headcount Analytics', actions: ['view'] },
      { seedKey: 'hrms:lifecycle-audit', title: 'Lifecycle', route: '/hrms/lifecycle-audit', icon: { iconName: 'MdTimeline', iconPackage: 'react-icons/md' }, capBase: 'lifecycle_audit', label: 'Lifecycle Audit', actions: ['view'] },
      { seedKey: 'hrms:monthly-payroll', title: 'Monthly Payroll', route: '/hrms/monthly-payroll', icon: { iconName: 'MdReceiptLong', iconPackage: 'react-icons/md' }, capBase: 'monthly_payroll', label: 'Monthly Payroll Runs', actions: ['view', 'create', 'update'] },
      { seedKey: 'hrms:onboarding-sla', title: 'Onboarding SLA', route: '/hrms/onboarding-sla', icon: { iconName: 'MdSpeed', iconPackage: 'react-icons/md' }, capBase: 'onboarding_sla', label: 'Onboarding SLA Tracker', actions: ['view'] },
      { seedKey: 'hrms:pf-ecr', title: 'PF ECR', route: '/hrms/pf-ecr', icon: { iconName: 'MdSecurity', iconPackage: 'react-icons/md' }, capBase: 'pf_ecr', label: 'Statutory PF ECR', actions: ['view'] },
      { seedKey: 'hrms:reports', title: 'Reports', route: '/hrms/reports', icon: { iconName: 'MdBarChart', iconPackage: 'react-icons/md' }, capBase: 'hrms_reports', label: 'HRMS Reports Hub', actions: ['view'] }
    ]
  },
  // V. HelpDesk
  {
    seedKey: 'helpdesk',
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
      { seedKey: 'helpdesk:tickets', title: 'Tickets', route: '/tickets', icon: { iconName: 'MdConfirmationNumber', iconPackage: 'react-icons/md' }, capBase: 'tickets', label: 'All Tickets', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'helpdesk:my-tickets', title: 'My Tickets', route: '/tickets/my-tickets', icon: { iconName: 'MdAssignmentInd', iconPackage: 'react-icons/md' }, capBase: 'my_tickets', label: 'My Tickets', actions: ['view', 'create', 'update'] },
      { seedKey: 'helpdesk:reports', title: 'Reports', route: '/tickets/reports', icon: { iconName: 'MdPieChart', iconPackage: 'react-icons/md' }, capBase: 'tickets_reports', label: 'Helpdesk Reports', actions: ['view'] }
    ]
  },
  // VI. Tasks
  {
    seedKey: 'tasks',
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
      { seedKey: 'tasks:project-management', title: 'Project Management', route: '/tasks', icon: { iconName: 'MdAccountTree', iconPackage: 'react-icons/md' }, capBase: 'tasks', label: 'Project Management', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'tasks:my-tasks', title: 'My Tasks', route: '/tasks/my-tasks', icon: { iconName: 'MdTask', iconPackage: 'react-icons/md' }, capBase: 'my_tasks', label: 'My Tasks', actions: ['view', 'create', 'update'] },
      { seedKey: 'tasks:client-tasks', title: 'Client Tasks', route: '/tasks/client-tasks', icon: { iconName: 'MdBusinessCenter', iconPackage: 'react-icons/md' }, capBase: 'client_tasks', label: 'Client Tasks', actions: ['view', 'create', 'update'] },
      { seedKey: 'tasks:activity-timeline', title: 'Activity Timeline', route: '/tasks/activity-timeline', icon: { iconName: 'MdHistory', iconPackage: 'react-icons/md' }, capBase: 'tasks_timeline', label: 'Activity Timeline', actions: ['view'] },
      { seedKey: 'tasks:reports', title: 'Reports', route: '/tasks/reports', icon: { iconName: 'MdAnalytics', iconPackage: 'react-icons/md' }, capBase: 'tasks_reports', label: 'Task Reports', actions: ['view'] }
    ]
  },
  // VII. CRM
  {
    seedKey: 'crm',
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
      { seedKey: 'crm:dashboard', title: 'CRM Dashboard', route: '/crm', icon: { iconName: 'MdDashboardCustomize', iconPackage: 'react-icons/md' }, capBase: 'crm', label: 'CRM Dashboard', actions: ['view'] },
      { seedKey: 'crm:contacts', title: 'Contacts', route: '/crm/contacts', icon: { iconName: 'MdContactPage', iconPackage: 'react-icons/md' }, capBase: 'contacts', label: 'Contacts', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'crm:ledger', title: 'Ledger', route: '/crm/ledger', icon: { iconName: 'MdMenuBook', iconPackage: 'react-icons/md' }, capBase: 'crm_ledger', label: 'CRM Ledger', actions: ['view'] },
      { seedKey: 'crm:order-acknowledgement', title: 'Order Acknowledgment', route: '/crm/order-acknowledgement', icon: { iconName: 'MdFactCheck', iconPackage: 'react-icons/md' }, capBase: 'order_acknowledgements', label: 'Order Acknowledgment', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'crm:orders', title: 'Orders', route: '/crm/orders', icon: { iconName: 'MdShoppingCart', iconPackage: 'react-icons/md' }, capBase: 'orders', label: 'Orders', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'crm:payments', title: 'Payments', route: '/crm/payments', icon: { iconName: 'MdPayment', iconPackage: 'react-icons/md' }, capBase: 'crm_payments', label: 'CRM Payments', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'crm:quotations', title: 'Quotations', route: '/crm/quotations', icon: { iconName: 'MdRequestQuote', iconPackage: 'react-icons/md' }, capBase: 'quotations', label: 'Quotations', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  // VIII. Profile
  {
    seedKey: 'profile',
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
    seedKey: 'policies',
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
  // X. Assets Management
  {
    seedKey: 'assets',
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
      { seedKey: 'assets:categories', title: 'Category', route: '/assets/categories', icon: { iconName: 'MdCategory', iconPackage: 'react-icons/md' }, capBase: 'assets_categories', label: 'Asset Categories', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'assets:grn', title: 'GRN', route: '/assets/grn', icon: { iconName: 'MdInventory', iconPackage: 'react-icons/md' }, capBase: 'assets_grn', label: 'Goods Received Note (GRN)', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'assets:register', title: 'Register', route: '/assets/register', icon: { iconName: 'MdAppRegistration', iconPackage: 'react-icons/md' }, capBase: 'assets_register', label: 'Asset Register', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'assets:allocations', title: 'Allocations', route: '/assets/allocations', icon: { iconName: 'MdAssignmentTurnedIn', iconPackage: 'react-icons/md' }, capBase: 'assets_allocations', label: 'Asset Allocations', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'assets:incidents', title: 'Incidents', route: '/assets/incidents', icon: { iconName: 'MdReportProblem', iconPackage: 'react-icons/md' }, capBase: 'assets_incidents', label: 'Asset Incidents', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'assets:invoices', title: 'Invoices', route: '/assets/invoices', icon: { iconName: 'MdReceipt', iconPackage: 'react-icons/md' }, capBase: 'assets_invoices', label: 'Asset Invoices', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'assets:payments', title: 'Payments', route: '/assets/payments', icon: { iconName: 'MdPayments', iconPackage: 'react-icons/md' }, capBase: 'assets_payments', label: 'Asset Payments', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'assets:repairs', title: 'Repair', route: '/assets/repairs', icon: { iconName: 'MdBuild', iconPackage: 'react-icons/md' }, capBase: 'assets_repairs', label: 'Asset Repairs', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'assets:vendors', title: 'Vendor Registration', route: '/assets/vendors', icon: { iconName: 'MdStore', iconPackage: 'react-icons/md' }, capBase: 'assets_vendors', label: 'Vendor Registration', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'assets:reports', title: 'Reports', route: '/assets/reports', icon: { iconName: 'MdShowChart', iconPackage: 'react-icons/md' }, capBase: 'assets_reports', label: 'Asset Reports', actions: ['view'] }
    ]
  },
  // XI. Payroll
  {
    seedKey: 'payroll',
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
      { seedKey: 'payroll:overview', title: 'Payroll Overview', route: '/payroll', icon: { iconName: 'MdAttachMoney', iconPackage: 'react-icons/md' }, capBase: 'payroll', label: 'Payroll Management', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'payroll:analytics', title: 'Payroll Analytics', route: '/payroll/dashboard', icon: { iconName: 'MdInsights', iconPackage: 'react-icons/md' }, capBase: 'payroll_analytics', label: 'Payroll Analytics', actions: ['view'] }
    ]
  },
  // XII. Accounts
  {
    seedKey: 'accounts',
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
      { seedKey: 'accounts:analytics', title: 'Accounts Analytics', route: '/accounts', icon: { iconName: 'MdAutoGraph', iconPackage: 'react-icons/md' }, capBase: 'accounts_analytics', label: 'Accounts Analytics', actions: ['view'] },
      { seedKey: 'accounts:ledger', title: 'Ledger', route: '/accounts/ledger', icon: { iconName: 'MdAccountBalanceWallet', iconPackage: 'react-icons/md' }, capBase: 'accounts_ledger', label: 'Financial Ledger', actions: ['view'] },
      { seedKey: 'accounts:payments', title: 'Payments', route: '/accounts/payments', icon: { iconName: 'MdPaid', iconPackage: 'react-icons/md' }, capBase: 'accounts_payments', label: 'Accounts Payments', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'accounts:productivity', title: 'Productivity', route: '/accounts/productivity', icon: { iconName: 'MdQueryStats', iconPackage: 'react-icons/md' }, capBase: 'accounts_productivity', label: 'Productivity Analytics', actions: ['view'] },
      { seedKey: 'accounts:reports', title: 'Reports', route: '/accounts/reports', icon: { iconName: 'MdDescription', iconPackage: 'react-icons/md' }, capBase: 'accounts_reports', label: 'Accounts Reports', actions: ['view'] }
    ]
  },
  // XIII. Reports Hub
  {
    seedKey: 'reports',
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
      { seedKey: 'reports:mis-cockpit', title: 'MIS Report', route: '/reports/mis-report-cockpit', icon: { iconName: 'MdLeaderboard', iconPackage: 'react-icons/md' }, capBase: 'mis_report', label: 'MIS Executive Cockpit', actions: ['view'] },
      { seedKey: 'reports:payroll-submission', title: 'Payroll Records', route: '/reports/payroll-submission', icon: { iconName: 'MdTableChart', iconPackage: 'react-icons/md' }, capBase: 'payroll_records_report', label: 'Payroll Submission Records', actions: ['view'] }
    ]
  },
  // XIV. Masters
  {
    seedKey: 'masters',
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
      { seedKey: 'masters:clients', title: 'Client', route: '/master-data/clients', icon: { iconName: 'MdBusiness', iconPackage: 'react-icons/md' }, capBase: 'clients', label: 'Client Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'crm' },
      { seedKey: 'masters:employees', title: 'Employee', route: '/master-data/employees', icon: { iconName: 'MdBadge', iconPackage: 'react-icons/md' }, capBase: 'employees', label: 'Employee Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'hrms' },
      { seedKey: 'masters:agents', title: 'Agent', route: '/master-data/agents', icon: { iconName: 'MdSupportAgent', iconPackage: 'react-icons/md' }, capBase: 'agents', label: 'Agent Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'core' },
      { seedKey: 'masters:departments', title: 'Department', route: '/master-data/departments', icon: { iconName: 'MdDomain', iconPackage: 'react-icons/md' }, capBase: 'departments', label: 'Department Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'hrms' },
      { seedKey: 'masters:designations', title: 'Designation', route: '/master-data/designations', icon: { iconName: 'MdWork', iconPackage: 'react-icons/md' }, capBase: 'designations', label: 'Designation Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'hrms' },
      { seedKey: 'masters:roles', title: 'Role', route: '/master-data/roles', icon: { iconName: 'MdAdminPanelSettings', iconPackage: 'react-icons/md' }, capBase: 'roles', label: 'Role Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'core' },
      { seedKey: 'masters:leave-types', title: 'Leave Type', route: '/master-data/leave-types', icon: { iconName: 'MdFlightTakeoff', iconPackage: 'react-icons/md' }, capBase: 'leave_types', label: 'Leave Type Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'attendance' },
      { seedKey: 'masters:leave-policies', title: 'Leave Policy', route: '/master-data/leave-policies', icon: { iconName: 'MdRule', iconPackage: 'react-icons/md' }, capBase: 'leave_policies', label: 'Leave Policy Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'attendance' },
      { seedKey: 'masters:leave-transactions', title: 'Leave Transaction', route: '/master-data/leave-transactions', icon: { iconName: 'MdSwapHoriz', iconPackage: 'react-icons/md' }, capBase: 'leave_transactions', label: 'Leave Transaction Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'attendance' },
      { seedKey: 'masters:shifts', title: 'Shift', route: '/master-data/shifts', icon: { iconName: 'MdSchedule', iconPackage: 'react-icons/md' }, capBase: 'shifts', label: 'Shift Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'attendance' },
      { seedKey: 'masters:hr-policies', title: 'HR Policy', route: '/master-data/hr-policies', icon: { iconName: 'MdVerifiedUser', iconPackage: 'react-icons/md' }, capBase: 'hr_policies', label: 'HR Policy Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'hrms' },
      { seedKey: 'masters:workflows', title: 'Workflow', route: '/master-data/workflows', icon: { iconName: 'MdSchema', iconPackage: 'react-icons/md' }, capBase: 'workflows', label: 'Workflow Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'core' },
      { seedKey: 'masters:attendance-policies', title: 'Attendance Policy', route: '/master-data/attendance-policies', icon: { iconName: 'MdFactCheck', iconPackage: 'react-icons/md' }, capBase: 'attendance_policies', label: 'Attendance Policy Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'attendance' },
      { seedKey: 'masters:holidays', title: 'Holiday', route: '/master-data/holidays', icon: { iconName: 'MdCelebration', iconPackage: 'react-icons/md' }, capBase: 'holidays', label: 'Holiday Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'attendance' }
    ]
  },
  // XV. Project Masters
  {
    seedKey: 'project-masters',
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
      { seedKey: 'pm:products', title: 'Product', route: '/master-data/products', icon: { iconName: 'MdInventory2', iconPackage: 'react-icons/md' }, capBase: 'products', label: 'Product Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'core' },
      { seedKey: 'pm:project-types', title: 'Project Type', route: '/master-data/project-types', icon: { iconName: 'MdFolder', iconPackage: 'react-icons/md' }, capBase: 'project_types', label: 'Project Type Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'tasks' },
      { seedKey: 'pm:job-types', title: 'Job Type', route: '/master-data/job-types', icon: { iconName: 'MdWorkHistory', iconPackage: 'react-icons/md' }, capBase: 'job_types', label: 'Job Type Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'recruitment' },
      { seedKey: 'pm:job-categories', title: 'Job Category', route: '/master-data/job-categories', icon: { iconName: 'MdCategory', iconPackage: 'react-icons/md' }, capBase: 'job_categories', label: 'Job Category Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'recruitment' },
      { seedKey: 'pm:lead-types', title: 'Lead Type', route: '/master-data/lead-types', icon: { iconName: 'MdLeaderboard', iconPackage: 'react-icons/md' }, capBase: 'lead_types', label: 'Lead Type Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'crm' },
      { seedKey: 'pm:milestones', title: 'Milestones', route: '/master-data/milestones', icon: { iconName: 'MdFlag', iconPackage: 'react-icons/md' }, capBase: 'milestones', label: 'Milestones Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'tasks' },
      { seedKey: 'pm:reference-types', title: 'Reference Type', route: '/master-data/reference-types', icon: { iconName: 'MdBookmark', iconPackage: 'react-icons/md' }, capBase: 'reference_types', label: 'Reference Type Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'crm' },
      { seedKey: 'pm:service-providers', title: 'Service Provider', route: '/master-data/service-providers', icon: { iconName: 'MdHandshake', iconPackage: 'react-icons/md' }, capBase: 'service_providers', label: 'Service Provider Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'core' },
      { seedKey: 'pm:status-master', title: 'Status Master', route: '/master-data/status-master', icon: { iconName: 'MdChecklist', iconPackage: 'react-icons/md' }, capBase: 'status_master', label: 'Status Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'core' },
      { seedKey: 'pm:task-types', title: 'Task Type', route: '/master-data/task-types', icon: { iconName: 'MdFormatListBulleted', iconPackage: 'react-icons/md' }, capBase: 'task_types', label: 'Task Type Master', actions: ['view', 'create', 'update', 'delete'], moduleKey: 'tasks' }
    ]
  },
  // XVI. Settings
  {
    seedKey: 'settings',
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
      { seedKey: 'settings:general', title: 'General Settings', route: '/settings/general', icon: { iconName: 'MdTune', iconPackage: 'react-icons/md' }, capBase: 'general_settings', label: 'General Settings', actions: ['view', 'update'] },
      { seedKey: 'settings:dashboard-builder', title: 'Dashboard Builder', route: '/settings/dashboard-builder', icon: { iconName: 'MdViewQuilt', iconPackage: 'react-icons/md' }, capBase: 'dashboard_builder', label: 'Dashboard Builder', actions: ['view', 'update'] },
      { seedKey: 'settings:designation-permissions', title: 'Designation Permission', route: '/settings/designation-permissions', icon: { iconName: 'MdKey', iconPackage: 'react-icons/md' }, capBase: 'designation_permissions', label: 'Designation Permissions', actions: ['view', 'update'] },
      { seedKey: 'settings:role-permissions', title: 'Role Permission', route: '/settings/role-permissions', icon: { iconName: 'MdLockPerson', iconPackage: 'react-icons/md' }, capBase: 'role_permissions', label: 'Role Permissions', actions: ['view', 'update'] },
      { seedKey: 'settings:menu', title: 'Menu', route: '/settings/menu', icon: { iconName: 'MdMenu', iconPackage: 'react-icons/md' }, capBase: 'menu', label: 'Menu Management', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'settings:email-config', title: 'Email Config', route: '/settings/email-config', icon: { iconName: 'MdEmail', iconPackage: 'react-icons/md' }, capBase: 'email_config', label: 'Email Configuration', actions: ['view', 'create', 'update', 'delete'] },
      { seedKey: 'settings:company', title: 'Company', route: '/settings/company', icon: { iconName: 'MdCorporateFare', iconPackage: 'react-icons/md' }, capBase: 'company', label: 'Company Profile', actions: ['view', 'update'] },
      { seedKey: 'settings:capabilities', title: 'Capability', route: '/settings/capabilities', icon: { iconName: 'MdShield', iconPackage: 'react-icons/md' }, capBase: 'capabilities', label: 'Capability Registry', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  // XVII. Messages
  {
    seedKey: 'messages',
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
    seedKey: 'teams',
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

// ─────────────────────────────────────────────────────────────────────────────
// CORE SEEDING LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seeds or updates Capabilities and Sidebars in the targeted Mongoose database connection.
 * 
 * @param {mongoose.Connection} conn - Mongoose connection or useDb instance
 * @param {Object} options
 * @param {string[]} [options.enabledModuleKeys] - Active module keys for tenant filtering (e.g. ['core', 'attendance'])
 * @param {boolean} [options.allowAllModules=false] - If true, bypasses module key filter (e.g. global/superadmin)
 * @param {boolean} [options.clearExisting=true] - If true, replaces existing sidebars and capabilities
 * @returns {Promise<{ capabilitiesCount: number, sidebarsCount: number }>}
 */
export async function seedNavigationAndCapabilities(conn, {
  enabledModuleKeys = ['core', 'attendance', 'hrms', 'tasks', 'tickets', 'crm', 'assets', 'recruitment', 'feed'],
  allowAllModules = false,
  clearExisting = true
} = {}) {
  const db = conn.db || (conn.connection ? conn.connection.db : null);
  if (!db) {
    throw new Error('Valid Mongoose database connection must be provided.');
  }

  const enabledSet = new Set(enabledModuleKeys.map(k => k.toLowerCase()));
  const isModuleAllowed = (modKey) => {
    if (allowAllModules) return true;
    return enabledSet.has((modKey || 'core').toLowerCase());
  };

  // 1. Prepare Capabilities
  const allCapabilities = [];
  const capKeyToId = new Map();
  const capBaseToIds = new Map();
  const seenCapabilityKeys = new Set();

  const registerCap = (capBase, act, module, label, title) => {
    const key = `${capBase}:${act}`;
    const capId = makeObjectId(`cap:${key}`);
    capKeyToId.set(key, capId);
    if (!capBaseToIds.has(capBase)) capBaseToIds.set(capBase, []);
    if (!capBaseToIds.get(capBase).some(id => id.equals(capId))) {
      capBaseToIds.get(capBase).push(capId);
    }

    if (!seenCapabilityKeys.has(key)) {
      seenCapabilityKeys.add(key);
      allCapabilities.push({
        _id: capId,
        key: key,
        name: `${capBase}.${act}`,
        action: act,
        module: module,
        label: `${act === 'view' ? 'View' : act.charAt(0).toUpperCase() + act.slice(1)} ${label}`,
        description: `Allows user to ${act} ${title}`,
        status: 'active',
        type: 'ui',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  };

  for (const parent of MASTER_NAVIGATION_TREE) {
    const parentMod = parent.moduleKey;
    for (const act of parent.actions) {
      registerCap(parent.capBase, act, parentMod, parent.label, parent.title);
    }

    if (parent.children) {
      for (const child of parent.children) {
        const childMod = child.moduleKey || parentMod;
        for (const act of child.actions) {
          registerCap(child.capBase, act, childMod, child.label, child.title);
        }
      }
    }
  }

  // 2. Filter Capabilities & Sidebars by Module Entitlement
  const filteredCapabilities = allCapabilities.filter(c => isModuleAllowed(c.module));

  const filteredParents = [];
  const filteredChildren = [];

  for (const parent of MASTER_NAVIGATION_TREE) {
    if (!isModuleAllowed(parent.moduleKey)) continue;

    const parentId = makeObjectId(`parent:${parent.seedKey}`);
    const parentCaps = (capBaseToIds.get(parent.capBase) || []).filter(id => {
      return filteredCapabilities.some(c => c._id.equals(id));
    });

    filteredParents.push({
      _id: parentId,
      title: parent.title,
      icon: parent.icon,
      mainRoute: parent.mainRoute,
      visibility: 'protected',
      capabilities: parentCaps,
      parentId: null,
      hasChildren: Boolean(parent.hasChildren),
      isParent: Boolean(parent.isParent),
      order: parent.order,
      moduleKey: parent.moduleKey,
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (parent.children) {
      let childOrder = 0;
      for (const child of parent.children) {
        const childMod = child.moduleKey || parent.moduleKey;
        if (!isModuleAllowed(childMod)) continue;

        const childId = makeObjectId(`child:${parent.seedKey}:${child.seedKey}`);
        const childCaps = (capBaseToIds.get(child.capBase) || []).filter(id => {
          return filteredCapabilities.some(c => c._id.equals(id));
        });

        filteredChildren.push({
          _id: childId,
          title: child.title,
          icon: child.icon,
          mainRoute: child.route,
          visibility: 'protected',
          capabilities: childCaps,
          parentId: parentId,
          hasChildren: false,
          isParent: false,
          order: childOrder++,
          moduleKey: childMod,
          isActive: true,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
  }

  const allSidebars = [...filteredParents, ...filteredChildren];

  // 3. Database Execution
  if (clearExisting) {
    await db.collection('capabilities').deleteMany({});
    await db.collection('sidebars').deleteMany({});
  }

  if (filteredCapabilities.length > 0) {
    await db.collection('capabilities').insertMany(filteredCapabilities);
  }

  if (allSidebars.length > 0) {
    await db.collection('sidebars').insertMany(allSidebars);
  }

  return {
    capabilitiesCount: filteredCapabilities.length,
    sidebarsCount: allSidebars.length,
    parentsCount: filteredParents.length,
    childrenCount: filteredChildren.length
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI RUNNER
// ─────────────────────────────────────────────────────────────────────────────
async function runCLI() {
  const args = process.argv.slice(2);
  const target = (args.find(a => a.startsWith('--target=')) || '--target=all').split('=')[1];
  const clean = !args.includes('--no-clean');

  console.log(`[MasterSeeder] Connecting to MongoDB: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);
  console.log(`[MasterSeeder] Target mode: ${target}`);

  try {
    if (target === 'global' || target === 'all') {
      console.log(`[MasterSeeder] Seeding Global Platform Database...`);
      const res = await seedNavigationAndCapabilities(mongoose.connection, {
        allowAllModules: true,
        clearExisting: clean
      });
      console.log(`  ✓ Global DB Seeded: ${res.capabilitiesCount} capabilities, ${res.sidebarsCount} sidebars (${res.parentsCount} parents, ${res.childrenCount} children).`);
    }

    if (target === 'all' || target !== 'global') {
      const adminDb = mongoose.connection.db.admin();
      const { databases } = await adminDb.listDatabases();
      const tenantDbs = databases.filter(d => d.name.startsWith('tenant_') || d.name.startsWith('tracker_tenant_'));

      console.log(`[MasterSeeder] Found ${tenantDbs.length} tenant database(s):`, tenantDbs.map(d => d.name));

      for (const tDb of tenantDbs) {
        const tenantName = tDb.name.replace('tracker_tenant_', '').replace('tenant_', '');
        if (target !== 'all' && target !== tenantName && target !== tDb.name) {
          continue;
        }

        console.log(`[MasterSeeder] Seeding Tenant Database '${tDb.name}'...`);
        const tConn = mongoose.connection.useDb(tDb.name);
        
        // Check enabled modules in tenant record
        const tenantRecord = await mongoose.connection.db.collection('tenants').findOne({
          $or: [{ slug: tenantName }, { dbName: tDb.name }, { tenantId: tenantName }]
        });

        let enabledModules = ['core', 'attendance', 'hrms', 'tasks', 'tickets', 'crm', 'assets', 'recruitment', 'feed'];
        if (tenantRecord && Array.isArray(tenantRecord.enabledModules) && tenantRecord.enabledModules.length > 0) {
          const globalModules = await mongoose.connection.db.collection('modules').find({}).toArray();
          const idToKey = new Map(globalModules.map(m => [m._id.toString(), m.moduleId || m.slug || m.name]));
          enabledModules = tenantRecord.enabledModules.map(m => {
            const s = m?.toString ? m.toString() : String(m);
            return idToKey.get(s) || s;
          }).filter(Boolean);
        }

        const res = await seedNavigationAndCapabilities(tConn, {
          enabledModuleKeys: enabledModules,
          allowAllModules: tenantRecord?.allowAllModules || tenantName === 'admin',
          clearExisting: clean
        });

        console.log(`  ✓ Tenant '${tDb.name}' Seeded: ${res.capabilitiesCount} capabilities, ${res.sidebarsCount} sidebars.`);
      }
    }

    console.log(`[MasterSeeder] Master Navigation and Capabilities seeding completed successfully!`);
  } catch (err) {
    console.error(`[MasterSeeder] ❌ Error during seeding:`, err);
  } finally {
    await mongoose.disconnect();
    console.log(`[MasterSeeder] Disconnected from DB.`);
  }
}

// Auto-run if invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCLI();
}
