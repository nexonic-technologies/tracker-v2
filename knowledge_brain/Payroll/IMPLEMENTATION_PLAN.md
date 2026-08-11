# Payroll Module — Full Implementation Plan
version: 1.3 (currency UI tokens)

---

## Changelog from v1.1
- SalaryStructure is now fully versioned (effectiveFrom / effectiveTo) — `isActive` flag removed
- Payroll state machine expanded: Draft → Processing → Processed → Approved → Paid; fields frozen after Approved
- Working days calculation is holiday-aware with a `holidays` collection placeholder
- ESI threshold and TDS logic marked with explicit TODO compliance markers
- `finalizeRun` uses atomic `$inc` to prevent race conditions across Bull workers
- Audit trail added: existing `auditLogger.js` covers all mutations; `payrollAuditEvents` array added to PayrollRun for coarse-grained HR-readable history
- Payslip generation fields added: `payslipUrl`, `generatedAt` on Payroll
- `SalaryStructure` earnings and deductions replaced with dynamic arrays: `earnings[]` and `deductions[]`

## Changelog from v1.2
- Currency UI tokens added to `frontend/src/styles/tokens.css` under `/* Payroll / Currency tokens */`
- All payroll frontend components must use these tokens — no raw hex, no inline green/red colours
- Implementation plan frontend section updated with token reference for every UI element

---

## 1. What We Already Have

### Backend
| File | State | Notes |
|---|---|---|
| `models/Payroll.js` | Exists | Basic fields — needs lopDays, salaryStructureId, payrollRunId, approvedBy, frozenAt, payslipUrl, generatedAt |
| `services/payrolls.js` | Exists (stub) | Only role guard + net recompute — replace entirely |
| `services/computationService.js` | Exists | Bull queue; `generateMonthlyReport` already reads Attendance+Leave; add `payroll-compute` processor |
| `models/Employee.js` | Exists | Has `salaryDetails` (package, basic, ctc) and `personalDocuments.pf/esi/pan` |
| `models/Attendance.js` | Exists | status, workHours, checkIn/checkOut per day |
| `models/Leave.js` | Exists | totalDays, status (Approved), date range |
| `models/Collection.js` | Exists | `payrolls` registered — needs 3 new model entries |
| `helper/populateHelper.js` | Exists | Generic engine — all payroll ops route here |
| `routes/populateRoutes.js` | Exists | `/:action/:model` and `/:action/:model/:id` — no changes needed |
| `utils/servicesCache.js` | Exists | Auto-discovers services by filename = modelName |
| `utils/auditLogger.js` | Exists | `saveAuditLog()` called by `buildUpdateQuery` — covers all mutations automatically |

### Frontend
| File | State | Notes |
|---|---|---|
| `pages/Payroll/index.jsx` | Exists | Manual HR form only — replace with tabbed layout |

### Gaps
- No `SalaryStructure`, `PayrollRun`, `Holiday` models
- No `payrollEngine.js` computation library
- No bulk-run / approve / pay workflow
- No access policies for `payrolls`, `salary_structures`, `payroll_runs`
- No employee self-view
- Frontend has no salary structure management or run workflow

---

## 2. Core Architecture Principle

No dedicated routes. Everything routes through the existing populate engine:

```
Browser → React → axiosInstance
       → POST /populate/{action}/{model}
       → populateHelper → policyEngine → buildQuery
       → CRUD handler (buildCreateQuery / buildUpdateQuery / …)
       → Service lifecycle hooks (beforeCreate / afterCreate / beforeUpdate / afterUpdate)
       → Mongoose → MongoDB
```

Business logic lives in **service lifecycle hooks**:

| Operation | Endpoint | Hook |
|---|---|---|
| Trigger bulk run | `POST /populate/create/payroll_runs` | `payroll_runs.js` afterCreate |
| Approve run | `PUT /populate/update/payroll_runs/:id` `{ status: "Approved" }` | `payroll_runs.js` beforeUpdate |
| Mark run paid | `PUT /populate/update/payroll_runs/:id` `{ status: "Paid" }` | `payroll_runs.js` afterUpdate |
| Single payroll compute | `POST /populate/create/payrolls` | `payrolls.js` beforeCreate |
| Freeze payroll on approve | `PUT /populate/update/payrolls/:id` | `payrolls.js` beforeUpdate |
| Version salary structure | `POST /populate/create/salary_structures` | `salary_structures.js` beforeCreate |

---

## 3. New Files to Create

### 3.1 Backend — Models

---

#### `backend/src/models/SalaryStructure.js`

Versioned per-employee compensation template. The computation engine looks up the version valid for the payroll month, not the latest one.

```
Fields:
  employeeId          ObjectId  → ref: employees  (indexed, not unique — multiple versions per employee)
  version             Number    (auto-incremented per employee: 1, 2, 3 …)
  effectiveFrom       Date      (required — start of this version's validity)
  effectiveTo         Date      (null = currently open; set when superseded)
  ctc                 Number    (annual CTC)

  earnings: [
    {
      name            String    e.g. "Basic", "HRA", "Transport", "Medical", "Special Allowance", "LTA", "Bonus"
      type            String    enum: ['fixed','variable','percentage_of_basic']
      amount          Number    (monthly value; for percentage_of_basic: the percentage, e.g. 40 = 40%)
      taxable         Boolean   default: true
      isProratable    Boolean   default: true  (false = pays full regardless of present days, e.g. Bonus)
    }
  ]

  deductions: [
    {
      name            String    e.g. "PF Employee", "ESI Employee", "TDS", "Professional Tax", "Loan Recovery"
      type            String    enum: ['fixed','percentage_of_basic','percentage_of_gross','statutory']
      amount          Number    (monthly flat or percentage depending on type)
      ceiling         Number    (optional cap — e.g. PF ceiling ₹15,000 on basic)
    }
  ]

  pfEmployeePercent   Number    default: 12    (kept top-level for fast engine access)
  pfCeiling           Number    default: 15000
  esiApplicable       Boolean   default: true
  overtimeRate        Number    default: 0     (₹ per hour)

  createdBy           ObjectId  → ref: employees

Indexes:
  { employeeId: 1, effectiveFrom: -1 }   — primary lookup
  { employeeId: 1, effectiveTo: 1 }
  { employeeId: 1, version: -1 }         — unique per employee per version
```

**Lookup pattern used by engine:**
```
SalaryStructure.findOne({
  employeeId,
  effectiveFrom: { $lte: payrollDate },
  $or: [{ effectiveTo: null }, { effectiveTo: { $gte: payrollDate } }]
}).sort({ effectiveFrom: -1 })
```

This ensures June payroll always uses the June structure even if a July raise was already entered.

---

#### `backend/src/models/PayrollRun.js`

Batch envelope for one month's payroll execution.

```
Fields:
  month               Number    1–12, required
  year                Number    required
  status              String    enum: ['Draft','Processing','Computed','Approved','Paid']  default: 'Draft'
  employeeIds         [ObjectId] → ref: employees  (snapshot at time of run)
  payrollIds          [ObjectId] → ref: payrolls   (populated as jobs complete)
  totalEmployees      Number    default: 0
  processedCount      Number    default: 0  (atomically incremented by workers)
  failedCount         Number    default: 0  (atomically incremented on job failure)
  totalGross          Number    default: 0  (atomically accumulated by workers)
  totalNet            Number    default: 0  (atomically accumulated by workers)
  initiatedBy         ObjectId  → ref: employees
  approvedBy          ObjectId  → ref: employees
  approvedAt          Date
  paidAt              Date
  notes               String

  payrollAuditEvents: [
    {
      event           String    e.g. 'created','processing_started','computed','approved','paid','failed'
      performedBy     ObjectId  → ref: employees
      timestamp       Date      default: now
      note            String
    }
  ]

Indexes:
  { month: 1, year: 1 }         — natural lookup; not unique (allow re-run after failure)
  { status: 1, createdAt: -1 }
  { initiatedBy: 1 }

State machine (enforced in payroll_runs.js beforeUpdate):
  Draft → Processing → Computed → Approved → Paid
  No reverse. No skipping.
```

---

#### `backend/src/models/Holiday.js`

Placeholder for statutory and company holiday calendar. Used by the engine to compute true working days.

```
Fields:
  date                Date      required, unique per year
  name                String    e.g. "Republic Day", "Diwali"
  type                String    enum: ['national','regional','optional','company']
  applicableStates    [String]  ISO state codes — empty = all
  year                Number    indexed

Indexes:
  { date: 1 }  unique
  { year: 1, type: 1 }
```

This model is **read-only at runtime**. HR Admin seeds it annually via the generic populate API. The engine uses it in `computeAttendanceSummary`. If no holiday records exist for a year, the engine falls back to weekoff-only calculation (current behavior) — so this is backward-compatible.

---

### 3.2 Backend — Services

---

#### `backend/src/services/payrollEngine.js`

Pure computation library. No Express. No side effects except DB reads and the upsert in `runPayrollForEmployee`. Called by service hooks and Bull workers.

---

**`resolveStructure(employeeId, payrollDate)`**
```
Returns the SalaryStructure version valid on payrollDate using the versioned lookup above.
Throws if no structure found — job fails gracefully with error recorded on PayrollRun.
```

---

**`computeWorkingDays(month, year, shiftWeeklyOff)`**
```
1. Generate all calendar days in the month
2. Remove weekoff days (from Shift.weeklyOff; default: ['Saturday','Sunday'])
3. Query Holiday collection for the year+month; remove matching dates
   (only 'national' and 'company' types count as mandatory offs by default)
4. Return: { workingDays, holidayDates[] }

NOTE: If Holiday collection is empty for the year, step 3 is skipped silently.
```

---

**`computeAttendanceSummary(employeeId, month, year)`**
```
1. Call computeWorkingDays() to get workingDays + holidayDates
2. Query attendances for the month
3. Compute:
   presentDays   = count of Present + WFH + Late Entry + (Half Day × 0.5)
   leaveDays     = sum of approved Leave.totalDays overlapping the month
   lopDays       = workingDays - presentDays - leaveDays  (clamped ≥ 0)
   overtimeHours = sum of max(workHours - shift.workingHours, 0)

Returns: { workingDays, presentDays, leaveDays, lopDays, overtimeHours }
```

---

**`computeSalary(attendanceSummary, structure)`**

Dynamic earnings/deductions loop — no hardcoded field names:

```
earnedRatio = presentDays / workingDays

EARNINGS LOOP:
for each entry in structure.earnings:
  if entry.isProratable:
    if entry.type === 'fixed':          earned = entry.amount * earnedRatio
    if entry.type === 'percentage_of_basic':
      basicMonthly = resolveBasicAmount(structure)
      earned = (basicMonthly * entry.amount / 100) * earnedRatio
    if entry.type === 'variable':       earned = entry.amount  (full, no proration)
  else:
    earned = entry.amount  (non-proratable: Bonus, one-time)
  accumulatedEarnings[entry.name] = earned

overtimePay = overtimeHours * structure.overtimeRate
grossSalary = sum(accumulatedEarnings) + overtimePay

DEDUCTIONS LOOP:
for each entry in structure.deductions:
  if entry.type === 'fixed':
    deducted = entry.amount
  if entry.type === 'percentage_of_basic':
    base = min(basicEarned, entry.ceiling || Infinity)
    deducted = base * entry.amount / 100
  if entry.type === 'percentage_of_gross':
    base = min(grossSalary, entry.ceiling || Infinity)
    deducted = base * entry.amount / 100
  if entry.type === 'statutory':
    deducted = resolveStatutory(entry.name, grossSalary, structure)
    → 'PF Employee':  min(basicEarned, pfCeiling) * pfEmployeePercent / 100
    → 'ESI Employee': grossSalary <= 21000 && esiApplicable ? grossSalary * 0.0075 : 0
                      TODO: statutory-compliance-engine — regime-aware ESI threshold
    → 'TDS':          structure-level flat tdsMonthly
                      TODO: statutory-compliance-engine — projected annual + 80C/80D/HRA exemptions + regime selection
  accumulatedDeductions[entry.name] = deducted

netSalary = grossSalary - sum(accumulatedDeductions)

Returns: {
  earnedBreakdown: accumulatedEarnings,   // snapshot for payslip display
  deductionBreakdown: accumulatedDeductions,
  grossSalary,
  netSalary,
  lopDays,
  overtimePay
}
```

---

**`runPayrollForEmployee(employeeId, month, year, processedBy, runId)`**
```
1. payrollDate = last day of month/year (for structure lookup)
2. resolveStructure(employeeId, payrollDate)
3. computeAttendanceSummary(employeeId, month, year)
4. computeSalary(attendanceSummary, structure)
5. Check existing Payroll for {employeeId, month, year}:
   - If status = 'Approved' or 'Paid': throw — do not touch
   - If status = 'Draft' or 'Processed': replace (re-run scenario)
   - If none: create
6. Upsert Payroll with all computed fields + status = 'Processed'
   + salaryStructureId, payrollRunId, processedBy, processedAt
   + earnedBreakdown, deductionBreakdown (JSON snapshots for immutable payslip display)
7. Return { payrollId, grossSalary, netSalary }
```

---

**`finalizeRun(runId, grossContribution, netContribution)` — atomic**
```
Uses findOneAndUpdate with $inc to prevent race condition when multiple workers finish simultaneously:

PayrollRun.findOneAndUpdate(
  { _id: runId },
  {
    $inc: {
      processedCount: 1,
      totalGross: grossContribution,
      totalNet: netContribution
    },
    $push: { payrollIds: newPayrollId }
  },
  { new: true }
)

After increment: if (doc.processedCount + doc.failedCount === doc.totalEmployees):
  → set status = 'Computed'
  → push payrollAuditEvents entry { event: 'computed', timestamp: now }

No non-atomic reads before the $inc. This is the fix for the race condition.
```

---

**`finalizeRunOnFailure(runId)` — atomic**
```
PayrollRun.findOneAndUpdate(
  { _id: runId },
  { $inc: { failedCount: 1 } },
  { new: true }
)
Same completion check as above → status = 'Computed' even with some failures.
```

---

#### `backend/src/services/payrolls.js` (replace existing stub)

```
beforeCreate({ role, userId, body }):
  1. Role guard: only HR Admin, HR, Super Admin, Admin
  2. Call payrollEngine.runPayrollForEmployee() — fully computes and returns body override
  3. Overwrite ALL client-sent salary fields with server-computed values
  4. Set status = 'Processed', processedBy = userId, processedAt = now
  5. Return mutated body

beforeUpdate({ role, userId, docId, body, existingDoc }):
  1. Role guard: employees cannot update any payroll field
  2. IMMUTABILITY GATE: if existingDoc.status is 'Approved' or 'Paid':
     - Only allow: status field if transitioning Approved → Paid (by HR/Admin)
     - Block everything else — throw "Payroll record is frozen after approval"
  3. Block direct mutation of these fields at any status:
     basicSalary, grossSalary, netSalary, earnedBreakdown, deductionBreakdown,
     lopDays, salaryStructureId, processedBy, processedAt
  4. Allow status: Processed → Approved (HR Admin only)
  5. Allow status: Approved → Paid; stamp paidAt = now
  6. On freeze (Approved): stamp frozenAt = now
```

---

#### `backend/src/services/payroll_runs.js` (new)

```
afterCreate({ role, userId, docId }):
  1. Load created PayrollRun
  2. Resolve employeeIds:
     - If run.employeeIds empty → fetch all employees where status = 'Active'
     - Else use provided list
  3. Filter out employees with no SalaryStructure valid for run month (log warning, add to notes)
  4. Update PayrollRun: totalEmployees, employeeIds snapshot, status = 'Processing'
  5. Push payrollAuditEvents: { event: 'processing_started', performedBy: userId }
  6. Call payrollEngine.runBulkPayroll(employeeIds, month, year, userId, docId)
     → queues N 'payroll-compute' Bull jobs

beforeUpdate({ role, userId, docId, body, existingDoc }):
  1. Role guard: only HR Admin, Super Admin
  2. Enforce state machine — allowed transitions only:
     Processing → Computed  (internal, set by finalizeRun — block if sent from client)
     Computed   → Approved  (HR Admin / Super Admin)
     Approved   → Paid      (HR Admin / Super Admin)
  3. If transitioning to Approved:
     - Validate all linked Payroll records have status = 'Processed' or 'Approved' (none Draft)
     - Stamp approvedBy = userId, approvedAt = now
     - Push payrollAuditEvents: { event: 'approved', performedBy: userId }
  4. If transitioning to Paid:
     - Bulk-update all payrolls in run.payrollIds: { status: 'Paid', paidAt: now }
     - Stamp paidAt = now
     - Push payrollAuditEvents: { event: 'paid', performedBy: userId }
```

---

#### `backend/src/services/salary_structures.js` (new)

```
beforeCreate({ role, userId, body }):
  1. Role guard: only HR Admin, HR, Super Admin
  2. Query existing structures for body.employeeId sorted by version desc → get latest version number
  3. Set body.version = latestVersion + 1  (or 1 if first structure)
  4. Validate effectiveFrom is provided
  5. Compute effectiveTo: if there is an open previous version (effectiveTo = null):
     - Set previous version's effectiveTo = body.effectiveFrom - 1 day  (close the old version)
  6. Validate earnings sum ≈ ctc/12 (warn if drift > 5%; do not block — HR may include non-monthly components)
  7. Stamp createdBy = userId

beforeUpdate({ role, userId, body, existingDoc }):
  1. Role guard: only HR Admin, HR, Super Admin
  2. Block mutation of: employeeId, version, effectiveFrom (these are immutable once created)
  3. Only allow: effectiveTo correction, overtimeRate, esiApplicable, notes-level fields
  4. To change compensation: create a new version via POST, not PATCH
```

---

#### `backend/src/services/computationService.js` — add processor

```js
// In setupProcessors():
this.computeQueue.process('payroll-compute', 3, async (job) => {
  const { employeeId, month, year, runId, processedBy } = job.data;
  const engine = await import('./payrollEngine.js');
  try {
    const result = await engine.runPayrollForEmployee(employeeId, month, year, processedBy, runId);
    await engine.finalizeRun(runId, result.grossSalary, result.netSalary, result.payrollId);
    return result;
  } catch (err) {
    await engine.finalizeRunOnFailure(runId);
    throw err;  // re-throw so Bull marks job as failed
  }
});
```

---

### 3.3 Backend — Updates to Existing Files

#### `backend/src/models/Payroll.js`

Add / change fields:
```
status              String   enum: ['Draft','Processing','Processed','Approved','Paid']  (add Processing, Approved)

// Versioned structure reference
salaryStructureId   ObjectId  → ref: salary_structures

// Run reference
payrollRunId        ObjectId  → ref: payroll_runs

// Computed breakdown snapshots (immutable after Approved)
earnedBreakdown     Map (String → Number)  — key: earning name, value: earned amount
deductionBreakdown  Map (String → Number)  — key: deduction name, value: deducted amount

// Extra day accounting
lopDays             Number   default: 0
overtimePay         Number   default: 0

// Approval & freeze
approvedBy          ObjectId  → ref: employees
approvedAt          Date
frozenAt            Date      — stamped when status reaches Approved; signals immutability

// Payslip generation (placeholder for Phase 2 PDF generation)
payslipUrl          String    — URL to generated PDF; null until generated
generatedAt         Date      — when payslip PDF was generated

// Remarks
remarks             String

New indexes:
  { payrollRunId: 1 }
  { status: 1, month: 1, year: 1 }
```

Remove: `basicSalary` top-level (it now lives inside `earnedBreakdown` as `earnedBreakdown.Basic`), `allowances.*`, `deductions.*` hardcoded sub-objects — replaced by the dynamic Map snapshots.

#### `backend/src/models/Collection.js`
```js
import salary_structures from './SalaryStructure.js';
import payroll_runs from './PayrollRun.js';
import holidays from './Holiday.js';

// add to models object:
salary_structures,
payroll_runs,
holidays,
```

#### `backend/src/Config/defaultPopulateFields.js`
```js
payrolls: {
  'employeeId':        'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.empId',
  'processedBy':       'basicInfo.firstName,basicInfo.lastName',
  'approvedBy':        'basicInfo.firstName,basicInfo.lastName',
  'salaryStructureId': 'version,effectiveFrom,effectiveTo,ctc',
  'payrollRunId':      'month,year,status'
},
salary_structures: {
  'employeeId': 'basicInfo.firstName,basicInfo.lastName,professionalInfo.empId,professionalInfo.department',
  'createdBy':  'basicInfo.firstName,basicInfo.lastName'
},
payroll_runs: {
  'initiatedBy': 'basicInfo.firstName,basicInfo.lastName',
  'approvedBy':  'basicInfo.firstName,basicInfo.lastName'
},
holidays: {}   // no populate needed — flat model
```

---

## 4. Frontend Files

### 4.0 Currency Token Reference

All payroll components must use the tokens added to `frontend/src/styles/tokens.css`. Never use raw hex or inline `style={{ color: '#059669' }}` anywhere in this module.

| UI element | Token / class to use |
|---|---|
| Page root | `data-module="payroll"` — activates `--module-accent` → payroll green |
| Section cards with left accent bar | `pay-card` |
| Plain cards (no accent bar) | `tracker-card-plain` |
| Earning amounts | `pay-amount-earn` or `pay-row--earn` |
| Deduction amounts | `pay-amount-deduct` or `pay-row--deduct` |
| Gross salary figure | `pay-amount-sm pay-amount-gross` |
| Net salary figure (hero) | `pay-amount-xl` |
| Net salary figure (card) | `pay-amount-lg` |
| Net salary figure (table row) | `pay-amount-md` |
| Payslip breakdown row | `pay-row` + `pay-row__label` + `pay-row__value` |
| Total rows in breakdown | add `pay-row--total` |
| Net salary row | add `pay-row--net` |
| Status chip: Draft | `pay-status-chip pay-status-chip--draft` |
| Status chip: Processing | `pay-status-chip pay-status-chip--processing` |
| Status chip: Processed | `pay-status-chip pay-status-chip--processed` |
| Status chip: Approved | `pay-status-chip pay-status-chip--approved` |
| Status chip: Paid | `pay-status-chip pay-status-chip--paid` |
| Gross / Net summary bar | `pay-summary-band` |
| Stat cards (header strip) | `pay-stat-card` + `pay-stat-card__label` + `pay-stat-card__value` |
| Run progress bar | `pay-progress` + `pay-progress__fill` (width set inline as %) |
| Modal / drawer hero header | `pay-gradient-hero` |
| Buttons | `tracker-btn-accent` (payroll green via `--module-accent`) |
| Inputs | `lmx-input` |
| Tab bar | `lmx-tab-bar` + `lmx-tab` / `lmx-tab-active` |
| Page eyebrow | `lmx-page-eyebrow` |
| Icon tiles | `lmx-icon-tile` (picks up `--module-accent` automatically) |

---

### 4.1 Modified

#### `frontend/src/pages/Payroll/index.jsx`
3-tab layout (`lmx-tab-bar` / `lmx-tab-active`, `data-module="payroll"`):

| Tab | Component | Visible to |
|---|---|---|
| Payroll Runs | `payroll_runsTab` | HR Admin, Super Admin |
| Salary Structures | `salary_structuresTab` | HR Admin, Super Admin |
| My Payslips | `MyPayslipsTab` | All employees (isSelf policy) |

Existing table + `PayslipModal` move into `MyPayslipsTab`.
Root `<div>` carries `data-module="payroll"` — all `--module-accent` references resolve to payroll green automatically.

---

### 4.2 New Components

#### `payroll_runsTab.jsx`
- Page header: `lmx-page-eyebrow` eyebrow + `pay-gradient-hero` is reserved for modal headers only
- Stat strip: 4 × `pay-stat-card` — Total Runs, Processing, Computed/Approved, Paid — values use `pay-stat-card__value`
- Run list: `pay-card` rows; status shown with `pay-status-chip--{status.toLowerCase()}`
- Progress column: `pay-progress` + `pay-progress__fill` width = `(processedCount / totalEmployees) * 100 + '%'`
- totalNet column: `pay-amount-lg` class
- "New Run" button: `tracker-btn-accent`
- `RunCreateModal`: header uses `pay-gradient-hero`; inputs use `lmx-input`
- Per-run actions:
  - Processing: spinner only
  - Computed: "Approve" → `tracker-btn-accent`
  - Approved: "Mark Paid" → `tracker-btn-accent`
- `RunDetailDrawer`: per-employee rows; net shown with `pay-amount-md`; breakdown opens `PayslipModal`

#### `salary_structuresTab.jsx`
- Lists `salary_structures` per employee; version badge uses `pay-status-chip pay-status-chip--approved` for active version
- "Add Structure" / "Revise": `tracker-btn-accent`
- `SalaryStructureForm`:
  - Dynamic earnings rows: name, type, amount, taxable, isProratable (add/remove with ghost button)
  - Dynamic deductions rows: name, type, amount, ceiling
  - PF ceiling, ESI toggle, overtime rate
  - effectiveFrom date picker using `lmx-input`
  - Live preview panel: `pay-summary-band` showing computed monthly gross/net as user types
    - Gross: `pay-amount-sm pay-amount-gross`
    - Net: `pay-amount-lg`
  - On submit: `POST /populate/create/salary_structures`
- Version history: expandable rows using `pay-row` pattern; past versions shown with `pay-status-chip--processed`

#### `MyPayslipsTab.jsx`
- Employee self-view: `POST /populate/read/payrolls { filter: { employeeId: userId } }`
- Year selector + month cards; status chips use `pay-status-chip--{status.toLowerCase()}`
- Month card net salary: `pay-amount-lg`
- Click → `PayslipModal`
- Read-only

#### `PayslipModal` (update existing export)
- Header: `pay-gradient-hero` — already correct, keep
- Earnings section header: `pay-row--total` row with label "Earnings"
- Each earning row: `pay-row pay-row--earn` → `pay-row__label` + `pay-row__value pay-amount-earn`
- Gross total row: `pay-row pay-row--total` → value uses `pay-amount-sm pay-amount-gross`
- Deduction rows: `pay-row pay-row--deduct` → `pay-row__value pay-amount-deduct` (prefix with `−`)
- Net salary row: `pay-row pay-row--net pay-row--total` → value uses `pay-amount-lg`
- Renders `earnedBreakdown` Map dynamically — no hardcoded field names
- Status badge in header: `pay-status-chip pay-status-chip--{status.toLowerCase()}`

---

## 5. API Calls (All via Populate Engine)

| Operation | Method + URL | Body / Notes |
|---|---|---|
| List payrolls | `POST /populate/read/payrolls` | filter, sort, populateFields |
| Create / compute single payroll | `POST /populate/create/payrolls` | engine recomputes in beforeCreate |
| Approve single payroll | `PUT /populate/update/payrolls/:id` | `{ status: "Approved" }` — frozen after this |
| Mark single payroll paid | `PUT /populate/update/payrolls/:id` | `{ status: "Paid" }` |
| List payroll runs | `POST /populate/read/payroll_runs` | |
| Trigger bulk run | `POST /populate/create/payroll_runs` | `{ month, year, employeeIds? }` |
| Approve run | `PUT /populate/update/payroll_runs/:id` | `{ status: "Approved" }` |
| Mark run paid | `PUT /populate/update/payroll_runs/:id` | `{ status: "Paid" }` |
| List salary structures | `POST /populate/read/salary_structures` | filter by employeeId |
| Create / revise salary structure | `POST /populate/create/salary_structures` | service closes previous version |
| List holidays | `POST /populate/read/holidays` | filter by year |
| Seed holidays | `POST /populate/create/holidays` | HR Admin only |
| Employee self payslips | `POST /populate/read/payrolls` | filter: `{ employeeId: userId }` — isSelf policy |

---

## 6. Access Policies

Seed via `backend/seedPayrollPolicies.js`.

### `payrolls`

| Role | read | create | update | delete | Field restrictions |
|---|---|---|---|---|---|
| Super Admin / HR Admin | ✅ all | ✅ | ✅ | ❌ | forbid direct mutation of earnedBreakdown, deductionBreakdown, grossSalary, netSalary, frozenAt |
| Manager | ❌ | ❌ | ❌ | ❌ | full block — salary is confidential |
| Employee | ✅ isSelf | ❌ | ❌ | ❌ | isSelf registry scopes to own employeeId |

### `salary_structures`

| Role | read | create | update | delete |
|---|---|---|---|---|
| Super Admin / HR Admin | ✅ | ✅ | ✅ (limited fields) | ❌ |
| Manager | ❌ | ❌ | ❌ | ❌ |
| Employee | ❌ | ❌ | ❌ | ❌ |

### `payroll_runs`

| Role | read | create | update | delete | Field restrictions on update |
|---|---|---|---|---|---|
| Super Admin / HR Admin | ✅ | ✅ | ✅ | ❌ | forbid: month, year, employeeIds, totalEmployees, initiatedBy; allow: status, notes |
| Manager | ❌ | ❌ | ❌ | ❌ | — |
| Employee | ❌ | ❌ | ❌ | ❌ | — |

### `holidays`

| Role | read | create | update | delete |
|---|---|---|---|---|
| Super Admin / HR Admin | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ❌ | ❌ | ❌ |
| Employee | ✅ | ❌ | ❌ | ❌ |

---

## 7. Business Logic Rules

| Scenario | Rule | Enforced in |
|---|---|---|
| Present / WFH / Late Entry | Full day toward earnedRatio | `computeAttendanceSummary` |
| Half Day | 0.5 toward presentDays | Engine |
| LOP | lopDays = workingDays - presentDays - leaveDays; proportional deduction implicit in earnedRatio | Engine |
| Absent without approved leave | Treated as LOP | Engine |
| Approved leave (within balance) | Paid leave; no deduction | Engine |
| Working days | calendarDays - weekoffs - holidays (national + company) | `computeWorkingDays`; falls back to weekoff-only if no Holiday records |
| PF | 12% of min(earnedBasic, pfCeiling); ceiling default ₹15,000 | `resolveStatutory` in engine |
| ESI | 0.75% of gross if gross ≤ ₹21,000 AND esiApplicable | `resolveStatutory`; **TODO: statutory-compliance-engine** |
| TDS | Flat monthly from structure.deductions[TDS].amount | `resolveStatutory`; **TODO: statutory-compliance-engine (projected annual, 80C/80D, regime)** |
| Overtime | overtimeHours × overtimeRate | Engine |
| Structure version lookup | effectiveFrom ≤ payrollDate ≤ effectiveTo (or null) | `resolveStructure` |
| Salary revision | New structure version created; old version's effectiveTo closed | `salary_structures.js` beforeCreate |
| Immutability after Approval | All salary fields frozen; only status (Approved→Paid) writable | `payrolls.js` beforeUpdate |
| Duplicate payroll | unique index {employeeId, month, year}; re-run blocked if Approved or Paid | Mongoose index + beforeCreate |
| finalizeRun race condition | Atomic `$inc` on processedCount/totalGross/totalNet; no optimistic reads | `finalizeRun` + `findOneAndUpdate` |
| Run state machine | Draft → Processing → Computed → Approved → Paid; no reverse | `payroll_runs.js` beforeUpdate |
| Inactive/terminated employee | Excluded from auto-resolved employeeIds in bulk run | `payroll_runs.js` afterCreate |
| Client-sent salary values | Always overwritten by engine in beforeCreate | `payrolls.js` beforeCreate |
| Audit trail | All mutations logged by `auditLogger.js` (existing); coarse HR-readable events in `payrollAuditEvents[]` on PayrollRun | `buildUpdateQuery` (auto) + service hooks |
| Payslip PDF | `payslipUrl` and `generatedAt` fields on Payroll model reserved; generation logic is Phase 2 | Model placeholder |

---

## 8. Data Flow Summary

```
HR creates PayrollRun
  POST /populate/create/payroll_runs  { month: 6, year: 2025 }
  → payroll_runs.js afterCreate
  → resolve Active employees; filter out those with no valid SalaryStructure
  → update PayrollRun: totalEmployees, status = 'Processing'
  → push audit event: processing_started
  → payrollEngine.runBulkPayroll() → queues N 'payroll-compute' Bull jobs

  Each Bull worker (concurrent, up to 3):
  → payrollEngine.runPayrollForEmployee()
     → resolveStructure()           reads: salary_structures (versioned lookup)
     → computeWorkingDays()         reads: holidays
     → computeAttendanceSummary()   reads: attendances, leaves
     → computeSalary()              dynamic earnings/deductions loop
     → upsert Payroll               status: Processed; earnedBreakdown/deductionBreakdown snapshotted
  → finalizeRun() atomic $inc       → when all done: PayrollRun.status = 'Computed'

HR approves run
  PUT /populate/update/payroll_runs/:id  { status: 'Approved' }
  → payroll_runs.js beforeUpdate
  → validates current = Computed; all payrolls = Processed
  → stamps approvedBy, approvedAt
  → push audit event: approved

HR marks as paid
  PUT /populate/update/payroll_runs/:id  { status: 'Paid' }
  → payroll_runs.js beforeUpdate/afterUpdate
  → bulk-updates all linked Payroll records → status = 'Paid', paidAt = now
  → stamps paidAt on PayrollRun
  → push audit event: paid

Employee reads own payslip
  POST /populate/read/payrolls  { filter: { employeeId: userId } }
  → policyEngine isSelf → scopes to own employeeId
  → returns earnedBreakdown + deductionBreakdown maps (rendered dynamically in PayslipModal)
```

---

## 9. TODO / Extension Points (Do Not Build Now)

| Area | Marker | Future scope |
|---|---|---|
| ESI compliance | `TODO: statutory-compliance-engine` | Regime-aware ESI threshold, ESIC registration validation |
| TDS / Income Tax | `TODO: statutory-compliance-engine` | Projected annual income, 80C/80D/HRA exemptions, old vs new regime selection, previous employer income |
| Payslip PDF | `payslipUrl`, `generatedAt` fields already on model | Generate PDF, store to S3/local, email employee |
| Professional Tax | Can be added as a `statutory` type deduction in `SalaryStructure.deductions[]` | State-wise slabs |
| Arrears | New earning type: `arrear` in earnings[] with isProratable = false | Backpay computation |
| Full & Final settlement | Separate PayrollRun type | Gratuity, notice pay, leave encashment |
| Bonus run | PayrollRun with type = 'bonus' | Variable pay disbursement |

---

## 10. Files Summary

### New Files
| File | Type |
|---|---|
| `backend/src/models/SalaryStructure.js` | Model — versioned, dynamic earnings/deductions |
| `backend/src/models/PayrollRun.js` | Model — batch envelope with audit events |
| `backend/src/models/Holiday.js` | Model — holiday calendar placeholder |
| `backend/src/services/payrollEngine.js` | Computation library |
| `backend/src/services/payroll_runs.js` | Lifecycle hooks for PayrollRun |
| `backend/src/services/salary_structures.js` | Lifecycle hooks for SalaryStructure versioning |
| `backend/seedPayrollPolicies.js` | Access policy seeder |
| `frontend/src/pages/Payroll/payroll_runsTab.jsx` | Frontend |
| `frontend/src/pages/Payroll/salary_structuresTab.jsx` | Frontend |
| `frontend/src/pages/Payroll/MyPayslipsTab.jsx` | Frontend |

### Modified Files
| File | Change |
|---|---|
| `backend/src/models/Payroll.js` | Status enum expanded; add earnedBreakdown, deductionBreakdown, lopDays, overtimePay, salaryStructureId, payrollRunId, approvedBy, approvedAt, frozenAt, payslipUrl, generatedAt, remarks; remove hardcoded allowances/deductions sub-objects |
| `backend/src/models/Collection.js` | Register: salary_structures, payroll_runs, holidays |
| `backend/src/services/payrolls.js` | Replace stub with full immutability-aware beforeCreate + beforeUpdate |
| `backend/src/services/computationService.js` | Add 'payroll-compute' processor with try/catch calling finalizeRunOnFailure |
| `backend/src/Config/defaultPopulateFields.js` | Add: payrolls, salary_structures, payroll_runs, holidays entries |
| `frontend/src/pages/Payroll/index.jsx` | Convert to 3-tab layout; delegate to tab components |

---

## 11. Brain Update (Post-Implementation)

Create `knowledge_brain/Payroll/MODULE_BRAIN.md`:
- Models: payrolls (v1.2 schema), salary_structures (versioned), payroll_runs, holidays
- Engine: payrollEngine — resolveStructure, computeWorkingDays, computeAttendanceSummary, computeSalary, runPayrollForEmployee, runBulkPayroll, finalizeRun (atomic), finalizeRunOnFailure
- Cross-module reads: attendances, leaves, holidays, shifts (weeklyOff)
- Access: HR Admin full; Employee isSelf read on payrolls only; zero on salary_structures + payroll_runs + holidays (write)
- Immutability: Payroll fields frozen after status = Approved
- Versioning: SalaryStructure lookup by effectiveFrom ≤ payrollDate ≤ effectiveTo

Update `knowledge_brain/_SYSTEM/SHARED_COLLECTIONS.md`:
- salary_structures → referenced by payrolls (salaryStructureId)
- payroll_runs → referenced by payrolls (payrollRunId)
- holidays → read by payrollEngine.computeWorkingDays

Update `knowledge_brain/_SYSTEM/SYSTEM_COVERAGE.md`:
- Add Payroll module (Models: 4, Frontend: 4)
