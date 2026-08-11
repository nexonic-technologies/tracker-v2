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
