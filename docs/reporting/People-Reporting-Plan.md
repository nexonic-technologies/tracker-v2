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
