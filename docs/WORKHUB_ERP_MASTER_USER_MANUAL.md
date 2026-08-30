# 📘 Workhub ERP Platform — Master Module-by-Module Enterprise User Manual

> **Workhub ERP Tracker Platform v3.2**  
> **Enterprise Edition:** Complete Cross-Functional Operating Guide & Analytics Playbook  
> **Target Audience:** CXOs, Operations Directors, Department Heads, HR Managers, Finance Leads, Project Managers, Sales Leads & Employees.

---

## 📑 Master Table of Contents
1. [Platform Architecture & Cross-Module Synergies](#1-platform-architecture--cross-module-synergies)
2. [Module 1: Core Platform, Security & Policy Engine](#module-1-core-platform-security--policy-engine)
3. [Module 2: HRMS & Employee Personnel Lifecycle](#module-2-hrms--employee-personnel-lifecycle)
4. [Module 3: Attendance, Leaves & Shift Scheduling Suite](#module-3-attendance-leaves--shift-scheduling-suite)
5. [Module 4: Payroll, Compensation & Tax Compliance](#module-4-payroll-compensation--tax-compliance) 
6. [Module 5: Time Tracking & Labor Cost Actualization](#module-5-time-tracking--labor-cost-actualization)
7. [Module 6: Agile Tasks, Sprints & Delivery Queues](#module-6-agile-tasks-sprints--delivery-queues)
8. [Module 7: Helpdesk & Support Ticketing System](#module-7-helpdesk--support-ticketing-system)
9. [Module 8: CRM, Commercial Pipeline & Double-Entry AR Ledger](#module-8-crm-commercial-pipeline--double-entry-ar-ledger)
10. [Module 9: Asset Lifecycle & Capex Inventory](#module-9-asset-lifecycle--capex-inventory)
11. [Module 10: Expense Management & Billable Claims](#module-10-expense-management--billable-claims)
12. [Module 11: Recruitment & Candidate Tracking (ATS)](#module-11-recruitment--candidate-tracking-ats)
13. [Module 12: Team Feeds, Messaging & Push Notifications](#module-12-team-feeds-messaging--push-notifications)
14. [Module 13: Executive MIS Intelligence, Cross-Module P&L & Analytics](#module-13-executive-mis-intelligence-cross-module-pl--analytics)
15. [Master Troubleshooting, System Health & Platform Administration](#15-master-troubleshooting-system-health--platform-administration)

---

## 1. Platform Architecture & Cross-Module Synergies

Unlike fragmented point solutions where CRM, HRMS, and Project Management operate in isolated silos, **Workhub ERP is an interconnected event-driven platform**. Every business transaction triggers cascading updates across operations, delivery, and finance:

```text
                                  WORKHUB ERP PLATFORM
                                           │
  ┌────────────────────────────────────────┼────────────────────────────────────────┐
  ▼                                        ▼                                        ▼
COMMERCIAL OPERATIONS              DELIVERY & PEOPLE                        FINANCE & ASSETS
┌──────────────────────┐          ┌──────────────────────┐                ┌──────────────────────┐
│  • Leads & Contacts  │          │  • Employee Master   │                │  • Tax Invoices      │
│  • Deal Opportunities│ ──────►  │  • Tasks & Sprints   │ ─────────────► │  • Double-Entry AR   │
│  • Price Quotations  │          │  • Time Tracking     │                │  • Payroll Runs      │
│  • Sales Contracts   │          │  • Attendance & Shift│                │  • Asset Deprec.     │
└──────────────────────┘          └──────────────────────┘                └──────────────────────┘
            │                                 │                                       │
            └─────────────────────────────────┼───────────────────────────────────────┘
                                              ▼
                              EXECUTIVE MIS & P&L INTELLIGENCE
                              • MIS-01: Loaded Labor Cost Sheet
                              • MIS-02: Real Client Profitability (Revenue - Actual Burn)
                              • MIS-04: Monthly Business Review (MBR)
                              • MIS-05: Real-Time Cash Flow Statement
```

---

## Module 1: Core Platform, Security & Policy Engine

### 1.1 Why It Exists
To provide bulletproof multi-tenant isolation, dynamic Attribute-Based Access Control (ABAC), centralized authentication, and automated audit trails without hardcoding permissions into UI or API endpoints.

### 1.2 Organizational Benefits & ROI
- **Zero Data Leakage:** Strict tenant connection sandboxing prevents cross-tenant data contamination.
- **Granular Security:** Manage access down to individual fields, actions (`create`, `read`, `update`, `delete`, `report`), and conditional filter boundaries.
- **Audit Compliance:** Immutable logs of every API mutation, login session, permission change, and system error.

### 1.3 Step-by-Step Operational Workflow
1. **Manage Roles & Policies** (`/master-data/roles`): Create functional roles (e.g., *Account Executive*, *Delivery Lead*, *Finance Manager*).
2. **Configure Access Policies** (`/policies`): Define read/write capabilities per model declaratively.
3. **Inspect Audit Trail** (`/settings` ➔ Audit Logs): Review system-wide user actions, IP addresses, and payload diffs.

### 1.4 Analytics & Intelligence
- **Permission Version Audits:** Tracks historical permission changes with rollback support.
- **System Exception Telemetry (`ErrorLog`):** Real-time monitoring of failed jobs and authentication anomalies.

---

## Module 2: HRMS & Employee Personnel Lifecycle

### 2.1 Why It Exists
Replaces manual HR spreadsheets with a unified single source of truth for the entire personnel journey—from candidate hiring and onboarding to promotion, salary revision, and separation.

### 2.2 Organizational Benefits
- **Zero Onboarding Friction:** Digital task checklists eliminate multi-day setup delays for new hires.
- **Compliance & Document Vault:** Centralized storage for Aadhaar, PAN, passports, offer letters, and contracts.
- **Career Traceability:** Full historical audit of promotions, manager reassignments, and department transfers.

### 2.3 End-to-End Workflow
```text
[ Candidate Hired ] ──► [ Automated Onboarding Template ] ──► [ Digital Document Verification ]
                                                                       │
                                                                       ▼
[ Full Employee Profile Created ] ◄── [ Salary Structure Assigned ] ◄──┘
```
1. **Onboarding Launch** (`/hrms/onboardings`): Select candidate and assign onboarding template.
2. **Document Upload & Verification** (`/hrms/documents`): New hires submit credentials; HR marks them `Verified`.
3. **Lifecycle Events** (`/hrms/employees/:id`): Log promotions, department shifts, or designation upgrades.

### 2.4 Cross-Module Linkages
- **To Payroll:** Designation and base salary feed directly into salary structure calculations.
- **To Delivery:** Employee hourly rate auto-populates time tracking cost calculations.

---

## Module 3: Attendance, Leaves & Shift Scheduling Suite

### 3.1 Why It Exists
Provides automated time and attendance tracking with support for flexible shifts, regularization workflows, remote WFH approvals, and holiday calendar enforcement.

### 3.2 Organizational Benefits
- **Eliminates Time Theft & Buddy Punching:** Tracks exact clock-in/out timestamps, late minutes, and work locations (Office / WFH).
- **Automated Leave Balances:** Deducts approved leaves dynamically against annual leave quotas.
- **Shift Flexibility:** Enables multi-shift operations (Morning, Evening, Night) with automated shift assignment history.

### 3.3 End-to-End Workflow
1. **Employee Clock-In/Out** (`/attendance`): Employees clock in via web dashboard or mobile app.
2. **Leave Application** (`/attendance/leaves`): Employee submits leave with reason and date range.
3. **Manager Approval**: Manager reviews and approves/rejects with comments.
4. **Regularization & WFH** (`/attendance/regularizations`): Employee requests timestamp correction for forgotten punches.

### 3.4 Cross-Module Linkages
- **To Payroll:** Net present days, approved paid leaves, and unexcused absences directly govern monthly salary deductions.

---

## Module 4: Payroll, Compensation & Tax Compliance

### 4.1 Why It Exists
Automates monthly payroll generation, tax deductions (PF, ESI, TDS, Professional Tax), reimbursement settlements, and salary slip generation in 1-click.

### 4.2 Organizational Benefits
- **100% Deterministic Calculations:** Eradicates calculation errors in overtime, variable allowances, and statutory contributions.
- **Statutory Compliance Ready:** Pre-calculates PF (Employer/Employee 12%), ESI (0.75%/3.25%), and output tax liabilities.
- **Confidentiality:** Strict role-gated access ensures salary details are visible only to authorized finance personnel.

### 4.3 End-to-End Workflow
```text
[ 1. Review Attendance & Approved Leaves ] ──► [ 2. Sync Approved Expense Claims ]
                                                            │
                                                            ▼
[ 4. Lock & Issue Pay Slips ] ◄── [ 3. Run Monthly Payroll Engine (/payroll) ]
```
1. **Set Salary Structures** (`/master-data/salary-structures`): Define Basic, HRA, Special Allowances, PF, and ESI formulas.
2. **Execute Payroll Run** (`/payroll/runs`): Select Month and Year, click **`Generate Payroll`**.
3. **Approve & Disburse**: Review line-by-line calculations, approve batch, and disburse bank payout files.

### 4.4 Analytics & Intelligence
- **MIS-01 (Employee Total Loaded Cost Sheet):** Full CTC + employer PF/ESI + asset amortization + non-billable expenses.
- **MIS-10 (Tax Compliance Dashboard):** Real-time breakdown of upcoming PF, ESI, and GST dues with payment calendar deadlines.

---

## Module 5: Time Tracking & Labor Cost Actualization

### 5.1 Why It Exists
Captures the exact engineering and operational hours spent per project, task, and client to calculate true delivery labor burn and project profitability.

### 5.2 Organizational Benefits
- **True Cost Transparency:** Reveals which tasks and clients consume excess engineering hours.
- **Eliminates Unprofitable Projects:** Real-time visibility into project budget burn before overrun occurs.
- **Accurate Resource Utilization:** Measures billable vs. non-billable hours per team member.

### 5.3 End-to-End Workflow
1. **Start Live Timer** (`/tasks` or Task Drawer): Select Task and click **`Start Timer`**.
2. **Log Session**: System captures `duration`, `costSnapshot` (hourly rate of employee at that moment), and `isBillable` flag.
3. **Review Timesheets** (`/reports` ➔ Utilization): Managers inspect daily and weekly team time allocations.

### 5.4 Cross-Module Linkages
- **To CRM 360° Account:** Aggregates delivery hours and labor cost against client contracts to compute Gross Margin %.

---

## Module 6: Agile Tasks, Sprints & Delivery Queues

### 6.1 Why It Exists
Enables high-velocity engineering and delivery execution using Scrum/Kanban boards, backlog grooming, sprint cadence, and task request queues.

### 6.2 Organizational Benefits
- **Clear Accountability:** Every deliverable has an assigned owner, priority, estimate, and deadline.
- **Sprint Predictability:** Tracks velocity points committed vs. delivered across sprint cycles.
- **Streamlined Requests:** Cross-functional teams can submit work requests directly into an employee's task queue with manager approval.

### 6.3 End-to-End Workflow
1. **Backlog & Sprint Planning** (`/tasks/sprints`): Create sprint, estimate story points, and add tasks.
2. **Execution Kanban** (`/tasks`): Move cards from `To Do` ➔ `In Progress` ➔ `Review` ➔ `Done`.
3. **Task Queue Requests** (`/tasks/queue-requests`): Submit ad-hoc work requests across departments.

---

## Module 7: Helpdesk & Support Ticketing System

### 7.1 Why It Exists
Centralizes internal and external support requests, IT tickets, and client bug reports with automated SLA timers and escalation paths.

### 7.2 Organizational Benefits
- **Zero Dropped Issues:** Real-time SLA breach countdowns prevent delayed responses.
- **Threaded Collaboration:** Rich markdown discussions, file attachments, and internal private notes.
- **Root Cause Categorization:** Tracks ticket frequency by category (Hardware, Software Bug, Feature Request).

### 7.3 End-to-End Workflow
1. **Raise Ticket** (`/tickets`): User or client submits ticket with priority (`Low`, `Medium`, `High`, `Urgent`).
2. **Assignment & SLA Start**: System auto-assigns agent and starts SLA response timer.
3. **Resolution & Feedback**: Agent resolves issue, logs root cause, and marks status as `Resolved`.

---

## Module 8: CRM, Commercial Pipeline & Double-Entry AR Ledger

### 8.1 Why It Exists
Orchestrates the entire revenue operations lifecycle: Lead capture, Opportunity pipeline, Quotations, Contracts (OAs), Tax Invoices, and automated double-entry Accounts Receivable ledger reconciliation.

### 8.2 Organizational Benefits
- **Eliminates Deal Leakage:** Drag-and-drop opportunity board with weighted revenue forecasting.
- **Automated Financial Accounting:** Issuing an invoice automatically creates an AR Credit entry; verifying a payment creates a Cash Debit entry.
- **360° Customer Intelligence:** Combines commercial contracts, outstanding receivables, and delivery labor costs in one unified cockpit.

### 8.3 End-to-End Commercial Flow
```text
[ Lead Contact ] ──► [ Opportunity Deal ] ──► [ Price Quotation ]
                                                      │
                                                      ▼
[ AR Ledger Settle ] ◄── [ Tax Invoice ] ◄── [ Order Acknowledgment (OA) ]
```

---

## Module 9: Asset Lifecycle & Capex Inventory

### 9.1 Why It Exists
Tracks physical hardware (laptops, monitors, servers) and software licenses throughout their entire lifecycle—from vendor purchase to employee allocation, repair incidents, and depreciation.

### 9.2 Organizational Benefits
- **Prevents Asset Loss:** Digital sign-off and audit history of which employee holds which asset.
- **Automated Amortization:** Calculates monthly depreciation (36-month SLM) and factors it into loaded employee costs.
- **Repair History:** Tracks maintenance spend per asset to identify end-of-life hardware.

### 9.3 End-to-End Workflow
1. **Record Purchase** (`/assets/purchases`): Log PO, vendor invoice, purchase price, and serial numbers.
2. **Allocate Asset** (`/assets/allocations`): Assign asset to employee with allocation date.
3. **Log Incident / Repair** (`/assets/repairs`): Report damaged hardware and track repair cost.

---

## Module 10: Expense Management & Billable Claims

### 10.1 Why It Exists
Allows employees to submit travel, food, software, and operational expense receipts with multi-level manager approval and client reimbursement tagging.

### 10.2 Organizational Benefits
- **Zero Fraudulent Claims:** Digital receipt attachment and policy verification (within budget caps).
- **Client Pass-Through Billing:** Billable client expenses are automatically aggregated into customer profitability sheets.
- **Fast Reimbursements:** Direct handoff to monthly payroll or finance payout batches.

---

## Module 11: Recruitment & Candidate Tracking (ATS)

### 11.1 Why It Exists
Manages job openings, incoming candidate resumes, multi-round interview stages, evaluation scorecards, and seamless 1-click conversion to employee onboarding.

### 11.2 Organizational Benefits
- **Structured Hiring Pipeline:** Visual candidate stages: `Applied` ➔ `Screening` ➔ `Interview` ➔ `Offer` ➔ `Hired`.
- **Handoff Without Retyping:** Converting a hired candidate automatically pre-fills their employee and onboarding records.

---

## Module 12: Team Feeds, Messaging & Push Notifications

### 12.1 Why It Exists
Internal social feed and real-time messaging hub for organization-wide announcements, channel discussions, direct messages, and FCM push notifications.

### 12.2 Organizational Benefits
- **Replaces Scattered Chat Apps:** Keeps organizational discussions, task references, and file attachments securely inside the ERP.
- **Instant System Alerts:** High-priority push notifications for leave approvals, ticket assignments, and payment verifications.

---

## Module 13: Executive MIS Intelligence, Cross-Module P&L & Analytics

### 13.1 Why It Exists
The core analytical brain of the platform. Synthesizes data across all 12 modules to deliver real-time P&L visibility, cash flow projections, and unit economics.

### 13.2 Complete Standard MIS Catalog

| Report ID | Title | Strategic Value |
|---|---|---|
| **MIS-01** | **Employee Total Cost Sheet** | Loaded employee cost = `Gross Salary + PF/ESI + Amortized Asset Cost + Non-Billable Expenses`. Derives accurate hourly cost rates. |
| **MIS-02** | **Client Profitability Analysis** | Real gross margin = `Invoiced Revenue - (Delivery Hours × Hourly Cost + Expenses)`. Identifies profit drivers vs. loss-makers. |
| **MIS-03** | **Department Scorecard** | Headcount, task completion %, ticket SLA compliance, expense spend, and payroll cost per department. |
| **MIS-04** | **Monthly Business Review (MBR)** | Total revenue, cash collections, payroll outflows, operational opex, capex, and net operating margin. |
| **MIS-05** | **Cash Flow Statement** | Operating inflows (client collections) vs. operating outflows (salaries, reimbursements, vendor payments) = Net Cash Position. |
| **MIS-06** | **Revenue vs. Cost Trend** | 12-month rolling trend comparing monthly revenue against total operating expenses. |
| **MIS-07** | **Employee Utilization Report** | Billable vs. non-billable hours logged vs. total paid hours (identifies bench capacity). |
| **MIS-08** | **Vendor Consolidation Report** | Total spend and outstanding payables across hardware suppliers and service providers. |
| **MIS-09** | **Period Closure Dashboard** | Multi-module month-end closing checklist (Payroll, Expenses, Attendance, CRM). |
| **MIS-10** | **Tax Compliance Dashboard** | Consolidated calendar of PF, ESI, Output GST, Input Tax Credit (ITC), and Net GST payable. |

---

## 15. Master Troubleshooting, System Health & Platform Administration

### Common Scenarios & Resolutions:

1. **"Model [name] is not registered on active tenant context"**
   - *Cause:* Model is missing from `staticModelMap` or `MODULE_DEFINITIONS` in `tenantRegistry.js`.
   - *Resolution:* Add model to `Backend/src/models/tenantRegistry.js` and restart backend.

2. **"Cannot win opportunity: Linked quotation is not approved"**
   - *Cause:* Sacred business rule prevents closing deals without an authorized quotation.
   - *Resolution:* Open the quotation, approve it, and then advance the deal to `Won`.

3. **"Payment is verified and locked"**
   - *Cause:* Verified financial receipts are immutable to preserve double-entry audit integrity.
   - *Resolution:* To adjust, create an offsetting journal adjustment rather than mutating locked records.

---

*© 2026 Workhub ERP Platform. All Rights Reserved. Enterprise Edition.*
