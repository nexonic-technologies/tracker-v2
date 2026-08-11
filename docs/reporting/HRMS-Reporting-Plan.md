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
