# Master Application Sidebar & Navigation Matrix (18 Root Domains)

## Overview
This document specifies the finalized Master Sidebar and Navigation Architecture across the entire Workhub ERP Tracker platform. It acts as the single source of truth for:
1. **Database Seeders**: `sidebars` collection in global and tenant DBs (`SideBar.js` schema).
2. **Module Key Mapping**: Multi-tenant SaaS module activation (`Backend/src/utils/moduleMapping.js` & `Backend/src/models/tenantRegistry.js`).
3. **Frontend Router Pages**: Pure page-only route structure (`Frontend/src/pages`).
4. **RBAC & Capabilities**: Dynamic permission evaluation (`Capability` linking & `policyEngine.js`).

---

## Complete 18-Domain Navigation & Module Mapping Matrix

| # | Menu Group | Item Title | Route URL | Target Page Path | Icon (`react-icons/md` / `Iconify`) | Type | `moduleKey` | Associated DB Collections / Models |
|---|---|---|---|---|---|---|---|---|
| **I** | **Dashboard** | Dashboard | `/dashboard` | `src/pages/dashboard/index.jsx` | `MdDashboard` (`ic:baseline-dashboard`) | Standalone | `core` | `dashboard_widgets`, `dashboard_schemas` |
| **II** | **Feeds** | Feeds | `/feed` (alias: `/feeds`) | `src/pages/feed/index.jsx` | `MdRssFeed` (`ic:baseline-rss-feed`) | Standalone | `feed` | `feed_posts`, `feed_comments`, `feed_groups`, `feed_channels` |
| **III** | **Tracker** | **Tracker** | `#` | *Parent Group* | `MdAccessTimeFilled` (`ic:baseline-access-time-filled`) | Parent Group | `attendance` | *N/A (Parent Container)* |
| | | 1. Attendance | `/attendance` | `src/pages/attendance/index.jsx` | `MdCoPresent` (`ic:baseline-co-present`) | Child Item | `attendance` | `attendances`, `daily_activities` |
| | | 2. Leave & Regularization | `/attendance/leave-regularization` | `src/pages/attendance/leave-regularization.jsx` | `MdEditCalendar` (`ic:baseline-edit-calendar`) | Child Item | `attendance` | `leaves`, `leave_types`, `regularizations` |
| | | 3. Reports | `/attendance/reports` | `src/pages/attendance/reports.jsx` | `MdAssessment` (`ic:baseline-assessment`) | Child Item | `attendance` | `attendances`, `leaves` |
| | | 4. Policies | `/attendance/policies` | `src/pages/attendance/policies/index.jsx` | `MdPolicy` (`ic:baseline-policy`) | Child Item | `attendance` | `attendance_policies`, `leave_policy` |
| | | 5. Shift Roster | `/attendance/shift-roster` | `src/pages/attendance/shift-roster.jsx` | `MdCalendarMonth` (`ic:baseline-calendar-month`) | Child Item | `attendance` | `shifts`, `shift_assignments` |
| | | 6. Approvals | `/attendance/pending-approvals` | `src/pages/attendance/pending-approvals.jsx` | `MdApproval` (`ic:baseline-approval`) | Child Item | `attendance` | `leaves`, `regularizations`, `wfh_requests`, `comp_off_requests` |
| | | 7. Monthly Summary | `/attendance/monthly-summary` | `src/pages/attendance/monthly-summary.jsx` | `MdCalendarToday` (`ic:baseline-calendar-today`) | Child Item | `attendance` | `attendances` |
| | | 8. Activities | `/attendance/daily-tracker` | `src/pages/attendance/daily-tracker/index.jsx` | `MdListAlt` (`ic:baseline-list-alt`) | Child Item | `attendance` | `daily_activities`, `time_tracker_sessions` |
| | | 9. Travel Expenses | `/attendance/travel-expenses` | `src/pages/attendance/travel-expenses/index.jsx` | `MdCardTravel` (`ic:baseline-card-travel`) | Child Item | `attendance` | `expenses` |
| **IV** | **HRMS** | **HRMS** | `#` | *Parent Group* | `MdPeople` (`ic:baseline-people`) | Parent Group | `hrms` | *N/A (Parent Container)* |
| | | 1. HR Management | `/hrms` | `src/pages/hrms/index.jsx` | `MdGroup` (`ic:baseline-group`) | Child Item | `hrms` | `employees`, `departments`, `designations` |
| | | 2. Bank Advice | `/hrms/bank-advice` | `src/pages/hrms/bank-advice.jsx` | `MdAccountBalance` (`ic:baseline-account-balance`) | Child Item | `hrms` | `employees`, `payrolls` |
| | | 3. Daily Attendance | `/hrms/daily-attendance` | `src/pages/hrms/daily-attendance.jsx` | `MdEventAvailable` (`ic:baseline-event-available`) | Child Item | `hrms` | `attendances`, `employees` |
| | | 4. ESI Returns | `/hrms/esi-return` | `src/pages/hrms/esi-return.jsx` | `MdHealthAndSafety` (`ic:baseline-health-and-safety`) | Child Item | `hrms` | `payrolls`, `salary_structures` |
| | | 5. Headcount Analytics | `/hrms/headcount-analytics` | `src/pages/hrms/headcount-analytics.jsx` | `MdTrendingUp` (`ic:baseline-trending-up`) | Child Item | `hrms` | `employees`, `departments` |
| | | 6. Lifecycle | `/hrms/lifecycle-audit` | `src/pages/hrms/lifecycle-audit.jsx` | `MdTimeline` (`ic:baseline-timeline`) | Child Item | `hrms` | `employee_lifecycle_histories` |
| | | 7. Monthly Payroll | `/hrms/monthly-payroll` | `src/pages/hrms/monthly-payroll.jsx` | `MdReceiptLong` (`ic:baseline-receipt-long`) | Child Item | `hrms` | `payrolls`, `payroll_runs` |
| | | 8. Onboarding SLA | `/hrms/onboarding-sla` | `src/pages/hrms/onboarding-sla.jsx` | `MdSpeed` (`ic:baseline-speed`) | Child Item | `hrms` | `onboardings`, `onboarding_templates` |
| | | 9. PF ECR | `/hrms/pf-ecr` | `src/pages/hrms/pf-ecr.jsx` | `MdSecurity` (`ic:baseline-security`) | Child Item | `hrms` | `payrolls`, `salary_structures` |
| | | 10. Reports | `/hrms/reports` | `src/pages/hrms/reports.jsx` | `MdBarChart` (`ic:baseline-bar-chart`) | Child Item | `hrms` | `employees`, `payrolls`, `attendances` |
| **V** | **HelpDesk** | **HelpDesk** | `#` | *Parent Group* | `MdHeadsetMic` (`ic:baseline-headset-mic`) | Parent Group | `tickets` | *N/A (Parent Container)* |
| | | 1. Tickets | `/tickets` | `src/pages/tickets/index.jsx` | `MdConfirmationNumber` (`ic:baseline-confirmation-number`) | Child Item | `tickets` | `tickets`, `ticket_activity_logs` |
| | | 2. My Tickets | `/tickets/my-tickets` | `src/pages/tickets/my-tickets.jsx` | `MdAssignmentInd` (`ic:baseline-assignment-ind`) | Child Item | `tickets` | `tickets`, `ticket_assignments` |
| | | 3. Reports | `/tickets/reports` | `src/pages/tickets/reports.jsx` | `MdPieChart` (`ic:baseline-pie-chart`) | Child Item | `tickets` | `tickets`, `ticket_status_history` |
| **VI** | **Tasks** | **Tasks** | `#` | *Parent Group* | `MdAssignment` (`ic:baseline-assignment`) | Parent Group | `tasks` | *N/A (Parent Container)* |
| | | 1. Project Management | `/tasks` | `src/pages/tasks/index.jsx` | `MdAccountTree` (`ic:baseline-account-tree`) | Child Item | `tasks` | `tasks`, `sprints`, `project_types` |
| | | 2. My Tasks | `/tasks/my-tasks` | `src/pages/tasks/my-tasks.jsx` | `MdTask` (`ic:baseline-task`) | Child Item | `tasks` | `tasks`, `todos` |
| | | 3. Client Tasks | `/tasks/client-tasks` | `src/pages/tasks/client-tasks/index.jsx` | `MdBusinessCenter` (`ic:baseline-business-center`) | Child Item | `tasks` | `tasks`, `clients` |
| | | 4. Activity Timeline | `/tasks/activity-timeline` | `src/pages/tasks/activity-timeline.jsx` | `MdHistory` (`ic:baseline-history`) | Child Item | `tasks` | `tasks`, `activity_logs` |
| | | 5. Reports | `/tasks/reports` | `src/pages/tasks/reports.jsx` | `MdAnalytics` (`ic:baseline-analytics`) | Child Item | `tasks` | `tasks`, `sprints` |
| **VII** | **CRM** | **CRM** | `#` | *Parent Group* | `MdStorefront` (`ic:baseline-storefront`) | Parent Group | `crm` | *N/A (Parent Container)* |
| | | 1. CRM Dashboard | `/crm` | `src/pages/crm/index.jsx` | `MdDashboardCustomize` (`ic:baseline-dashboard-customize`) | Child Item | `crm` | `crm_activities`, `crm_meetings`, `clients` |
| | | 2. Contacts | `/crm/contacts` | `src/pages/crm/contacts/index.jsx` | `MdContactPage` (`ic:baseline-contact-page`) | Child Item | `crm` | `contacts` |
| | | 3. Ledger | `/crm/ledger` | `src/pages/crm/ledger/index.jsx` | `MdMenuBook` (`ic:baseline-menu-book`) | Child Item | `crm` | `client_ledgers`, `period_closures` |
| | | 4. Order Acknowledgment | `/crm/order-acknowledgement` | `src/pages/crm/order-acknowledgement/index.jsx` | `MdFactCheck` (`ic:baseline-fact-check`) | Child Item | `crm` | `order_acknowledgements` |
| | | 5. Orders | `/crm/orders` | `src/pages/crm/orders/index.jsx` | `MdShoppingCart` (`ic:baseline-shopping-cart`) | Child Item | `crm` | `quotations`, `order_acknowledgements` |
| | | 6. Payments | `/crm/payments` | `src/pages/crm/payments/index.jsx` | `MdPayment` (`ic:baseline-payment`) | Child Item | `crm` | `payments`, `client_ledgers` |
| | | 7. Quotations | `/crm/quotations` | `src/pages/crm/quotations/index.jsx` | `MdRequestQuote` (`ic:baseline-request-quote`) | Child Item | `crm` | `quotations`, `quotation_revisions` |
| **VIII** | **Profile** | Profile | `/profile` | `src/pages/profile/index.jsx` | `MdPerson` (`ic:baseline-person`) | Standalone | `core` | `employees`, `user_logins` |
| **IX** | **Policies** | Company Policies | `/policies` | `src/pages/policies/index.jsx` | `MdGavel` (`ic:baseline-gavel`) | Standalone | `core` | `hr_policies`, `attendance_policies` |
| **X** | **Assets Management** | **Assets Management** | `#` | *Parent Group* | `MdDevicesOther` (`ic:baseline-devices-other`) | Parent Group | `assets` | *N/A (Parent Container)* |
| | | 1. Category | `/assets/categories` (alias: `/assets/category`) | `src/pages/assets/categories.jsx` | `MdCategory` (`ic:baseline-category`) | Child Item | `assets` | `assets_categories` |
| | | 2. GRN | `/assets/grn` | `src/pages/assets/grn.jsx` | `MdInventory` (`ic:baseline-inventory`) | Child Item | `assets` | `assets_purchases`, `assets_stock_ledgers` |
| | | 3. Register | `/assets/register` | `src/pages/assets/register.jsx` | `MdAppRegistration` (`ic:baseline-app-registration`) | Child Item | `assets` | `assets`, `assets_categories` |
| | | 4. Allocations | `/assets/allocations` | `src/pages/assets/allocations.jsx` | `MdAssignmentTurnedIn` (`ic:baseline-assignment-turned-in`) | Child Item | `assets` | `asset_allocations`, `employees` |
| | | 5. Incidents | `/assets/incidents` | `src/pages/assets/incidents.jsx` | `MdReportProblem` (`ic:baseline-report-problem`) | Child Item | `assets` | `assets_incidents` |
| | | 6. Invoices | `/assets/invoices` | `src/pages/assets/invoices.jsx` | `MdReceipt` (`ic:baseline-receipt`) | Child Item | `assets` | `assets_invoices` |
| | | 7. Payments | `/assets/payments` | `src/pages/assets/payments.jsx` | `MdPayments` (`ic:baseline-payments`) | Child Item | `assets` | `assets_payments` |
| | | 8. Repair | `/assets/repairs` (alias: `/assets/repair`) | `src/pages/assets/repairs.jsx` | `MdBuild` (`ic:baseline-build`) | Child Item | `assets` | `assets_repairs` |
| | | 9. Vendor Registration | `/assets/vendors` (alias: `/assets/vendor`) | `src/pages/assets/vendors.jsx` | `MdStore` (`ic:baseline-store`) | Child Item | `assets` | `assets_vendors` |
| | | 10. Reports | `/assets/reports` | `src/pages/assets/reports.jsx` | `MdShowChart` (`ic:baseline-show-chart`) | Child Item | `assets` | `assets`, `asset_allocations` |
| **XI** | **Payroll** | **Payroll** | `#` | *Parent Group* | `MdMonetizationOn` (`ic:baseline-monetization-on`) | Parent Group | `attendance` | *N/A (Parent Container)* |
| | | 1. Payroll Overview | `/payroll` | `src/pages/payroll/index.jsx` | `MdAttachMoney` (`ic:baseline-attach-money`) | Child Item | `attendance` | `payrolls`, `payroll_runs` |
| | | 2. Payroll Analytics | `/payroll/dashboard` | `src/pages/payroll/dashboard.jsx` | `MdInsights` (`ic:baseline-insights`) | Child Item | `attendance` | `payrolls`, `salary_structures` |
| **XII** | **Accounts** | **Accounts** | `#` | *Parent Group* | `MdCalculate` (`ic:baseline-calculate`) | Parent Group | `accounts` | *N/A (Parent Container)* |
| | | 1. Accounts Analytics | `/accounts` | `src/pages/accounts/index.jsx` | `MdAutoGraph` (`ic:baseline-auto-graph`) | Child Item | `accounts` | `payments`, `payment_journals` |
| | | 2. Ledger | `/accounts/ledger` | `src/pages/accounts/ledger.jsx` | `MdAccountBalanceWallet` (`ic:baseline-account-balance-wallet`) | Child Item | `accounts` | `payment_journals`, `client_ledgers` |
| | | 3. Payments | `/accounts/payments` | `src/pages/accounts/payments.jsx` | `MdPaid` (`ic:baseline-paid`) | Child Item | `accounts` | `payments`, `expenses` |
| | | 4. Productivity | `/accounts/productivity` | `src/pages/accounts/productivity.jsx` | `MdQueryStats` (`ic:baseline-query-stats`) | Child Item | `accounts` | `payrolls`, `tasks` |
| | | 5. Reports | `/accounts/reports` | `src/pages/accounts/reports/index.jsx` | `MdDescription` (`ic:baseline-description`) | Child Item | `accounts` | `payments`, `expenses` |
| **XIII** | **Reports** | **Reports** | `#` | *Parent Group* | `MdEqualizer` (`ic:baseline-equalizer`) | Parent Group | `core` | *N/A (Parent Container)* |
| | | 1. MIS Report | `/reports/mis-report-cockpit` | `src/pages/reports/mis-report-cockpit.jsx` | `MdLeaderboard` (`ic:baseline-leaderboard`) | Child Item | `core` | `employees`, `tasks`, `tickets`, `attendances` |
| | | 2. Payroll Records | `/reports/payroll-submission` | `src/pages/reports/payroll-submission.jsx` | `MdTableChart` (`ic:baseline-table-chart`) | Child Item | `attendance` | `payrolls`, `payroll_runs` |
| **XIV** | **Masters** | **Masters** | `#` | *Parent Group* | `MdFolderSpecial` (`ic:baseline-folder-special`) | Parent Group | `core` | *N/A (Parent Container)* |
| | | 1. Client | `/master-data/clients` | `src/pages/master-data/clients/index.jsx` | `MdBusiness` (`ic:baseline-business`) | Child Item | `core` | `clients` |
| | | 2. Employee | `/master-data/employees` | `src/pages/master-data/employees/index.jsx` | `MdBadge` (`ic:baseline-badge`) | Child Item | `core` | `employees` |
| | | 3. Agent | `/master-data/agents` | `src/pages/master-data/agents/index.jsx` | `MdSupportAgent` (`ic:baseline-support-agent`) | Child Item | `core` | `agents`, `agent_tokens` |
| | | 4. Department | `/master-data/departments` | `src/pages/master-data/departments/index.jsx` | `MdDomain` (`ic:baseline-domain`) | Child Item | `core` | `departments` |
| | | 5. Designation | `/master-data/designations` | `src/pages/master-data/designations/index.jsx` | `MdWork` (`ic:baseline-work`) | Child Item | `core` | `designations` |
| | | 6. Role | `/master-data/roles` | `src/pages/master-data/roles/index.jsx` | `MdAdminPanelSettings` (`ic:baseline-admin-panel-settings`) | Child Item | `core` | `roles` |
| | | 7. Leave Type | `/master-data/leave-types` | `src/pages/master-data/leave-types/index.jsx` | `MdFlightTakeoff` (`ic:baseline-flight-takeoff`) | Child Item | `attendance` | `leave_types` |
| | | 8. Leave Policy | `/master-data/leave-policies` | `src/pages/master-data/leave-policies/index.jsx` | `MdRule` (`ic:baseline-rule`) | Child Item | `attendance` | `leave_policy` |
| | | 9. Leave Transaction | `/master-data/leave-transactions` | `src/pages/master-data/leave-transactions/index.jsx` | `MdSwapHoriz` (`ic:baseline-swap-horiz`) | Child Item | `attendance` | `leave_transactions` |
| | | 10. Shift | `/master-data/shifts` | `src/pages/master-data/shifts/index.jsx` | `MdSchedule` (`ic:baseline-schedule`) | Child Item | `attendance` | `shifts` |
| | | 11. HR Policy | `/master-data/hr-policies` | `src/pages/master-data/hr-policies/index.jsx` | `MdVerifiedUser` (`ic:baseline-verified-user`) | Child Item | `core` | `hr_policies` |
| | | 12. Workflow | `/master-data/workflows` | `src/pages/master-data/workflows/index.jsx` | `MdSchema` (`ic:baseline-schema`) | Child Item | `core` | `workflows` |
| | | 13. Attendance Policy | `/master-data/attendance-policies` | `src/pages/master-data/attendance-policies/index.jsx` | `MdFactCheck` (`ic:baseline-fact-check`) | Child Item | `core` | `attendance_policies` |
| | | 14. Holiday | `/master-data/holidays` | `src/pages/master-data/holidays/index.jsx` | `MdCelebration` (`ic:baseline-celebration`) | Child Item | `core` | `holidays` |
| **XV** | **Project Masters** | **Project Masters** | `#` | *Parent Group* | `MdHub` (`ic:baseline-hub`) | Parent Group | `core` | *N/A (Parent Container)* |
| | | 1. Product | `/master-data/products` | `src/pages/master-data/products/index.jsx` | `MdInventory2` (`ic:baseline-inventory-2`) | Child Item | `core` | `products` |
| | | 2. Project Type | `/master-data/project-types` | `src/pages/master-data/project-types/index.jsx` | `MdFolder` (`ic:baseline-folder`) | Child Item | `core` | `project_types` |
| | | 3. Job Type | `/master-data/job-types` | `src/pages/master-data/job-types/index.jsx` | `MdWorkHistory` (`ic:baseline-work-history`) | Child Item | `core` | `job_types` |
| | | 4. Job Category | `/master-data/job-categories` | `src/pages/master-data/job-categories/index.jsx` | `MdCategory` (`ic:baseline-category`) | Child Item | `core` | `job_categories` |
| | | 5. Lead Type | `/master-data/lead-types` | `src/pages/master-data/lead-types/index.jsx` | `MdLeaderboard` (`ic:baseline-leaderboard`) | Child Item | `crm` | `lead_types` |
| | | 6. Milestones | `/master-data/milestones` | `src/pages/master-data/milestones/index.jsx` | `MdFlag` (`ic:baseline-flag`) | Child Item | `core` | `milestones` |
| | | 7. Reference Type | `/master-data/reference-types` | `src/pages/master-data/reference-types/index.jsx` | `MdBookmark` (`ic:baseline-bookmark`) | Child Item | `crm` | `reference_types` |
| | | 8. Service Provider | `/master-data/service-providers` | `src/pages/master-data/service-providers/index.jsx` | `MdHandshake` (`ic:baseline-handshake`) | Child Item | `core` | `service_providers` |
| | | 9. Status Master | `/master-data/status-master` | `src/pages/master-data/status-master/index.jsx` | `MdChecklist` (`ic:baseline-checklist`) | Child Item | `core` | `status_configs`, `status_mappings` |
| | | 10. Task Type | `/master-data/task-types` | `src/pages/master-data/task-types/index.jsx` | `MdFormatListBulleted` (`ic:baseline-format-list-bulleted`) | Child Item | `tasks` | `task_types` |
| **XVI** | **Settings** | **Settings** | `#` | *Parent Group* | `MdSettings` (`ic:baseline-settings`) | Parent Group | `core` | *N/A (Parent Container)* |
| | | 1. General Settings | `/settings/general` | `src/pages/settings/general.jsx` | `MdTune` (`ic:baseline-tune`) | Child Item | `core` | `general_settings` |
| | | 2. Dashboard Builder | `/settings/dashboard-builder` | `src/pages/settings/dashboard-builder.jsx` | `MdViewQuilt` (`ic:baseline-view-quilt`) | Child Item | `core` | `dashboard_schemas` |
| | | 3. Designation Permission | `/settings/designation-permissions` | `src/pages/settings/designation-permissions.jsx` | `MdKey` (`ic:baseline-key`) | Child Item | `core` | `access_policies`, `designations` |
| | | 4. Role Permission | `/settings/role-permissions` | `src/pages/settings/role-permissions.jsx` | `MdLockPerson` (`ic:baseline-lock-person`) | Child Item | `core` | `access_policies`, `roles` |
| | | 5. Menu | `/settings/menu` | `src/pages/settings/menu/index.jsx` | `MdMenu` (`ic:baseline-menu`) | Child Item | `core` | `sidebars` |
| | | 6. Email Config | `/settings/email-config` | `src/pages/settings/email-config/index.jsx` | `MdEmail` (`ic:baseline-email`) | Child Item | `core` | `email_configs` |
| | | 7. Company | `/settings/company` | `src/pages/settings/company.jsx` | `MdCorporateFare` (`ic:baseline-corporate-fare`) | Child Item | `core` | `company` |
| | | 8. Capability | `/settings/capabilities` | `src/pages/settings/Capabilities.jsx` | `MdShield` (`ic:baseline-shield`) | Child Item | `core` | `capabilities` |
| **XVII** | **Messages** | Messages | `/messages` | `src/pages/messages.jsx` | `MdMessage` (`ic:baseline-message`) | Standalone | `feed` | `team_messages`, `comments_threads` |
| **XVIII** | **Teams** | Teams | `/teams` | `src/pages/Teams.jsx` | `MdGroups` (`ic:baseline-groups`) | Standalone | `hrms` | `employees`, `departments` |

---

## Mongoose SideBar Schema (`Backend/src/models/SideBar.js`)

```javascript
const SideBarSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  icon: {
    iconName: { type: String },
    iconPackage: { type: String }
  },
  mainRoute: { type: String, trim: true },
  visibility: {
    type: String,
    enum: ["public", "protected"],
    default: "protected",
    index: true
  },
  capabilities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Capability',
    default: []
  }],
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    default: null,
    index: true
  },
  moduleKey: {
    type: String,
    trim: true,
    lowercase: true,
    default: 'core',
    index: true
  },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'sidebars', default: null },
  hasChildren: { type: Boolean, default: false },
  isParent: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });
```

---

## Module Resolution Engine (`Backend/src/utils/moduleMapping.js`)

The `moduleKey` enables SaaS multi-tenancy: when a tenant organization enables or disables a module (e.g. `assets`, `payroll`, `crm`, `attendance`), the navigation builder automatically filters and serves only the sidebar items linked to active modules.
