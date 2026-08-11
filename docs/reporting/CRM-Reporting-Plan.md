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
