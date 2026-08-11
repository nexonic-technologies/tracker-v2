# Tracker ERP — Master Reporting Architecture

> **Version:** 1.0 — July 2026
> **Scope:** All modules
> **Status:** Specification — Engineering Implementation Ready

---

## 1. Reporting Philosophy

Tracker reports exist to answer **one business question per report**.

A report is successful when a manager can make a decision from it within minutes. Not when it looks impressive. Not when it has many charts. When the right number, in the right context, leads to a clear action.

**The chain of trust:**
```
Raw business events (punches, tasks, payments)
        ↓
Trusted records in Tracker (MongoDB collections)
        ↓
Aggregation via buildReport() (single engine)
        ↓
Role-filtered, column-secured result
        ↓
Report UI (table + optional chart)
        ↓
Decision by manager
```

Every number presented in a report must be traceable to the individual records that produced it via drill-down. No number may be presented without that traceability.

---

## 2. Module Map

| Module | Plan Document | Reports | Models Used |
|---|---|:---:|---|
| HRMS | [HRMS-Reporting-Plan.md](./HRMS-Reporting-Plan.md) | 23 | Employee, Attendance, Leave, Payroll, PayrollRun, SalaryStructure, Onboarding, Candidate |
| Tasks | [Tasks-Reporting-Plan.md](./Tasks-Reporting-Plan.md) | 9 | Tasks, Sprint, MileStone, time_tracker_session, DailyActivity |
| Helpdesk | [Helpdesk-Reporting-Plan.md](./Helpdesk-Reporting-Plan.md) | 10 | Ticket, TicketComment, TicketStatusHistory, TicketAssignment |
| Assets | [Assets-Reporting-Plan.md](./Assets-Reporting-Plan.md) | 11 | Asset, AssetAllocation, AssetIncident, AssetRepair, AssetPurchase |
| CRM | [CRM-Reporting-Plan.md](./CRM-Reporting-Plan.md) | 11 | Client, Quotation, OrderAcknowledgment, Collection, Payment, CRMActivity |
| People | [People-Reporting-Plan.md](./People-Reporting-Plan.md) | 9 | Expense, WFHRequest, DailyActivity |
| **Total** | — | **73** | — |

---

## 3. Shared Backend Architecture

### 3.1 Report Engine — `buildReport()`

The existing `buildReportQuery.js` handles basic aggregation and population. The full reporting system requires it to be extended with the following shared services:

```
src/reportEngine/
├── buildReport.js           ← Extended core (wraps buildReportQuery)
├── aggregationEngine.js     ← SUM/COUNT/AVG/groupBy/subGroupBy/date-bucket
├── permissionResolver.js    ← Role → allowed rows (ABAC policies)
├── columnResolver.js        ← Strips restricted columns from results
├── dateRangeResolver.js     ← { startDate, endDate, dateField } → $match
├── drillDownResolver.js     ← { reportId, kpiKey, filters } → detail query
├── exportGenerator.js       ← Excel (xlsx), CSV (custom schema), PDF (pdfkit)
└── cacheLayer.js            ← TTL cache keyed by reportId+filters+roleId
```

**Design rule:** No report implements its own aggregation logic. All computation flows through these shared services. This guarantees consistent numbers across all reports that read the same data.

---

### 3.2 `aggregationEngine.js` — Contract

```js
/**
 * Build a MongoDB aggregation pipeline for a report.
 *
 * @param {Object} config
 * @param {string} config.modelName         — Target collection
 * @param {Object} config.filter            — Pre-validated ABAC filter ($match stage)
 * @param {Object} config.dateRange         — { startDate, endDate, dateField }
 * @param {string} config.groupBy           — Field to group by
 * @param {string} [config.subGroupBy]      — Secondary grouping field
 * @param {string[]} [config.sum]           — Fields to SUM
 * @param {string[]} [config.count]         — Fields to COUNT
 * @param {string[]} [config.avg]           — Fields to AVG
 * @param {string[]} [config.populate]      — Lookup joins before grouping
 * @param {Object}  [config.sort]           — MongoDB sort stage
 * @param {number}  [config.limit]          — Pagination limit
 * @param {number}  [config.skip]           — Pagination skip
 * @param {Object}  [config.computedFields] — { fieldName: $expr definition }
 *
 * @returns {Object[]} MongoDB aggregation pipeline
 */
export function buildAggregationPipeline(config) { ... }
```

**Computed field support** (server-side, not frontend):
- `daysOverdue`: `{ $max: [0, { $subtract: [today, "$dueDate"] }] }` / 86400000
- `daysInStatus`: `{ $subtract: [today, "$lastStatusChangedAt"] }` / 86400000
- `firstResponseTime`: requires sub-pipeline join to comments collection
- `agingBucket`: `$switch` on `daysOverdue`
- `resolutionTime`: `{ $subtract: ["$resolvedAt", "$createdAt"] }` / 3600000

---

### 3.3 `permissionResolver.js` — Contract

```js
/**
 * Returns the row-level $match filter for a given user + reportId.
 *
 * Rules:
 * - Superadmin/HR: no row filter (all rows)
 * - Manager: filter by { assignedTo: { $in: managedEmployeeIds } }
 *            OR { department: managerId.department }
 * - Employee (isSelf): filter by { employeeId: userId } or { assignedTo: userId }
 * - Finance: no salary filter; receives salary columns
 *
 * @param {Object} user    — { id, role, managedEmployees[], department }
 * @param {string} reportId
 * @returns {Object}       — MongoDB $match filter to inject into pipeline
 */
export function resolveRowPermission(user, reportId) { ... }
```

---

### 3.4 `columnResolver.js` — Contract

```js
/**
 * Strips columns the user's role is not permitted to see.
 *
 * Column rules are defined per report in the reporting config registry.
 * Example: salary columns (grossSalary, netSalary, earnedBreakdown) are
 * stripped for all roles except Finance and HR.
 *
 * @param {Object[]} rows     — Raw result from aggregation
 * @param {string}   role     — User role
 * @param {string}   reportId
 * @returns {Object[]}        — Rows with restricted columns removed
 */
export function stripRestrictedColumns(rows, role, reportId) { ... }
```

---

### 3.5 `drillDownResolver.js` — Contract

The drill-down is the mechanism that guarantees every number is explainable.

```js
/**
 * Maps a KPI click to a detail query.
 *
 * @param {Object} ctx
 * @param {string} ctx.reportId    — e.g., 'H-05'
 * @param {string} ctx.kpiKey      — e.g., 'lateArrivals'
 * @param {Object} ctx.filters     — Applied report filters (date, dept, etc.)
 * @param {Object} ctx.user        — Current user (for permission scope)
 * @returns {Object}               — { modelName, filter, populate, fields }
 *                                   — Ready to pass to buildReadQuery or buildReport
 */
export function resolveDrillDown(ctx) { ... }
```

**Critical invariant:** The filter produced by `resolveDrillDown` must be identical to the filter used to compute the KPI. If the KPI counted 18 late employees, clicking it must show exactly 18 records — never 17 or 19.

---

### 3.6 `exportGenerator.js` — Contract

```js
/**
 * Generate a file export from report data.
 *
 * @param {Object[]} rows       — Report rows (post column-resolver)
 * @param {Object}   schema     — Column definitions: { key, label, format }
 * @param {string}   format     — 'excel' | 'csv' | 'pdf'
 * @param {Object}   [options]  — PDF: { title, subtitle, logo }
 *                               CSV: { delimiter, lineEnding, headerMap }
 * @returns {Buffer}            — File buffer for HTTP response
 */
export async function generateExport(rows, schema, format, options) { ... }
```

Government-format CSV exports (PF ECR, ESI) define their own `headerMap` object that maps internal field names to the government column names. This decouples format changes from report logic.

---

### 3.7 `cacheLayer.js` — Policy

```js
/**
 * Cache key: `report:${reportId}:${roleId}:${hash(filters)}`
 * TTL: per-report configuration (see individual report specs)
 *
 * Invalidation strategy:
 * - Model create/update events clear relevant report caches via event tags
 * - Example: employee.create → invalidates 'report:H-01:*'
 * - Salary reports (H-15, H-02): manual invalidation on PayrollRun status change
 *
 * Rules:
 * - KPI card results: cacheable (see per-report TTL)
 * - Detail table rows: NOT cacheable for salary/statutory reports
 * - Export results: never cached (always fresh)
 */
```

---

## 4. Security Architecture

### 4.1 Permission Levels
```
Report Level    — Can the user access this report at all?
                  (controlled by role capability / menu visibility)
Row Level       — Which records does the user see?
                  (isSelf, isManagedBy, clientId match)
Column Level    — Which fields appear in the result?
                  (salary, account details, PAN, etc.)
```

**Rule:** The backend is the sole enforcer. The frontend renders what it receives. Frontend must never make visibility decisions for security-sensitive data.

### 4.2 Role-to-Access Matrix (Summary)

| Role | Salary Data | All Employees | Team Only | Self Only |
|---|:---:|:---:|:---:|:---:|
| Superadmin | ✓ | ✓ | — | — |
| HR | ✓ | ✓ | — | — |
| Finance | ✓ (cost only) | ✓ (summary) | — | — |
| Manager | ✗ | ✗ | ✓ | — |
| Employee | ✗ | ✗ | ✗ | ✓ |

### 4.3 No Second Permission System
Reports reuse the existing `access_policies` / `policyEngine.js` framework. A separate "reporting permission" table must NOT be introduced. The `permissionResolver.js` reads from existing policy records.

---

## 5. API Design

### Endpoint Contract

```
POST /api/reports/:module/:reportId
     Body: { filters, groupBy, type, sort, limit, skip }
     Returns: { kpis, breakdown, rows, meta }

GET  /api/reports/:module/:reportId/export
     Query: format=excel|csv|pdf
     Returns: File buffer (Content-Disposition: attachment)
```

### Response Shape
```json
{
  "meta": {
    "reportId": "H-05",
    "reportName": "Daily Attendance",
    "generatedAt": "2026-07-23T05:00:00Z",
    "totalRows": 142,
    "appliedFilters": { "date": "2026-07-23", "department": null },
    "userScope": "all"
  },
  "kpis": [
    { "key": "totalPresent", "label": "Total Present", "value": 98, "drillDownKey": "present" },
    { "key": "lateArrivals", "label": "Late Arrivals", "value": 18, "drillDownKey": "late" }
  ],
  "breakdown": [
    { "_id": "Engineering", "present": 34, "absent": 2, "late": 5 }
  ],
  "rows": [ ... ]
}
```

**`drillDownKey`** — the frontend passes this back to `/api/reports/:module/:reportId/drilldown` to get the filtered detail list. The backend reconstructs the filter from the key — the frontend does not construct filters.

---

## 6. Report Registry

Every report is declared in a central registry (`src/reportEngine/reportRegistry.js`):

```js
export const REPORT_REGISTRY = {
  'H-05': {
    name: 'Daily Attendance',
    module: 'hrms',
    category: 'attendance',
    primaryModel: 'attendances',
    joins: ['employees'],
    defaultDateField: 'date',
    allowedRoles: ['superadmin', 'hr', 'manager', 'employee'],
    rowScope: {
      manager: 'isManagedBy',
      employee: 'isSelf'
    },
    restrictedColumns: {
      salary: ['Finance', 'HR']    // column: [roles that CAN see it]
    },
    kpis: [
      { key: 'totalPresent', label: 'Total Present', filter: { status: 'Present' } },
      { key: 'lateArrivals', label: 'Late Arrivals', filter: { lateMinutes: { $gt: 0 } } }
    ],
    exports: ['excel', 'csv', 'pdf', 'print'],
    cacheTTL: 120   // seconds
  },
  // ... all other reports
};
```

This registry is the single configuration file for the entire reporting system. It replaces ad-hoc per-report configuration scattered across the codebase.

---

## 7. Implementation Priority

| Priority | Reports | Reason |
|---|---|---|
| P0 — Critical | H-05 Daily Attendance, H-15 Payroll Register, H-18 PF ECR, H-16 My Payslips | Operational daily use + statutory compliance |
| P1 — High | H-01 Headcount, H-06 Attendance Summary, H-11 Leave Summary, C-07 Receivables Aging, HD-01 Ticket Summary | Core management visibility |
| P2 — Important | H-04 Lifecycle Audit, H-22 Onboarding SLA, T-01 Task Summary, T-02 Overdue Tasks, A-01 Asset Register, A-04 Unreturned Assets | Operational safety and audit |
| P3 — Standard | Remaining core reports across all modules | Full system coverage |
| P4 — Additional | All `[ADDITIONAL]` reports | Enhanced visibility after core coverage |

---

## 8. Consistency Rules

These rules are non-negotiable across all module reports:

1. **Single attendance source:** `computeAttendanceSummary()` (from `payrollEngine.js`) is the only function that may compute `presentDays`, `absentDays`, and `lopDays`. Both Payroll and Attendance reports must call this function — never re-implement it.

2. **Payroll data immutability:** All payroll reports (H-15, H-16, H-17, H-18, H-19) read from `Payroll.earnedBreakdown` (frozen at compute time). They must never recalculate earnings from `SalaryStructure` — that data may have changed since the payroll run.

3. **Status values from status_configs:** No report hardcodes status values like `'Completed'` or `'Approved'`. Status filter options must be loaded from the `status_configss` collection for the relevant model. This ensures reports remain accurate when statuses are reconfigured.

4. **Drill-down count invariance:** The count in a KPI card must always equal the count of records returned by its drill-down. The aggregation pipeline that produced the KPI count and the filter that generates the drill-down list must be derived from the same source filter — enforced by `drillDownResolver`.

5. **No report-specific MongoDB queries:** No controller or route handler may write a custom `Model.aggregate()` or `Model.find()` for a report. All queries go through `buildReport()`. This is the architectural guarantee of consistency.

---

## 9. Success Criteria

The reporting system is considered complete when:

- [ ] Every P0 report is functional, tested, and role-permission verified.
- [ ] Every KPI card on every report has a working drill-down to individual records.
- [ ] Every report with salary data rejects requests from non-Finance/HR roles at the API layer.
- [ ] PF ECR and ESI CSV exports match government-mandated column formats.
- [ ] A manager seeing 18 "Late Arrivals" clicks the card and sees exactly 18 employee records.
- [ ] The payroll register and the attendance summary show identical `presentDays` for the same employee and month.
- [ ] No report duplicates another report's business question (merged or removed per spec).
- [ ] The report registry is the single source of truth — no report configuration exists outside it.


# HRMS-Reporting-Plan.md

> **Module:** HRMS (Human Resource Management System)
> **Version:** 1.0 — July 2026
> **Covers:** Employees · Attendance · Leave · Payroll · Recruitment · Onboarding
> **Source Models:** `Employee`, `EmployeeLifecycleHistory`, `Attendance`, `Leave`, `leave_types`, `LeavePolicy`, `LeaveTransaction`, `Regularization`, `Shift`, `Payroll`, `PayrollRun`, `SalaryStructure`, `Holiday`, `Onboarding`, `OnboardingTemplate`, `Candidate`, `JobOpening`, `WFHRequest`, `CompOffRequest`

---

## 1. Module Overview

### Purpose
HRMS is the foundational people-management module of Tracker. Every employee's complete career record — hire through separation — lives here, along with daily attendance, leave balances, salary computation, and onboarding progress. Payroll is computed from HRMS data combined with Attendance records; statutory compliance reports are generated from the same source.

### Business Goals
- Ensure every HR decision is backed by a factual, auditable record.
- Give managers real-time visibility into their team's availability and cost without routing through HR.
- Allow Finance to reconcile payroll cost precisely against department budgets.
- Provide statutory export files ready for direct government portal upload.

### Reporting Goals
1. Replace all ad-hoc Excel exports — HR can answer any workforce query directly in Tracker.
2. Make payroll computation fully auditable from input (attendance) to output (payslip).
3. Surface attendance anomalies to managers before they become policy violations.
4. Provide statutory exports (PF ECR, ESI, TDS) in government-mandated formats.

---

## 2. Navigation Structure

```
HRMS Reports
├── ⭐ Executive
│     ├── Headcount Summary           [CORE]
│     └── HR Cost Summary             [CORE]
├── ⭐ Employees
│     ├── Employee Directory          [CORE]
│     └── Lifecycle Audit             [CORE]
├── ⭐ Attendance
│     ├── Daily Attendance            [CORE]
│     ├── Attendance Summary          [CORE]
│     └── Attendance Exceptions       [CORE]
│     ── More Reports ──
│     ├── Monthly Attendance Register [ADDITIONAL]
│     ├── Overtime Summary            [ADDITIONAL]
│     └── Missing Punch               [ADDITIONAL]
├── ⭐ Leave
│     ├── Leave Summary               [CORE]
│     └── Leave Balance               [CORE]
│     ── More Reports ──
│     ├── Leave Exceptions            [ADDITIONAL]
│     └── Comp-Off Summary            [ADDITIONAL]
├── ⭐ Payroll
│     ├── Monthly Payroll Register    [CORE]
│     └── My Payslips                 [CORE — Employee self-serve]
│     ── More Reports ──
│     ├── Bank Advice Export          [ADDITIONAL]
│     ├── PF ECR Export               [ADDITIONAL]
│     ├── ESI Monthly Return          [ADDITIONAL]
│     ├── TDS Projection              [ADDITIONAL]
│     └── LOP Summary                 [ADDITIONAL]
└── ⭐ Recruitment & Onboarding
      ├── Onboarding SLA Tracker      [CORE]
      └── Candidate Pipeline          [CORE]
```

> **Navigation rule:** Department Attendance is NOT a separate report. It is a saved filter preset of the Attendance Summary report. Do not create duplicate reports for the same data.

### Audience Visibility Matrix
| Report | Superadmin/HR | Manager | Employee | Finance |
|---|:---:|:---:|:---:|:---:|
| Headcount Summary | ✓ | ✓ (own team) | — | ✓ |
| HR Cost Summary | ✓ | — | — | ✓ |
| Employee Directory | ✓ | ✓ (direct reports) | ✓ (self only) | — |
| Lifecycle Audit | ✓ | — | — | — |
| Daily Attendance | ✓ | ✓ (direct reports) | ✓ (self only) | — |
| Attendance Summary | ✓ | ✓ (team) | ✓ (self only) | — |
| Attendance Exceptions | ✓ | ✓ (team) | — | — |
| Monthly Attendance Register | ✓ | ✓ (team) | ✓ (self only) | — |
| Overtime Summary | ✓ | ✓ (team) | — | ✓ |
| Missing Punch | ✓ | ✓ (team) | — | — |
| Leave Summary | ✓ | ✓ (team) | ✓ (self only) | — |
| Leave Balance | ✓ | ✓ (team) | ✓ (self only) | — |
| Leave Exceptions | ✓ | ✓ (team) | — | — |
| Comp-Off Summary | ✓ | ✓ (team) | ✓ (self only) | — |
| Monthly Payroll Register | ✓ | — | — | ✓ |
| My Payslips | ✓ | — | ✓ (self only) | — |
| Bank Advice Export | ✓ | — | — | ✓ |
| PF ECR Export | ✓ | — | — | — |
| ESI Monthly Return | ✓ | — | — | — |
| TDS Projection | ✓ | — | — | ✓ |
| LOP Summary | ✓ | — | — | ✓ |
| Onboarding SLA Tracker | ✓ | ✓ (own joiners) | — | — |
| Candidate Pipeline | ✓ | — | — | — |

> **Backend rule:** Manager row-level scope is enforced via `access_policies` using the `isManagedBy` predicate. Frontend receives only allowed rows. Salary columns are stripped at the policy/column resolver layer — frontend never receives salary data for non-Finance/HR roles.

---

## 3. Report Inventory

| # | Report Name | Business Question | Primary Consumer | Category | Mandatory | Frequency |
|---|---|---|---|---|:---:|---|
| H-01 | Headcount Summary | How many people do we employ, segmented by dept/status/type, right now? | Senior HR | Executive | ✓ | Daily / Monthly |
| H-02 | HR Cost Summary | What is our total payroll cost by department this month? | CFO / Finance Head | Executive | ✓ | Monthly |
| H-03 | Employee Directory | Who are our active employees and what are their current details? | HR Junior | Employees | ✓ | On-demand |
| H-04 | Lifecycle Audit | What career changes happened to employees in a given period? | Senior HR | Employees | ✓ | Monthly / Quarterly |
| H-05 | Daily Attendance | Who is present, absent, or late today? | HR Junior / Manager | Attendance | ✓ | Daily |
| H-06 | Attendance Summary | What is the attendance pattern for a period per employee or team? | HR / Manager | Attendance | ✓ | Weekly / Monthly |
| H-07 | Attendance Exceptions | Who violated attendance policy (late, half-day, no-punch, absent)? | HR / Manager | Attendance | ✓ | Weekly |
| H-08 | Monthly Attendance Register | What was each employee's status for every day this month? | HR (payroll input) | Attendance | — | Monthly |
| H-09 | Overtime Summary | Who worked overtime, how many hours, and at what cost? | Finance / HR | Attendance | — | Monthly |
| H-10 | Missing Punch | Who has a missing clock-in or clock-out today? | HR Junior | Attendance | — | Daily |
| H-11 | Leave Summary | How many leaves were taken, approved, and pending? | HR / Manager | Leave | ✓ | Monthly |
| H-12 | Leave Balance | What is each employee's remaining leave quota by type? | HR / Employee | Leave | ✓ | On-demand |
| H-13 | Leave Exceptions | Who exceeded leave limits or has a negative balance? | Senior HR | Leave | — | Monthly |
| H-14 | Comp-Off Summary | How many comp-offs were earned, used, and lapsed? | HR | Leave | — | Monthly |
| H-15 | Monthly Payroll Register | What is the full payroll breakdown for every employee this month? | Finance / HR | Payroll | ✓ | Monthly |
| H-16 | My Payslips | What was my pay breakdown this month? | Employee (self) | Payroll | ✓ | Monthly |
| H-17 | Bank Advice Export | What net amounts should be disbursed to employee bank accounts? | Finance Ops | Payroll | ✓ | Monthly |
| H-18 | PF ECR Export | What are PF contributions formatted for EPFO ECR filing? | HR Compliance | Payroll | ✓ | Monthly |
| H-19 | ESI Monthly Return | What are ESI contributions for ESIC filing? | HR Compliance | Payroll | — | Monthly |
| H-20 | TDS Projection | What is projected annual TDS liability per employee? | Finance / HR Compliance | Payroll | — | Quarterly |
| H-21 | LOP Summary | Which employees had Loss-of-Pay and how much was deducted? | Finance / HR | Payroll | — | Monthly |
| H-22 | Onboarding SLA Tracker | Which new joiners are overdue on their onboarding checklist? | HR Ops | Recruitment | ✓ | Daily |
| H-23 | Candidate Pipeline | How many candidates are at each recruitment stage? | Senior HR | Recruitment | ✓ | Weekly |

---

## 4. Report Specifications

---

### H-01 — Headcount Summary
**Purpose:** Single-view workforce count for executive decision-making.
**Business Question:** How many employees do we have, segmented by department, status, and employment type, right now?
**Primary Consumer:** Senior HR — daily operating view; also Finance for budget planning.
**Audience:** Superadmin, HR, Finance, CEO

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Department | Multi-select | — |
| Employment Type | Multi-select (Full-time, Contract, Intern) | — |
| Status | Multi-select (Active, Inactive, On Notice) | — |
| Location / Branch | Multi-select | — |
| As-of Date | Date picker | — |

#### KPI Cards
| KPI | Source Field | Drill Down Target |
|---|---|---|
| Total Active Employees | `employees.status = Active` | Employee list |
| On Notice Period | `employees.status = On Notice` | Employee list |
| Joining This Month | `employees.joiningDate in [month]` | Employee list |
| Separating This Month | `employees.exitDate in [month]` | Employee list |
| Open Vacancies | `job_openings.status = Open` | Job opening list |

#### Charts
| Chart | Type | Purpose |
|---|---|---|
| Department Headcount | Horizontal Bar | Compare department sizes |
| Status Distribution | Donut | Active vs Inactive vs Notice |
| Monthly Headcount Trend (last 12m) | Line | Net headcount over time |

#### Breakdown
By Department → total count, active count, average tenure.

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Employee ID | All | ✓ |
| Employee Name | All | ✓ |
| Department | All | ✓ |
| Designation | All | ✓ |
| Employment Type | HR, Admin | ✓ |
| Status | All | ✓ |
| Joining Date | HR, Admin | ✓ |
| Reporting Manager | HR, Manager | — |
| Location / Branch | All | — |
| Exit Date | HR only | — |

#### Drill Down
- KPI card click → filtered employee list
- Chart bar/segment → filtered employee list
- Table row → Employee profile record

#### Exports
Excel, CSV, PDF

#### Permission Rules
- Manager: rows scoped to `isManagedBy` direct reports only
- Employee: no access to this report
- Finance: read-only, no salary columns

#### Performance Considerations
- Index: `professionalInfo.department`, `status`, `joiningDate`
- KPI counts cacheable for 5 minutes; invalidate on employee create/update events
- Bounded by org size; no pagination required for orgs < 5,000

---

### H-02 — HR Cost Summary
**Purpose:** Total payroll expenditure segmented by department for budget reconciliation.
**Business Question:** What did we spend on salaries by department this month, and how does it compare to last month?
**Primary Consumer:** CFO / Finance Head — used during monthly budget reviews.
**Audience:** Finance, HR, Superadmin

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Month / Year | Month picker | ✓ |
| Department | Multi-select | — |
| Payroll Run Status | Select (Approved, Paid) | — |
| Employment Type | Multi-select | — |

#### KPI Cards
| KPI | Source | Drill Down |
|---|---|---|
| Total Gross Payroll | `SUM(payrolls.grossSalary)` | Payroll register |
| Total Net Payroll | `SUM(payrolls.netSalary)` | Payroll register |
| Total Employer PF | `SUM(payrolls.pfEmployer)` | Payroll detail |
| Total Employer ESI | `SUM(payrolls.esiEmployer)` | Payroll detail |
| Total Cost-to-Company | Gross + Employer PF + Employer ESI | — |

#### Charts
| Chart | Type | Purpose |
|---|---|---|
| Dept Cost Breakdown | Stacked Bar (Gross/Deductions/Net) | Budget allocation by dept |
| MOM Cost Trend (last 6m) | Line | Month-over-month cost movement |

#### Breakdown
By Department → employee count, total gross, total net, average CTC.

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Department | Finance, HR | ✓ |
| Employee Count | Finance, HR | ✓ |
| Total Gross | Finance, HR | ✓ |
| Total Deductions | Finance, HR | ✓ |
| Total Net | Finance, HR | ✓ |
| Employer PF | Finance, HR | ✓ |
| Employer ESI | Finance, HR | — |
| Total CTC | Finance, HR | — |

> **Security:** Salary columns are NEVER returned to Manager or Employee roles. Backend column resolver must strip these fields before response.

#### Drill Down
- Department row → Monthly Payroll Register scoped to that department

#### Exports
Excel, PDF

#### Permission Rules
- Finance and HR: full access
- Manager, Employee: no access to this report

---

### H-03 — Employee Directory
**Purpose:** Canonical list of employees with current professional details.
**Business Question:** Who are our employees, where are they located, and who do they report to?
**Primary Consumer:** HR Junior — day-to-day people operations.
**Audience:** All roles (row-level scoped by `isManagedBy` / `isSelf`)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Department | Multi-select | — |
| Designation | Multi-select | — |
| Status | Multi-select | — |
| Employment Type | Multi-select | — |
| Location | Multi-select | — |
| Reporting Manager | Select | — |
| Joining Date Range | Date range | — |

#### KPI Cards
None. This is a directory report, not an analytics view.

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Employee ID | All | ✓ |
| Full Name | All | ✓ |
| Department | All | ✓ |
| Designation | All | ✓ |
| Status | All | ✓ |
| Reporting Manager | HR, Manager | ✓ |
| Employment Type | HR | — |
| Work Email | HR | — |
| Phone | HR | — |
| Location | All | — |
| Joining Date | HR | — |
| CTC (Annual) | Finance, HR only | — |

#### Drill Down
- Table row → full Employee profile record

#### Exports
Excel, CSV, PDF

---

### H-04 — Lifecycle Audit
**Purpose:** Immutable audit trail of all career changes across the workforce.
**Business Question:** What changes (promotions, transfers, salary revisions, separations) happened in this period?
**Primary Consumer:** Senior HR — compliance reviews, board reporting, litigation support.
**Audience:** Superadmin, HR

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range (effectiveDate) | Date range | ✓ |
| Change Type | Multi-select (Joining / Promotion / Transfer / Salary Revision / Separation / Status Change) | — |
| Department | Multi-select | — |
| Employee | Employee lookup | — |
| Changed By | Employee lookup | — |

#### KPI Cards
| KPI | Source |
|---|---|
| Total Changes This Period | COUNT(`lifecycleHistories`) |
| Promotions | COUNT where `changeType = Promotion` |
| Separations | COUNT where `changeType = Separation` |
| Salary Revisions | COUNT where `changeType = Salary Revision` |

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Log ID | HR | ✓ |
| Employee Name | HR | ✓ |
| Employee ID | HR | ✓ |
| Change Type | HR | ✓ |
| Effective Date | HR | ✓ |
| Previous Value | HR | ✓ |
| New Value | HR | ✓ |
| Changed By | HR | ✓ |
| Reason / Notes | HR | — |

#### Drill Down
- Row → original employee record + source change record in EmployeeLifecycleHistory

#### Exports
Excel, CSV, PDF

---

### H-05 — Daily Attendance
**Purpose:** Real-time view of who is present, absent, or late on a given date.
**Business Question:** Who is in office today, who is absent, and who clocked in late?
**Primary Consumer:** HR Junior (morning headcount review) and Manager (team availability).
**Audience:** HR (all employees), Manager (direct reports only), Employee (self only)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date | Date picker | ✓ (defaults to today) |
| Department | Multi-select | — |
| Status | Multi-select (Present / Absent / Late / Half-Day / WFH / On Leave) | — |
| Location | Multi-select | — |
| Shift | Multi-select | — |

#### KPI Cards
| KPI | Drill Down |
|---|---|
| Total Present | Present employee list |
| Total Absent | Absent employee list |
| Late Arrivals | Late employee list |
| On Leave | Leave-linked employee list |
| WFH Today | WFH employee list |
| Not Clocked Out | Employees without checkout |

#### Charts
| Chart | Type | Purpose |
|---|---|---|
| Status Distribution | Donut | Quick present/absent/leave split |
| Department Attendance % | Horizontal Bar | Which department has low attendance |

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Employee Name | All | ✓ |
| Employee ID | HR, Manager | ✓ |
| Department | HR, Manager | ✓ |
| Shift | HR, Manager | ✓ |
| Status | All | ✓ |
| Clock In | All | ✓ |
| Clock Out | All | ✓ |
| Working Hours | All | ✓ |
| Late Minutes | HR, Manager | ✓ |
| Work Location | All | — |
| Regularization Status | HR | — |

#### Drill Down
- KPI card → filtered employee list
- Table row → individual Attendance record (full punch log + regularization history)

#### Exports
Excel, CSV, PDF, Print

---

### H-06 — Attendance Summary
**Purpose:** Aggregated attendance metrics for a period to identify trends and issues.
**Business Question:** What was the overall attendance rate for each employee or department in the selected period?
**Primary Consumer:** HR (monthly compliance), Manager (team performance input to reviews).
**Audience:** HR (all), Manager (team scoped), Employee (self only)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range | Date range | ✓ |
| Department | Multi-select | — |
| Employee | Employee lookup | — |
| Status | Multi-select | — |
| Group By | Select (Employee / Department / Month) | — |

#### KPI Cards
| KPI |
|---|
| Average Attendance % |
| Total Present Days (org-wide) |
| Total Absent Days |
| Total Late Days |
| Total Leaves Taken |

#### Charts
| Chart | Type | Purpose |
|---|---|---|
| Daily Attendance Trend | Line | Day-by-day fluctuation over period |
| Department Heatmap | Grid/Table | Best/worst performing departments |

#### Breakdown
By Department → by Employee within department.

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Employee Name | All | ✓ |
| Department | HR, Manager | ✓ |
| Working Days in Period | All | ✓ |
| Present Days | All | ✓ |
| Absent Days | All | ✓ |
| Late Days | HR, Manager | ✓ |
| Leave Days | All | ✓ |
| WFH Days | All | — |
| Overtime Hours | HR, Finance | — |
| Attendance % | All | ✓ |

#### Drill Down
- Summary row → Daily Attendance filtered to that employee + period

#### Exports
Excel, CSV, PDF

---

### H-07 — Attendance Exceptions
**Purpose:** Surface employees who violated attendance policy in a given period.
**Business Question:** Who has been repeatedly late, absent, or had missing punches beyond policy thresholds?
**Primary Consumer:** HR Manager and Department Manager — corrective action and warnings.
**Audience:** HR, Manager (scoped to direct reports)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range | Date range | ✓ |
| Exception Type | Multi-select (Late / Half-Day / Absent / Early Exit / No Punch) | ✓ |
| Department | Multi-select | — |
| Minimum Occurrences | Number | — |

#### KPI Cards
| KPI |
|---|
| Employees with 3+ Late Arrivals |
| Employees with 2+ Unexplained Absences |
| Employees with Missing Punch |

#### Detailed Table Columns
| Column | Mandatory |
|---|:---:|
| Employee Name | ✓ |
| Department | ✓ |
| Exception Type | ✓ |
| Occurrence Count | ✓ |
| Dates of Exceptions | ✓ |
| Reporting Manager | ✓ |
| Policy Limit | — |

#### Drill Down
- Row → list of individual Attendance records that caused the exception flag

#### Exports
Excel, PDF

---

### H-08 — Monthly Attendance Register
**Purpose:** Day-by-day attendance status matrix for the full month — replaces traditional paper register.
**Business Question:** What was each employee's attendance status for every working day this month?
**Primary Consumer:** HR (month-end payroll input validation).
**Audience:** HR (all), Manager (team scoped), Employee (self only)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Month / Year | Month picker | ✓ |
| Department | Multi-select | — |
| Employee | Employee lookup | — |

#### Layout
Matrix table: **Employee rows × Calendar day columns**
Cell values: `P` (Present) · `A` (Absent) · `L` (Leave) · `H` (Holiday) · `WFH` · `LD` (Late) · `HD` (Half-Day) · `OT` (Overtime) · `—` (Weekend/Off)

#### Exports
Excel (primary — must preserve matrix layout), PDF

> **Note:** This report is the most expensive query. It must use the pre-computed `AttendanceSummary` daily records (see Backend Architecture) rather than real-time aggregation.

---

### H-09 — Overtime Summary
**Purpose:** Track overtime hours worked and their financial impact.
**Business Question:** Who worked overtime this month, how many hours, and what is the additional pay cost?
**Primary Consumer:** Finance (cost reconciliation), HR (policy enforcement).
**Audience:** Finance, HR, Manager (scoped to direct reports)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range | Date range | ✓ |
| Department | Multi-select | — |
| Employee | Employee lookup | — |
| Minimum OT Hours | Number | — |

#### KPI Cards
| KPI |
|---|
| Total OT Hours (org) |
| Total OT Cost (INR) |
| Employees with Any OT |

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Employee Name | All | ✓ |
| Department | All | ✓ |
| Total OT Hours | All | ✓ |
| OT Rate (per hour) | Finance, HR | — |
| OT Pay Amount | Finance, HR | ✓ |
| Days with OT | All | — |

#### Drill Down
- Row → individual Attendance records with OT hours flagged

#### Exports
Excel, CSV

---

### H-10 — Missing Punch
**Purpose:** Identify employees who have a missing clock-in or clock-out for a date.
**Business Question:** Which employees forgot to clock in or out today (or in a date range)?
**Primary Consumer:** HR Junior — daily administrative follow-up.
**Audience:** HR, Manager (scoped)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date | Date picker | ✓ |
| Type | Select (Missing Clock-In / Missing Clock-Out / Both) | — |
| Department | Multi-select | — |

#### KPI Cards
| KPI |
|---|
| Total Missing Punches Today |
| Regularization Pending |
| Regularization Approved |

#### Detailed Table Columns
Employee Name · Department · Date · Missing Type · Last Known Punch Time · Regularization Status

#### Exports
Excel, Print

---

### H-11 — Leave Summary
**Purpose:** Aggregated leave taken, approved, and pending by employee/department.
**Business Question:** How many leaves were taken this month, what types, and how many are pending approval?
**Primary Consumer:** HR (monthly leave audit), Manager (team availability planning).
**Audience:** HR (all), Manager (team scoped), Employee (self only)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range | Date range | ✓ |
| Department | Multi-select | — |
| Leave Type | Multi-select | — |
| Status | Multi-select (Approved / Pending / Rejected) | — |
| Employee | Employee lookup | — |

#### KPI Cards
| KPI |
|---|
| Total Leave Days Taken (Approved) |
| Pending Approval Count |
| Rejected This Period |
| Most Common Leave Type |

#### Charts
| Chart | Type | Purpose |
|---|---|---|
| Leave by Type | Donut | CL vs SL vs EL breakdown |
| Monthly Leave Trend | Bar | Month-wise leave usage |

#### Detailed Table Columns
| Column | Mandatory |
|---|:---:|
| Employee Name | ✓ |
| Department | ✓ |
| Leave Type | ✓ |
| From Date | ✓ |
| To Date | ✓ |
| Days | ✓ |
| Status | ✓ |
| Applied On | ✓ |
| Approved By | — |
| Reason | — |

#### Drill Down
- Row → full Leave record including approval trail and linked attendance

#### Exports
Excel, CSV, PDF

---

### H-12 — Leave Balance
**Purpose:** Current leave quota remaining per employee per leave type.
**Business Question:** How many leaves does each employee have left, and who is running critically low?
**Primary Consumer:** HR Junior (approval decisions), Employee (self-service planning).
**Audience:** HR (all), Manager (team scoped), Employee (self only)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| As-of Date | Date picker | — |
| Department | Multi-select | — |
| Leave Type | Multi-select | — |
| Employee | Employee lookup | — |
| Balance Below Threshold | Number | — |

#### KPI Cards
| KPI |
|---|
| Employees with Zero Balance (any type) |
| Average Balance per Employee |

#### Detailed Table Columns
Employee Name · Department · Leave Type · Annual Quota · Used · Pending · Available Balance

#### Drill Down
- Employee row → Leave Summary filtered to that employee

#### Exports
Excel, PDF

---

### H-13 — Leave Exceptions
**Purpose:** Identify employees who exceeded leave limits or have negative balance.
**Business Question:** Who took more leave than their quota allows or has unapproved absences?
**Primary Consumer:** Senior HR — policy enforcement and escalation.
**Audience:** HR, Manager (scoped to direct reports)

#### Filters
Date Range · Department · Exception Type (Over Quota / Negative Balance / Unapproved Leave)

#### Detailed Table Columns
Employee · Department · Leave Type · Annual Quota · Used · Excess Days · Dates of Excess · Manager

#### Exports
Excel, PDF

---

### H-14 — Comp-Off Summary
**Purpose:** Track compensatory-off earned, used, and lapsed per employee.
**Business Question:** How many comp-offs are outstanding and which ones are about to lapse?
**Primary Consumer:** HR.
**Audience:** HR, Manager (scoped), Employee (self only)

#### Filters
Date Range · Department · Status (Earned / Used / Lapsed / Pending Approval) · Employee

#### Detailed Table Columns
Employee · Comp-Off Earned Date · Occasion (worked day) · Expiry Date · Status · Used On Date

#### Exports
Excel

---

### H-15 — Monthly Payroll Register
**Purpose:** Complete payroll computation record for a given month — the authoritative payroll document.
**Business Question:** What is the exact gross, deductions, and net salary for every employee this month?
**Primary Consumer:** Finance (payment disbursement review), HR (payroll audit).
**Audience:** Finance, HR, Superadmin

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Month / Year | Month picker | ✓ |
| PayrollRun | Select (by run ID or auto last approved) | — |
| Department | Multi-select | — |
| Status | Multi-select (Processed / Approved / Paid) | — |

#### KPI Cards
| KPI |
|---|
| Total Employees Processed |
| Total Gross Payroll |
| Total Deductions |
| Total Net Payroll |
| PayrollRun Status |

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Employee ID | Finance, HR | ✓ |
| Employee Name | Finance, HR | ✓ |
| Department | Finance, HR | ✓ |
| Designation | Finance, HR | ✓ |
| Working Days | Finance, HR | ✓ |
| Present Days | Finance, HR | ✓ |
| LOP Days | Finance, HR | ✓ |
| Basic Salary | Finance, HR | ✓ |
| HRA | Finance, HR | — |
| Other Earnings | Finance, HR | — |
| Gross Salary | Finance, HR | ✓ |
| PF Employee | Finance, HR | ✓ |
| ESI Employee | Finance, HR | — |
| TDS | Finance, HR | — |
| Other Deductions | Finance, HR | — |
| Total Deductions | Finance, HR | ✓ |
| Overtime Pay | Finance, HR | — |
| Net Payable | Finance, HR | ✓ |
| Status | Finance, HR | ✓ |

> **Critical security rule:** This report is NEVER accessible to Manager or Employee roles. The backend policy layer must reject the request entirely — not just strip columns.

#### Drill Down
- Employee row → Payslip detail (earnedBreakdown + deductionBreakdown from Payroll model)
- PayrollRun KPI → PayrollRun record with audit events

#### Exports
Excel (primary), CSV, PDF

---

### H-16 — My Payslips (Employee Self-Serve)
**Purpose:** Employee views their own payslip for any processed month.
**Business Question:** What was my pay breakdown this month?
**Primary Consumer:** Employee — self-service HR enquiry.
**Audience:** All roles — each user sees ONLY their own record (`isSelf` policy enforced)

#### Filters
Year picker · Month picker

#### Layout
Formatted payslip: earnings table + deductions table + net pay + working days summary. Same as paper payslip.

#### Exports
PDF only (formatted payslip document). No Excel/CSV — prevents salary data from being shared externally.

---

### H-17 — Bank Advice Export
**Purpose:** Net salary disbursement file for bank upload/NEFT instructions.
**Business Question:** How much should be transferred to each employee's bank account this month?
**Primary Consumer:** Finance operations team.
**Audience:** Finance, Superadmin

#### Filters
Month/Year (mandatory) · PayrollRun

#### Columns
Employee ID · Employee Name · Bank Name · Account Number · IFSC Code · Branch · Net Amount (INR) · Narration

> **Note:** Shows net disbursable amount only. No earnings/deductions breakdown — those are in H-15.

#### Exports
Excel (bank-upload format), CSV only — no PDF.

---

### H-18 — PF ECR Export
**Purpose:** EPFO Electronic Challan cum Return — statutory data in government format.
**Business Question:** What are the PF contributions for this month that need to be remitted to EPFO?
**Primary Consumer:** HR Compliance officer.
**Audience:** Superadmin, HR

#### Columns (EPFO ECR format — fixed schema)
UAN · Employee Name · Gross Wages · EPF Wages · EPS Wages · EDLI Wages · EPF EE Amount · EPS ER Amount · EPF ER Amount · NCP Days · Refund of Advances

> **Data source:** `Payroll.earnedBreakdown` (snapshotted at compute time). Do NOT recalculate from salary structure — use frozen payroll data only.

#### Exports
CSV only (government portal upload format)

---

### H-19 — ESI Monthly Return
**Purpose:** ESIC contribution data for monthly return filing.
**Business Question:** What are the ESI contributions to be remitted this month?
**Primary Consumer:** HR Compliance officer.
**Audience:** Superadmin, HR

#### Columns
IP Number · IP Name · Days Worked · Total Wages · Employee ESI Contribution · Employer ESI Contribution · Reason for Zero Wages

#### Exports
CSV only

---

### H-20 — TDS Projection
**Purpose:** Project annual TDS liability across the financial year.
**Business Question:** What is the estimated TDS for each employee for the full financial year?
**Primary Consumer:** Finance team and HR Compliance.
**Audience:** Finance, HR, Superadmin

#### Filters
Financial Year · Department · Employee

#### Detailed Table Columns
Employee · Annualized Gross · Declared Exemptions · Taxable Income · Tax Slab · Monthly TDS · YTD TDS Deducted · Remaining TDS to Deduct

#### Exports
Excel, PDF

---

### H-21 — LOP Summary
**Purpose:** Loss-of-Pay days and salary deduction per employee per month.
**Business Question:** Which employees had LOP this month and how much was deducted?
**Primary Consumer:** Finance, HR.
**Audience:** Finance, HR, Superadmin

#### Filters
Month/Year (mandatory) · Department · Employee

#### Detailed Table Columns
Employee · Department · LOP Days · Daily Rate · LOP Amount Deducted · Gross Before LOP · Net After LOP

#### Exports
Excel, PDF

---

### H-22 — Onboarding SLA Tracker
**Purpose:** Identify new joiners whose onboarding is overdue the completion target.
**Business Question:** Which employees are past their onboarding completion date and still incomplete?
**Primary Consumer:** HR Ops — daily SLA management and escalation.
**Audience:** Superadmin, HR, Manager (own joiners only)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Status | Multi-select (Pending / In Progress / Completed / Overdue) | — |
| Department | Multi-select | — |
| Overdue Only Toggle | Boolean | — |
| Joining Date Range | Date range | — |

#### KPI Cards
| KPI |
|---|
| Total Active Onboardings |
| SLA Overdue Count |
| Completed This Month |
| Average Completion % |

#### Detailed Table Columns
Candidate/Employee Name · Department · Joining Date · Target Completion Date · Status · Completion % · Verified % · SLA Overdue (Y/N) · Reporting Manager

#### Drill Down
- Row → full Onboarding record with checklist items and their completion state

#### Exports
Excel, PDF

---

### H-23 — Candidate Pipeline
**Purpose:** Recruitment funnel view showing candidate count at each hiring stage.
**Business Question:** How many candidates are in each stage across all open positions?
**Primary Consumer:** Senior HR — recruitment capacity and forecast planning.
**Audience:** Superadmin, HR

#### Filters
Date Range · Job Opening · Department · Stage

#### KPI Cards
Total Applications · In Screening · In Interview · Offer Extended · Offer Accepted · Rejected

#### Charts
Funnel chart — candidate drop-off rates across stages.

#### Detailed Table Columns
Candidate Name · Applied Position · Department · Current Stage · Source · Applied Date · Last Activity · Assigned Recruiter

#### Exports
Excel, PDF

---

## 5. Backend Requirements

### `buildReport()` Features Required for HRMS

| Feature | Reports | Priority |
|---|---|---|
| Date range filter on configurable field (`dateField` param) | H-05, H-06, H-08, H-11, H-15 | Critical |
| Row-level scoping (`isSelf`, `isManagedBy`) | H-05, H-06, H-11, H-12, H-16 | Critical |
| Column-level permission stripping | H-02, H-03, H-15 (salary columns) | Critical |
| Cross-model aggregation (Employee + Attendance join) | H-05, H-06, H-08 | Critical |
| `groupBy` aggregation with `SUM`, `COUNT`, `AVG` | H-01, H-02, H-06, H-09, H-11 | Critical |
| Matrix / pivot layout (employee × day) | H-08 | High |
| Government-format CSV generation | H-18, H-19 | High |
| PDF payslip generation (formatted) | H-16 | High |
| Saved filter presets (no separate report) | H-09 dept view | Medium |

### Shared Services Required

```
src/reportEngine/
├── aggregationEngine.js     — SUM/COUNT/AVG with groupBy, subGroupBy, date bucketing
├── permissionResolver.js    — Resolves role → allowed rows (ABAC) and allowed columns
├── columnResolver.js        — Strips restricted columns before sending response
├── dateRangeResolver.js     — Converts { startDate, endDate, dateField } → $match stage
├── drillDownResolver.js     — Maps { reportId, kpiKey, filterContext } → detail query
├── exportGenerator.js       — Adapters: Excel (xlsx), CSV (custom schema), PDF (pdfkit)
└── cacheLayer.js            — TTL-based result cache keyed by reportId+filters+roleId
```

### Caching Policy
| Report | Cache TTL | Invalidation Trigger |
|---|---|---|
| H-01 KPI cards | 5 min | Employee create/update |
| H-05 KPI cards | 2 min | Attendance punch event |
| H-06 Summary | 15 min | Attendance create/update |
| H-15 Payroll Register | 30 min | PayrollRun status change |
| H-12 Leave Balance | 10 min | LeaveTransaction create |

> **Rule:** KPI card counts may be cached. Detail table rows must never be served from stale cache for salary/statutory reports.

### Consistency Guarantee (Critical)
`computeAttendanceSummary()` in `payrollEngine.js` must be extracted as a **shared service** callable by both the Payroll computation engine AND reports H-06 / H-08. This is the single source of truth for `presentDays`, `absentDays`, and `lopDays`. If reports recalculate these independently, values will drift from what Payroll used — a critical consistency violation.

### Drill-Down Contract
Every KPI card click passes `{ reportId, kpiKey, appliedFilters }` to `drillDownResolver`. The resolver maps this to a predefined detail query (not ad-hoc frontend filtering). This guarantees: **the number in the KPI always equals the count of records in the drill-down list.**

### API Design
```
POST   /api/reports/hrms/:reportId          — All HRMS reports (data)
GET    /api/reports/hrms/:reportId/export   — Export (format=excel|csv|pdf)
GET    /api/reports/hrms/payslip/:payrollId/pdf  — Streaming PDF payslip (separate endpoint)
GET    /api/reports/hrms/ecr/:month/:year/csv    — PF ECR (synchronous, no pagination)
GET    /api/reports/hrms/esi/:month/:year/csv    — ESI return (synchronous)
```

---

## 6. Future Considerations (Architecture Only)

1. **Payroll Archive Partitioning:** After 3 years of `payrolls` × employee count, consider time-partitioned collections or Atlas Online Archive to keep report queries performant.
2. **Daily Attendance Pre-Aggregation Cron:** A nightly job that writes pre-computed `AttendanceDailySummary` documents eliminates expensive real-time aggregation for H-06 and H-08 during month-end peak usage.
3. **Statutory Template Registry:** PF ECR and ESI return formats change with government circulars. A version-stamped `statutoryTemplates` config collection decouples format changes from code deploys.
4. **Report Subscription / Scheduling:** Allow HR to schedule H-15 Payroll Register and H-22 Onboarding SLA as auto-delivered email PDFs on a monthly/daily cron. Reuses `exportGenerator` + existing notification infrastructure.
5. **Salary-Report Access Audit Log:** Record every access to H-02, H-15, H-17, H-18 — who, when, with what filters — stored in `AuditLog`. Required for compliance in regulated industries.


# Tasks-Reporting-Plan.md

> **Module:** Tasks
> **Version:** 1.0 — July 2026
> **Covers:** Tasks · Sprints · Time Tracking · Daily Activity
> **Source Models:** `Tasks`, `Sprint`, `MileStone`, `time_tracker_session`, `DailyActivity`, `TaskType`, `Client`, `Employee`

---

## 1. Module Overview

### Purpose
The Tasks module is the operational work-execution backbone of Tracker. Every unit of work — whether a client deliverable, internal project task, or sprint story — is tracked here from creation to closure. Reports from this module answer the fundamental question: **Is work getting done, by whom, on time?**

### Business Goals
- Give managers visibility into team workload and delivery velocity.
- Identify bottlenecks before they impact client commitments.
- Provide accurate time-effort data for billing and productivity analysis.
- Track sprint velocity over time for capacity planning.

### Reporting Goals
1. Give a manager a complete picture of their team's task health in under 2 minutes.
2. Identify overdue tasks before the deadline passes — not after.
3. Provide client-level task summaries for account management.
4. Make sprint velocity measurable across runs.

---

## 2. Navigation Structure

```
Tasks Reports
├── ⭐ Team Overview
│     ├── Task Summary                [CORE]
│     └── Overdue Tasks               [CORE]
├── ⭐ Sprint
│     ├── Sprint Velocity             [CORE]
│     └── Sprint Burndown             [CORE]
├── ⭐ Individual
│     └── My Task Report             [CORE — Employee self-serve]
│     ── More Reports ──
│     ├── Employee Task Load          [ADDITIONAL]
│     ├── Task Aging                  [ADDITIONAL]
│     ├── Time Tracker Summary        [ADDITIONAL]
│     └── Client Task Summary         [ADDITIONAL]
```

### Audience Visibility Matrix
| Report | Superadmin | Manager | Employee | Finance | Client |
|---|:---:|:---:|:---:|:---:|:---:|
| Task Summary | ✓ | ✓ (team) | — | — | — |
| Overdue Tasks | ✓ | ✓ (team) | — | — | — |
| Sprint Velocity | ✓ | ✓ (team) | — | — | — |
| Sprint Burndown | ✓ | ✓ (team) | — | — | — |
| My Task Report | ✓ | ✓ | ✓ (self) | — | — |
| Employee Task Load | ✓ | ✓ (team) | — | — | — |
| Task Aging | ✓ | ✓ (team) | — | — | — |
| Time Tracker Summary | ✓ | ✓ (team) | ✓ (self) | ✓ | — |
| Client Task Summary | ✓ | ✓ (assigned) | — | — | — |

---

## 3. Report Inventory

| # | Report Name | Business Question | Primary Consumer | Category | Mandatory | Frequency |
|---|---|---|---|---|:---:|---|
| T-01 | Task Summary | What is the current status distribution of all tasks in a period? | Manager | Team Overview | ✓ | Daily / Weekly |
| T-02 | Overdue Tasks | Which tasks are past their due date and still not complete? | Manager | Team Overview | ✓ | Daily |
| T-03 | Sprint Velocity | How many story points / tasks are we completing per sprint? | Manager / Tech Lead | Sprint | ✓ | Per sprint |
| T-04 | Sprint Burndown | Is the current sprint on track to complete on time? | Manager / Tech Lead | Sprint | ✓ | Daily (during sprint) |
| T-05 | My Task Report | What are my open, completed, and overdue tasks? | Employee (self) | Individual | ✓ | Daily |
| T-06 | Employee Task Load | How many tasks is each team member carrying right now? | Manager | Individual | — | Weekly |
| T-07 | Task Aging | How long have tasks been sitting in each status without movement? | Manager | Individual | — | Weekly |
| T-08 | Time Tracker Summary | How many hours were logged against tasks by employee? | Finance / Manager | Individual | — | Weekly / Monthly |
| T-09 | Client Task Summary | What is the task delivery status for each client? | Manager / Account | Individual | — | Weekly |

---

## 4. Report Specifications

---

### T-01 — Task Summary
**Purpose:** Aggregate view of task status distribution for a team or period.
**Business Question:** What is the current distribution of tasks by status, priority, and type?
**Primary Consumer:** Manager — used for weekly team stand-down and health reviews.
**Audience:** Superadmin, Manager (direct reports' tasks only)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range (createdAt or dueDate) | Date range | — |
| Date Field | Select (Created / Due / Completed) | — |
| Assigned To | Employee multi-select | — |
| Department | Multi-select | — |
| Client | Select | — |
| Task Type | Multi-select | — |
| Status | Multi-select | — |
| Priority | Multi-select (High / Medium / Low) | — |
| Sprint | Select | — |

#### KPI Cards
| KPI | Drill Down |
|---|---|
| Total Tasks | Full task list |
| Open Tasks | Open task list |
| In Progress | In-progress task list |
| Completed | Completed task list |
| Overdue | Overdue task list |
| Blocked | Blocked task list |

#### Charts
| Chart | Type | Purpose |
|---|---|---|
| Status Distribution | Donut | At-a-glance pipeline health |
| Tasks by Priority | Bar | High vs Medium vs Low backlog |
| Tasks by Assignee | Horizontal Bar | Who has how much work |
| Completion Trend (daily) | Line | Daily task closes over period |

#### Breakdown
By Status → by Assignee within status.

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Task ID | All | ✓ |
| Task Title | All | ✓ |
| Status | All | ✓ |
| Priority | All | ✓ |
| Assigned To | Manager, HR | ✓ |
| Client | All | — |
| Task Type | All | — |
| Created Date | All | ✓ |
| Due Date | All | ✓ |
| Completed Date | All | — |
| Sprint | Manager | — |
| Overdue (Y/N) | Manager | ✓ |

#### Drill Down
- KPI card → filtered task list
- Chart segment → filtered task list
- Table row → original Task record

#### Exports
Excel, CSV, PDF

#### Permission Rules
- Manager: sees only tasks assigned to direct reports
- Employee: no access (use My Task Report)
- Row-level scope via `assignedTo` ∈ `managedEmployees`

---

### T-02 — Overdue Tasks
**Purpose:** Daily exception report of tasks past their due date without completion.
**Business Question:** Which tasks are overdue today, by how many days, and who owns them?
**Primary Consumer:** Manager — daily corrective action.
**Audience:** Superadmin, Manager (scoped to team)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Assigned To | Employee multi-select | — |
| Department | Multi-select | — |
| Client | Select | — |
| Overdue By (days) | Number (minimum) | — |
| Priority | Multi-select | — |

#### KPI Cards
| KPI |
|---|
| Total Overdue Tasks |
| Overdue by 7+ Days |
| Overdue by 30+ Days |
| High Priority Overdue |

#### Detailed Table Columns
| Column | Mandatory |
|---|:---:|
| Task Title | ✓ |
| Assigned To | ✓ |
| Due Date | ✓ |
| Days Overdue | ✓ |
| Priority | ✓ |
| Status | ✓ |
| Client | — |
| Last Status Change Date | — |

#### Drill Down
- Row → original Task record

#### Exports
Excel, PDF

---

### T-03 — Sprint Velocity
**Purpose:** Measure delivery output per sprint to support capacity planning.
**Business Question:** How many tasks (or story points) did we complete in each sprint, and is velocity improving?
**Primary Consumer:** Manager / Tech Lead — sprint retrospective and planning input.
**Audience:** Superadmin, Manager

#### Filters
Sprint range (from/to sprint) · Team / Assignee · Task Type

#### KPI Cards
| KPI |
|---|
| Avg Tasks Completed per Sprint |
| Current Sprint Completion % |
| Velocity Trend (up/down vs last 3 sprints) |

#### Charts
Bar chart — completed vs total tasks per sprint (last N sprints).

#### Breakdown
By Sprint → completed count, total count, velocity (completed/total %).

#### Detailed Table Columns
Sprint Name · Start Date · End Date · Total Tasks · Completed · Incomplete · Velocity % · Avg Completion Days

#### Drill Down
- Sprint row → Task Summary filtered to that sprint

#### Exports
Excel, PDF

---

### T-04 — Sprint Burndown
**Purpose:** Track remaining work within the current sprint day by day.
**Business Question:** Is the current sprint on track, or are we accumulating a backlog?
**Primary Consumer:** Manager / Tech Lead — daily sprint monitoring.
**Audience:** Superadmin, Manager

#### Filters
Sprint selector (defaults to current active sprint)

#### Chart (Primary Visual)
Line chart: **Ideal Burndown** (diagonal from sprint start to end) vs **Actual Remaining Tasks** (daily count of incomplete tasks). The gap between lines is the deficit.

#### Detailed Table (Supporting)
Date · Tasks Remaining · Tasks Closed That Day · Cumulative Closed

#### Drill Down
- Point on line → Task list for that day showing what was open

#### Exports
PDF, Excel

---

### T-05 — My Task Report
**Purpose:** Employee's personal view of their own task portfolio.
**Business Question:** What are my current tasks, which are overdue, and what did I complete recently?
**Primary Consumer:** Employee — daily self-management.
**Audience:** All roles — each user sees ONLY their own assigned tasks (`isSelf` policy)

#### Filters
Status · Date Range · Priority · Client

#### KPI Cards
Open Tasks · Overdue Tasks · Completed This Week · Due Today

#### Detailed Table Columns
Task Title · Status · Priority · Due Date · Days Overdue · Client · Sprint

#### Drill Down
- Row → original Task record

#### Exports
Excel

---

### T-06 — Employee Task Load
**Purpose:** Snapshot of how many tasks each employee currently carries across status.
**Business Question:** Is any team member overloaded while others are underutilized?
**Primary Consumer:** Manager — workload balancing and assignment decisions.
**Audience:** Superadmin, Manager (scoped)

#### Filters
Date (as-of) · Department · Assignee · Status

#### KPI Cards
Most Loaded Employee · Average Tasks per Employee · Employees with Zero Tasks

#### Detailed Table Columns
Employee Name · Open Tasks · In-Progress Tasks · Overdue Tasks · Completed (30 days) · Total Active

#### Drill Down
- Employee row → Task Summary filtered to that employee

#### Exports
Excel

---

### T-07 — Task Aging
**Purpose:** Identify tasks that have been stagnant in a status for too long.
**Business Question:** Which tasks have not changed status in 7+ days?
**Primary Consumer:** Manager — escalation trigger for stuck work.
**Audience:** Superadmin, Manager (scoped)

#### Filters
Department · Assigned To · Status · Minimum Days in Status (e.g., ≥ 7 days)

#### Detailed Table Columns
Task Title · Status · Days in Current Status · Assigned To · Priority · Client · Last Updated

#### Exports
Excel, PDF

---

### T-08 — Time Tracker Summary
**Purpose:** Log of hours spent per task, per employee, per period.
**Business Question:** How many hours were logged against each task/client/project in this period?
**Primary Consumer:** Finance (billing), Manager (productivity analysis).
**Audience:** Superadmin, Manager (scoped), Employee (self only), Finance

#### Filters
Date Range · Employee · Client · Task · Project Type

#### KPI Cards
Total Hours Logged · Avg Hours per Task · Employees with No Logged Time

#### Breakdown
By Employee → by Client → by Task.

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Employee Name | All | ✓ |
| Date | All | ✓ |
| Task Title | All | ✓ |
| Client | All | — |
| Hours Logged | All | ✓ |
| Session Notes | Manager, HR | — |
| Billable (Y/N) | Finance | — |

#### Drill Down
- Row → individual time_tracker_session record

#### Exports
Excel, CSV

---

### T-09 — Client Task Summary
**Purpose:** Task delivery status per client.
**Business Question:** What is the open/completed task status for each client we serve?
**Primary Consumer:** Account Manager / Manager — client-facing review.
**Audience:** Superadmin, Manager (scoped to assigned clients)

#### Filters
Client · Date Range · Status · Priority

#### KPI Cards
Total Client Tasks · Completed on Time · Overdue · In Progress

#### Breakdown
By Client → task count, completion %, overdue count.

#### Detailed Table Columns
Client Name · Total Tasks · Open · In Progress · Completed · Overdue · Completion %

#### Drill Down
- Client row → Task Summary filtered to that client

#### Exports
Excel, PDF

---

## 5. Backend Requirements

### `buildReport()` Features Required

| Feature | Reports |
|---|---|
| Date range filter on `dueDate`, `createdAt`, `completedAt` | T-01, T-02, T-07 |
| `groupBy` with `COUNT` | T-01, T-03, T-06, T-09 |
| Row-level scope by `assignedTo` ∈ `managedEmployees` | T-01, T-02, T-06, T-07, T-08 |
| `isSelf` scope | T-05 |
| Date-bucketed aggregation (daily) | T-04 burndown |
| Cross-model join: Tasks + time_tracker_session | T-08 |
| Cross-model join: Tasks + Sprint | T-03, T-04 |

### Computed Fields Required (Not Stored)
- `daysOverdue`: `TODAY - dueDate` where `status ≠ Completed` and `dueDate < TODAY`
- `daysInCurrentStatus`: `TODAY - lastStatusChangeDate`
- `velocity %`: `completedCount / totalCount * 100`

These must be computed server-side in the aggregation pipeline — never in the frontend.

### API Design
```
POST /api/reports/tasks/:reportId    — Data query
GET  /api/reports/tasks/:reportId/export  — Export
```

### Performance Considerations
- Index: `tasks.assignedTo`, `tasks.dueDate`, `tasks.status`, `tasks.sprintId`, `tasks.clientId`
- Overdue tasks (T-02) should use a compound index: `{ dueDate: 1, status: 1 }`
- Sprint burndown (T-04) must pre-compute daily snapshots via cron — real-time aggregation per day is too expensive for large sprints

---

## 6. Future Considerations (Architecture Only)

1. **Daily Task Snapshot Cron:** A nightly job that records task counts by status per day enables accurate burndown charts and trend analysis without expensive historical re-aggregation.
2. **Billable Hours Flag:** Add `isBillable` boolean to `time_tracker_session` once billing module is introduced. T-08 already has the column slot.
3. **Milestone Progress Report:** Once `MileStone` model is populated, add a Milestone delivery report showing % completion toward key project milestones.


# Helpdesk-Reporting-Plan.md

> **Module:** Helpdesk (Tickets)
> **Version:** 1.0 — July 2026
> **Covers:** Tickets · Comments · Assignments · SLA · Status History
> **Source Models:** `Ticket`, `TicketComment`, `TicketActivityLog`, `TicketAssignment`, `TicketStatusHistory`, `TicketParticipant`, `TicketAttachment`, `Employee`, `Client`, `Agent`

---

## 1. Module Overview

### Purpose
The Helpdesk module is the client-facing support layer of Tracker. Clients raise tickets through the mobile app or web portal; internal developers and support staff resolve them. Every customer issue from open to closed lives here — with full audit history, comment threads, SLA tracking, and developer task linkage.

### Business Goals
- Ensure every client-raised issue is acknowledged, tracked, and resolved with measurable SLA.
- Give management visibility into team workload and resolution performance.
- Identify systemic issues (high-volume ticket types, repeat clients) for root-cause action.
- Provide clients with confidence that their issues are actively managed.

### Reporting Goals
1. Make SLA compliance a measurable daily metric — not an end-of-month surprise.
2. Surface tickets at risk of SLA breach before they breach.
3. Allow account managers to see ticket health per client.
4. Give developers a personal queue view without exposing other users' data.

---

## 2. Navigation Structure

```
Helpdesk Reports
├── ⭐ Operations
│     ├── Ticket Summary              [CORE]
│     └── SLA Compliance              [CORE]
├── ⭐ Client
│     ├── Client Ticket Health        [CORE]
│     └── Open Tickets by Client      [CORE]
├── ⭐ Team
│     ├── Agent/Developer Workload    [CORE]
│     └── My Tickets                  [CORE — Employee self-serve]
│     ── More Reports ──
│     ├── Ticket Aging                [ADDITIONAL]
│     ├── First Response Time         [ADDITIONAL]
│     ├── Resolution Time Analysis    [ADDITIONAL]
│     └── Ticket Volume Trend         [ADDITIONAL]
```

### Audience Visibility Matrix
| Report | Superadmin | Manager | Developer/Agent | Employee | Client Contact |
|---|:---:|:---:|:---:|:---:|:---:|
| Ticket Summary | ✓ | ✓ (team) | — | — | — |
| SLA Compliance | ✓ | ✓ (team) | — | — | — |
| Client Ticket Health | ✓ | ✓ (assigned) | — | — | — |
| Open Tickets by Client | ✓ | ✓ (assigned) | — | — | — |
| Agent/Developer Workload | ✓ | ✓ (team) | — | — | — |
| My Tickets | ✓ | ✓ | ✓ (self) | — | — |
| Ticket Aging | ✓ | ✓ (team) | — | — | — |
| First Response Time | ✓ | ✓ (team) | — | — | — |
| Resolution Time Analysis | ✓ | ✓ (team) | — | — | — |
| Ticket Volume Trend | ✓ | ✓ | — | — | — |

---

## 3. Report Inventory

| # | Report Name | Business Question | Primary Consumer | Category | Mandatory | Frequency |
|---|---|---|---|---|:---:|---|
| HD-01 | Ticket Summary | What is the current status distribution of all tickets? | Support Manager | Operations | ✓ | Daily |
| HD-02 | SLA Compliance | What percentage of tickets were resolved within SLA? | Support Manager | Operations | ✓ | Weekly / Monthly |
| HD-03 | Client Ticket Health | How many open, overdue, and resolved tickets does each client have? | Account Manager | Client | ✓ | Weekly |
| HD-04 | Open Tickets by Client | Which specific tickets are open for each client right now? | Support Manager | Client | ✓ | Daily |
| HD-05 | Agent/Developer Workload | How many tickets is each team member currently handling? | Manager | Team | ✓ | Daily |
| HD-06 | My Tickets | What tickets are assigned to me and what is their status? | Developer/Agent | Team | ✓ | Daily |
| HD-07 | Ticket Aging | Which tickets have been open for too long without resolution? | Manager | Team | — | Daily |
| HD-08 | First Response Time | How long does it take for us to first respond to a ticket? | Manager | Team | — | Weekly |
| HD-09 | Resolution Time Analysis | What is the average time to resolve tickets by type/priority? | Manager | Team | — | Weekly |
| HD-10 | Ticket Volume Trend | Is ticket volume increasing or decreasing over time? | Senior Manager | Team | — | Monthly |

---

## 4. Report Specifications

---

### HD-01 — Ticket Summary
**Purpose:** Real-time view of ticket pipeline by status, priority, and type.
**Business Question:** What is the current state of all tickets — how many are open, in-progress, resolved, and closed?
**Primary Consumer:** Support Manager — daily ops review.
**Audience:** Superadmin, Manager (scoped to assigned team)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range (createdAt) | Date range | — |
| Client | Select | — |
| Assigned To | Employee multi-select | — |
| Priority | Multi-select (Critical / High / Medium / Low) | — |
| Status | Multi-select | — |
| Ticket Type | Multi-select | — |
| Product | Select | — |

#### KPI Cards
| KPI | Drill Down |
|---|---|
| Total Open Tickets | Open ticket list |
| Critical / High Priority Open | Filtered ticket list |
| In Progress | In-progress ticket list |
| Awaiting Client Response | Ticket list |
| Resolved (period) | Resolved ticket list |
| Closed (period) | Closed ticket list |

#### Charts
| Chart | Type | Purpose |
|---|---|---|
| Status Distribution | Donut | Pipeline health at a glance |
| By Priority | Bar | Risk exposure |
| Tickets by Type | Horizontal Bar | Most common issue categories |
| Daily Volume Trend | Line | Incoming vs outgoing tickets |

#### Breakdown
By Status → by Priority within status.

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Ticket ID | All | ✓ |
| Title / Subject | All | ✓ |
| Client | All | ✓ |
| Priority | All | ✓ |
| Status | All | ✓ |
| Assigned To | Manager, HR | ✓ |
| Created Date | All | ✓ |
| Last Updated | All | ✓ |
| SLA Breach (Y/N) | Manager | ✓ |
| Linked Task | Manager | — |
| Product | All | — |

#### Drill Down
- KPI card → filtered ticket list
- Table row → original Ticket record with full thread

#### Exports
Excel, CSV, PDF

---

### HD-02 — SLA Compliance
**Purpose:** Measure what percentage of tickets were resolved within their SLA window.
**Business Question:** Are we meeting our SLA commitments, and which ticket types/priorities are most at risk?
**Primary Consumer:** Support Manager — KPI reporting to leadership.
**Audience:** Superadmin, Manager

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range (resolvedAt) | Date range | ✓ |
| Priority | Multi-select | — |
| Ticket Type | Multi-select | — |
| Client | Select | — |
| Assigned To | Employee multi-select | — |

#### KPI Cards
| KPI |
|---|
| Overall SLA Compliance % |
| Critical Priority SLA % |
| High Priority SLA % |
| Tickets Breached SLA |

#### Charts
| Chart | Type | Purpose |
|---|---|---|
| SLA Compliance by Priority | Grouped Bar | Where are the failures? |
| SLA Trend (weekly) | Line | Improving or degrading? |

#### Breakdown
By Priority → SLA compliance %, breach count.

#### Detailed Table Columns
| Column | Mandatory |
|---|:---:|
| Ticket ID | ✓ |
| Title | ✓ |
| Client | ✓ |
| Priority | ✓ |
| Created Date | ✓ |
| Resolved Date | ✓ |
| Resolution Time (hours) | ✓ |
| SLA Target (hours) | ✓ |
| SLA Met (Y/N) | ✓ |
| Assigned To | ✓ |

> **Note:** SLA target hours come from a configurable `SLAPolicy` — Critical: 4h / High: 8h / Medium: 24h / Low: 72h. These must be stored in general_settings, not hardcoded.

#### Drill Down
- "Breached" KPI → list of SLA-breached tickets
- Row → original Ticket record

#### Exports
Excel, PDF

---

### HD-03 — Client Ticket Health
**Purpose:** Per-client view of open, resolved, and overdue ticket counts.
**Business Question:** Which clients have the most outstanding issues right now?
**Primary Consumer:** Account Manager — client relationship management.
**Audience:** Superadmin, Manager (scoped to assigned clients)

#### Filters
Client · Date Range · Status · Priority

#### KPI Cards
Clients with Open Critical Tickets · Clients with SLA Breached · Total Active Clients with Tickets

#### Breakdown
By Client → open count, in-progress, resolved, overdue, SLA compliance %.

#### Detailed Table Columns
Client Name · Open Tickets · In Progress · Overdue · Resolved (period) · SLA Compliance % · Last Activity Date

#### Drill Down
- Client row → Open Tickets by Client (HD-04) filtered to that client

#### Exports
Excel, PDF

---

### HD-04 — Open Tickets by Client
**Purpose:** Specific list of all currently open tickets for each client.
**Business Question:** What are the exact open tickets for a given client, and what is their current state?
**Primary Consumer:** Support Manager, Account Manager — client call preparation.
**Audience:** Superadmin, Manager (scoped)

#### Filters
Client (mandatory) · Priority · Assigned To · Days Open (minimum)

#### Detailed Table Columns
Ticket ID · Title · Priority · Status · Assigned To · Created Date · Days Open · SLA Breach · Last Comment Date

#### Drill Down
- Row → original Ticket record

#### Exports
Excel, PDF

---

### HD-05 — Agent/Developer Workload
**Purpose:** Snapshot of tickets assigned to each team member.
**Business Question:** Is any developer overloaded with tickets while others are underloaded?
**Primary Consumer:** Manager — workload balancing.
**Audience:** Superadmin, Manager (scoped to direct reports)

#### Filters
Date (as-of) · Department · Status · Priority

#### KPI Cards
Most Loaded Developer · Average Tickets per Developer · Developers with Overdue Tickets

#### Detailed Table Columns
Employee Name · Open Tickets · In-Progress Tickets · Critical Open · Overdue Tickets · Avg Resolution Time (days)

#### Drill Down
- Employee row → Ticket Summary filtered to that assignee

#### Exports
Excel

---

### HD-06 — My Tickets
**Purpose:** Personal ticket queue for developers and support agents.
**Business Question:** What tickets are assigned to me today, and which are urgent?
**Primary Consumer:** Developer / Support Agent — daily work management.
**Audience:** All roles — each user sees ONLY tickets assigned to themselves (`isSelf` scope)

#### Filters
Status · Priority · Client · Date Range

#### KPI Cards
My Open Tickets · Overdue · Due Today · Waiting for Client

#### Detailed Table Columns
Ticket ID · Title · Client · Priority · Status · Created Date · Last Updated · Days Open

#### Drill Down
- Row → full Ticket record

#### Exports
Excel

---

### HD-07 — Ticket Aging
**Purpose:** Identify tickets that have been open for too long without resolution.
**Business Question:** Which tickets have been open for 7+ days without a status change?
**Primary Consumer:** Manager — escalation decisions.
**Audience:** Superadmin, Manager (scoped)

#### Filters
Minimum Days Open · Status · Priority · Assigned To · Client

#### Detailed Table Columns
Ticket ID · Title · Client · Priority · Days Open · Current Status · Days in Current Status · Assigned To · Last Comment Date

#### Exports
Excel, PDF

---

### HD-08 — First Response Time
**Purpose:** Measure how quickly the team initially responds to a new ticket.
**Business Question:** What is our average time from ticket creation to first internal comment?
**Primary Consumer:** Support Manager — team responsiveness KPI.
**Audience:** Superadmin, Manager

#### Filters
Date Range · Priority · Ticket Type · Assigned To

#### KPI Cards
Average First Response Time · % Within 1 Hour · % Within 4 Hours · % > 24 Hours

#### Breakdown
By Priority → avg first response time.

#### Detailed Table Columns
Ticket ID · Client · Priority · Created At · First Response At · First Response Time (hours) · Responded By · SLA Target

#### Exports
Excel, PDF

> **Data source:** `ticketcomments` — first comment by an internal employee after ticket creation. Computed as `firstComment.createdAt - ticket.createdAt`.

---

### HD-09 — Resolution Time Analysis
**Purpose:** Understand average resolution time by ticket type and priority.
**Business Question:** How long does it typically take to resolve different types of tickets?
**Primary Consumer:** Support Manager — process improvement.
**Audience:** Superadmin, Manager

#### Filters
Date Range · Priority · Ticket Type · Assigned To

#### KPI Cards
Avg Resolution Time (all) · Avg Resolution Time (Critical) · Median Resolution Time

#### Charts
Box plot or Bar — resolution time distribution by priority/type.

#### Breakdown
By Ticket Type → avg resolution time, min, max, median.

#### Detailed Table Columns
Ticket ID · Type · Priority · Created At · Resolved At · Resolution Time (hours) · Assigned To · SLA Met

#### Exports
Excel, PDF

---

### HD-10 — Ticket Volume Trend
**Purpose:** Understand whether ticket volumes are growing or shrinking over time.
**Business Question:** Is the number of incoming tickets increasing month over month?
**Primary Consumer:** Senior Manager — capacity planning, product quality signal.
**Audience:** Superadmin, Manager

#### Filters
Date Range (by month/week) · Client · Ticket Type · Priority

#### KPI Cards
Total Tickets This Month · vs Last Month (delta %) · Avg Daily Volume

#### Charts
Line chart — daily/weekly ticket creation count over period.

#### Breakdown
By Month → created count, resolved count, net open at end of period.

#### Exports
Excel, PDF

---

## 5. Backend Requirements

### `buildReport()` Features Required

| Feature | Reports |
|---|---|
| Date range filter on `createdAt`, `resolvedAt`, `updatedAt` | HD-01, HD-02, HD-08, HD-09, HD-10 |
| Row-level scope by `assignedTo` ∈ `managedEmployees` | HD-01, HD-05, HD-07 |
| `isSelf` scope (`assignedTo = currentUser`) | HD-06 |
| Cross-model join: Ticket + TicketComment (first comment) | HD-08 |
| Cross-model join: Ticket + TicketStatusHistory | HD-07 (days in status) |
| Computed field: `daysOpen = TODAY - createdAt` | HD-07, HD-04 |
| Computed field: `firstResponseTime = firstComment.createdAt - ticket.createdAt` | HD-08 |
| Computed field: `resolutionTime = resolvedAt - createdAt` | HD-02, HD-09 |
| Grouping + aggregation by client | HD-03, HD-04 |
| Time-bucket aggregation (daily/weekly/monthly) | HD-10 |

### SLA Policy Integration
SLA targets (hours) must be read from `general_settings.slaPolicy` (or a dedicated `SLAPolicy` config), not hardcoded. The `buildReport()` engine joins this config at query time to compute SLA compliance per ticket.

### API Design
```
POST /api/reports/helpdesk/:reportId
GET  /api/reports/helpdesk/:reportId/export
```

### Performance Considerations
- Index: `tickets.assignedTo`, `tickets.status`, `tickets.createdAt`, `tickets.clientId`, `tickets.priority`
- Compound index for SLA queries: `{ createdAt: 1, resolvedAt: 1, priority: 1 }`
- First response time (HD-08) requires a lookup into `ticketcomments` — ensure `{ ticketId: 1, createdAt: 1, commenterModel: 1 }` index exists

---

## 6. Future Considerations (Architecture Only)

1. **SLA Policy Model:** Introduce a dedicated `SLAPolicy` model with `priority → targetHours` mapping, configurable per client. This enables per-client SLA agreements without code changes.
2. **Ticket Category Taxonomy:** Once ticket volume grows, a structured `Category → Subcategory` hierarchy on `Ticket` enables richer trend analysis (e.g., "Login issues" vs "Billing queries").
3. **Client Portal Reporting:** A read-only ticket status report accessible to client contacts directly — showing only their own company's ticket summary — built on the same `buildReport()` engine with `clientId`-scoped row policy.
4. **Escalation SLA Alerts:** A cron that checks tickets approaching SLA breach threshold (80% of time elapsed) and fires notifications through the existing `NotificationRule` infrastructure — not a new report, but uses SLA data computed here.


# Assets-Reporting-Plan.md

> **Module:** Assets (Asset Management)
> **Version:** 1.0 — July 2026
> **Covers:** Asset Register · Allocations · Incidents · Repairs · Purchases · Stock Ledger
> **Source Models:** `Asset`, `AssetAllocation`, `AssetIncident`, `AssetRepair`, `AssetCategory`, `AssetVendor`, `AssetPurchase`, `AssetInvoice`, `AssetPayment`, `AssetStockLedger`, `Employee`

---

## 1. Module Overview

### Purpose
The Assets module tracks the full lifecycle of every physical asset owned by the organization — from purchase order to disposal. It connects procurement (purchases, vendors), operations (allocations, repairs), compliance (damage recovery, insurance), and finance (asset cost, vendor payments). Reports from this module answer: **Where is every asset, who has it, what condition is it in, and what has it cost us?**

### Business Goals
- Maintain a 100% accurate real-time asset register — zero untracked assets.
- Ensure all allocated assets are with the correct employee and in documented condition.
- Track financial exposure from damage incidents and repair costs.
- Provide purchase history for budget forecasting and vendor performance.

### Reporting Goals
1. Enable an Admin to verify every asset's location and custodian in seconds.
2. Surface assets that are damaged, under repair, or lost so management can act.
3. Provide Finance with asset purchase costs and depreciation visibility.
4. Make the employee exit process safer by flagging unreturned assets.

---

## 2. Navigation Structure

```
Assets Reports
├── ⭐ Inventory
│     ├── Asset Register              [CORE]
│     └── Stock Summary               [CORE]
├── ⭐ Allocations
│     ├── Active Allocations          [CORE]
│     └── Unreturned Assets           [CORE]
│     ── More Reports ──
│     ├── Allocation History          [ADDITIONAL]
│     └── Employee Asset Profile      [ADDITIONAL]
├── ⭐ Incidents & Repairs
│     ├── Incident Summary            [CORE]
│     └── Active Repairs              [CORE]
│     ── More Reports ──
│     └── Recovery Summary            [ADDITIONAL]
└── ⭐ Finance
      ├── Purchase Summary            [CORE]
      └── Vendor Payment Summary      [ADDITIONAL]
```

### Audience Visibility Matrix
| Report | Superadmin/Admin | HR | Manager | Employee | Finance |
|---|:---:|:---:|:---:|:---:|:---:|
| Asset Register | ✓ | ✓ | — | — | ✓ |
| Stock Summary | ✓ | ✓ | — | — | ✓ |
| Active Allocations | ✓ | ✓ | ✓ (own team) | ✓ (self only) | — |
| Unreturned Assets | ✓ | ✓ | ✓ (own team) | — | — |
| Allocation History | ✓ | ✓ | — | — | — |
| Employee Asset Profile | ✓ | ✓ | ✓ (own team) | ✓ (self only) | — |
| Incident Summary | ✓ | ✓ | — | — | ✓ |
| Active Repairs | ✓ | ✓ | — | — | — |
| Recovery Summary | ✓ | ✓ | — | — | ✓ |
| Purchase Summary | ✓ | — | — | — | ✓ |
| Vendor Payment Summary | ✓ | — | — | — | ✓ |

---

## 3. Report Inventory

| # | Report Name | Business Question | Primary Consumer | Category | Mandatory | Frequency |
|---|---|---|---|---|:---:|---|
| A-01 | Asset Register | Where is every asset, what is its status, and who has it? | Admin/IT Manager | Inventory | ✓ | On-demand / Monthly |
| A-02 | Stock Summary | How many assets do we have by category and status? | Admin | Inventory | ✓ | On-demand |
| A-03 | Active Allocations | Which assets are currently allocated to which employees? | Admin / HR | Allocations | ✓ | On-demand |
| A-04 | Unreturned Assets | Which assets assigned to resigned or transferred employees have not been returned? | HR / Admin | Allocations | ✓ | Daily |
| A-05 | Allocation History | What is the full allocation history for an asset or employee? | Admin | Allocations | — | On-demand |
| A-06 | Employee Asset Profile | What assets does a specific employee currently hold? | HR / Manager | Allocations | — | On-demand |
| A-07 | Incident Summary | How many incidents occurred, what type, and what is the financial exposure? | Admin / Finance | Incidents | ✓ | Monthly |
| A-08 | Active Repairs | Which assets are currently under repair, with which vendor, since when? | Admin | Incidents | ✓ | Daily |
| A-09 | Recovery Summary | How much damage recovery has been collected or is pending from employees? | Finance | Incidents | — | Monthly |
| A-10 | Purchase Summary | What assets have we purchased, from which vendors, at what cost? | Finance / Admin | Finance | ✓ | Monthly / Quarterly |
| A-11 | Vendor Payment Summary | What payments have been made to asset vendors and what is outstanding? | Finance | Finance | — | Monthly |

---

## 4. Report Specifications

---

### A-01 — Asset Register
**Purpose:** The complete, authoritative list of every asset in the organization with its current state.
**Business Question:** What assets do we own, where is each one, and what condition is it in?
**Primary Consumer:** Admin / IT Manager — the master reference for asset audits.
**Audience:** Superadmin, Admin, HR, Finance

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Category | Multi-select | — |
| Status | Multi-select (Available / Reserved / Allocated / Under Repair / Lost / Disposed) | — |
| Condition | Multi-select (Excellent / Good / Fair / Poor / Damaged) | — |
| Allocated To (Employee) | Employee lookup | — |
| Department | Multi-select | — |
| Vendor | Select | — |
| Purchase Date Range | Date range | — |

#### KPI Cards
| KPI | Drill Down |
|---|---|
| Total Assets | Full register |
| Available in Stock | Available list |
| Currently Allocated | Allocation view |
| Under Repair | Repair list |
| Lost / Disposed | Asset list |

#### Charts
| Chart | Type | Purpose |
|---|---|---|
| Assets by Category | Donut | Category distribution |
| Assets by Status | Bar | Availability at a glance |

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Asset ID (AST-xxxxxx) | All | ✓ |
| Asset Name | All | ✓ |
| Category | All | ✓ |
| Serial Number | Admin | ✓ |
| Status | All | ✓ |
| Condition | All | ✓ |
| Allocated To (Employee) | Admin, HR | — |
| Department | Admin, HR | — |
| Purchase Date | Finance, Admin | — |
| Purchase Cost | Finance | — |
| Vendor | Finance, Admin | — |
| Warranty Expiry | Admin | — |

#### Drill Down
- KPI card → filtered asset list
- Row → original Asset record with full stock ledger

#### Exports
Excel, CSV, PDF

#### Permission Rules
- Finance: can see Purchase Cost; cannot see employee allocation details
- Employee: no access

---

### A-02 — Stock Summary
**Purpose:** Aggregated count of assets by category and status for inventory planning.
**Business Question:** How many laptops/phones/etc. are available, allocated, or under repair?
**Primary Consumer:** Admin (inventory management).
**Audience:** Superadmin, Admin, HR, Finance

#### Filters
Category · Status · Department

#### KPI Cards
Total Assets in Stock · Available for Allocation · Utilization Rate (Allocated / Total)

#### Breakdown
By Category → total, available, allocated, under repair, disposed.

#### Detailed Table Columns
Category · Total · Available · Reserved · Allocated · Under Repair · Lost · Disposed · Utilization %

#### Drill Down
- Category row → Asset Register filtered to that category + status

#### Exports
Excel, PDF

---

### A-03 — Active Allocations
**Purpose:** Real-time snapshot of all currently active asset-to-employee assignments.
**Business Question:** Which assets are allocated to which employees right now?
**Primary Consumer:** Admin / HR — routine custody verification.
**Audience:** Admin, HR, Manager (own team), Employee (self only)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Employee | Employee lookup | — |
| Department | Multi-select | — |
| Category | Multi-select | — |
| Allocation Date Range | Date range | — |
| Condition at Allocation | Multi-select | — |

#### KPI Cards
| KPI |
|---|
| Total Active Allocations |
| Assets Allocated This Month |
| Allocations Pending Approval |

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Asset ID | All | ✓ |
| Asset Name | All | ✓ |
| Category | All | ✓ |
| Employee Name | Admin, HR, Manager | ✓ |
| Department | Admin, HR | ✓ |
| Allocation Date | All | ✓ |
| Condition at Allocation | Admin | — |
| Expected Return Date | Admin | — |

#### Drill Down
- Row → AssetAllocation record with approval trail

#### Exports
Excel, PDF, Print

---

### A-04 — Unreturned Assets
**Purpose:** Flag assets that should have been returned but have not been.
**Business Question:** Which assets are held by employees who have resigned, transferred, or are on notice, without a return record?
**Primary Consumer:** HR / Admin — exit clearance and asset recovery.
**Audience:** Superadmin, Admin, HR, Manager (own team)

> **This report is a daily HR exit checklist, not an analytics report. Every row is an action item.**

#### Filters
Employee Status · Department · Category · Separation Date Range

#### KPI Cards
| KPI |
|---|
| Assets with Resigned Employees |
| Assets with Transferred Employees |
| Total Asset Value at Risk |

#### Detailed Table Columns
| Column | Mandatory |
|---|:---:|
| Asset ID | ✓ |
| Asset Name | ✓ |
| Category | ✓ |
| Employee Name | ✓ |
| Employee Status | ✓ |
| Last Working Day | ✓ |
| Allocation Date | ✓ |
| Days Since Separation | ✓ |
| Purchase Cost | — |

#### Drill Down
- Row → AssetAllocation record → Employee record

#### Exports
Excel, PDF

---

### A-05 — Allocation History
**Purpose:** Full chronological allocation record for an asset or employee.
**Business Question:** Who has held this asset in the past, when, and what condition was it returned in?
**Primary Consumer:** Admin — asset traceability for incidents, disputes, audits.
**Audience:** Superadmin, Admin

#### Filters
Asset ID or Employee (at least one required) · Date Range

#### Detailed Table Columns
Asset ID · Asset Name · Employee · Department · Allocation Date · Return Date · Duration (days) · Condition on Return · Return Notes · Allocated By

#### Drill Down
- Row → original AssetAllocation record

#### Exports
Excel, PDF

---

### A-06 — Employee Asset Profile
**Purpose:** All assets currently held by a specific employee.
**Business Question:** What does this employee have right now?
**Primary Consumer:** HR (exit clearance), Manager (team asset audit), Employee (self).
**Audience:** Admin, HR, Manager (scoped), Employee (self only)

#### Filters
Employee (mandatory)

#### Detailed Table Columns
Asset ID · Asset Name · Category · Allocation Date · Condition · Serial Number

#### Exports
PDF (used for acknowledgement letters)

---

### A-07 — Incident Summary
**Purpose:** Aggregated view of damage, loss, and theft incidents with financial exposure.
**Business Question:** How many asset incidents occurred this period, what type, and how much is the total recovery amount?
**Primary Consumer:** Admin / Finance — risk exposure and payroll recovery tracking.
**Audience:** Superadmin, Admin, Finance

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range | Date range | ✓ |
| Incident Type | Multi-select (Damage / Loss / Theft) | — |
| Recovery Status | Multi-select (Approved / Pending / Waived) | — |
| Department | Multi-select | — |
| Employee | Employee lookup | — |

#### KPI Cards
| KPI |
|---|
| Total Incidents |
| Damage Cases |
| Loss / Theft Cases |
| Total Recovery Amount (INR) |
| Pending Recovery |
| Recovery Collected |

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Incident ID | All | ✓ |
| Asset Name | All | ✓ |
| Category | All | ✓ |
| Incident Type | All | ✓ |
| Employee (Responsible) | Admin, Finance | ✓ |
| Incident Date | All | ✓ |
| Recovery Amount | Finance, Admin | ✓ |
| Recovery Approved | Finance, Admin | ✓ |
| Linked Payroll Deduction | Finance | — |
| Status | All | ✓ |

#### Drill Down
- Row → AssetIncident record with full description and linked repair/payroll recovery

#### Exports
Excel, PDF

---

### A-08 — Active Repairs
**Purpose:** Current view of all assets sent for external repair.
**Business Question:** Which assets are under repair, with which vendor, and since when?
**Primary Consumer:** Admin — follow up with vendors on pending repairs.
**Audience:** Superadmin, Admin

#### Filters
Vendor · Category · Status (Under Repair / Repaired / Beyond Repair) · Date Range

#### KPI Cards
| KPI |
|---|
| Total Under Repair |
| Repairs Pending > 7 Days |
| Total Estimated Repair Cost |

#### Detailed Table Columns
Asset ID · Asset Name · Category · Vendor · Sent Date · Days in Repair · Estimated Cost · Repair Status · Condition on Return

#### Drill Down
- Row → AssetRepair record with full vendor notes

#### Exports
Excel, PDF

---

### A-09 — Recovery Summary
**Purpose:** Track payroll deductions linked to asset damage recovery.
**Business Question:** How much has been recovered from employees for asset damage, and what is still pending?
**Primary Consumer:** Finance — payroll deduction reconciliation.
**Audience:** Superadmin, Finance, Admin

#### Filters
Date Range · Employee · Recovery Status

#### KPI Cards
Total Recovery Due · Total Collected · Pending Collection · Waived Amount

#### Detailed Table Columns
Employee · Incident Type · Asset Name · Recovery Amount · Linked Payroll Month · Recovery Status · Notes

#### Exports
Excel, PDF

---

### A-10 — Purchase Summary
**Purpose:** Aggregated view of asset purchases for budget and vendor analysis.
**Business Question:** What assets have we purchased, from which vendors, at what total cost?
**Primary Consumer:** Finance — capex tracking.
**Audience:** Superadmin, Finance, Admin

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range (Purchase Date) | Date range | ✓ |
| Category | Multi-select | — |
| Vendor | Select | — |
| Status | Multi-select (Ordered / Received / Cancelled) | — |

#### KPI Cards
| KPI |
|---|
| Total Purchase Amount (period) |
| POs Received |
| POs Pending Delivery |
| Assets Created from POs |

#### Breakdown
By Vendor → total spent, quantity.

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| PO Number | Finance, Admin | ✓ |
| Vendor | Finance, Admin | ✓ |
| Category | All | ✓ |
| Quantity | All | ✓ |
| Total Amount | Finance | ✓ |
| Status | All | ✓ |
| PO Date | All | ✓ |
| Received Date | Admin | — |
| Invoice Reference | Finance | — |

#### Drill Down
- Row → AssetPurchase record + generated Asset list

#### Exports
Excel, PDF

---

### A-11 — Vendor Payment Summary
**Purpose:** Track what has been paid to asset vendors and what is outstanding.
**Business Question:** How much do we owe each asset vendor, and what has already been paid?
**Primary Consumer:** Finance — vendor liability management.
**Audience:** Superadmin, Finance

#### Filters
Vendor · Date Range · Payment Status

#### Detailed Table Columns
Vendor Name · Invoice Number · Invoice Amount · Payment Date · Amount Paid · Outstanding · Payment Mode · Payment Reference

#### Exports
Excel, PDF

---

## 5. Backend Requirements

### `buildReport()` Features Required

| Feature | Reports |
|---|---|
| Cross-model join: Asset + AssetAllocation | A-01, A-03, A-04, A-06 |
| Cross-model join: Asset + AssetIncident | A-07 |
| Cross-model join: Asset + AssetRepair | A-08 |
| Cross-model join: AssetAllocation + Employee (status) | A-04 |
| Row-level scope (`isManagedBy`) | A-03, A-04, A-06 |
| `isSelf` scope | A-06 (employee self-view) |
| Date range filter on `allocationDate`, `sentDate`, `purchaseDate` | A-03, A-08, A-10 |
| Aggregation with `SUM` (recovery amount, purchase cost) | A-07, A-09, A-10 |
| Computed field: `daysInRepair = TODAY - sentDate` | A-08 |
| Computed field: `daysSinceSeparation = TODAY - lastWorkingDay` | A-04 |
| `groupBy` category/status | A-02, A-10 |

### A-04 Special Logic (Unreturned Assets)
This report requires a cross-model join across:
1. `assets_allocations` (status = Active)
2. `employees` (status ∈ [Resigned, Terminated, On Notice])

The engine must NOT rely on a single collection. This is a declarative multi-model join that `buildReport()` must support via `$lookup` pipeline stages.

### API Design
```
POST /api/reports/assets/:reportId
GET  /api/reports/assets/:reportId/export
```

### Performance Considerations
- Index: `assets_allocations.status`, `assets_allocations.employeeId`, `assets.status`, `assets.category`
- A-04 (Unreturned Assets) requires compound index: `{ status: 1, employeeId: 1 }` on `assets_allocations`
- A-08 (Active Repairs): `{ status: 1, sentDate: 1 }` on `assets_repairs`

---

## 6. Future Considerations (Architecture Only)

1. **Asset Depreciation Engine:** Add a computed `currentValue` field based on purchase cost, asset age, and a configurable depreciation rate per category. This enables a Balance Sheet–level Asset Valuation report for Finance without manual calculation.
2. **QR Code / Barcode Integration:** Link each `Asset._id` to a QR code for mobile scan-based stock verification. The `AssetStockLedger` audit trail already supports this; only the scanning UI needs to be added.
3. **Warranty Expiry Notifications:** A cron checking `asset.warrantyExpiry` within 30/60/90 days and firing notifications through the existing `NotificationRule` infrastructure — no separate report needed, uses existing data.
4. **Insurance Tracking:** Add an `insurance` subdocument to `Asset` (insurer, policy number, premium, expiry) to enable an Insurance Expiry report for Admin/Finance.


# CRM-Reporting-Plan.md

> **Module:** CRM (Client Relationship Management)
> **Version:** 1.0 — July 2026
> **Covers:** Clients · Contacts · Leads · Quotations · Orders · Activities · Meetings · Collections
> **Source Models:** `Client`, `Contact`, `CRMActivity`, `CRMMeeting`, `Quotation`, `QuotationRevision`, `OrderAcknowledgment`, `Collection`, `Payment`, `PaymentJournal`, `ClientLedger`, `Expense`

---

## 1. Module Overview

### Purpose
The CRM module captures and tracks the entire client-facing commercial pipeline — from first contact through quotation, order confirmation, delivery, and payment collection. It sits at the intersection of Sales (new opportunities), Operations (active client delivery), and Finance (collections and receivables). Reports from this module answer: **Is our pipeline healthy, are we closing business, and are clients paying on time?**

### Business Goals
- Give sales and account managers complete visibility into their pipeline and client activity.
- Ensure no quotation expires or goes unfollowed.
- Track collections against invoices to surface overdue receivables before they age.
- Measure sales team activity and effectiveness objectively.

### Reporting Goals
1. Replace pipeline spreadsheets — one report shows the full sales pipeline.
2. Make overdue collections visible daily — Finance should not discover aged receivables at month-end.
3. Measure sales rep activity (calls, meetings, follow-ups) to support performance management.
4. Provide Finance with a receivables aging report for working capital decisions.

---

## 2. Navigation Structure

```
CRM Reports
├── ⭐ Pipeline
│     ├── Quotation Pipeline          [CORE]
│     └── Order Summary               [CORE]
├── ⭐ Clients
│     ├── Client Activity Summary     [CORE]
│     └── Client Ledger               [CORE]
│     ── More Reports ──
│     ├── Client Health Dashboard     [ADDITIONAL]
│     └── Meetings Summary            [ADDITIONAL]
├── ⭐ Collections
│     ├── Receivables Aging           [CORE]
│     └── Collection Summary          [CORE]
│     ── More Reports ──
│     └── Payment Journal             [ADDITIONAL]
└── ⭐ Sales Team
      └── Sales Activity Report       [CORE]
      ── More Reports ──
      └── Quotation Conversion Rate   [ADDITIONAL]
```

### Audience Visibility Matrix
| Report | Superadmin | Sales Manager | Sales Rep | Finance | CEO |
|---|:---:|:---:|:---:|:---:|:---:|
| Quotation Pipeline | ✓ | ✓ (own team) | ✓ (own) | — | ✓ |
| Order Summary | ✓ | ✓ | ✓ (own) | ✓ | ✓ |
| Client Activity Summary | ✓ | ✓ (own team) | ✓ (own) | — | — |
| Client Ledger | ✓ | — | — | ✓ | — |
| Client Health Dashboard | ✓ | ✓ (own team) | — | — | ✓ |
| Meetings Summary | ✓ | ✓ (own team) | ✓ (own) | — | — |
| Receivables Aging | ✓ | — | — | ✓ | ✓ |
| Collection Summary | ✓ | — | — | ✓ | ✓ |
| Payment Journal | ✓ | — | — | ✓ | — |
| Sales Activity Report | ✓ | ✓ (own team) | ✓ (own) | — | ✓ |
| Quotation Conversion Rate | ✓ | ✓ | — | — | ✓ |

---

## 3. Report Inventory

| # | Report Name | Business Question | Primary Consumer | Category | Mandatory | Frequency |
|---|---|---|---|---|:---:|---|
| C-01 | Quotation Pipeline | What quotations are in play, at what stage, and what is the total value? | Sales Manager | Pipeline | ✓ | Daily |
| C-02 | Order Summary | How many orders have been confirmed this month and at what value? | Sales Manager / Finance | Pipeline | ✓ | Weekly / Monthly |
| C-03 | Client Activity Summary | How many interactions (calls, meetings, emails) happened per client? | Sales Manager | Clients | ✓ | Weekly |
| C-04 | Client Ledger | What is the complete transaction history for a client? | Finance / Account Manager | Clients | ✓ | On-demand |
| C-05 | Client Health Dashboard | What is the overall health of each client relationship? | Senior Manager | Clients | — | Weekly |
| C-06 | Meetings Summary | How many client meetings were held, by whom, and what outcomes? | Sales Manager | Clients | — | Weekly |
| C-07 | Receivables Aging | Which clients have outstanding payments, and how old are they? | Finance | Collections | ✓ | Daily |
| C-08 | Collection Summary | How much was collected from clients this month vs. expected? | Finance | Collections | ✓ | Weekly / Monthly |
| C-09 | Payment Journal | What are all the payment transactions in a period? | Finance | Collections | — | Monthly |
| C-10 | Sales Activity Report | How many activities (calls, visits, emails) did each sales rep perform? | Sales Manager | Sales Team | ✓ | Weekly |
| C-11 | Quotation Conversion Rate | What percentage of quotations convert to confirmed orders? | Sales Manager / CEO | Sales Team | — | Monthly |

---

## 4. Report Specifications

---

### C-01 — Quotation Pipeline
**Purpose:** Complete view of all quotations in the sales pipeline.
**Business Question:** What quotations are in play, at what stage, what is their total value, and which are expiring soon?
**Primary Consumer:** Sales Manager — daily pipeline management.
**Audience:** Superadmin, Sales Manager (all), Sales Rep (own only), CEO

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range (quotation date) | Date range | — |
| Status | Multi-select (Draft / Sent / Under Review / Accepted / Rejected / Expired) | — |
| Client | Select | — |
| Assigned To (Sales Rep) | Employee select | — |
| Expiry Within (days) | Number | — |
| Value Range | Min/Max | — |

#### KPI Cards
| KPI | Drill Down |
|---|---|
| Total Pipeline Value | Full quotation list |
| Quotations Sent (period) | Sent list |
| Quotations Accepted | Accepted list |
| Expiring in 7 Days | Expiry risk list |
| Expired (not converted) | Expired list |

#### Charts
| Chart | Type | Purpose |
|---|---|---|
| Pipeline by Status | Funnel | Conversion visualization |
| Pipeline Value by Stage | Stacked Bar | Revenue at each stage |
| Quotations by Sales Rep | Horizontal Bar | Rep performance comparison |

#### Breakdown
By Sales Rep → count, total value, conversion %, avg days to close.

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Quotation Number | All | ✓ |
| Client | All | ✓ |
| Total Value | Sales, Finance | ✓ |
| Status | All | ✓ |
| Assigned To | Manager | ✓ |
| Issue Date | All | ✓ |
| Expiry Date | All | ✓ |
| Days to Expiry | All | ✓ |
| Revision Count | Manager | — |
| Last Activity Date | All | — |

#### Drill Down
- KPI card → filtered quotation list
- Row → original Quotation record with revision history

#### Exports
Excel, PDF

---

### C-02 — Order Summary
**Purpose:** Confirmed orders / Order Acknowledgements for the period.
**Business Question:** How many orders did we confirm this month and at what total value?
**Primary Consumer:** Sales Manager (delivery planning), Finance (revenue recognition).
**Audience:** Superadmin, Sales Manager, Finance, CEO

#### Filters
Date Range · Client · Status · Assigned To

#### KPI Cards
| KPI |
|---|
| Orders Confirmed (period) |
| Total Order Value |
| Orders Pending Delivery |
| Orders Completed |

#### Breakdown
By Client → order count, total value.

#### Detailed Table Columns
Order Number · Client · Order Value · Status · Order Date · Expected Delivery Date · Assigned To · Linked Quotation

#### Drill Down
- Row → OrderAcknowledgment record

#### Exports
Excel, PDF

---

### C-03 — Client Activity Summary
**Purpose:** Volume and type of interactions per client in a period.
**Business Question:** How actively are we engaging each client, and what types of activities are happening?
**Primary Consumer:** Sales Manager — relationship depth audit.
**Audience:** Superadmin, Sales Manager (all), Sales Rep (own only)

#### Filters
Date Range · Client · Activity Type (Call / Visit / Email / Demo / Follow-up) · Assigned To

#### KPI Cards
| KPI |
|---|
| Total Activities (period) |
| Clients with No Activity (30 days) |
| Avg Activities per Client |

#### Breakdown
By Client → activity count by type.

#### Detailed Table Columns
Client · Activity Type · Count · Last Activity Date · Assigned To

#### Drill Down
- Row → CRMActivity list filtered to that client

#### Exports
Excel

---

### C-04 — Client Ledger
**Purpose:** Complete financial transaction history for a specific client.
**Business Question:** What has this client ordered, invoiced, and paid — and what do they still owe?
**Primary Consumer:** Finance / Account Manager — account reconciliation.
**Audience:** Finance, Superadmin, Account Manager (own client)

#### Filters
Client (mandatory) · Date Range

#### KPI Cards
| KPI |
|---|
| Total Invoiced |
| Total Collected |
| Outstanding Balance |
| Overdue Amount |

#### Detailed Table Columns
Date · Transaction Type (Order / Invoice / Payment / Credit Note) · Reference Number · Amount · Balance · Notes

#### Drill Down
- Row → source order or payment record

#### Exports
Excel, PDF (statement format for client communication)

---

### C-05 — Client Health Dashboard
**Purpose:** Multi-dimensional health score per client based on activity, payments, and order frequency.
**Business Question:** Which clients are at risk (low engagement, overdue payments, no recent orders)?
**Primary Consumer:** Senior Manager — account risk review.
**Audience:** Superadmin, Senior Manager, CEO

#### Filters
Date Range · Assigned To · Segment (if applicable)

#### KPI Cards
Clients at Risk · Clients with Overdue Payments · Clients with No Activity (60 days) · High-Value Clients

#### Breakdown
By Client → last order date, last activity date, outstanding balance, activity count.

#### Exports
Excel, PDF

> **Note:** This report does NOT generate a "health score" using algorithmic assumptions. It presents factual signals (last contact, last order, outstanding amount) — the manager draws their own conclusion.

---

### C-06 — Meetings Summary
**Purpose:** Log of all client meetings — who attended, what was the purpose, outcome.
**Business Question:** How many meetings did we conduct this period, and what were the outcomes?
**Primary Consumer:** Sales Manager.
**Audience:** Superadmin, Manager (team), Sales Rep (self)

#### Filters
Date Range · Client · Meeting Type · Organized By

#### Detailed Table Columns
Meeting Date · Client · Meeting Type · Participants (internal) · Agenda · Outcome · Follow-up Required · Scheduled By

#### Exports
Excel, PDF

---

### C-07 — Receivables Aging
**Purpose:** Outstanding invoices categorized by how long they have been unpaid.
**Business Question:** Which clients owe us money, and how old are those invoices?
**Primary Consumer:** Finance — working capital management and collection prioritization.
**Audience:** Finance, Superadmin, CEO

> **This is one of the most operationally critical reports in the CRM module. Finance must be able to run this every morning.**

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| As-of Date | Date picker | — |
| Client | Select | — |
| Minimum Outstanding | Number | — |

#### KPI Cards
| KPI |
|---|
| Total Outstanding Receivables |
| Current (0–30 days) |
| 31–60 Days |
| 61–90 Days |
| 90+ Days (Critical) |

#### Charts
Stacked Bar — aging buckets by client (shows which clients contribute most to old debt).

#### Breakdown
By Client → 0-30, 31-60, 61-90, 90+ day buckets.

#### Detailed Table Columns
| Column | Mandatory |
|---|:---:|
| Client | ✓ |
| Invoice / Order Reference | ✓ |
| Invoice Date | ✓ |
| Due Date | ✓ |
| Invoice Amount | ✓ |
| Paid Amount | ✓ |
| Outstanding | ✓ |
| Days Overdue | ✓ |
| Aging Bucket | ✓ |
| Account Manager | — |

#### Drill Down
- KPI bucket card → filtered invoice list
- Client row → Client Ledger filtered to that client

#### Exports
Excel, PDF (shareable with Finance leadership)

---

### C-08 — Collection Summary
**Purpose:** Payments received from clients in a given period vs. expected.
**Business Question:** How much did we collect this month, and how does it compare to what was due?
**Primary Consumer:** Finance / CFO — monthly revenue reconciliation.
**Audience:** Finance, Superadmin, CEO

#### Filters
Date Range · Client · Payment Mode

#### KPI Cards
| KPI |
|---|
| Total Collections (period) |
| Expected Collections (due this period) |
| Collection Efficiency % (Collected / Expected) |
| Overdue from Prior Periods Collected |

#### Charts
Bar — expected vs. actual collections by week.

#### Breakdown
By Client → collected, expected, efficiency %.

#### Detailed Table Columns
Client · Payment Date · Amount · Payment Mode · Reference · Invoice Applied To

#### Exports
Excel, PDF

---

### C-09 — Payment Journal
**Purpose:** Chronological log of all payment transactions.
**Business Question:** What payments were received, from whom, on what dates, and how were they applied?
**Primary Consumer:** Finance — bookkeeping.
**Audience:** Finance, Superadmin

#### Filters
Date Range · Client · Payment Mode

#### Detailed Table Columns
Payment Date · Client · Amount · Payment Mode · Reference Number · Applied to Invoice · Received By · Notes

#### Exports
Excel, CSV

---

### C-10 — Sales Activity Report
**Purpose:** Measure the activity output of each sales team member.
**Business Question:** How many calls, visits, emails, and follow-ups did each sales rep perform this period?
**Primary Consumer:** Sales Manager — rep performance management.
**Audience:** Superadmin, Sales Manager (all), Sales Rep (own only)

#### Filters
Date Range · Sales Rep · Activity Type · Client

#### KPI Cards
Total Activities · Avg Activities per Rep · Most Active Rep · Reps with Zero Activity

#### Breakdown
By Sales Rep → activity count by type.

#### Detailed Table Columns
Sales Rep · Calls · Visits · Emails · Demos · Follow-ups · Total · Last Activity Date · Unique Clients Touched

#### Drill Down
- Rep row → CRMActivity list for that rep

#### Exports
Excel

---

### C-11 — Quotation Conversion Rate
**Purpose:** Measure how effectively quotations convert to confirmed orders.
**Business Question:** What percentage of our quotations become orders, and what is the win rate by rep?
**Primary Consumer:** Sales Manager / CEO — sales effectiveness measurement.
**Audience:** Superadmin, Sales Manager, CEO

> **Architecture note:** Merge this into the Quotation Pipeline (C-01) as a secondary view, not a standalone report, unless the volume of quotations justifies a dedicated page.

#### Filters
Date Range · Sales Rep · Client Segment

#### KPI Cards
Total Quotations Sent · Total Accepted · Conversion Rate % · Avg Days to Convert · Avg Deal Value

#### Breakdown
By Sales Rep → sent, accepted, rejected, conversion %, avg value.

#### Exports
Excel, PDF

---

## 5. Backend Requirements

### `buildReport()` Features Required

| Feature | Reports |
|---|---|
| Date range on `quotationDate`, `orderDate`, `paymentDate` | C-01, C-02, C-08, C-09 |
| Cross-model join: Quotation + OrderAcknowledgment (conversion tracking) | C-11 |
| Cross-model join: Collection + Payment + ClientLedger | C-04, C-07, C-08 |
| Aging bucket computation (0-30, 31-60, 61-90, 90+) | C-07 |
| Grouping by client with multi-metric aggregation | C-03, C-05, C-07, C-08 |
| Row-level scope by `assignedTo` (sales rep's own clients) | C-01, C-03, C-10 |
| Computed field: `daysOverdue = TODAY - dueDate` | C-07 |
| Computed field: `conversionRate = accepted / sent` | C-11 |
| Running balance computation (ledger) | C-04 |

### Aging Buckets (C-07 Implementation)
Aging must be computed server-side:
```js
daysOverdue = Math.floor((today - dueDate) / 86400000)
bucket = daysOverdue <= 0 ? 'Current' :
         daysOverdue <= 30 ? '1-30' :
         daysOverdue <= 60 ? '31-60' :
         daysOverdue <= 90 ? '61-90' : '90+'
```
This logic belongs in `aggregationEngine.js` as a reusable `$addFields` stage builder, not in individual report implementations.

### API Design
```
POST /api/reports/crm/:reportId
GET  /api/reports/crm/:reportId/export
```

### Performance Considerations
- Index: `quotations.status`, `quotations.assignedTo`, `quotations.expiryDate`
- Index: `collections.clientId`, `collections.dueDate`, `collections.paymentStatus`
- C-07 Receivables Aging runs daily for Finance; cache result for 30 minutes with invalidation on any payment event

---

## 6. Future Considerations (Architecture Only)

1. **Revenue Forecast:** Once order intake data is stable, add a monthly revenue projection report based on confirmed orders with expected delivery dates — no assumptions, only confirmed records.
2. **Credit Limit Integration:** If a `creditLimit` field is added to `Client`, the Receivables Aging report can add a "% of Credit Limit Used" column to flag clients near their limit.
3. **Lead Source Tracking:** Adding a `leadSource` field to `Client` / opportunity model enables a Lead Conversion by Source report, which is currently not possible without source data.
4. **Client Segmentation:** A `tier` or `segment` field on `Client` (e.g., Key Account / Growth / Standard) enables portfolio-level reporting without custom SQL queries.


# People-Reporting-Plan.md

> **Module:** People (Travel, Expenses & Daily Activity)
> **Version:** 1.0 — July 2026
> **Covers:** Expenses · WFH Requests · Daily Activity Logs · Employee Self-Service
> **Source Models:** `Expense`, `WFHRequest`, `DailyActivity`, `Employee`, `Client`, `Department`

---

## 1. Module Overview

### Purpose
The People module captures the day-to-day self-reported activity of employees — expenses claimed for business travel and operations, requests to work from home, and daily activity logs (what did I work on today). These records are submitted by employees and approved through the standard approval workflow. Reports from this module answer: **Are employees claiming expenses appropriately, working from home by policy, and logging their daily output?**

### Business Goals
- Ensure expense claims are legitimate, within policy, and accurately reimbursed.
- Maintain visibility into WFH patterns across the organization.
- Provide Finance with expense accruals for cost control.
- Give managers transparency into what their team is working on daily.

### Reporting Goals
1. Give Finance a monthly expense summary ready for reimbursement processing.
2. Surface expense policy violations before they are reimbursed.
3. Give managers a team-level view of WFH usage.
4. Provide HR with daily activity data as an operational productivity signal.

---

## 2. Navigation Structure

```
People Reports
├── ⭐ Expenses
│     ├── Expense Summary             [CORE]
│     └── Pending Approvals           [CORE]
│     ── More Reports ──
│     ├── Expense by Employee         [ADDITIONAL]
│     ├── Expense by Category         [ADDITIONAL]
│     └── Expense Exceptions          [ADDITIONAL]
├── ⭐ WFH
│     ├── WFH Summary                 [CORE]
│     └── WFH Trend                   [ADDITIONAL]
└── ⭐ Daily Activity
      └── Daily Activity Log          [CORE]
      ── More Reports ──
      └── Activity by Client/Project  [ADDITIONAL]
```

### Audience Visibility Matrix
| Report | Superadmin/HR | Manager | Employee | Finance |
|---|:---:|:---:|:---:|:---:|
| Expense Summary | ✓ | ✓ (team) | ✓ (self) | ✓ |
| Pending Approvals | ✓ | ✓ (team) | ✓ (self) | — |
| Expense by Employee | ✓ | ✓ (team) | ✓ (self) | ✓ |
| Expense by Category | ✓ | ✓ (team) | — | ✓ |
| Expense Exceptions | ✓ | ✓ (team) | — | ✓ |
| WFH Summary | ✓ | ✓ (team) | ✓ (self) | — |
| WFH Trend | ✓ | ✓ (team) | — | — |
| Daily Activity Log | ✓ | ✓ (team) | ✓ (self) | — |
| Activity by Client/Project | ✓ | ✓ (team) | ✓ (self) | ✓ |

---

## 3. Report Inventory

| # | Report Name | Business Question | Primary Consumer | Category | Mandatory | Frequency |
|---|---|---|---|---|:---:|---|
| P-01 | Expense Summary | What is the total expense claimed and approved this month by dept/category? | Finance | Expenses | ✓ | Monthly |
| P-02 | Pending Approvals | Which expense claims are awaiting approval right now? | Manager / HR | Expenses | ✓ | Daily |
| P-03 | Expense by Employee | How much has each employee claimed in expenses this period? | Finance / Manager | Expenses | — | Monthly |
| P-04 | Expense by Category | Which expense categories are consuming the most budget? | Finance | Expenses | — | Monthly |
| P-05 | Expense Exceptions | Which claims exceed policy limits or are flagged as unusual? | Finance / HR | Expenses | — | Monthly |
| P-06 | WFH Summary | How many WFH days were approved per employee/department? | HR / Manager | WFH | ✓ | Monthly |
| P-07 | WFH Trend | Is WFH usage increasing or decreasing over time? | HR | WFH | — | Quarterly |
| P-08 | Daily Activity Log | What did each employee log as their work output this period? | Manager | Daily Activity | ✓ | Daily / Weekly |
| P-09 | Activity by Client/Project | How many hours were logged against each client/project? | Finance / Manager | Daily Activity | — | Weekly |

---

## 4. Report Specifications

---

### P-01 — Expense Summary
**Purpose:** Aggregate view of all expense claims for a period.
**Business Question:** What is the total expense claimed, approved, and pending reimbursement this month?
**Primary Consumer:** Finance — monthly cost accrual and reimbursement processing.
**Audience:** Finance, HR, Superadmin, Manager (team scoped), Employee (self only)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range (expense date) | Date range | ✓ |
| Department | Multi-select | — |
| Employee | Employee lookup | — |
| Category | Multi-select | — |
| Status | Multi-select (Pending / Approved / Rejected / Reimbursed) | — |
| Client | Select | — |

#### KPI Cards
| KPI | Drill Down |
|---|---|
| Total Claimed Amount | Full expense list |
| Total Approved Amount | Approved list |
| Pending Approval Count | Pending list |
| Reimbursed This Month | Reimbursed list |

#### Charts
| Chart | Type | Purpose |
|---|---|---|
| Expense by Category | Donut | Where is money being spent? |
| Monthly Expense Trend | Bar | Month-over-month comparison |

#### Breakdown
By Department → by Employee within department.

#### Detailed Table Columns
| Column | Visibility | Mandatory |
|---|---|:---:|
| Expense ID | All | ✓ |
| Employee Name | Manager, Finance, HR | ✓ |
| Department | Manager, Finance, HR | ✓ |
| Date | All | ✓ |
| Category | All | ✓ |
| Description | All | ✓ |
| Amount | All | ✓ |
| Status | All | ✓ |
| Approved By | Manager, HR | — |
| Client | All | — |
| Receipt Attached | Finance, HR | — |

#### Drill Down
- KPI card → filtered expense list
- Row → original Expense record with attachments

#### Exports
Excel, CSV, PDF

---

### P-02 — Pending Approvals
**Purpose:** Live queue of expense claims awaiting manager or HR approval.
**Business Question:** Which expense claims are pending approval right now, by whom, for how long?
**Primary Consumer:** Manager — daily approval management.
**Audience:** Superadmin, HR, Manager (own team), Employee (self only)

#### Filters
Department · Employee · Days Pending (minimum) · Amount Range

#### KPI Cards
| KPI |
|---|
| Total Pending Approvals |
| Pending > 7 Days |
| Total Amount Pending |

#### Detailed Table Columns
Employee Name · Department · Submitted Date · Days Pending · Category · Amount · Description · Awaiting Approver

#### Drill Down
- Row → Expense record (can approve directly from drill-down)

#### Exports
Excel

---

### P-03 — Expense by Employee
**Purpose:** Per-employee expense totals for a period.
**Business Question:** How much has each employee claimed and received in reimbursements?
**Primary Consumer:** Finance (reimbursement processing), Manager (spending oversight).
**Audience:** Finance, HR, Manager (scoped), Employee (self only)

#### Filters
Date Range · Department · Employee · Status

#### Detailed Table Columns
Employee Name · Department · Total Claimed · Total Approved · Total Reimbursed · Pending · Rejected

#### Drill Down
- Row → Expense Summary filtered to that employee

#### Exports
Excel, PDF

---

### P-04 — Expense by Category
**Purpose:** Cost breakdown by expense category for budget analysis.
**Business Question:** Which types of expenses are employees claiming most frequently and at what value?
**Primary Consumer:** Finance — budget category analysis.
**Audience:** Finance, Superadmin

#### Filters
Date Range · Department · Category

#### Detailed Table Columns
Category · Number of Claims · Total Approved Amount · Avg Claim Amount · Top Claimant

#### Drill Down
- Category row → Expense list filtered to that category

#### Exports
Excel, PDF

---

### P-05 — Expense Exceptions
**Purpose:** Identify claims that exceed policy limits or appear unusual.
**Business Question:** Which claims are above policy thresholds, lack receipts, or have been flagged?
**Primary Consumer:** Finance / HR — pre-reimbursement audit.
**Audience:** Finance, Superadmin, HR

#### Filters
Date Range · Department · Exception Type (Over Limit / No Receipt / Duplicate Dates) · Amount Threshold

#### KPI Cards
Claims Over Policy Limit · Claims Without Receipt · Total Exception Value

#### Detailed Table Columns
Employee · Category · Amount · Policy Limit · Excess Amount · Exception Type · Status

#### Exports
Excel, PDF

---

### P-06 — WFH Summary
**Purpose:** Aggregated WFH days approved per employee and department.
**Business Question:** How many WFH days were approved this month per employee/department?
**Primary Consumer:** HR (policy compliance), Manager (team availability).
**Audience:** HR, Manager (scoped), Employee (self only)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range | Date range | ✓ |
| Department | Multi-select | — |
| Employee | Employee lookup | — |
| Status | Multi-select (Approved / Pending / Rejected) | — |

#### KPI Cards
| KPI |
|---|
| Total WFH Days Approved |
| Employees on WFH Today |
| Pending WFH Requests |

#### Breakdown
By Department → total WFH days, avg per employee.

#### Detailed Table Columns
Employee Name · Department · WFH Date · Status · Reason · Approved By · Manager

#### Drill Down
- Row → WFHRequest record

#### Exports
Excel, PDF

---

### P-07 — WFH Trend
**Purpose:** Month-over-month view of WFH usage across the organization.
**Business Question:** Is WFH usage increasing? Are certain departments consistently over-using WFH?
**Primary Consumer:** Senior HR — policy review and workforce planning.
**Audience:** HR, Superadmin

#### Filters
Date Range (monthly buckets) · Department

#### Charts
Line chart — WFH days per month over time, with department breakdown.

#### Breakdown
By Month → by Department.

#### Exports
Excel, PDF

---

### P-08 — Daily Activity Log
**Purpose:** Employee-submitted daily work log review by manager.
**Business Question:** What did employees log as their work output, and are they logging consistently?
**Primary Consumer:** Manager — team productivity visibility.
**Audience:** Superadmin, HR, Manager (scoped), Employee (self only)

#### Filters
| Filter | Type | Mandatory |
|---|---|:---:|
| Date Range | Date range | ✓ |
| Employee | Employee lookup | — |
| Department | Multi-select | — |
| Client | Select | — |
| Status | Multi-select | — |

#### KPI Cards
| KPI |
|---|
| Employees with No Log Today |
| Total Logs Submitted |
| Avg Hours Logged per Employee |

#### Detailed Table Columns
| Column | Mandatory |
|---|:---:|
| Employee Name | ✓ |
| Date | ✓ |
| Activity Description | ✓ |
| Client | — |
| Project Type | — |
| Hours Logged | ✓ |
| Status | ✓ |

#### Drill Down
- Row → full DailyActivity record

#### Exports
Excel

---

### P-09 — Activity by Client/Project
**Purpose:** Aggregated hours logged against each client or project type.
**Business Question:** How many hours did employees log against each client or project this period?
**Primary Consumer:** Finance (billing input), Manager (effort tracking).
**Audience:** Finance, Manager (scoped), Employee (self only)

#### Filters
Date Range · Employee · Client · Project Type

#### Breakdown
By Client → by Employee → hours logged.

#### Detailed Table Columns
Client · Project Type · Employee · Total Hours Logged · Date Range

#### Drill Down
- Client row → Daily Activity Log filtered to that client + period

#### Exports
Excel, CSV

---

## 5. Backend Requirements

### `buildReport()` Features Required

| Feature | Reports |
|---|---|
| Date range on `expenseDate`, `wfhDate`, `activityDate` | P-01, P-06, P-08 |
| Row-level scope (`isManagedBy`, `isSelf`) | All reports |
| Aggregation `SUM(amount)` by employee/category/dept | P-01, P-03, P-04 |
| Cross-model join: DailyActivity + Client | P-09 |
| Computed field: `daysOverdue = TODAY - submittedDate` | P-02 |
| Policy limit comparison (expense ceiling per category) | P-05 |
| Time-bucket grouping (monthly) | P-07 |

### Expense Policy Config
P-05 (Expense Exceptions) requires a `ExpensePolicy` config (or stored in `general_settings`) defining per-category spending limits. This is a **configuration read**, not hardcoded logic. The `columnResolver` / `aggregationEngine` must join this config at query time.

### API Design
```
POST /api/reports/people/:reportId
GET  /api/reports/people/:reportId/export
```

---

## 6. Future Considerations (Architecture Only)

1. **Expense Receipt OCR:** When receipt attachments are added to `Expense`, an OCR pipeline could validate that claimed amounts match the attached receipt — purely data verification, not AI inference.
2. **WFH Policy Enforcement:** If a `wfhAllowance` (days per month) is added to `LeavePolicy`, the WFH Summary report can automatically flag employees who exceeded their monthly WFH quota — no new report needed, just an additional column.
3. **Daily Activity Completeness Cron:** A daily cron that checks which employees submitted no activity log for the previous working day and fires a reminder notification — reuses existing notification infrastructure.
