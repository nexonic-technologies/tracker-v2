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
