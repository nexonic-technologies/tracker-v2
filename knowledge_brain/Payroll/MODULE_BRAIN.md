# Payroll Module Brain

## Overview
This module governs monthly compensation calculation, versioned salary structures, bulk payroll processing runs, statutory compliance derivations, accounting exports, and the Authoritative Monthly Payroll Submission Register.

## Core Architectural Invariants
1. **Zero Manufactured Defaults**: The payroll engine never invents salary structures or statutory rates. Precedence is strictly:
   ```
   SalaryStructure → GeneralSettings.payroll → REJECT
   ```
2. **Configuration Readiness Gate**: In `payrollruns.js`, any employee lacking a mandatory `SalaryStructure` triggers a `CONFIGURATION_ERROR` note and **blocks final approval** until resolved. Missing employees are never silently omitted.
3. **Accountant Report Projection**: Reports consume frozen `Attendance.snapshot` records and authoritative `Payroll` documents. Reports never recalculate attendance or payroll independently.

---

## Models

| Model | Collection | Key Fields |
|---|---|---|
| `Payroll` | `payrolls` | `employeeId`, `month`, `year`, `salaryStructureId`, `payrollRunId`, `earnedBreakdown` (Map), `deductionBreakdown` (Map), `grossSalary`, `netSalary`, `workingDays`, `presentDays`, `lopDays`, `overtimeHours`, `overtimePay`, `pfEmployerContribution`, `esiEmployerContribution`, `status` (Draft/Processing/Processed/Approved/Paid), `frozenAt` |
| `SalaryStructure` | `salary_structures` | `employeeId`, `version`, `effectiveFrom`, `effectiveTo`, `ctc`, `earnings[code, name, type, amount, isProratable]`, `deductions[code, name, type, amount, ceiling]`, `pfEmployeePercent`, `pfCeiling`, `esiApplicable`, `overtimeRate` |
| `PayrollRun` | `payroll_runs` | `month`, `year`, `status` (Draft/Processing/Computed/Approved/Paid), `employeeIds[]`, `payrollIds[]`, `totalEmployees`, `processedCount`, `failedCount`, `totalGross`, `totalNet`, `payrollAuditEvents[]`, `notes` |
| `Holiday` | `holidays` | `date` (unique), `name`, `type` (national/regional/optional/company), `year` |

---

## Services & Engines

| Service | File | Purpose |
|---|---|---|
| `payrollEngine` | `Backend/src/services/business/payrollEngine.js` | Pure payroll computation engine: resolves structure, working days, attendance summaries, and statutory deductions. |
| `payrollSubmissionReport` | `Backend/src/services/business/payrollSubmissionReport.js` | Authoritative Monthly Payroll Submission Register: batched queries, dynamic 1..31 daily attendance grid from frozen snapshots, dynamic earnings/deductions, and column-level ABAC security. |
| `payrolls` | `Backend/src/services/payrolls.js` | Lifecycle CRUD hooks for individual Payroll records. |
| `payrollruns` | `Backend/src/services/payrollruns.js` | Bulk payroll lifecycle, Configuration Readiness Gate, and state machine enforcement. |
| `reportService` | `Backend/src/services/business/reportService.js` | Aggregation service for bank advice, PF ECR, and ESI monthly returns. |

---

## Endpoints & Export Routes

| Method | Route | Output | Security / Role |
|---|---|---|---|
| `GET` | `/api/export/payroll-submission` | Authoritative Excel XLSX download (`exceljs`) | Private (Finance / HR / Admin) |
| `GET` | `/api/export/payroll-submission/json` | JSON dataset with daily grid & audit trail | Private (Column-gated by role) |
| `POST` | `/api/populate/create/payroll_runs` | Initiates bulk calculation run | HR / Finance / Admin |
| `PUT` | `/api/populate/update/payroll_runs/:id` | State transition: `Approved` or `Paid` | HR Admin / Finance (Blocked if configuration errors exist) |

---

## Frontend Components

| File | Purpose | UX & Design Standard |
|---|---|---|
| `Frontend/src/pages/reports/payroll-submission.jsx` | Monthly Payroll Submission Register | High-density ledger table with sticky frozen columns (Emp ID, Name, Dept), monospace numeric alignment, and interactive **Side Drill-Down Drawer** (Punches, Math, Policy Snapshots, Audit Hashes). |
| `Frontend/src/pages/hrms/monthly-payroll.jsx` | Payroll Report Page route | Directly renders `MonthlyPayrollSubmissionReport`. |
| `Frontend/src/pages/Payroll/payroll_runsTab.jsx` | HR Payroll Runs manager | Run list, creation modal, approval actions, and Configuration Error display. |
| `Frontend/src/pages/Payroll/salary_structuresTab.jsx` | Salary Structures manager | Multi-component salary creator with versioning and component codes (`BASIC`, `HRA`, `PF_EE`). |
| `Frontend/src/pages/Payroll/MyPayslipsTab.jsx` | Employee self-service | Payslip viewer for authenticated employees. |

---

## State Machine & Freezing
- **Payroll**: `Draft → Processing → Processed → Approved → Paid` (Fields frozen after `Approved`).
- **PayrollRun**: `Draft → Processing → Computed → Approved → Paid`. Cannot transition to `Approved` if `notes` contains unresolved `CONFIGURATION_ERROR` flags.
