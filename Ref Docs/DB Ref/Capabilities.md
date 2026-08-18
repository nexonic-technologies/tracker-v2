# Master Application Capabilities Matrix & Vocabulary

## Overview
This document specifies the unified **Capabilities Matrix** across the 18 root domains and 62 navigation nodes of the Workhub ERP Tracker platform. 

Capabilities control frontend UI element visibility, route access permissions, action buttons (Create, Edit, Delete, Approve, Export), and data-plane security guards evaluated through the Dynamic Policy Engine.

### Capability Schema (`Backend/src/models/Capability.js`)
```javascript
const CapabilitySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true }, // e.g. "employees:create"
  action: { type: String, trim: true, index: true },                // "view" | "create" | "update" | "delete" | "approve"
  module: { type: String, trim: true, index: true },                // "core" | "attendance" | "hrms" | "tasks" | "tickets" | "crm" | "assets" | "feed"
  label: { type: String, required: true, trim: true },              // "Create Employee Master"
  description: { type: String, trim: true },                       // "Allows user to create employee master records"
  status: { type: String, enum: ['active', 'deprecated'], default: 'active' },
  type: { type: String, enum: ['ui', 'business'], default: 'ui', index: true }
}, { timestamps: true, collection: 'capabilities' });
```

---

## Capabilities Classification Rules

1. **Read-Only / Analytics / Audits / Reports (1 Action: `view`)**:
   - Executive Dashboards & Analytics (`dashboard:view`, `headcount_analytics:view`, `payroll_analytics:view`, `accounts_analytics:view`, `accounts_productivity:view`)
   - Reports Hubs & Catalogs (`attendance_reports:view`, `hrms_reports:view`, `tickets_reports:view`, `tasks_reports:view`, `assets_reports:view`, `accounts_reports:view`, `mis_report:view`, `payroll_records_report:view`)
   - Compliance & Audit Summaries (`bank_advice:view`, `daily_attendance_audit:view`, `esi_returns:view`, `lifecycle_audit:view`, `onboarding_sla:view`, `pf_ecr:view`, `crm_ledger:view`, `accounts_ledger:view`, `attendance_summary:view`, `tasks_timeline:view`)
   - Company Policy Viewers (`company_policies:view`)

2. **Full CRUD Domain Entities (4 Actions: `view`, `create`, `update`, `delete`)**:
   - All Master Data catalogs (`clients`, `employees`, `agents`, `departments`, `designations`, `roles`, `leave_types`, `leave_policies`, `leave_transactions`, `shifts`, `hr_policies`, `workflows`, `attendance_policies`, `holidays`, `products`, `project_types`, `job_types`, `job_categories`, `lead_types`, `milestones`, `reference_types`, `service_providers`, `status_master`, `task_types`)
   - Transactional Modules (`tickets`, `tasks`, `contacts`, `orders`, `quotations`, `order_acknowledgements`, `crm_payments`, `assets_categories`, `assets_grn`, `assets_register`, `assets_allocations`, `assets_incidents`, `assets_invoices`, `assets_payments`, `assets_repairs`, `assets_vendors`, `payroll`, `accounts_payments`, `regularizations`, `shift_roster`, `daily_activities`, `travel_expenses`, `menu`, `email_config`, `capabilities`, `teams`, `feed`)

3. **Workflow & Status Gate Actions (`view`, `approve` / `update`)**:
   - Pending Approvals (`pending_approvals:view`, `pending_approvals:approve`)
   - Configuration / Settings Editors (`general_settings:view`, `general_settings:update`, `company:view`, `company:update`, `dashboard_builder:view`, `dashboard_builder:update`, `designation_permissions:view`, `designation_permissions:update`, `role_permissions:view`, `role_permissions:update`, `profile:view`, `profile:update`)
   - Messaging (`messages:view`, `messages:create`, `messages:delete`)

---

## Domain Capabilities Catalog

### I. Dashboard (`/dashboard`) — `module: core`
| Capability Key | Action | Label | Type | Description |
|---|---|---|---|---|
| `dashboard:view` | `view` | View Dashboard | `ui` | View executive system dashboard, widgets, and activity summaries |

---

### II. Feeds (`/feed`) — `module: feed`
| Capability Key | Action | Label | Type | Description |
|---|---|---|---|---|
| `feed:view` | `view` | View Feeds | `ui` | View company announcements, channel feeds, and posts |
| `feed:create` | `create` | Create Feeds | `ui` | Create announcements, channels, and social posts |
| `feed:update` | `update` | Update Feeds | `ui` | Edit announcement channels and post contents |
| `feed:delete` | `delete` | Delete Feeds | `ui` | Delete posts, announcements, and channel threads |

---

### III. Tracker Suite — `module: attendance`
| Menu Screen / Entity | Route | Capability Keys | Actions |
|---|---|---|---|
| **Tracker Group** | `#` | `tracker:view` | `view` |
| **Attendance Check-In** | `/attendance` | `attendance:view`, `attendance:create`, `attendance:update` | `view`, `create`, `update` |
| **Leave & Regularization** | `/attendance/leave-regularization` | `regularizations:view`, `regularizations:create`, `regularizations:update`, `regularizations:delete` | `view`, `create`, `update`, `delete` |
| **Attendance Reports** | `/attendance/reports` | `attendance_reports:view` | `view` |
| **Attendance Policies** | `/attendance/policies` | `attendance_policies:view`, `attendance_policies:create`, `attendance_policies:update`, `attendance_policies:delete` | `view`, `create`, `update`, `delete` |
| **Shift Roster** | `/attendance/shift-roster` | `shift_roster:view`, `shift_roster:create`, `shift_roster:update`, `shift_roster:delete` | `view`, `create`, `update`, `delete` |
| **Pending Approvals** | `/attendance/pending-approvals` | `pending_approvals:view`, `pending_approvals:approve` | `view`, `approve` |
| **Monthly Summary** | `/attendance/monthly-summary` | `attendance_summary:view` | `view` |
| **Daily Activities** | `/attendance/daily-tracker` | `daily_activities:view`, `daily_activities:create`, `daily_activities:update`, `daily_activities:delete` | `view`, `create`, `update`, `delete` |
| **Travel Expenses** | `/attendance/travel-expenses` | `travel_expenses:view`, `travel_expenses:create`, `travel_expenses:update`, `travel_expenses:delete` | `view`, `create`, `update`, `delete` |

---

### IV. HRMS Suite — `module: hrms`
| Menu Screen / Entity | Route | Capability Keys | Actions |
|---|---|---|---|
| **HRMS Group** | `#` | `hrms:view` | `view` |
| **HR Management** | `/hrms` | `hrms:view`, `hrms:create`, `hrms:update`, `hrms:delete` | `view`, `create`, `update`, `delete` |
| **Bank Advice** | `/hrms/bank-advice` | `bank_advice:view` | `view` |
| **Daily Attendance Audit** | `/hrms/daily-attendance` | `daily_attendance_audit:view` | `view` |
| **ESI Returns** | `/hrms/esi-return` | `esi_returns:view` | `view` |
| **Headcount Analytics** | `/hrms/headcount-analytics` | `headcount_analytics:view` | `view` |
| **Lifecycle Audit** | `/hrms/lifecycle-audit` | `lifecycle_audit:view` | `view` |
| **Monthly Payroll** | `/hrms/monthly-payroll` | `monthly_payroll:view`, `monthly_payroll:create`, `monthly_payroll:update` | `view`, `create`, `update` |
| **Onboarding SLA** | `/hrms/onboarding-sla` | `onboarding_sla:view` | `view` |
| **PF ECR** | `/hrms/pf-ecr` | `pf_ecr:view` | `view` |
| **HRMS Reports Hub** | `/hrms/reports` | `hrms_reports:view` | `view` |

---

### V. HelpDesk — `module: tickets`
| Menu Screen / Entity | Route | Capability Keys | Actions |
|---|---|---|---|
| **HelpDesk Group** | `#` | `tickets:view` | `view` |
| **All Tickets** | `/tickets` | `tickets:view`, `tickets:create`, `tickets:update`, `tickets:delete` | `view`, `create`, `update`, `delete` |
| **My Tickets** | `/tickets/my-tickets` | `my_tickets:view`, `my_tickets:create`, `my_tickets:update` | `view`, `create`, `update` |
| **Helpdesk Reports** | `/tickets/reports` | `tickets_reports:view` | `view` |

---

### VI. Tasks & Project Tracker — `module: tasks`
| Menu Screen / Entity | Route | Capability Keys | Actions |
|---|---|---|---|
| **Tasks Group** | `#` | `tasks:view` | `view` |
| **Project Management** | `/tasks` | `tasks:view`, `tasks:create`, `tasks:update`, `tasks:delete` | `view`, `create`, `update`, `delete` |
| **My Tasks** | `/tasks/my-tasks` | `my_tasks:view`, `my_tasks:create`, `my_tasks:update` | `view`, `create`, `update` |
| **Client Tasks** | `/tasks/client-tasks` | `client_tasks:view`, `client_tasks:create`, `client_tasks:update` | `view`, `create`, `update` |
| **Activity Timeline** | `/tasks/activity-timeline` | `tasks_timeline:view` | `view` |
| **Task Reports** | `/tasks/reports` | `tasks_reports:view` | `view` |

---

### VII. CRM & Client Management — `module: crm`
| Menu Screen / Entity | Route | Capability Keys | Actions |
|---|---|---|---|
| **CRM Group** | `#` | `crm:view` | `view` |
| **CRM Dashboard** | `/crm` | `crm:view` | `view` |
| **Contacts** | `/crm/contacts` | `contacts:view`, `contacts:create`, `contacts:update`, `contacts:delete` | `view`, `create`, `update`, `delete` |
| **CRM Ledger** | `/crm/ledger` | `crm_ledger:view` | `view` |
| **Order Acknowledgment** | `/crm/order-acknowledgement` | `order_acknowledgements:view`, `order_acknowledgements:create`, `order_acknowledgements:update`, `order_acknowledgements:delete` | `view`, `create`, `update`, `delete` |
| **Orders** | `/crm/orders` | `orders:view`, `orders:create`, `orders:update`, `orders:delete` | `view`, `create`, `update`, `delete` |
| **CRM Payments** | `/crm/payments` | `crm_payments:view`, `crm_payments:create`, `crm_payments:update`, `crm_payments:delete` | `view`, `create`, `update`, `delete` |
| **Quotations** | `/crm/quotations` | `quotations:view`, `quotations:create`, `quotations:update`, `quotations:delete` | `view`, `create`, `update`, `delete` |

---

### VIII. Profile (`/profile`) — `module: core`
| Capability Key | Action | Label | Type | Description |
|---|---|---|---|---|
| `profile:view` | `view` | View User Profile | `ui` | View personal account credentials and profile |
| `profile:update` | `update` | Update User Profile | `ui` | Edit profile details, avatar, and contact settings |

---

### IX. Policies (`/policies`) — `module: core`
| Capability Key | Action | Label | Type | Description |
|---|---|---|---|---|
| `company_policies:view` | `view` | View Company Policies | `ui` | Read and acknowledge company HR and operational policies |

---

### X. Assets Management — `module: assets`
| Menu Screen / Entity | Route | Capability Keys | Actions |
|---|---|---|---|
| **Assets Group** | `#` | `assets:view` | `view` |
| **Asset Categories** | `/assets/categories` | `assets_categories:view`, `assets_categories:create`, `assets_categories:update`, `assets_categories:delete` | `view`, `create`, `update`, `delete` |
| **Goods Received Note (GRN)** | `/assets/grn` | `assets_grn:view`, `assets_grn:create`, `assets_grn:update`, `assets_grn:delete` | `view`, `create`, `update`, `delete` |
| **Asset Register** | `/assets/register` | `assets_register:view`, `assets_register:create`, `assets_register:update`, `assets_register:delete` | `view`, `create`, `update`, `delete` |
| **Asset Allocations** | `/assets/allocations` | `assets_allocations:view`, `assets_allocations:create`, `assets_allocations:update`, `assets_allocations:delete` | `view`, `create`, `update`, `delete` |
| **Asset Incidents** | `/assets/incidents` | `assets_incidents:view`, `assets_incidents:create`, `assets_incidents:update`, `assets_incidents:delete` | `view`, `create`, `update`, `delete` |
| **Asset Invoices** | `/assets/invoices` | `assets_invoices:view`, `assets_invoices:create`, `assets_invoices:update`, `assets_invoices:delete` | `view`, `create`, `update`, `delete` |
| **Asset Payments** | `/assets/payments` | `assets_payments:view`, `assets_payments:create`, `assets_payments:update`, `assets_payments:delete` | `view`, `create`, `update`, `delete` |
| **Asset Repairs** | `/assets/repairs` | `assets_repairs:view`, `assets_repairs:create`, `assets_repairs:update`, `assets_repairs:delete` | `view`, `create`, `update`, `delete` |
| **Vendor Registration** | `/assets/vendors` | `assets_vendors:view`, `assets_vendors:create`, `assets_vendors:update`, `assets_vendors:delete` | `view`, `create`, `update`, `delete` |
| **Asset Reports** | `/assets/reports` | `assets_reports:view` | `view` |

---

### XI. Payroll — `module: attendance`
| Menu Screen / Entity | Route | Capability Keys | Actions |
|---|---|---|---|
| **Payroll Group** | `#` | `payroll:view` | `view` |
| **Payroll Management** | `/payroll` | `payroll:view`, `payroll:create`, `payroll:update`, `payroll:delete` | `view`, `create`, `update`, `delete` |
| **Payroll Analytics** | `/payroll/dashboard` | `payroll_analytics:view` | `view` |

---

### XII. Accounts — `module: accounts` (UI Access Group)
| Menu Screen / Entity | Route | Capability Keys | Actions |
|---|---|---|---|
| **Accounts Group** | `#` | `accounts:view` | `view` |
| **Accounts Analytics** | `/accounts` | `accounts_analytics:view` | `view` |
| **Financial Ledger** | `/accounts/ledger` | `accounts_ledger:view` | `view` |
| **Accounts Payments** | `/accounts/payments` | `accounts_payments:view`, `accounts_payments:create`, `accounts_payments:update`, `accounts_payments:delete` | `view`, `create`, `update`, `delete` |
| **Productivity Analytics** | `/accounts/productivity` | `accounts_productivity:view` | `view` |
| **Accounts Reports** | `/accounts/reports` | `accounts_reports:view` | `view` |

---

### XIII. Reports Hub — `module: core`
| Menu Screen / Entity | Route | Capability Keys | Actions |
|---|---|---|---|
| **Executive Reports Group** | `#` | `reports_hub:view` | `view` |
| **MIS Executive Cockpit** | `/reports/mis-report-cockpit` | `mis_report:view` | `view` |
| **Payroll Submission Records** | `/reports/payroll-submission` | `payroll_records_report:view` | `view` |

---

### XIV. Core Masters — `module: core` / `module: hrms` / `module: attendance`
| Master Entity | Route | Capability Keys | Actions | Module |
|---|---|---|---|---|
| **Masters Group** | `#` | `masters:view` | `view` | `core` |
| **Client Master** | `/master-data/clients` | `clients:view`, `clients:create`, `clients:update`, `clients:delete` | Full CRUD | `crm` |
| **Employee Master** | `/master-data/employees` | `employees:view`, `employees:create`, `employees:update`, `employees:delete` | Full CRUD | `hrms` |
| **Agent Master** | `/master-data/agents` | `agents:view`, `agents:create`, `agents:update`, `agents:delete` | Full CRUD | `core` |
| **Department Master** | `/master-data/departments` | `departments:view`, `departments:create`, `departments:update`, `departments:delete` | Full CRUD | `hrms` |
| **Designation Master** | `/master-data/designations` | `designations:view`, `designations:create`, `designations:update`, `designations:delete` | Full CRUD | `hrms` |
| **Role Master** | `/master-data/roles` | `roles:view`, `roles:create`, `roles:update`, `roles:delete` | Full CRUD | `core` |
| **Leave Type Master** | `/master-data/leave-types` | `leave_types:view`, `leave_types:create`, `leave_types:update`, `leave_types:delete` | Full CRUD | `attendance` |
| **Leave Policy Master** | `/master-data/leave-policies` | `leave_policies:view`, `leave_policies:create`, `leave_policies:update`, `leave_policies:delete` | Full CRUD | `attendance` |
| **Leave Transaction Master** | `/master-data/leave-transactions` | `leave_transactions:view`, `leave_transactions:create`, `leave_transactions:update`, `leave_transactions:delete` | Full CRUD | `attendance` |
| **Shift Master** | `/master-data/shifts` | `shifts:view`, `shifts:create`, `shifts:update`, `shifts:delete` | Full CRUD | `attendance` |
| **HR Policy Master** | `/master-data/hr-policies` | `hr_policies:view`, `hr_policies:create`, `hr_policies:update`, `hr_policies:delete` | Full CRUD | `hrms` |
| **Workflow Master** | `/master-data/workflows` | `workflows:view`, `workflows:create`, `workflows:update`, `workflows:delete` | Full CRUD | `core` |
| **Attendance Policy Master** | `/master-data/attendance-policies` | `attendance_policies:view`, `attendance_policies:create`, `attendance_policies:update`, `attendance_policies:delete` | Full CRUD | `attendance` |
| **Holiday Master** | `/master-data/holidays` | `holidays:view`, `holidays:create`, `holidays:update`, `holidays:delete` | Full CRUD | `attendance` |

---

### XV. Project Masters — `module: core` / `module: tasks` / `module: recruitment`
| Master Entity | Route | Capability Keys | Actions | Module |
|---|---|---|---|---|
| **Project Masters Group** | `#` | `project_masters:view` | `view` | `core` |
| **Product Master** | `/master-data/products` | `products:view`, `products:create`, `products:update`, `products:delete` | Full CRUD | `core` |
| **Project Type Master** | `/master-data/project-types` | `project_types:view`, `project_types:create`, `project_types:update`, `project_types:delete` | Full CRUD | `tasks` |
| **Job Type Master** | `/master-data/job-types` | `job_types:view`, `job_types:create`, `job_types:update`, `job_types:delete` | Full CRUD | `recruitment` |
| **Job Category Master** | `/master-data/job-categories` | `job_categories:view`, `job_categories:create`, `job_categories:update`, `job_categories:delete` | Full CRUD | `recruitment` |
| **Lead Type Master** | `/master-data/lead-types` | `lead_types:view`, `lead_types:create`, `lead_types:update`, `lead_types:delete` | Full CRUD | `crm` |
| **Milestones Master** | `/master-data/milestones` | `milestones:view`, `milestones:create`, `milestones:update`, `milestones:delete` | Full CRUD | `tasks` |
| **Reference Type Master** | `/master-data/reference-types` | `reference_types:view`, `reference_types:create`, `reference_types:update`, `reference_types:delete` | Full CRUD | `crm` |
| **Service Provider Master** | `/master-data/service-providers` | `service_providers:view`, `service_providers:create`, `service_providers:update`, `service_providers:delete` | Full CRUD | `core` |
| **Status Master** | `/master-data/status-master` | `status_master:view`, `status_master:create`, `status_master:update`, `status_master:delete` | Full CRUD | `core` |
| **Task Type Master** | `/master-data/task-types` | `task_types:view`, `task_types:create`, `task_types:update`, `task_types:delete` | Full CRUD | `tasks` |

---

### XVI. System Settings — `module: core`
| Menu Screen / Entity | Route | Capability Keys | Actions |
|---|---|---|---|
| **Settings Group** | `#` | `settings:view` | `view` |
| **General Settings** | `/settings/general` | `general_settings:view`, `general_settings:update` | `view`, `update` |
| **Dashboard Builder** | `/settings/dashboard-builder` | `dashboard_builder:view`, `dashboard_builder:update` | `view`, `update` |
| **Designation Permissions** | `/settings/designation-permissions` | `designation_permissions:view`, `designation_permissions:update` | `view`, `update` |
| **Role Permissions** | `/settings/role-permissions` | `role_permissions:view`, `role_permissions:update` | `view`, `update` |
| **Menu Management** | `/settings/menu` | `menu:view`, `menu:create`, `menu:update`, `menu:delete` | `view`, `create`, `update`, `delete` |
| **Email Configuration** | `/settings/email-config` | `email_config:view`, `email_config:create`, `email_config:update`, `email_config:delete` | `view`, `create`, `update`, `delete` |
| **Company Profile** | `/settings/company` | `company:view`, `company:update` | `view`, `update` |
| **Capability Registry** | `/settings/capabilities` | `capabilities:view`, `capabilities:create`, `capabilities:update`, `capabilities:delete` | `view`, `create`, `update`, `delete` |

---

### XVII. Messages (`/messages`) — `module: feed`
| Capability Key | Action | Label | Type | Description |
|---|---|---|---|---|
| `messages:view` | `view` | View Team Messages | `ui` | View direct and group chat messages |
| `messages:create` | `create` | Send Team Message | `ui` | Compose and send direct and team messages |
| `messages:delete` | `delete` | Delete Team Message | `ui` | Delete sent messages and conversations |

---

### XVIII. Teams (`/teams`) — `module: hrms`
| Capability Key | Action | Label | Type | Description |
|---|---|---|---|---|
| `teams:view` | `view` | View Teams | `ui` | View organizational teams, members, and structures |
| `teams:create` | `create` | Create Team | `ui` | Create new organizational teams and working groups |
| `teams:update` | `update` | Update Team | `ui` | Edit team memberships, team leads, and metadata |
| `teams:delete` | `delete` | Delete Team | `ui` | Remove working teams and groups |

---

## Seeding & Database Synchronization Script

Execute the generator script to re-compile the capability JSON registries and link them to sidebar navigation documents:

```bash
cd scripts/playground
node generate-menu-capabilities.js
node feed-capablities.js
node feed-sidebars.js
```
