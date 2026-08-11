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
