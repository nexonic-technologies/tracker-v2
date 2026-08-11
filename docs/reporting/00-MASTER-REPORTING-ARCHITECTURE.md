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
