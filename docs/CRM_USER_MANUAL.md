# 📖 Tracker CRM v3 — Unified Sales & Revenue Operations User Manual

> **Workhub ERP Tracker Platform**  
> **Target Audience:** Sales Representatives, Account Managers, Finance Teams, Delivery Leads & Executive Leadership.  
> **Version:** 3.2.0 (Revenue Operations Edition)

---

## 📑 Table of Contents
1. [System Overview & Commercial Architecture](#1-system-overview--commercial-architecture)
2. [Phase 1: Lead Capture & Contact Management](#2-phase-1-lead-capture--contact-management)
3. [Phase 2: Contact-to-Account Conversion](#3-phase-2-contact-to-account-conversion)
4. [Phase 3: Deal Pipeline & Opportunity Management](#4-phase-3-deal-pipeline--opportunity-management)
5. [Phase 4: Quotation Builder & Price Proposals](#5-phase-4-quotation-builder--price-proposals)
6. [Phase 5: Contract Generation & Order Acknowledgments (OA)](#6-phase-5-contract-generation--order-acknowledgments-oa)
7. [Phase 6: Tax Invoices & Automated AR Billing](#7-phase-6-tax-invoices--automated-ar-billing)
8. [Phase 7: Payment Collections & Double-Entry Ledger Settlement](#8-phase-7-payment-collections--double-entry-ledger-settlement)
9. [Phase 8: 360° Unified Customer Command Center](#9-phase-8-360-unified-customer-command-center)
10. [Phase 9: Executive MIS Reporting & Delivery Margin Analytics](#10-phase-9-executive-mis-reporting--delivery-margin-analytics)
11. [Troubleshooting & Frequently Asked Questions (FAQ)](#11-troubleshooting--frequently-asked-questions-faq)

---

## 1. System Overview & Commercial Architecture

Tracker CRM v3 connects **Pre-Sale Commercial Operations** (lead qualification, deal pipelines, quotations) with **Post-Sale Delivery & Finance** (contracts, billing, double-entry AR ledger, actual delivery labor burn, and real client profitability).

```text
                               COMMERCIAL LIFECYCLE FLOW
                                          │
    [ 1. Lead / Contact ] ──► [ 2. Customer Account ] ──► [ 3. Deal / Opportunity ]
                                                                  │
                                                                  ▼
    [ 6. Tax Invoice ] ◄── [ 5. Contract (OA) ] ◄── [ 4. Price Quotation ]
            │
            ▼
    [ 7. Double-Entry AR Ledger ] ◄── [ 8. Payment Receipt ]
            │
            ▼
    [ 9. 360° Account Profitability (Revenue vs. Delivery Labor Burn) ]
```

---

## 2. Phase 1: Lead Capture & Contact Management

### Purpose
Record inquiries, prospective stakeholders, and marketing leads before an official customer account is established.

### Step-by-Step Instructions:
1. Navigate to **CRM** ➔ **Manage Contacts** (`/crm/contacts`).
2. Click the **`+ Add Lead`** button in the top header.
3. Fill in the required contact information:
   - **Full Name**: e.g., *Rajesh Sharma*
   - **Email Address**: e.g., *rajesh@enterprise.com*
   - **Phone / Mobile**: e.g., *+91 98765 43210*
   - **Company / Organization**: e.g., *Apex Cloud Solutions*
   - **Lead Status**: Select `New`, `Qualified`, `Proposal`, or `Negotiation`.
4. Click **`Save Lead`**.
5. The contact will now appear in your active leads directory with quick-dial and email action shortcuts.

---

## 3. Phase 2: Contact-to-Account Conversion

### Purpose
When a prospect shows qualified commercial interest, convert the individual contact into an official **Customer Account (Client)**.

### Step-by-Step Instructions:
1. In **Manage Contacts** (`/crm/contacts`), locate the qualified lead.
2. In the rightmost action column, click **`Convert to Client`**.
3. The platform automatically:
   - Creates a new **Customer Account** in the database.
   - Links the originating Contact ID to the Account.
   - Logs an immutable `CRMActivity` entry.
   - Sets the initial account status to **Prospect / Active**.
4. You will be redirected to the **360° Customer Command Center** for that account.

---

## 4. Phase 3: Deal Pipeline & Opportunity Management

### Purpose
Track potential sales engagements, estimated deal values, probability milestones, and expected close dates.

### Step-by-Step Instructions:
1. Navigate to **CRM** ➔ **Deal Pipeline (Opportunities)** (`/crm/opportunities`).
2. Click **`+ New Opportunity`** in the top right.
3. Fill in the deal details:
   - **Opportunity Name**: e.g., *Cloud ERP Enterprise Migration 2026*
   - **Client Account**: Select the target customer from the dropdown.
   - **Sales Owner**: Assign a sales executive/rep.
   - **Deal Stage**:
     - `New` (10% probability default)
     - `Discovery` (25% probability default)
     - `Proposal` (50% probability default)
     - `Negotiation` (75% probability default)
     - `Won` (100% probability default — requires approved quotation)
     - `Lost` (0% probability — requires mandatory *Lost Reason*)
   - **Expected Value (₹)**: e.g., *₹12,50,000*
   - **Target Close Date**: Select anticipated contract signing date.
4. Click **`Create Opportunity`**.

### Drag-and-Drop Pipeline Progression:
- In the **Pipeline Board (Kanban)**, click and drag any deal card across columns to advance its stage.
- The **Weighted Forecast Cockpit** (`Expected Value × Probability %`) will update in real-time.

---

## 5. Phase 4: Quotation Builder & Price Proposals

### Purpose
Generate formal, itemized price proposals with automated GST tax calculation, product catalog selection, and version-controlled revision snapshots.

### 5.1 Where to Create & Manage Your Products / Rate Cards
Products and deliverable rate cards can be pre-configured in the platform's catalog:
1. Navigate to **Master Data** ➔ **Products & Services** (`/master-data/products`).
2. Click **`+ Add Product`** to define:
   - **Product / Service Name**: e.g., *Cloud Architecture Consultation*, *Mobile App Module*, *UI/UX Prototyping*.
   - **Default Description**: Scope deliverables and SLA terms.
   - **Base Unit Price (₹)**: e.g., *₹75,000*.
   - **Status**: `Active`.
3. Saved products become instantly selectable in all Quotation and Invoice line-item dropdowns across the company.

---

### 5.2 Building Line Items (Catalog Selectable vs. Custom Deliverables)
When creating a Quotation (`/crm/quotations/form`) or Tax Invoice (`/crm/invoices`):
1. **Option A — Select from Product Catalog (Recommended)**:
   - Click the **"Select Product / Deliverable..."** dropdown on any line item row.
   - Choose a pre-defined product.
   - The platform auto-fills the **Description** and **Standard Unit Price** (which you can still adjust if offering a custom discount).
2. **Option B — Custom / Ad-Hoc Deliverables**:
   - If a proposal requires custom work not in your catalog, simply type directly into the **Item Description** field (e.g., *"Custom AWS VPC Multi-Region Peering Setup"*).
   - Enter custom **Quantity**, **Unit Price (₹)**, and **Tax Rate %**.
3. **Adding Multiple Deliverables**:
   - Click **`+ Add Item`** to append as many catalog or custom items as needed.
   - Click the trash icon to remove a line item.
4. **Summary & Totals**:
   - The system automatically computes server-authoritative Subtotal, Tax Breakdown (e.g., 18% GST), and Grand Total.

### Managing Revisions:
- If a client requests pricing adjustments, click **`Request Revision`**.
- The system captures a snapshot of the current quote in `quotation_revisions` and increments the active version number (`Rev 1`, `Rev 2`, etc.).

---

## 6. Phase 5: Contract Generation & Order Acknowledgments (OA)

### Purpose
Lock in an approved quotation into an official, legally binding **Order Acknowledgment (Contract)**.

### Step-by-Step Instructions:
1. In **Quotations Manager** (`/crm/quotations`), open the approved quotation.
2. Click **`Approve & Convert to OA`**.
3. The platform generates an **Order Acknowledgment** (`OA-XXXXXX`):
   - Locks agreed contract deliverables and milestones.
   - Automatically activates the Client Account (`Status: Active`).
   - Links the OA to delivery task queues.
4. View all active contracts under **CRM** ➔ **Order Acknowledgments** (`/crm/order-acknowledgement`).

---

## 7. Phase 6: Tax Invoices & Automated AR Billing

### Purpose
Issue formal tax invoices against contract milestones with **automated double-entry Accounts Receivable (AR) ledger credit posting**.

### Step-by-Step Instructions:
1. Navigate to **CRM** ➔ **Tax Invoices & Billing** (`/crm/invoices`).
2. Click **`+ Create Invoice`**.
3. Select the **Client Account** and optional **Contract (OA)** reference.
4. Set the **Issue Date** and **Payment Due Date**.
5. Add line items with quantities and tax rates.
6. Choose the Invoice Status:
   - **`Draft`**: Saves for internal review (no financial ledger postings).
   - **`Issued`**: Formally issues the tax invoice.
7. Click **`Issue & Post to Ledger`**.

> [!IMPORTANT]
> **Automated Accounting Automation:**  
> When an invoice is set to `Issued`, the platform **automatically creates a Credit entry on the Client's Outstanding Ledger** (`clients_ledgers`), increasing the client's Accounts Receivable balance without manual accounting intervention.

---

## 8. Phase 7: Payment Collections & Double-Entry Ledger Settlement

### Purpose
Record payment receipts from clients and settle outstanding accounts receivable.

### Step-by-Step Instructions:
1. Navigate to **CRM** ➔ **Payments** (`/crm/payments`) or **Invoices** (`/crm/invoices`).
2. Click **`Record Payment Receipt`**:
   - Select the **Client Account**.
   - Input **Amount Received (₹)**.
   - Select **Payment Mode** (NEFT, RTGS, UPI, Cheque, Wire).
   - Input **Bank Reference / UTR Number**.
   - Link the payment to the specific **Invoice Number**.
3. Click **`Verify Payment`**.

> [!TIP]
> **Automated Settlement Automation:**  
> Once verified, the platform:
> 1. Posts an automated **Debit Entry** to `clients_ledgers` (decreasing outstanding balance).
> 2. Updates the invoice `paidAmount` and recomputes `balanceDue`.
> 3. If `balanceDue == 0`, marks the Invoice status as **`Paid`** automatically.

---

## 9. Phase 8: 360° Unified Customer Command Center

### Purpose
The comprehensive, all-in-one customer cockpit for account managers and executives (`/crm/contacts/:id`).

### Key Cockpit Features:
1. **Commercial KPI Banner**:
   - **Contracted Value**: Total value of approved OAs.
   - **Total Invoiced**: Total tax invoices issued.
   - **Total Collected**: Verified payments received.
   - **Outstanding AR**: Real-time receivable balance due.
   - **Delivery Hours**: Billable hours logged by engineers on time tracker.
   - **Gross Margin %**: Real-time margin after direct labor costs.
   - **Health Tag**: `🟢 Prime Account (>40%)`, `🟡 Low Margin (20-40%)`, or `🔴 Loss Alert (<0%)`.
2. **360° Navigation Tabs**:
   - **Overview**: Contact info, quick note logger, and next meeting scheduler.
   - **Opportunities**: All active and closed deals with win probabilities.
   - **Quotations**: Price proposal history and revision snapshots.
   - **Contracts (OAs)**: Approved commercial orders and milestone status.
   - **Invoices**: Tax invoices, due dates, and outstanding balances.
   - **Unified Timeline**: Chronological stream of calls, notes, quotes, contracts, and payments.

---

## 10. Phase 9: Executive MIS Reporting & Delivery Margin Analytics

### Purpose
Executive dashboards for P&L tracking, deal conversion rates, and client profitability.

### Accessing Reports:
Navigate to **CRM** ➔ **Reports** (`/crm/reports`) or executive analytics:

| Report Code | Report Title | Business Insight |
|---|---|---|
| **MIS-02** | **Client Profitability & Delivery Margin** | Real gross profit per client: `Invoiced Revenue - (Delivery Hours × Hourly Cost Rate + Expenses)`. Identifies loss-making vs. high-margin accounts. |
| **MIS-04** | **Monthly Business Review (MBR)** | Total invoiced revenue, cash collections, payroll costs, operational opex, and net operating margin. |
| **MIS-06** | **CRM Lead & Activity Pipeline** | Funnel conversion velocity, sales representative touchpoints, and weighted deal forecast. |
| **C-02** | **Quotation Conversion Ledger** | Quotation win rates, discount percentages, and average sales cycle length. |

---

## 11. Troubleshooting & Frequently Asked Questions (FAQ)

### Q1: Why can't I mark an Opportunity as "Won"?
**A:** The platform requires a valid, approved quotation to be linked before a deal can be marked as `Won`. Ensure the quotation is in `Client Approved` or `Accepted` status.

### Q2: Why is the "Lost Reason" field required when marking a deal as "Lost"?
**A:** To maintain commercial intelligence and competitor analysis, the platform enforces capturing why a deal was lost (e.g., *budget constraint*, *competitor selected*, *project canceled*).

### Q3: How does the Client Outstanding Ledger calculate running balances?
**A:**  
- **Tax Invoice Issued** ➔ Posts **Credit** (`Running Balance = Previous + Invoice Amount`).
- **Payment Verified** ➔ Posts **Debit** (`Running Balance = Previous - Payment Amount`).

### Q4: How is Delivery Margin % calculated on the 360° Customer Page?
**A:**  
$$\text{Gross Margin \%} = \frac{\text{Total Invoiced} - (\text{Delivery Hours} \times \text{Employee Hourly Rate} + \text{Expenses})}{\text{Total Invoiced}} \times 100$$

---

*© 2026 Workhub ERP Platform. All Rights Reserved.*
