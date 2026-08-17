---
Purpose: Maintain the historical log of architectural design choices and decision records for the platform.
Audience: Architects, Principal Engineers, and Tech Leads.
Status: ARCHITECTURAL_DECISION
Related Documents:
  - [System Architecture Guide](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/SYSTEM_ARCHITECTURE_GUIDE.md)
  - [Collections Reference](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/COLLECTIONS_REFERENCE.md)
Owner: Principal Architect
Last Review: 2026-06-27
Architecture Version: 2.2.0
---

# Architecture Decision Records (ADRs)

This document contains the immutable Architecture Decision Records (ADRs) for the Tracker platform. It documents core structural selections, runtime models, and operational constraints that guide the system's ongoing development.

---

## [ADR-001] Generic CRUD instead of Module-Specific CRUD

### Category
Runtime Architecture

### Status
`IMPLEMENTED`

### Context
In traditional Express and Mongoose applications, developers write dedicated controllers, validation files, and routers for every database collection. In an enterprise system containing over 70 models, this approach leads to significant code duplication, inconsistent validation patterns, varying performance behaviors, and high maintenance overhead.

### Decision
Implement a single, unified dynamic entry gate: the **Populate Engine** (`/api/populate/:action/:model/:id`). All operations (reads, updates, creations, deletions, and aggregations) are routed through this single dynamic controller:
- **Routing**: Managed dynamically by [populateHelper.js](file:///E:/Loigmax/Tracker/backend/src/helper/populateHelper.js).
- **Execution**: Parsed and delegated to dynamic query builders inside the `backend/src/crud/` directory (such as [buildCreateQuery.js](file:///E:/Loigmax/Tracker/backend/src/crud/buildCreateQuery.js)).
- **Access Control**: Sanitization and authorization rules are applied uniformly at this layer.

### Consequences
- **Benefits**: Enhances developer productivity; establishing a new module only requires creating a Mongoose schema and registering it in the model directory registry. Security audits, rate-limiting, and error-handling are modified in a single location rather than across dozens of routers.
- **Trade-offs**: Requires a metadata-driven policy engine to enforce complex access constraints dynamically on single tables.
- **Architectural Recommendations**: Keep this gateway uniform. Avoid bypassing the Populate Engine with custom route parameters unless handling external binary data protocols or auth triggers.

---

## [ADR-002] Runtime Service Resolution through Populate Engine

### Category
Runtime Resolution

### Status
`IMPLEMENTED`

### Context
While database operations should remain generic, specific business rules must still be executed (such as hashing an employee's password during creation or generating asset records on purchase receipt). Creating static mappings between models and service classes introduces tight coupling and makes scaling the platform difficult.

### Decision
Introduce a dynamic, directory-scanning registry: [servicesCache.js](file:///E:/Loigmax/Tracker/backend/src/utils/servicesCache.js).
- On boot, the registry scans `backend/src/services/` and builds an internal cache mapping service filenames to model keys.
- At runtime, when a populate request is executed, the CRUD query builders check the cache for a matching model name.
- If a service file is present, the engine dynamically imports it via `import()` and executes the corresponding hook function (e.g., `beforeCreate`).

### Consequences
- **Benefits**: Loose coupling; services are independent and pluggable. Adding business rules to a model is as simple as adding a `.js` file with matching model naming to the `services/` directory.
- **Trade-offs**: Relies on a strict naming convention. If a model name is `comments_threads`, the service filename must match exactly (`comments_threads.js`) or it will be skipped by the dynamic loader.

---

## [ADR-003] Business Services Extend, Not Replace, Generic CRUD

### Category
Business Logic Engine

### Status
`IMPLEMENTED`

### Context
Allowing custom business services to replace database operations (such as running `Model.create()` or `Model.save()`) bypasses the centralized security policies, sanitization checks, and audit logging layers.

### Decision
Enforce that business services **extend** generic CRUD by exporting hook functions rather than replacing the write operations:
- Services return an object with lifecycle hooks: `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeRead`, etc.
- **`before*` hooks**: Mutate and return the incoming payload, or throw validation errors.
- **`after*` hooks**: Trigger asynchronous side-effects (e.g. push notifications, dispatching jobs) after a successful database transaction.
- The Mongoose write operation is always executed by the generic query builders, preserving data sanitization and audit trails.

### Consequences
- **Benefits**: Enforces consistent validation, data formatting, and automatic audit logging. Service code remains free of database boilerplate.
- **Trade-offs**: Service hooks run synchronously inside database query blocks, meaning slow third-party API integrations inside hooks could block request lifecycles. These should be offloaded to asynchronous queues.

---

## [ADR-004] Historical Records Remain Immutable after Financial Approval

### Category
Data Compliance & Auditing

### Status
`IMPLEMENTED WITH LIMITATIONS`

### Context
In human resource calculations, attendance, shift assignments, and leaves directly drive monthly payroll figures. If an administrator alters a past holiday, modifies an employee's shift assignment retroactively, or updates an approved leave after a payroll month has been finalized, the financial figures will go out of sync, leading to compliance violations.

### Decision
Establish an **Immutability Lock** on all operational, historical, and financial records associated with a completed month:
- Once a monthly `PayrollRun` transitions to `Approved` or `Paid` status, all underlying documents (e.g., `Attendance` logs, active `ShiftAssignment` logs, approved `Leave` details) for that month are locked.
- The policy engine and beforeUpdate service hooks block any database writes (updates or deletions) on these documents.

### Consequences
- **Benefits**: High audit integrity; billing calculations match ledger figures.
- **Trade-offs**: Administrative errors in locked months cannot be directly edited.
- **Architectural Recommendations**: Implement a specialized "Adjustments / Reversals Engine" to process corrections in the current month rather than altering past historical data directly.

---

## [ADR-005] Metadata-Driven Policies Preferred over Handwritten Service Logic

### Category
Security & Access Control

### Status
`IMPLEMENTED`

### Context
Hardcoding access rules (e.g., `if (role === 'employee' && userId !== document.employeeId) throw error;`) inside controllers makes auditing permissions difficult, increases code verbosity, and makes it hard for non-developers to verify compliance.

### Decision
Maintain a centralized JSON configuration matrix (`access_policies.json`) and run all populate queries through a single policy engine [policyEngine.js](file:///E:/Loigmax/Tracker/backend/src/utils/policy/policyEngine.js):
- Rules are defined as declarative JSON metadata.
- Fine-grained access parameters (such as checking ownership, manager relations, or reference checks) are executed by context handlers inside `utils/policy/registry/` (e.g., `isSelf.js`, `isManager.js`).
- Fields visibility mapping (`allowAccess` and `forbiddenAccess`) is resolved at this layer before database execution.

### Consequences
- **Benefits**: Centralized security management. Code remains lightweight; authorization audits only need to scan a single policy matrix file.
- **Trade-offs**: Policy configuration requires precision, as metadata syntax errors can cause system-wide access blockages.

---

## [ADR-005] Strict Policy Authority, Configuration Readiness Gates & Traceable Reports

### Category
Business Logic Architecture & Financial Integrity

### Status
`IMPLEMENTED`

### Context
Previous calculation engines silently fell back to arbitrary hardcoded numbers (e.g. 8-hour days, 15-minute grace, 480-minute OT thresholds, default shifts, and hardcoded statutory rates) when persisted configuration was missing. This created policy leakage, violated multi-tenant SaaS isolation, and made historical payroll calculations non-reproducible if policies were later modified.

### Decision
1. **Zero Manufactured Defaults**: No attendance or payroll calculation engine may supply fallback business rules in code. If an employee lacks an active policy or shift, the system fails explicitly with `ATTENDANCE_POLICY_REQUIRED` or `PAYROLL_CONFIGURATION_REQUIRED`.
2. **Policy Precedence Hierarchy**:
   - **Attendance**: `AttendancePolicy` → `Shift` → `GeneralSettings` → `REJECT`.
   - **Payroll**: `SalaryStructure` → `GeneralSettings.payroll` → `REJECT`.
3. **Immutable Policy Versioning**: Updates to active policies archive the old document and generate a new version increment with updated `effectiveFrom`. Historical attendance snapshots retain the exact policy ID and version that produced them.
4. **Configuration Readiness Gate**: In `payrollruns.js`, any employee lacking a mandatory salary structure triggers a `CONFIGURATION_ERROR` note on the run and **blocks final approval** until resolved. Missing employees are never silently skipped.
5. **Authoritative Report Projection**: The Monthly Payroll Submission Register consumes frozen `Attendance.snapshot` objects and authoritative `Payroll` records. The report never derives or recalculates values independently.
6. **Zero Cold-Start Pre-Warming**: Tenant connections, static model compilations, and indexes are pre-warmed at server startup in `index.js` (`initApp()`), eliminating first-login cold-start latency.

### Consequences
- **Benefits**: Complete mathematical traceability for accountants and auditors; reproducible payroll history; total multi-tenant policy isolation; sub-second warm logins.
- **Trade-offs**: Requires organization administrators to configure valid policies and salary structures before attendance or payroll runs can be processed.

---

## [ADR-014] Decouple Payroll Calculation from Persistence

### Category
Data Compliance & Execution Flow

### Status
`IMPLEMENTED`

### Context
Verification audits discovered that the `beforeCreate` hook in the `payrolls` service executed database writes (calling `runPayrollForEmployee` which runs an internal Mongoose `findOneAndUpdate` operation) before returning. Since the platform's CRUD engine (`buildCreateQuery.js`) automatically instantiates a new Mongoose document and attempts a `save()` insert on the returned payload, this design resulted in:
1. Validation errors because intermediate computed fields (like `workingDays` and `presentDays`) were not populated in the return payload.
2. Concurrent duplicate key errors on `{ employeeId, month, year }` when the CRUD engine attempted to save the new document after the hook had already committed the record.

### Decision
Decouple payroll computation logic completely from persistence side-effects:
- Introduce `computePayrollPayload()` in [payrollEngine.js](file:///E:/Loigmax/Tracker/backend/src/services/payrollEngine.js). This function computes all salaries, prorations, and LOP snap-shots, returning a clean payload without performing database write operations.
- Update the `beforeCreate` hook in [payrolls.js](file:///E:/Loigmax/Tracker/backend/src/services/payrolls.js) to retrieve this pure payload, allowing `buildCreateQuery` to execute the database insert.
- Safely clean up any non-frozen (`Draft` or `Processed`) payroll records in the hook before inserting the fresh calculation to prevent duplicate constraint violations.

### Consequences
- **Benefits**: 
  - **No Duplicate Inserts:** Avoids duplicate key errors during API creation requests.
  - **Pure & Queue-Safe:** Calculation logic can be safely executed inside background processing queues (Bull) and API routing layers without database coupling.
  - **Testable:** Testing payroll math no longer relies on tracking Mongoose lifecycle side-effects.
- **Trade-offs**: Requires the `beforeCreate` hook to handle cleanup of existing unapproved calculations before inserting the fresh calculation.
