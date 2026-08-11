# Payroll Module Brain

## Models

| Model | Collection | Key fields |
|---|---|---|
| `Payroll` | `payrolls` | employeeId, month, year, salaryStructureId, payrollRunId, earnedBreakdown (Map), deductionBreakdown (Map), grossSalary, netSalary, workingDays, presentDays, lopDays, overtimePay, status (Draft/Processing/Processed/Approved/Paid), frozenAt, payslipUrl |
| `SalaryStructure` | `salary_structures` | employeeId, version, effectiveFrom, effectiveTo (null=open), ctc, earnings[], deductions[], pfEmployeePercent, pfCeiling, esiApplicable, overtimeRate |
| `PayrollRun` | `payroll_runs` | month, year, status (Draft/Processing/Computed/Approved/Paid), employeeIds[], payrollIds[], totalEmployees, processedCount (atomic), failedCount (atomic), totalGross (atomic), totalNet (atomic), payrollAuditEvents[] |
| `Holiday` | `holidays` | date (unique), name, type (national/regional/optional/company), year |

## Services

| Service | File | Purpose |
|---|---|---|
| `payrollEngine` | `services/payrollEngine.js` | Pure computation — no Express |
| `payrolls` | `services/payrolls.js` | Lifecycle hooks for Payroll CRUD |
| `payroll_runs` | `services/payroll_runs.js` | Lifecycle hooks — bulk run trigger, state machine |
| `salary_structures` | `services/salary_structures.js` | Versioning logic — close previous, auto-increment version |

## Engine Functions

| Function | Reads | Returns |
|---|---|---|
| `resolveStructure(employeeId, payrollDate)` | `salary_structures` | Active structure for that date |
| `computeWorkingDays(month, year, weeklyOff)` | `holidays` | `{ workingDays, holidayDates[] }` |
| `computeAttendanceSummary(employeeId, month, year)` | `attendances`, `leaves`, `shifts` | `{ workingDays, presentDays, leaveDays, lopDays, overtimeHours }` |
| `computeSalary(summary, structure)` | — (pure) | `{ earnedBreakdown, deductionBreakdown, grossSalary, netSalary, lopDays, overtimePay }` |
| `runPayrollForEmployee(empId, month, year, processedBy, runId)` | All above + `payrolls` (upsert) | `{ payrollId, grossSalary, netSalary }` |
| `runBulkPayroll(empIds, month, year, userId, runId)` | — | Queues Bull jobs |
| `finalizeRun(runId, gross, net, payrollId)` | — | Atomic `$inc`; promotes run to Computed when all done |
| `finalizeRunOnFailure(runId)` | — | Atomic `$inc failedCount`; same completion check |

## Data Flow

```
POST /populate/create/payroll_runs
  → payroll_runs.js afterCreate
  → resolve employees (Active, valid structure)
  → PayrollRun status = Processing
  → runBulkPayroll() → N Bull jobs (payroll-compute)
    → runPayrollForEmployee() per employee
       → resolveStructure → computeWorkingDays → computeAttendanceSummary → computeSalary
       → upsert Payroll (status: Processed, earnedBreakdown snapshotted)
    → finalizeRun() atomic → Computed when all done

PUT /populate/update/payroll_runs/:id { status: "Approved" }
  → payroll_runs.js beforeUpdate → validate, stamp approvedBy/approvedAt

PUT /populate/update/payroll_runs/:id { status: "Paid" }
  → payroll_runs.js beforeUpdate → bulk Payroll.updateMany → Paid, stamp paidAt

POST /populate/read/payrolls (employee)
  → isSelf policy → scopes to own employeeId
```

## State Machines

**Payroll:** `Draft → Processing → Processed → Approved → Paid`
- Fields frozen after `Approved` (frozenAt stamped)
- Only `Approved → Paid` allowed after freeze

**PayrollRun:** `Draft → Processing → Computed → Approved → Paid`
- `Processing` and `Computed` set internally by engine — blocked from client updates
- Atomic `$inc` on processedCount/failedCount prevents race conditions

## SalaryStructure Versioning

- No `isActive` flag
- Lookup: `effectiveFrom ≤ payrollDate AND (effectiveTo IS NULL OR effectiveTo ≥ payrollDate)`
- `beforeCreate` in `salary_structures.js` closes previous open version's `effectiveTo = effectiveFrom - 1 day` and auto-increments `version`
- Immutable fields: `employeeId`, `version`, `effectiveFrom`

## Access Policies

| Model | superadmin / hr | manager | employee |
|---|---|---|---|
| payrolls | full (no delete) | none | self-read (isSelf) |
| salary_structures | full (no delete, limited update) | none | none |
| payroll_runs | full (no delete, limited update fields) | none | none |
| holidays | full | read | read |

## Cross-Module Reads

| Source | Used by | Purpose |
|---|---|---|
| `attendances` | `computeAttendanceSummary` | presentDays, overtimeHours |
| `leaves` | `computeAttendanceSummary` | leaveDays (Approved leaves in month) |
| `shifts` (ShiftAssignment) | `computeAttendanceSummary` | weeklyOff config, shiftWorkingHours |
| `holidays` | `computeWorkingDays` | mandatory offs (national + company) |
| `employees` | `payroll_runs.afterCreate` | Active employee list for bulk run |

## TODO / Extension Points

- `statutory-compliance-engine` in `resolveStatutory()` — PF ECR export, ESI Return export, TDS projection implemented in `reportService.js` (`/api/reports/...`).
- `payslipUrl` / `generatedAt` fields on Payroll — Phase 2 PDF generation
- Professional Tax: add as `statutory` deduction in SalaryStructure.deductions[]
- Arrears: `isProratable: false` earning with type `variable`
- Full & Final: separate PayrollRun type

## Frontend Files

| File | Purpose |
|---|---|
| `pages/Payroll/index.jsx` | 3-tab shell + PayslipModal export |
| `pages/Payroll/payroll_runsTab.jsx` | HR — run list, create modal, approve/pay, detail drawer |
| `pages/Payroll/salary_structuresTab.jsx` | HR — structure list, form with dynamic rows, version history |
| `pages/Payroll/MyPayslipsTab.jsx` | All roles — own payslips by year |

## Seed Script

`backend/seedPayrollPolicies.js` — run once to insert access_policies:
```
node seedPayrollPolicies.js
```
