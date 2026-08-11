---
Purpose: Maintain the official database schema directory, mapping fields, business lifecycles, and relational policies.
Audience: Platform Engineers, Database Architects, and Backend Developers.
Status: IMPLEMENTED
Related Documents:
  - [System Architecture Guide](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/SYSTEM_ARCHITECTURE_GUIDE.md)
  - [Architectural Decision Records](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/ARCHITECTURAL_DECISION_RECORDS.md)
  - [Shared Collections](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/SHARED_COLLECTIONS.md)
Owner: Database Administrator
Last Review: 2026-06-27
Architecture Version: 2.2.0
---

# Tracker Mongoose Collections Reference
**Scope**: Core Platform Collections (Category, Business Purpose, Wiring, & Extension Guidelines)  
**Status**: Stable Core Schemas  

This document serves as the master architectural reference for Mongoose database collections. It explains why each model exists, what business problems it solves, its relations, UI field groupings, extension boundaries, and governing policies.

## 1. `employees` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Information**: First name, last name, DOB, DOA, marital status, gender, phone, email, profile image.
- **Professional Details**: Employee ID, designation (ref), department (ref), role (ref), reporting manager (ref), team lead (ref), level, DOJ, probation period, confirmation date.
- **Authentication**: Work email, password, password reset tokens.
- **Salary & Bank Details**: Account name, account number, bank name, branch, IFSC code.
- **Salary Breakdown**: CTC package, basic, allowances, deductions.
- **Personal Documents**: PAN card, Aadhar card, and file upload references.

### Business Purpose
**[Verified]** The `employees` collection is the foundation of identity and profile data across the system. If it did not exist, mapping attendance records, routing approvals to managers, issuing notifications, or processing monthly payroll runs would be impossible.

### Business Problem
**[Architectural Intent]** It removes the operational pain of fragmented worker profiles. It allows HR managers, team leaders, and payroll engines to access a single, verified record of an employee's professional status, line-manager hierarchy, banking details, and credentials.

### Relationships
- **[Verified]** **Parent**: `departments` (via `professionalInfo.department`), `designations` (via `professionalInfo.designation`), `roles` (via `professionalInfo.role`).
- **[Verified]** **Child / References**: Self-referencing link via `professionalInfo.reportingManager` and `professionalInfo.teamLead`. Referenced by almost all transactional models (e.g. `Attendance`, `Leave`, `Tasks`, `Ticket`, `AssetAllocation`).

### Architectural Category
**[Verified]** **Operational**. It stores mutable, active identity profiles that undergo routine transformations (promotions, contact updates) and trigger active lifecycle hooks.

### Ultimate Goal
**[Architectural Intent]** To act as the master identity directory for the platform. In future releases (such as advanced resource scheduling and AI productivity analysis), it will serve as the source of truth for worker availability and performance metrics.

### Reason for Separate Collection
**[Architectural Intent]** Embedding employee profiles inside department or project collections would cause severe data duplication, update anomalies, and slow down access control checks.

### Architectural Importance
**[Architectural Intent]** All access controls, workflows, task assignments, and payroll calculations would break. The system would lose the ability to verify who is performing an action or to whom a notification belongs.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When capturing permanent, cross-module profile parameters (e.g., secondary contact info, work location, or tax status).
- **[Recommendation]** **Create New Collection Instead**: If tracking temporary data or recurring metrics (e.g., monthly performance ratings or daily activity checks).
- **[Verified]** **Service Hooks**: Password hashing (`beforeCreate`/`beforeUpdate`) and exit clearance validation are enforced in [employees.js](file:///E:/Loigmax/Tracker/backend/src/services/employees.js).

### Policies
- **[Verified]** **Soft Delete**: Terminates employees by shifting `status = "Terminated"`. Hard deletion is blocked.
- **[Verified]** **Clearance Lock**: The `beforeUpdate` hook blocks terminations or deactivations if the employee still holds active asset allocations.
- **[Recommendation]** **Security**: Access policies (`access_policies.json`) enforce field-level permissions (e.g., hide passwords and CTC package fields from non-admin roles).

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Design Trade-offs*: Bank details and allowances are stored directly in the profile to keep lookups fast. For future releases, a separate bank ledger registry may be recommended for stricter auditing.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 2. `attendances` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Identity Details**: Employee reference (ref), employee name, manager reference (ref).
- **Logs**: Date, check-in timestamp, check-out timestamp, latitude/longitude coordinates, check-in request text.
- **Computations**: Work hours (calculated), status (e.g. Present, Absent, WFH, LOP, Late Entry).
- **Context Mappings**: Leave type reference (ref) if checking status = `Leave`.

### Business Purpose
**[Verified]** To capture employee time-in and time-out data. If it did not exist, payroll runs could not compute LOP deductions, overtime, or attendance ratio balances.

### Business Problem
**[Architectural Intent]** It eliminates manual tracking and prevents time theft. Employees gain a clear check-in terminal, while management gets real-time visibility into attendance ratios and coordinates.

### Relationships
- **[Verified]** **Parent**: `employees` (via `employee` and `managerId`).
- **[Verified]** **Child / References**: `leave_types` (via `leaveType` ref to associate paid/unpaid leaves).

### Architectural Category
**[Verified]** **Historical**. It stores sequential time logs that cannot be altered retroactively once approved.

### Ultimate Goal
**[Architectural Intent]** To supply accurate calculations data to the payroll engine and compile analytics reports on worker punctuality and presence.

### Reason for Separate Collection
**[Architectural Intent]** An employee checks in daily, generating hundreds of records per year. Embedding this inside the `employees` collection would cause documents to hit MongoDB's 16MB document limit.

### Architectural Importance
**[Architectural Intent]** Automated payroll calculations would fail, and LOP deductions would have to be calculated manually from spreadsheets.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When logging check-in telemetry (e.g., client IP address or device fingerprint).
- **[Recommendation]** **Create New Collection Instead**: If capturing detail sub-tasks completed during work hours (use `daily_activities`).
- **[Verified]** **Service Hooks**: [attendances.js](file:///E:/Loigmax/Tracker/backend/src/services/attendances.js) enforces coordinates tracking and check-in bounds.

### Policies
- **[Verified]** **Approved Month Lock**: Attendance logs for previous months are locked against modifications once the payroll run for that month is `Approved` or `Paid`.
- **[Verified]** **Pre-save Trigger**: Work hours (`workHours`) are automatically computed on save if both `checkIn` and `checkOut` are present.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: Locations are currently simplified to a single coordinate snapshot. Tracking route paths during WFH shifts is reserved for future releases.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 3. `payrolls` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Identity Details**: Employee reference (ref), processed by (ref), approved by (ref).
- **Period**: Month, year, payment date.
- **Salary Snapshot**: CTC package, basic salary, total gross earnings, total net deductions, status (e.g. Draft, Computed, Approved, Paid).
- **Breakdown Snapshots**: Earnings breakdown array, deductions breakdown array, statutory deductions.

### Business Purpose
**[Verified]** To store computed payroll slips for each employee monthly. It serves as the final financial ledger showing CTC payouts and deductions.

### Business Problem
**[Architectural Intent]** It automates salary computations and maintains billing compliance. It prevents incorrect payouts by snapshotting salary figures at the moment of approval.

### Relationships
- **[Verified]** **Parent**: `employees` (via `employeeId`), `payroll_runs` (via parent run ID).
- **[Verified]** **Child / References**: None. It holds static snapshots of figures.

### Architectural Category
**[Verified]** **Financial**. It represents the finalized financial ledger records of the system.

### Ultimate Goal
**[Architectural Intent]** To manage bank transfer exports, statutory compliance filings (PF, ESI), and generate employees payslips.

### Reason for Separate Collection
**[Architectural Intent]** It must represent a point-in-time snapshot. Overwriting values in the employee's active profile does not work because historical salary revisions must not retroactively change past payslips.

### Architectural Importance
**[Architectural Intent]** Employees would not have access to past payslips, and compliance auditing of salary structures would be impossible.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding new compliance attributes (e.g. tax filing reference numbers).
- **[Recommendation]** **Create New Collection Instead**: If creating dynamic calculation engines (write utility files, not new database schemas).

### Policies
- **[Verified]** **Immutability Lock**: The `beforeUpdate` hook in [payrolls.js](file:///E:/Loigmax/Tracker/backend/src/services/payrolls.js) locks all fields once status transitions to `Approved` or `Paid`.
- **[Recommendation]** **Uniqueness constraint**: Enforces unique combination of `employeeId`, `month`, and `year`.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: TDS is currently simplified to flat structure values. A statutory compliance tax calculator is planned for future releases.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 4. `shifts` & `shiftassignments` Collections

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Shift Settings**: Shift name, start time ("09:00"), end time ("18:00"), break duration, weekly off days array, overtime threshold.
- **Assignment Mapping**: Target employee (ref), shift ID (ref), effective start date, effective end date, isActive boolean.

### Business Purpose
**[Verified]** To track work schedules and map them to employees dynamically. If it did not exist, calculating overtime or determining check-in lateness would be impossible.

### Business Problem
**[Architectural Intent]** It prevents errors in lateness calculations for varying schedules (e.g. night shifts vs. morning shifts).

### Relationships
- **[Verified]** **Parent**: `employees` (via `employeeId` in assignment).
- **[Verified]** **Child / References**: `attendances` (evaluates shift settings during check-in).

### Architectural Category
**[Verified]** **Historical**. It tracks historical changes in shift assignments.

### Ultimate Goal
**[Architectural Intent]** To support dynamic roster scheduling and automated time tracking.

### Reason for Separate Collection
**[Architectural Intent]** An employee can change shifts multiple times during their tenure. Storing a single shift ID on the profile would overwrite past assignments, breaking historical calculation audits.

### Architectural Importance
**[Architectural Intent]** Lateness checks and overtime computations would revert to manual spreadsheet processing.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When capturing shift constraints (e.g., maximum check-in window delay).
- **[Recommendation]** **Create New Collection Instead**: If tracking ad-hoc temporary shift overrides (e.g. swap requests).

### Policies
- **[Verified]** **Transition Lock**: Updating an assignment requires setting `isActive: false` and `endDate: now` on the previous record before saving the new active range.
- **[Recommendation]** **Immutability**: Shifts cannot be modified if they have active assignments linked to processed payroll runs.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Architectural Recommendation*: Introduce a `shifts.js` service to automate the active shift deactivation workflow in future releases.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 5. `tickets` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Identity Details**: Ticket ID, title, description, user story, project category (ref), target product (ref).
- **Assignments**: Assigned developers array (ref), client reference (ref), creator model type (ref Path).
- **Workflow State**: Priority (Low, Medium, High, Critical), status (Open, Waiting For Admin, Waiting For Client, Resolved, Closed), metaStatus.
- **Sync Context**: Linked task reference (ref), converted by (ref), resolved at timestamp.

### Business Purpose
**[Verified]** To manage external customer and client support requests. It separates development tasks from customer-facing issue management.

### Business Problem
**[Architectural Intent]** It keeps clients isolated from internal task tracking while allowing developers to coordinate issues directly with tasks.

### Relationships
- **[Verified]** **Parent**: `clients` (via `clientId`), `employees` / `agents` (via polymorphic `createdBy`).
- **[Verified]** **Child / References**: `tasks` (via `linkedTaskId` ref).

### Architectural Category
**[Verified]** **Workflow**. It drives a multi-stage communication and validation cycle.

### Ultimate Goal
**[Architectural Intent]** To operate as the customer support portal and coordinate service level agreements (SLA) metrics.

### Reason for Separate Collection
**[Architectural Intent]** Tickets follow client visibility rules and polymorphic creator schemas (agents/employees) that do not map to the internal development task collection.

### Architectural Importance
**[Architectural Intent]** Customer support tracking would break, and clients would lose visibility into issue resolution progress.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When capturing support attributes (e.g., ticket categories or escalations).
- **[Recommendation]** **Create New Collection Instead**: If tracking sub-actions or attachments (use `ticket_comments` or `ticket_attachments`).

### Policies
- **[Verified]** **Client Isolation**: Client agents can only access tickets belonging to their client ID.
- **[Verified]** **Dynamic Status Mapping**: Task completion triggers automatic ticket resolution via `ticketTaskSync.js`.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: Status transitions are currently mapped inside service code. Moving these to metadata configurations is a recommended enhancement.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 6. `tasks` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Metadata**: Task code, title, description, priority.
- **Assignments**: Creator reference (ref), assigned developer reference (ref).
- **Workflow State**: Status (Backlogs, To Do, In Progress, In Review, Completed, Closed).
- **Sync Context**: Linked ticket reference (ref).

### Business Purpose
**[Verified]** To track internal development workflows and project milestones.

### Business Problem
**[Architectural Intent]** It prevents team coordination blockages. Developers and managers gain real-time visibility into backlogs and in-progress tasks.

### Relationships
- **[Verified]** **Parent**: `employees` (via creator/assignee).
- **[Verified]** **Child / References**: `tickets` (via `linkedTicketId`).

### Architectural Category
**[Verified]** **Workflow**.

### Ultimate Goal
**[Architectural Intent]** To support automated project reporting and developer productivity metrics.

### Reason for Separate Collection
**[Architectural Intent]** Internal tasks contain developer-only details (e.g., impact analysis, internal code links) that should not be visible to client support agents.

### Architectural Importance
**[Architectural Intent]** Internal development progress tracking would be lost.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When tracking developer attributes (e.g., estimated story points).
- **[Recommendation]** **Create New Collection Instead**: If tracking nested checklists (use sub-tasks).

### Policies
- **[Verified]** **Sync Validation**: Updates to task status are synchronized automatically to linked tickets.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: Kanban status values are currently simplified to hardcoded models. Supporting custom workflows per project is a future extension.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 7. `assets` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Identity Details**: Asset ID, category reference (ref), asset name, serial number, IMEI.
- **Procurement**: Purchase reference (ref), purchase cost, vendor name, invoice reference, warranty expiry date.
- **Operational Status**: Status (Available, Allocated, Under Repair, Disposed), condition (Excellent, Good, Fair, Poor, Damaged).
- **Holder Details**: Current allocated employee reference (ref), current allocation reference (ref).

### Business Purpose
**[Verified]** To maintain the master register of physical hardware items owned by the organization.

### Business Problem
**[Architectural Intent]** It prevents equipment loss, tracks warranty expirations, and streamlines device assignments.

### Relationships
- **[Verified]** **Parent**: `assets_categories` (via `categoryId`).
- **[Verified]** **Child / References**: Referenced by `assets_allocations`, `assets_incidents`, and `assets_repairs`.

### Architectural Category
**[Verified]** **Operational**.

### Ultimate Goal
**[Architectural Intent]** To support automated inventory calculations, depreciation reports, and automated device provisioning.

### Reason for Separate Collection
**[Architectural Intent]** Assets exist independently of who is holding them. Embedding them in employee records would make it impossible to track unallocated inventory.

### Architectural Importance
**[Architectural Intent]** The organization would lose its inventory control registry, leading to equipment loss and missing compliance audits.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding hardware parameters (e.g., MAC address).
- **[Recommendation]** **Create New Collection Instead**: If tracking allocation requests (use `assets_allocations`).

### Policies
- **[Verified]** **State Integrity**: Asset status can only transition through approved lifecycle events (e.g. allocating shifts status to `Allocated` is managed by allocation approvals, not direct updates).

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Recommendations*: Incorporating automatic network discovery protocols is a future extension.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 8. `feed_posts` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Metadata**: Subject line, rich text content, author reference (ref), post type (e.g. Update, Announcement, General).
- **Visibility Limits**: Group reference (ref), channel reference (ref).
- **Engagement Details**: Reactions array, comments count, views count, followers array.

### Business Purpose
**[Verified]** To operate as the corporate announcement board and social feed.

### Business Problem
**[Architectural Intent]** It replaces fragmented email chains with centralized corporate communications.

### Relationships
- **[Verified]** **Parent**: `employees` (via `author`).
- **[Verified]** **Child / References**: `feed_comments` (via `postId`).

### Architectural Category
**[Verified]** **Operational**.

### Ultimate Goal
**[Architectural Intent]** To drive internal communication, share documents, and manage event schedules.

### Reason for Separate Collection
**[Architectural Intent]** Feed posts generate high write/read frequencies and are social, which does not fit inside internal task or profile databases.

### Architectural Importance
**[Architectural Intent]** The organization would lose its centralized internal communication feed.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When tracking social parameters (e.g., pinned status).
- **[Recommendation]** **Create New Collection Instead**: If tracking comment details (use `feed_comments`).

### Policies
- **[Verified]** **Visibility Policy**: The `beforeRead` hook restricts post query results based on group/channel enrollment.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: Rich text media references are currently simplified to flat arrays. A dedicated media asset storage manager is a recommended enhancement.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 9. `departments` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Info**: Department name, department short code, description.
- **Governing Policies**: Leave policy reference (ref), attendance policy reference (ref).
- **Leadership**: Department manager reference (ref).

### Business Purpose
**[Verified]** The `departments` collection exists to organize the company's employee structure into functional units (e.g., HR, Engineering, Sales). It links these units to specific policies like leave policies and attendance policies, and defines managers for routing approvals. Without it, managing policy applications and approval hierarchies dynamically across groups of employees would be extremely hard.

### Business Problem
**[Architectural Intent]** It removes the operational pain of applying HR and attendance rules to employees individually. It automates policy assignment based on team membership and establishes a clear reporting line for department-wide approval routing.

### Relationships
- **[Verified]** **Parent**: None.
- **[Verified]** **Child / References**: References `leave_policies` (via `leavePolicy`), `attendance_policies` (via `attendancePolicy`), and `employees` (via `manager`). Referenced by `employees` (via `professionalInfo.department`) and `hr_policies` (via `departments`).

### Architectural Category
**[Verified]** **Registry**. It serves as a master lookup table of the organization's corporate structure.

### Ultimate Goal
**[Architectural Intent]** To support dynamic department-based resource allocation, cost center budgeting, granular role-based access control, and dynamic approval routing.

### Reason for Separate Collection
**[Architectural Intent]** Departments have independent attributes (manager, policies, codes) that are shared by many employees. Embedding these details inside individual employee records would lead to severe data duplication and update anomalies.

### Architectural Importance
**[Architectural Intent]** All department-level policy mappings and manager-based approval workflows would fail. Employees could not be grouped into business units, breaking organizational reporting and compliance audits.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When capturing permanent department attributes (e.g., cost center codes or department billing codes).
- **[Recommendation]** **Create New Collection Instead**: If tracking recurring metrics or department budgets (use a financial ledger or performance collection).
- **[Recommendation]** **Business Service**: Currently run on Generic CRUD. If custom validation or lifecycle hooks are needed, a new service file must be introduced.

### Policies
- **[Unknown]** **De-register Hook**: "Architectural policies not evident — requires clarification." (No database-level delete restrictions exist, meaning departments can be deleted even if employees are actively assigned to them).

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: The lack of check constraints allowing deletion of active departments is an intentional simplification for Version 1. Implementing a deletion blocker service is a recommended enhancement.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 10. `designations` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Details**: Designation title, designation description.

### Business Purpose
**[Verified]** The `designations` collection exists to standardize and index job roles and ranks across the company. Without it, employee job titles would be free-text strings, making it impossible to perform structured reporting on ranks, grades, and role hierarchies.

### Business Problem
**[Architectural Intent]** It standardizes job titles across the organization, which eliminates grade confusion and ensures consistency in payroll packages, eligibility criteria, and designation-based asset assignments.

### Relationships
- **[Verified]** **Parent**: None.
- **[Verified]** **Child / References**: Referenced by `employees` (via `professionalInfo.designation`).

### Architectural Category
**[Verified]** **Registry**. It serves as a static master index of professional titles.

### Ultimate Goal
**[Architectural Intent]** To support rank-based access control, automated grade-based salary bands, and designation-based hardware provisioning rules.

### Reason for Separate Collection
**[Architectural Intent]** Since multiple employees share the same designation, embedding designations would duplicate title and description strings, leading to synchronization errors during job title updates.

### Architectural Importance
**[Architectural Intent]** Employee titles would revert to inconsistent free-text entries, breaking designation-based reports, grade-based payroll logic, and role-based permissions.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding attributes that apply to a job title universally (e.g., grade level, salary band constraints).
- **[Recommendation]** **Create New Collection Instead**: If tracking individual career histories or promotions (use a historical progression log).
- **[Recommendation]** **Business Service**: Runs on Generic CRUD. No dedicated service file exists.

### Policies
- **[Unknown]** **Update/Delete policies**: "Architectural policies not evident — requires clarification." (Deletion is not blocked even if active employees hold the designation).

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Simplifications*: Standard role hierarchy levels are not currently enforced at the database level for designations.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 11. `leave_types` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Details**: Leave type name, description.
- **Balance Limits**: Maximum days allowed per month, maximum days allowed per year, carry forward flag.
- **Workflow settings**: Requires approval flag, active status flag.

### Business Purpose
**[Verified]** To define and configure the types of leaves available to employees (e.g., Sick Leave, Casual Leave, Loss of Pay). It defines baseline limits and approval rules. Without it, leave request engines and payroll calculation tables could not categorize or restrict leave durations.

### Business Problem
**[Architectural Intent]** Ensures legal compliance and corporate policy governance for paid/unpaid leaves. It removes the operational pain of manually checking leave eligibility and automates balance tracking.

### Relationships
- **[Verified]** **Parent**: None.
- **[Verified]** **Child / References**: Referenced by `leave_policies` (via `leaves.leaveType`), `leaves` (via `leaveType`), and `attendances` (via `leaveType`).

### Architectural Category
**[Verified]** **Historical**. It defines registries governing time-tracking history.

### Ultimate Goal
**[Architectural Intent]** To support dynamic leave entitlement engines, year-end leave balance rollover operations, and automated payroll loss-of-pay (LOP) deductions.

### Reason for Separate Collection
**[Architectural Intent]** Separating leave types allows HR admins to dynamically configure new leave categories (e.g. Maternity Leave, Bereavement Leave) without modifying codebase files or database schemas.

### Architectural Importance
**[Architectural Intent]** Leave categorization would break, making it impossible to check if a leave request is paid or unpaid, which would stall automated payroll runs.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When introducing global leave type attributes (e.g., gender-specific constraints or probation exclusion rules).
- **[Recommendation]** **Create New Collection Instead**: If tracking employee-specific leave balances (use a separate transactions ledger).
- **[Recommendation]** **Business Service**: Runs on Generic CRUD. No service file exists.

### Policies
- **[Unknown]** **Locking policies**: "Architectural policies not evident — requires clarification." (Deleting a leave type is not blocked even if referenced by existing leave transactions).

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Recommendations*: Implementing a soft-delete constraint to prevent deleting leave types that have active historical dependencies is a recommended future enhancement.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 12. `leavepolicy` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Info**: Policy name, description, active status flag, version.
- **Scheduling**: Policy status (`Draft`, `Scheduled`, `Active`, `Expired`), `effectiveFrom`, `effectiveTo`.
- **Entitlements**: Leaves rules array (referencing leave types, max monthly/yearly days, carry forward flags).
- **Target Audience**: Applicable roles array (ref), applicable departments array (ref), applicable designations array (ref).

### Business Purpose
**[Verified]** The `leavepolicy` collection groups multiple leave types and defines custom limits, mapping them collectively to specific employee roles, departments, or designations. Without it, leave entitlements would have to be assigned to each employee individually, causing severe administrative overhead.

### Business Problem
**[Architectural Intent]** It automates the assignment of leave benefits based on employee categories (e.g., contract workers vs. permanent staff), eliminating errors in leave balance allocations.

### Relationships
- **[Verified]** **Parent**: `roles` (via `applicableRoles`), `leave_types` (via `leaves.leaveType`), `departments` (via `applicableDepartments`), `designations` (via `applicableDesignations`).
- **[Verified]** **Child / References**: Referenced by `departments` (via `leavePolicy`), `designations` (via `leavePolicy`), and `employees` (via `professionalInfo.leavePolicyOverride`). Queried during employee registration/onboarding and dynamic policy resolution.

### Architectural Category
**[Verified]** **Historical**. It defines rules that govern time-tracking history and accruals.

### Ultimate Goal
**[Architectural Intent]** To manage dynamic role-based benefits, tenure-based leave accrual adjustments, and compliance checking.

### Reason for Separate Collection
**[Architectural Intent]** Leave policies are shared across multiple roles and departments. Embedding policy objects inside employee records would prevent central policy updates from propagating to employees instantly.

### Architectural Importance
**[Architectural Intent]** Role-based leave structures would break, and HR would have to manually compute and update leave balances for every employee.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When capturing policy-wide rules (e.g., maximum consecutive leave bounds or region-based policy variants).
- **[Recommendation]** **Create New Collection Instead**: If tracking employee-specific policy override requests.
- **[Recommendation]** **Business Service**: Runs on Generic CRUD. No service file exists.

### Policies
- **[Unknown]** **Integrity Check**: "Architectural policies not evident — requires clarification." (No database triggers exist to prevent deletion of policies linked to active departments).

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Recommendations*: A versioning system for leave policies is highly recommended so that modifications to a policy do not retroactively alter the historic leave balance calculations of past months.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 13. `task_types` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Details**: Task type name, description, active status flag.
- **Estimation & Class**: Estimated baseline hours, category (enum: Development, Testing, Design, Documentation, Meeting).
- **UI Presentation**: Icon name, color code (hex/rgb).

### Business Purpose
**[Verified]** To define standard classes of tasks. It supplies baseline estimated hours and UI presentation styling (colors, icons) for task boards. Without it, categorizations would be arbitrary strings, and compiling productivity analytics by task category would be impossible.

### Business Problem
**[Architectural Intent]** It standardizes task classifications, which allows managers to evaluate where engineering hours are spent (e.g., coding vs. documentation) and automates default time allocations.

### Relationships
- **[Verified]** **Parent**: None.
- **[Verified]** **Child / References**: Referenced by `tasks` (via `taskTypeId` or `taskType`).

### Architectural Category
**[Verified]** **Registry**. It serves as a master configuration table for task board categories.

### Ultimate Goal
**[Architectural Intent]** To feed machine learning estimation engines, drive project health dashboards, and compute granular employee productivity indices.

### Reason for Separate Collection
**[Architectural Intent]** Separation allows administrators to customize task categories, estimated hours, and visual tags dynamically from the admin panel without editing UI assets or rebuilding code.

### Architectural Importance
**[Architectural Intent]** Tasks would lose standard category structures, visual color indicators on Kanban boards would break, and automated developer velocity calculations would fail.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When capturing global task parameters (e.g., complexity weight or target SLA resolution hours).
- **[Recommendation]** **Create New Collection Instead**: If tracking specific sub-tasks or check-off items (use checklists).
- **[Recommendation]** **Business Service**: Runs on Generic CRUD. No service file exists.

### Policies
- **[Unknown]** **Update constraints**: "Architectural policies not evident — requires clarification."

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Simplifications*: Estimates are currently flat values. Dynamic estimation based on developer seniority is a planned enhancement.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 14. `clients` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Account Identification**: Client name, owner name, business type, contact email, contact phone.
- **Primary Address**: Street, city, state, zip code, country.
- **Compliance Registry**: GSTIN (15-character uppercase string).
- **Pipeline Stage**: Lead source, lead status (enum), lead type reference (ref), reference type reference (ref).
- **Operational Status**: Status (Active, Inactive).
- **Assigned Stakeholders**: Client agents (ref), account manager (ref), project manager (ref), project types array (ref), proposed products (ref).
- **Milestone Logs**: Milestone status array (containing milestoneId (ref), status, assignedTo (ref), dueDate, completedDate, notes).

### Business Purpose
**[Verified]** The `clients` collection acts as the master directory of all customer accounts, sales lead stages, compliance details, and billing assignments. It connects client-facing modules (like support tickets) with internal project execution modules (like tasks and milestones). Without it, isolating customer data or tracking SLAs would be impossible.

### Business Problem
**[Architectural Intent]** It eliminates the operational pain of maintaining disconnected CRM and project management tools. It provides a single record of client compliance details, active projects, SLA managers, and milestone statuses.

### Relationships
- **[Verified]** **Parent**: `lead_types` (via `leadType`), `reference_types` (via `referenceType`).
- **[Verified]** **Child / References**: References `agents` (via `agent`), `employees` (via `accountManager`, `projectManager`, `milestones.assignedTo`), `project_types` (via `project_types`), `products` (via `proposedProducts`), and `milestones` (via `milestones.milestoneId`). Referenced by `tickets` (via `clientId`) and `tasks` (via `clientId`).

### Architectural Category
**[Verified]** **Registry**. It holds the master identity and contract parameters of external customer accounts.

### Ultimate Goal
**[Architectural Intent]** To drive automated customer billing, manage service level agreement (SLA) metrics, and power customer support portals.

### Reason for Separate Collection
**[Architectural Intent]** Clients possess complex contact, compliance, and milestone data structures that are shared across multiple tickets, tasks, and agents. Embedding client details in those transactional collections would cause massive data duplication.

### Architectural Importance
**[Architectural Intent]** External customer billing and compliance records would be lost. Support agents could not associate incoming tickets with customers, and project manager assignments would break.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding permanent customer characteristics (e.g., credit terms, billing schedules, tax status fields).
- **[Recommendation]** **Create New Collection Instead**: If recording financial transactions, invoices, or invoice items.
- **[Recommendation]** **Business Service**: Operates on Generic CRUD, but [milestoneService.js](file:///E:/Loigmax/Tracker/backend/src/services/milestoneService.js) assists in updating and syncing internal milestone records to tasks and tickets.

### Policies
- **[Unknown]** **Update and Delete restriction**: "Architectural policies not evident — requires clarification." (No database locks prevent client deletion, even if active tickets or billing runs exist).

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: The `milestones` array is currently embedded inside the client record. Extracting milestones to a standalone transaction ledger is a recommended enhancement for scaling.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 15. `project_types` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Info**: Project type name, description, active status flag.
- **Constraints**: Default estimated hours, complexity rating (enum: Low, Medium, High).

### Business Purpose
**[Verified]** To categorize client projects and define standard complexity ratings and estimated baselines. Without it, compiling project estimation metrics and comparing delivery schedules across project types would be impossible.

### Business Problem
**[Architectural Intent]** It automates the classification of project workloads and standardizes SLA baselines based on project complexity (e.g., Mobile App vs. Consultation), preventing under-estimation of deliverables.

### Relationships
- **[Verified]** **Parent**: None.
- **[Verified]** **Child / References**: Referenced by `clients` (via `project_types`) and `tasks` (via `projectTypeId`).

### Architectural Category
**[Verified]** **Registry**. It holds static master parameters defining project classification templates.

### Ultimate Goal
**[Architectural Intent]** To support template-driven project creation, automated billing rates based on complexity, and velocity tracking.

### Reason for Separate Collection
**[Architectural Intent]** Since multiple clients and projects share the same template configuration, separation avoids duplicating description and complexity strings.

### Architectural Importance
**[Architectural Intent]** Project velocity metrics would lose standard categorization, and resource estimation models would require manual calculation.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding global classification characteristics (e.g., default billing multipliers).
- **[Recommendation]** **Create New Collection Instead**: If tracking project instances or active timelines.
- **[Recommendation]** **Business Service**: Runs on Generic CRUD. No service file exists.

### Policies
- **[Unknown]** **Deletion restrictions**: "Architectural policies not evident — requires clarification."

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Simplifications*: Est hours represent a static baseline. Dynamic estimation models based on historical delivery averages are a planned enhancement.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 16. `access_policies` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Role Mapping**: Target role reference (ref).
- **Target Model**: Collection/Model name string.
- **CRUD Matrix**: Permissions flags (read, create, update, delete).
- **Granular Restrictions**: Forbidden access fields list (arrays for read, create, update, delete).
- **Allowed Inclusions**: Allow access fields list (arrays for read, create, update, delete).
- **Scopes & Logic**: Registry scope tags, conditional query rules map.

### Business Purpose
**[Verified]** To store fine-grained, database-driven role-based access control (RBAC) rules. Rather than hardcoding user permissions, the policy middleware evaluates these documents to validate requests and filter fields. Without it, altering user access permissions would require editing backend code and redeploying.

### Business Problem
**[Architectural Intent]** It prevents unauthorized data access and leaks (e.g., hiding salary figures from regular employees, restricting client agents from viewing internal developer tasks). It allows compliance admins to modify permissions in real-time.

### Relationships
- **[Verified]** **Parent**: `roles` (via `role`).
- **[Verified]** **Runtime**: Queried by the backend validation middlewares for every API hit and database query.

### Architectural Category
**[Verified]** **Configuration**. It governs the operational behavior and security limits of the system.

### Ultimate Goal
**[Architectural Intent]** To support dynamic field-level and row-level data isolation based on organizational hierarchies (e.g. "employees can only view colleagues in their own department").

### Reason for Separate Collection
**[Architectural Intent]** Permissions change independently of user profiles or roles. Keeping them in a dedicated collection allows fast indexing and real-time security updates without lock contention on user profiles.

### Architectural Importance
**[Architectural Intent]** The system authorization engine would fail, leaving the application unsecured, or forcing a rollback to a rigid, hardcoded permission model.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When expanding the policy model to support advanced authorization structures (e.g., time-based access windows).
- **[Recommendation]** **Create New Collection Instead**: If logging access violations or security logs (use a security incident ledger).
- **[Recommendation]** **Business Service**: Runs on Generic CRUD.

### Policies
- **[Verified]** **Unique Constraint**: Enforces a unique index on the combination of `role` and `modelName`.
- **[Verified]** **RBAC**: Access to modify access policies is restricted strictly to the Super Admin role.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Performance*: The schema implements indexed fields (`role`, `modelName`) for query speed, preventing request latency during policy checks.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 17. `roles` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Details**: Role name, description, active status flag.
- **Capabilities Matrix**: Authorized capability tags array.
- **Hierarchy Rank**: Security clearance level (integer, 1 to 10).

### Business Purpose
**[Verified]** To define access privilege groups (e.g., Super Admin, HR, Employee) and their capabilities. Without it, managing employee clearances and grouping system permissions would be impossible.

### Business Problem
**[Architectural Intent]** Eliminates the operational risk of manual permission assignment. Assigning a role to a new employee automatically grants them all associated capabilities, simplifying employee onboarding.

### Relationships
- **[Verified]** **Parent**: None.
- **[Verified]** **Child / References**: Referenced by `employees` (via `professionalInfo.role`), `access_policies` (via `role`), `leave_policies` (via `applicableRoles`), and `hr_policies` (via `roles`).

### Architectural Category
**[Verified]** **Registry**. It serves as the master database lookup for access groups.

### Ultimate Goal
**[Architectural Intent]** To serve as the foundation of the platform's multi-tenant security model, supporting hierarchical approval chains and security clearances.

### Reason for Separate Collection
**[Architectural Intent]** Roles and capabilities are shared by many employees. Embedding them would duplicate strings and make capability updates slow and error-prone.

### Architectural Importance
**[Architectural Intent]** All role-based access checks would fail, disabling the onboarding of new employees with designated privileges.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding hierarchical attributes (e.g., parent role references).
- **[Recommendation]** **Create New Collection Instead**: If recording individual permission exceptions or user overrides.
- **[Recommendation]** **Business Service**: Runs on Generic CRUD.

### Policies
- **[Unknown]** **Integrity Lock**: "Architectural policies not evident — requires clarification." (No database delete block prevents deleting a role that is assigned to active employees).

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Simplifications*: Clearance levels are integers from 1 to 10, which represents a simplified hierarchy.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 18. `session` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **User Mapping**: Target user reference (ref).
- **Auth Tokens**: Access token details (token, secret, expiry), refresh token details (token, secret, jti, expiry).
- **Platform Identity**: Platform (web, mobile), device UUID, Firebase FCM token.
- **Context Details**: Connection status (Active, DeActive, PendingApproval), device metadata (name, os, userAgent, ipAddress), last used timestamp.

### Business Purpose
**[Verified]** To manage active user logins, support JWT refresh token rotation, track user devices, and hold Firebase Cloud Messaging (FCM) tokens. Without it, the system could not invalidate a login, revoke a compromised token, or route push notifications to specific user devices.

### Business Problem
**[Architectural Intent]** Prevents unauthorized account hijacking by allowing users and admins to view active login locations, identify suspicious devices, and revoke active sessions instantly.

### Relationships
- **[Verified]** **Parent**: `employees` (via `userId`).
- **[Verified]** **Runtime**: Queried by auth middleware to validate sessions and verify JWT refresh tokens.

### Architectural Category
**[Verified]** **Operational**. It manages highly dynamic login state transitions.

### Ultimate Goal
**[Architectural Intent]** To support secure multi-device token management, device telemetry logging, and targeted mobile push notifications.

### Reason for Separate Collection
**[Architectural Intent]** Sessions are highly ephemeral and updated on every page load/action. Embedding session data in employee profiles would cause database lock contention and performance degradation.

### Architectural Importance
**[Architectural Intent]** JWT token refresh operations would fail, users would be logged out on token expiry, and push notifications would fail to reach client devices.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding login-related security parameters (e.g., login coordinates, MFA check flags).
- **[Recommendation]** **Create New Collection Instead**: If recording login historical events (use an audit trail).
- **[Recommendation]** **Business Service**: Runs on Generic CRUD, but integrates with auth and push messaging services.

### Policies
- **[Verified]** **TTL Auto-Expiry**: `expireAfterSeconds: 90 * 24 * 60 * 60` (Mongoose automatically deletes inactive sessions after 90 days).
- **[Verified]** **FCM Indexing**: Indexes `fcmToken` as a sparse index to ensure fast search without indexing empty records.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Performance*: The schema defines compound indexes on `userId` and `platform` to ensure fast login validation queries.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 19. `todos` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Ownership**: Target employee reference (ref).
- **Task Content**: Task description string.
- **Status & Priority**: Completed status flag, priority rating (low, medium, high), due date, category (personal, work, meeting, deadline).

### Business Purpose
**[Verified]** To provide employees with a personal checklist manager directly inside Tracker. Without it, employees would need external to-do apps, fragmenting their daily workflows.

### Business Problem
**[Architectural Intent]** It helps individual workers organize their daily schedule and deadlines, which increases productivity and reduces missed deadlines.

### Relationships
- **[Verified]** **Parent**: `employees` (via `employee`).
- **[Verified]** **Child / References**: None.

### Architectural Category
**[Verified]** **Operational**. It stores active, mutable user checklist records.

### Ultimate Goal
**[Architectural Intent]** To act as a personal productivity assistant, integrating with calendars, tasks, and alerts.

### Reason for Separate Collection
**[Architectural Intent]** Checklist items are highly dynamic and only relevant to the owner. Embedding them in employee records or internal development tasks would bloat those collections.

### Architectural Importance
**[Architectural Intent]** Personal checklist functionality would be lost, disrupting individual task tracking.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding task properties (e.g., links to internal tasks/tickets).
- **[Recommendation]** **Create New Collection Instead**: If tracking shared team tasks (use `tasks` collection).
- **[Recommendation]** **Business Service**: Runs on Generic CRUD.

### Policies
- **[Unknown]** **Update/Delete policies**: "Architectural policies not evident — requires clarification." (No database restrictions exist; users can edit and delete their checklist items at will).

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Performance*: Text index is defined on `text` to support quick keyword searches, and compound indexes are configured on owner and completion status to optimize list loading.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 20. `auditlog` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Target Record**: Model/Collection name, document identifier.
- **Operation details**: Action type (create, update, delete).
- **Actor context**: User identifier, user role.
- **Payload Snapshots**: State before modification, state after modification, custom metadata.

### Business Purpose
**[Verified]** The `auditlog` collection exists to log all data mutations across the database. Without it, tracking who changed a value, when they changed it, and what the original value was would be impossible, creating a massive security and auditing gap.

### Business Problem
**[Architectural Intent]** It prevents internal fraud, aids error recovery by tracking what data was changed, and supplies data audits for enterprise compliance.

### Relationships
- **[Verified]** **Parent**: References the user who performed the operation (via `userId`).
- **[Verified]** **Child / References**: Dynamically references modified records via `model` and `docId`.

### Architectural Category
**[Verified]** **Historical**. It is a read-only, append-only historical log of system mutations.

### Ultimate Goal
**[Architectural Intent]** To provide a complete audit trail for security compliance and support automated data rollback tools.

### Reason for Separate Collection
**[Architectural Intent]** Audit logs are write-heavy and read-rarely. Keeping them separate prevents query slowdowns on transactional tables and ensures logs are protected from modifications.

### Architectural Importance
**[Architectural Intent]** The system would lose all data audibility. Administrators could not trace incorrect edits, corrupt updates, or security violations.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When capturing additional runtime metadata (e.g., correlation/request IDs, API route info).
- **[Recommendation]** **Create New Collection Instead**: If logging read accesses or system errors.
- **[Recommendation]** **Business Service**: Runs on Generic CRUD, but integrations exist in audit logging middleware.

### Policies
- **[Verified]** **TTL Auto-Expiry**: `expireAfterSeconds: 365 * 24 * 60 * 60` (Mongoose automatically deletes audit logs after 1 year to manage disk space).
- **[Recommendation]** **Immutability**: Log entries should never be updated or deleted by application users.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Performance*: Compound indexes are defined on `model`, `docId`, and `createdAt` to support fast historical lookups of specific documents.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 21. `errorlog` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Error Details**: Error message, stack trace.
- **Location Context**: API route or function name.
- **User Context**: Employee reference (ref) who encountered the error.
- **Severity**: Level (Info, Warning, Error, Critical).

### Business Purpose
**[Verified]** To capture and store unhandled exceptions and stack traces in the backend application. Without it, debugging production crashes would require manual access to server console logs.

### Business Problem
**[Architectural Intent]** It reduces downtime by capturing exactly why an error occurred and which employee encountered it, allowing development teams to isolate and fix bugs quickly.

### Relationships
- **[Verified]** **Parent**: `employees` (via `user`).
- **[Verified]** **Child / References**: None.

### Architectural Category
**[Verified]** **Historical**. It stores sequential server error logs.

### Ultimate Goal
**[Architectural Intent]** To feed automated alerting systems (like Slack/Email notifications for critical crashes) and generate system health metrics.

### Reason for Separate Collection
**[Architectural Intent]** Error logs are highly dynamic and only read by developers. Storing them in standard database collections would slow down operations.

### Architectural Importance
**[Architectural Intent]** Backend exceptions would go unnoticed, and developers would lack stack trace details to debug production crashes.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When logging additional context (e.g., browser user agent or API payload details).
- **[Recommendation]** **Create New Collection Instead**: If logging user feedback or bug tickets (use `tickets` collection).
- **[Recommendation]** **Business Service**: Runs on Generic CRUD.

### Policies
- **[Unknown]** **Retention Policies**: "Architectural policies not evident — requires clarification." (No TTL index is defined in schema, meaning logs persist indefinitely unless pruned manually).

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Recommendations*: Implementing a TTL index (e.g., auto-delete after 30 days) is recommended to prevent error log storage bloat.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 22. `hrpolicies` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Info**: Policy title, category (enum), HTML/text content, version string.
- **Governance**: Status (Draft/Approved), metaStatus (active/etc.), requires acknowledgment flag, is public flag.
- **Effective Limits**: Effective start date, expiry date, tags.
- **Audience Scope**: Applicable audience, target departments (ref), target roles (ref).
- **Attachments Ledger**: Attachments array (filename, path, uploaded timestamp).
- **Acknowledgments Ledger**: Signatures array (employeeId (ref), acknowledged timestamp, IP address).
- **Management Context**: Creator employee (ref), approver employee (ref), approval timestamp.

### Business Purpose
**[Verified]** To manage company policy documents (e.g., Code of Conduct, Travel Policy) and track employee acknowledgments. Without it, HR would have to distribute policies and collect signatures manually, leading to compliance risks.

### Business Problem
**[Architectural Intent]** It automates corporate policy compliance audits. It provides legal proof that employees read and acknowledged company policies, and tracks policy revisions.

### Relationships
- **[Verified]** **Parent**: `employees` (via `createdBy`, `approvedBy`).
- **[Verified]** **Child / References**: References `departments` (via `departments`), `roles` (via `roles`), and `employees` (via `acknowledgments.employeeId`).

### Architectural Category
**[Verified]** **Workflow**. It governs draft-to-approval cycles and tracks mandatory employee signatures.

### Ultimate Goal
**[Architectural Intent]** To serve as the company's central compliance library, supporting automated onboarding checklists and policy audits.

### Reason for Separate Collection
**[Architectural Intent]** Policies have unique lifecycles, version progress, and acknowledgment lists that are independent of other core entities.

### Architectural Importance
**[Architectural Intent]** Corporate policy dissemination and employee compliance signature tracking would revert to paper forms, breaking HR compliance.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding policy properties (e.g., department-specific approval flows).
- **[Recommendation]** **Create New Collection Instead**: If tracking detailed legal contracts (use a document manager).
- **[Recommendation]** **Business Service**: Currently runs on Generic CRUD.

### Policies
- **[Verified]** **Audit Logging**: Employee IP address and timestamps are snapshotted during signature submission and locked against edits.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Performance*: Text search indexes are configured on `title` and `content` to support dynamic user handbook searches.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 23. `milestones` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Details**: Milestone name, description, status (Active/Inactive).

### Business Purpose
**[Verified]** To serve as a standardized registry of project stages (e.g., Requirements, Design, Development, UAT, Deployment). Without it, milestones would be free-text entries, making standard project tracking impossible.

### Business Problem
**[Architectural Intent]** It standardizes client project stages, allowing management to track progress uniformly across various client projects.

### Relationships
- **[Verified]** **Parent**: None.
- **[Verified]** **Child / References**: Referenced by `clients` (within the `milestones` array) and `tasks` (via `milestoneId`).

### Architectural Category
**[Verified]** **Registry**. It holds lookup stage definitions.

### Ultimate Goal
**[Architectural Intent]** To support automated invoicing triggers linked to milestone completions and compile cross-project execution metrics.

### Reason for Separate Collection
**[Architectural Intent]** Since multiple clients and projects follow the same standard delivery stages, separation avoids duplicating stage names and descriptions.

### Architectural Importance
**[Architectural Intent]** Milestone definitions would become arbitrary free-text entries, breaking stage-based reporting and automated project creation.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding global milestone attributes (e.g., default stage duration).
- **[Recommendation]** **Create New Collection Instead**: If tracking project-specific milestone schedules (update `clients.milestones` instead).
- **[Recommendation]** **Business Service**: Runs on Generic CRUD, but [milestoneService.js](file:///E:/Loigmax/Tracker/backend/src/services/milestoneService.js) handles client milestone sync operations.

### Policies
- **[Unknown]** **Deletion restrictions**: "Architectural policies not evident — requires clarification." (No database restrictions exist to prevent deleting milestones that are in use).

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Simplifications*: Milestones are a simple list. Establishing stage dependencies (e.g., "UAT requires Development complete") is a recommended future extension.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 24. `email_configs` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **General status**: Active flag, email service (gmail, outlook, yahoo, custom).
- **Server details**: Host address, port number, secure connection flag.
- **Login Credentials**: Username, password.
- **Sender details**: From name, from email address.

### Business Purpose
**[Verified]** To store connection details for the system SMTP mail server. Without it, mail server credentials would have to be hardcoded in configuration files, preventing administrators from updating connection settings from the admin panel.

### Business Problem
**[Architectural Intent]** It allows administrators to change mail servers or update expired credentials without modifying code files or restarting server processes.

### Relationships
- **[Verified]** **Parent**: None.
- **[Verified]** **Runtime**: Queried by the notification mailer engine to dispatch transactional emails.

### Architectural Category
**[Verified]** **Configuration**. It defines system-wide connection settings.

### Ultimate Goal
**[Architectural Intent]** To act as the SMTP credentials provider for all system notification dispatches.

### Reason for Separate Collection
**[Architectural Intent]** SMTP settings must be stored securely and isolated from operational collections. Separating them allows tight read constraints.

### Architectural Importance
**[Architectural Intent]** Administrators would lose the ability to configure SMTP connections from the admin UI, requiring developer intervention for every mail server update.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding advanced server attributes (e.g., OAuth client keys).
- **[Recommendation]** **Create New Collection Instead**: If tracking email delivery logs.
- **[Recommendation]** **Business Service**: Runs on Generic CRUD.

### Policies
- **[Verified]** **Single Instance Enforcement**: The schema's `pre-save` hook automatically deletes any existing configurations before saving a new one, ensuring only one SMTP configuration exists.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Security*: Enforcing strict field-level encryption for the `password` field is an architectural recommendation for future releases.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 25. `reference_types` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Info**: Reference type name, description, status (Active/Inactive).

### Business Purpose
**[Verified]** To index sales lead sources (e.g., Website, Referral, Partner, Cold Call). Without it, source analysis would rely on inconsistent free-text entries.

### Business Problem
**[Architectural Intent]** It standardizes the tracking of sales lead channels, allowing the sales team to analyze which channels yield the highest conversion rates.

### Relationships
- **[Verified]** **Parent**: None.
- **[Verified]** **Child / References**: Referenced by `clients` (via `referenceType`).

### Architectural Category
**[Verified]** **Registry**. It holds static lookup options.

### Ultimate Goal
**[Architectural Intent]** To power sales marketing dashboards and evaluate conversion ratios by channel.

### Reason for Separate Collection
**[Architectural Intent]** Multiple client lead records refer to the same source. Separation prevents string duplication and allows name updates to cascade.

### Architectural Importance
**[Architectural Intent]** Sales funnel analytics by lead source would break.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding category-wide attributes.
- **[Recommendation]** **Business Service**: Runs on Generic CRUD.

### Policies
- **[Unknown]** **Deletion restrictions**: "Architectural policies not evident — requires clarification."

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Simplifications*: A basic lookup table with no complex constraints.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 26. `lead_types` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Basic Info**: Lead type name, description, status (Active/Inactive).

### Business Purpose
**[Verified]** To index client account tiers (e.g., Enterprise, Mid-Market, SMB, Retainer). Without it, client segmentation would rely on free-text entries.

### Business Problem
**[Architectural Intent]** It standardizes lead classifications, helping sales teams group client accounts and prioritize deals.

### Relationships
- **[Verified]** **Parent**: None.
- **[Verified]** **Child / References**: Referenced by `clients` (via `leadType`).

### Architectural Category
**[Verified]** **Registry**. It holds lookup classifications.

### Ultimate Goal
**[Architectural Intent]** To analyze sales velocity and support dynamic pricing rules based on deal tiers.

### Reason for Separate Collection
**[Architectural Intent]** Separation prevents duplicating deal segment strings across multiple customer records.

### Architectural Importance
**[Architectural Intent]** Consistent classification and reporting of sales deal tiers would be lost.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding classification characteristics.
- **[Recommendation]** **Business Service**: Runs on Generic CRUD.

### Policies
- **[Unknown]** **Deletion restrictions**: "Architectural policies not evident — requires clarification."

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Simplifications*: Simple lookups.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 27. `leaves` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Identity & Context**: Employee reference (ref), employee name, department reference (ref), manager reference (ref).
- **Type & Range**: Leave type reference (ref), leave name, start date, end date, total days.
- **Workflow State**: Status (Pending, Approved, Rejected), metaStatus (active/inactive), emergency flag.
- **Approvals Ledger**: Workflow reference (ref), current step index, approvals array (step index, approver reference, approver type, status, comment, actioned timestamp).
- **Resolution**: Approved timestamp, rejected timestamp, manager comments, uploaded documents.

### Business Purpose
**[Verified]** The `leaves` collection exists to manage the submission, tracking, and approval lifecycle of employee leave requests. It dynamically routes requests through role-based approval steps defined in approval workflows. Without it, managing employee time-off requests and tracking team availability dynamically would be impossible.

### Business Problem
**[Architectural Intent]** It automates leave requests, reducing HR administration overhead. It enforces leave policy limits at the moment of submission, prevents double-booking within departments, and logs approvals for compliance.

### Relationships
- **[Verified]** **Parent**: `employees` (via `employeeId`, `managerId`), `departments` (via `departmentId`), `leave_types` (via `leaveTypeId`), `approvalworkflows` (via `workflowId`).
- **[Verified]** **Child / References**: Referenced by the payroll engine during monthly runs to compute LOP deductions.

### Architectural Category
**[Verified]** **Workflow**. It utilizes dynamic state progression, multi-step approval arrays, and triggers calculations in the payroll layer.

### Ultimate Goal
**[Architectural Intent]** To supply availability metrics to team calendars, automate payroll calculations, and enforce corporate compliance policies.

### Reason for Separate Collection
**[Architectural Intent]** Leave requests are transaction-oriented, highly mutable during approval, and grow indefinitely. Embedding them inside employee records would lead to document size violations and lock contention.

### Architectural Importance
**[Architectural Intent]** Time-off requests would revert to manual emails, leave policy balances could not be enforced, and payroll LOP deductions would have to be calculated manually from emails.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding leave request metadata (e.g., return-to-work checklist triggers or half-day markers).
- **[Recommendation]** **Create New Collection Instead**: If tracking leave ledger balance adjustments (use `leave_transactions`).
- **[Recommendation]** **Business Service**: Hook validations and status updates are managed in [leaves.js](file:///E:/Loigmax/Tracker/backend/src/services/leaves.js).

### Policies
- **[Verified]** **Approval Workflow Lock**: Once status is set to `Approved` or `Rejected`, further status transitions are locked.
- **[Verified]** **Historical Lock**: Modifying leaves for periods in closed/approved payroll runs is blocked.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: The approvals array is embedded directly inside the document. For very long approval loops, an external workflow ledger may be recommended.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 28. `assets_allocations` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Assignee Context**: Asset reference (ref), employee reference (ref), department reference (ref).
- **Allocation Details**: Type (Allocation, Transfer, Temporary), allocation date, expected return date, actual return date.
- **Workflow State**: Status (Pending Approval, Active, Returned, Transferred, Rejected), metaStatus.
- **Return Context**: Returned condition (enum), return notes.
- **Approvals Ledger**: Workflow reference (ref), current step index, approvals array (step index, approver reference, approver type, status, comment, actioned timestamp).

### Business Purpose
**[Verified]** The `assets_allocations` collection manages the lifecycle of physical corporate assets assigned to employees. It coordinates the approval loops for device checkouts, tracking asset transfers and returns. Without it, tracking who currently holds a device, the condition of returned hardware, and approval histories would be impossible.

### Business Problem
**[Architectural Intent]** It prevents hardware loss and coordinates equipment deployments. It ensures approvals are obtained before high-value devices are handed out and logs device conditions on return.

### Relationships
- **[Verified]** **Parent**: `assets` (via `assetId`), `employees` (via `employeeId`), `departments` (via `departmentId`), `approvalworkflows` (via `workflowId`).
- **[Verified]** **Child / References**: Used during employee termination to ensure all allocated assets are returned before final clearance.

### Architectural Category
**[Verified]** **Workflow**. It manages physical assets transitions through multi-stage approval status arrays.

### Ultimate Goal
**[Architectural Intent]** To automate inventory management, track physical asset deprecations, and enforce hardware compliance policies.

### Reason for Separate Collection
**[Architectural Intent]** An asset can have a long history of assignments, returns, and transfers. Separating it from the `assets` and `employees` collections preserves the audit trail without bloating those master documents.

### Architectural Importance
**[Architectural Intent]** The organization would lose track of who holds which hardware. HR could not enforce exit clearance checks, and loss of equipment would increase.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When logging allocation metadata (e.g., courier tracking numbers or setup checklist status).
- **[Recommendation]** **Create New Collection Instead**: If recording repairs or damages (use `assets_repairs` or `assets_incidents`).
- **[Recommendation]** **Business Service**: Allocations and status syncs are governed by [assets_allocations.js](file:///E:/Loigmax/Tracker/backend/src/services/assets_allocations.js).

### Policies
- **[Verified]** **Clearance Blocker**: Prevents employee termination if they hold active allocations.
- **[Verified]** **Asset Status Sync**: Transitioning status to `Active` automatically shifts the underlying asset's status to `Allocated`.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: The allocation condition enum is checked only during return. Dynamic inspection checks during allocation are reserved for future releases.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 29. `payroll_runs` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Period**: Month, year.
- **Workflow State**: Status (Draft, Processing, Computed, Approved, Paid).
- **Aggregation Summary**: Total employees, processed count, failed count, total gross payout, total net payout.
- **Approvals & Audits**: Initiated by (ref), approved by (ref), approved at, paid at, notes.
- **Run Elements**: Employee references array (ref), payroll references array (ref).
- **Audit Logs**: Payroll audit events array (event, performed by (ref), timestamp, note).

### Business Purpose
**[Verified]** The `payroll_runs` collection exists to orchestrate the monthly payroll calculation cycle for groups of employees. It acts as a state machine that tracks payroll calculations from initiation to final bank payouts. Without it, processing salaries at scale and logging financial audits of monthly payouts would be impossible.

### Business Problem
**[Architectural Intent]** It automates mass salary calculations, prevents double-payment errors, and logs approval audit paths to ensure financial compliance and prevent fraud.

### Relationships
- **[Verified]** **Parent**: `employees` (via `initiatedBy`, `approvedBy`).
- **[Verified]** **Child / References**: References `employees` (via `employeeIds` array) and `payrolls` (via `payrollIds` array).

### Architectural Category
**[Verified]** **Workflow**. It dictates state transitions (`Draft` ➔ `Processing` ➔ `Computed` ➔ `Approved` ➔ `Paid`) that freeze transaction entries.

### Ultimate Goal
**[Architectural Intent]** To drive automated salary transfers, compile statutory filings (PF, ESI), and generate financial audit reports.

### Reason for Separate Collection
**[Architectural Intent]** Salary processing must be run as a transactional batch. Overwriting individual payslips without a parent run would make audit trails and batch rollbacks impossible.

### Architectural Importance
**[Architectural Intent]** Payroll calculations would have to be run for employees individually, increasing processing times and risking payout discrepancies.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When capturing batch-wide billing metadata (e.g., bank transfer reference numbers or corporate funding accounts).
- **[Recommendation]** **Create New Collection Instead**: If adding individual salary structures or components (use `salary_structures`).
- **[Recommendation]** **Business Service**: Governed by [payroll_runs.js](file:///E:/Loigmax/Tracker/backend/src/services/payroll_runs.js).

### Policies
- **[Verified]** **Immutability Lock**: Setting status to `Approved` or `Paid` freezes all referenced `payrolls` and associated `attendances` against any modifications.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: The calculation engine runs as a single process block. Distributing calculations across background queues is planned for future scaling.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 30. `wfh_requests` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Assignee Context**: Employee reference (ref), department reference (ref), manager reference (ref).
- **Details**: Start date, end date, reason.
- **Workflow State**: Status (Pending, Approved, Rejected, Cancelled), approver comment.

### Business Purpose
**[Verified]** The `wfh_requests` collection tracks and manages Work From Home requests. Without it, attendance calculations would mark remote employees absent on days they work remotely.

### Business Problem
**[Architectural Intent]** It automates remote work requests, giving management visibility into who is working remotely and ensuring attendance evaluations adjust check-in rules (e.g. bypass geofencing).

### Relationships
- **[Verified]** **Parent**: `employees` (via `employeeId`, `managerId`), `departments` (via `departmentId`).
- **[Verified]** **Child / References**: Attendance calculations check this collection to validate check-ins.

### Architectural Category
**[Verified]** **Workflow**. It manages remote work approvals.

### Ultimate Goal
**[Architectural Intent]** To support flexible hybrid schedules and feed remote work location logs to attendance metrics.

### Reason for Separate Collection
**[Architectural Intent]** WFH requests are dynamic transactions with their own approval paths. Storing them inside employee profiles would cause document bloat.

### Architectural Importance
**[Architectural Intent]** Employees working remotely would be marked absent, breaking attendance metrics and requiring manual corrections.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding remote attributes (e.g., remote IP addresses or work logs).
- **[Recommendation]** **Business Service**: Request flows are governed by [wfh_requests.js](file:///E:/Loigmax/Tracker/backend/src/services/wfh_requests.js).

### Policies
- **[Verified]** **Auto-Approval Bounds**: Double-booking requests for overlapping dates is blocked.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Simplifications*: A simple request form. Future releases will integrate WFH requests with task boards to track remote activity.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 31. `comp_off_requests` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Employee Context**: Employee reference (ref), department reference (ref), manager reference (ref).
- **Details**: Worked date, hours worked, reason, expiry date.
- **Workflow State**: Status (Pending, Approved, Rejected, Cancelled), approver comment.

### Business Purpose
**[Verified]** To manage compensatory off requests submitted by employees who worked on holidays or weekly off days. Without it, tracking overtime credits and allocating comp-off days would be manual.

### Business Problem
**[Architectural Intent]** It automates overtime allocations, ensuring employees get leave credits for overtime hours while protecting the organization from incorrect leave accumulations.

### Relationships
- **[Verified]** **Parent**: `employees` (via `employeeId`, `managerId`), `departments` (via `departmentId`).
- **[Verified]** **Child / References**: Successful approvals create credits in `leave_transactions` with a 90-day expiry limit.

### Architectural Category
**[Verified]** **Workflow**. It drives overtime allocations.

### Ultimate Goal
**[Architectural Intent]** To support overtime tracking and balance accrual engines.

### Reason for Separate Collection
**[Architectural Intent]** Comp-off requests require validation of check-in histories for the worked date. Storing this inside leaves would violate boundary separations.

### Architectural Importance
**[Architectural Intent]** Overtime leave allocation would revert to spreadsheets, leading to tracking errors.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When capturing client approval reference codes.
- **[Recommendation]** **Business Service**: Governed by [comp_off_requests.js](file:///E:/Loigmax/Tracker/backend/src/services/comp_off_requests.js).

### Policies
- **[Verified]** **Expiry Rules**: Credit expiration is set to 90 days from the worked date.
- **[Verified]** **Pre-check**: Block requests if check-in logs do not verify attendance on the worked date.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: Verification checks must be run manually by the approver. Automating verification against attendance logs is a recommended enhancement.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 32. `regularizations` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Employee Context**: Employee reference (ref), employee name, department reference (ref), manager reference (ref).
- **Request Details**: Request type, request date, attendance reference (ref).
- **Punches**: Original check-in/out timestamps, requested check-in/out timestamps.
- **Workflow State**: Status (Pending, Approved, Rejected), metaStatus.
- **Approvals Ledger**: Workflow reference (ref), current step index, approvals array (step index, approver reference, approver type, status, comment, actioned timestamp).
- **Resolution Details**: Approved by (ref), approved at, rejected by (ref), rejected at, approver comment.

### Business Purpose
**[Verified]** The `regularizations` collection manages requests to correct missing or incorrect check-in/out logs. Without it, check-in errors or missing check-out entries would permanently lead to incorrect LOP deductions.

### Business Problem
**[Architectural Intent]** It automates attendance adjustments, ensuring employees are not penalized for forgotten punches while keeping an audit log of corrections.

### Relationships
- **[Verified]** **Parent**: `employees` (via `employeeId`, `managerId`, `approvedBy`, `rejectedBy`), `departments` (via `departmentId`), `attendances` (via `attendanceId`), `approvalworkflows` (via `workflowId`).
- **[Verified]** **Child / References**: None.

### Architectural Category
**[Verified]** **Workflow**. It adjusts historical attendance records.

### Ultimate Goal
**[Architectural Intent]** To ensure accurate inputs are sent to the payroll engine.

### Reason for Separate Collection
**[Architectural Intent]** Regularizations represent corrections to historical data. Keeping corrections in a dedicated collection preserves the original logs for audit compliance.

### Architectural Importance
**[Architectural Intent]** Incorrect punch logs could not be adjusted, leading to manual payroll adjustments and employee frustration.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When logging location verification details.
- **[Recommendation]** **Business Service**: Governed by [regularizations.js](file:///E:/Loigmax/Tracker/backend/src/services/regularizations.js).

### Policies
- **[Verified]** **Uniqueness**: Enforces a unique index on `attendanceId`, preventing multiple regularization requests on a single attendance record.
- **[Verified]** **Apply Punch**: Approving a regularization automatically overwrites the check-in/out timestamps on the linked attendance document.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: Overwrites the check-in details. Storing correction versions inside the attendance record itself is a planned enhancement.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 33. `salary_structures` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Employee Context**: Employee reference (ref), version count, created by reference (ref).
- **Period Validity**: Effective from date, effective to date.
- **Monetary Snapshot**: CTC total, overtime rate, ESI applicable flag.
- **Earnings Breakdown**: Earnings array (name, type, amount, taxable flag, proratable flag).
- **Deductions Breakdown**: Deductions array (name, type, amount, ceiling limit).
- **Statutory Details**: PF employee percentage, PF ceiling limit.

### Business Purpose
**[Verified]** The `salary_structures` collection tracks salary structures, CTC values, and tax rules for each employee. Without it, the payroll engine could not calculate dynamic earnings, deductions, or statutory contributions (PF/ESI).

### Business Problem
**[Architectural Intent]** It standardizes compensation components, tracks salary progression historically, and automates tax deductions.

### Relationships
- **[Verified]** **Parent**: `employees` (via `employeeId`, `createdBy`).
- **[Verified]** **Child / References**: Queried by the payroll engine during payroll runs to process payouts.

### Architectural Category
**[Verified]** **Financial**. It defines core payroll parameters.

### Ultimate Goal
**[Architectural Intent]** To drive salary calculations, compliance reporting, and tax structures.

### Reason for Separate Collection
**[Architectural Intent]** Salary structures change over time (e.g. annual appraisals). Storing structures in a dedicated collection with validity dates preserves historical salary records.

### Architectural Importance
**[Architectural Intent]** The payroll engine could not calculate salary components, and salary histories would be lost.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding global salary components (e.g., transport allowances).
- **[Recommendation]** **Business Service**: Hook validations are managed in [salary_structures.js](file:///E:/Loigmax/Tracker/backend/src/services/salary_structures.js).

### Policies
- **[Verified]** **Temporal Alignment**: Saving a new version automatically updates the `effectiveTo` date of the previous version.
- **[Verified]** **Locked Run Freeze**: Salary structures cannot be modified if linked to a processed payroll run.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Architectural Intent]** *Limitations*: The structures define simple calculations. Dynamic formulas based on variables are a recommended future extension.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 34. `approvalworkflows` Collection

### Key Field Groups (UI-Friendly Overview)
(UI-Friendly Overview)
- **Definition Context**: Model name (enum: leaves, regularizations, assets_allocations, assets_incidents), department reference (ref), active status flag.
- **Steps Matrix**: Steps array (step order, approver type (enum), specific role reference (ref), specific user reference (ref), timeout days).

### Business Purpose
**[Verified]** The `approvalworkflows` collection defines step-by-step routing paths for transaction approvals. Without it, transaction routing (e.g. leaves, regularizations) would be hardcoded in backend endpoints.

### Business Problem
**[Architectural Intent]** It allows organizations to modify approval paths (e.g., adding an HR step or manager validation step) without modifying codebase files.

### Relationships
- **[Verified]** **Parent**: `departments` (via `departmentId`).
- **[Verified]** **Child / References**: Referenced by `leaves`, `regularizations`, and `assets_allocations` to retrieve approval steps.

### Architectural Category
**[Verified]** **Workflow**. It configures approval processes.

### Ultimate Goal
**[Architectural Intent]** To support dynamic approval chains and automated timeout escalation paths.

### Reason for Separate Collection
**[Architectural Intent]** Workflows are shared across departments and models. Separating them allows real-time modifications without modifying user records.

### Architectural Importance
**[Architectural Intent]** Multi-step transaction routing would break, forcing a fallback to a hardcoded reporting manager approval model.

### Business Lifecycle
UNKNOWN

### Entry Points
UNKNOWN

### Source of Truth
UNKNOWN

### Consumers
UNKNOWN

### Runtime Path
UNKNOWN

### Extension Guidelines
- **[Recommendation]** **Add Fields Here**: When adding workflow parameters (e.g., approval amount thresholds).
- **[Recommendation]** **Business Service**: Workflows are parsed by workflow services.

### Policies
- **[Verified]** **Uniqueness Index**: Enforces a unique index on the combination of `modelName` and `departmentId`.

### Known Constraints
UNKNOWN

### Future Recommendations
- **[Recommendation]** *Performance*: Indexed fields ensure fast lookup times during transaction creation.

### ADR References
UNKNOWN

### Related Services
UNKNOWN

### Related Modules
UNKNOWN

### UI Forms
UNKNOWN

### Approval Workflow
UNKNOWN

### Reports
UNKNOWN

### Notifications
UNKNOWN

### Dependency Graph
UNKNOWN

## 35. Master Registries, Logs, & Sub-entity Configurations

The following master lookup registries, runtime log, and sub-entity collections serve specialized support roles in the platform and are documented concisely under the unified metadata contract.

### 1. `agents` & `AgentToken` (`Agent.js`, `AgentToken.js`)
* **[Verified]** **Category**: Registry / Operational.
* **[Verified]** **Key Field Groups**: Agent ID, name, email, contact phone, linked client reference (ref), credentials block (hashed password, session token, session expiry date, login attempts, locked until date).
* **[Architectural Intent]** **Why it exists**: Manages profiles and dynamic session auth tokens of external client agents who log in to access customer support ticket dashboards.

### 2. `activity_logs` & `api_hit_logs` (`ActivityLog.js`, `ApiHitLog.js`)
* **[Verified]** **Category**: Historical / Configuration.
* **[Verified]** **Key Field Groups**: Model, document ID reference, user reference (ref), route hit path, duration, payload snapshot, timestamp.
* **[Architectural Intent]** **Why it exists**: Records general activity and API endpoint response times for system-wide auditing and performance bottleneck detection.

### 3. `time_tracker_sessions` (`time_tracker_session.js`)
* **[Verified]** **Category**: Historical.
* **[Verified]** **Key Field Groups**: Task reference (ref), employee reference (ref), task type reference (ref), start time, end time, duration (seconds), description notes.
* **[Architectural Intent]** **Why it exists**: Records active developer work session intervals, tracking precise times spent on task board items.

### 4. `assets_categories` & `assets_vendors` & `products` (`AssetCategory.js`, `AssetVendor.js`, `products.js`)
* **[Verified]** **Category**: Registry.
* **[Verified]** **Key Field Groups**: Category name, code, vendor name, email, phone, product name, status (Active/Inactive).
* **[Architectural Intent]** **Why it exists**: Serves as lookup registers for physical asset configurations, procurement vendors, and client-purchased product software modules.

### 5. `assets_incidents` & `assets_repairs` (`AssetIncident.js`, `AssetRepair.js`)
* **[Verified]** **Category**: Workflow / Operational.
* **[Verified]** **Key Field Groups**: Asset reference (ref), employee reference (ref), incident type (Damage/Loss), description, repairs cost, repair status (Pending, Under Repair, Completed).
* **[Architectural Intent]** **Why it exists**: Manages workflows for tracking lost or broken hardware and coordinates vendor servicing for damaged devices.

### 6. `assets_purchases` & `assets_invoices` & `assets_payments` & `assets_stock_ledgers` (`AssetPurchase.js`, `AssetInvoice.js`, `AssetPayment.js`, `AssetStockLedger.js`)
* **[Verified]** **Category**: Financial / Historical.
* **[Verified]** **Key Field Groups**: Vendor reference (ref), purchase order number, total amount, invoice number, payment status, transaction reference, stock ledger changes.
* **[Architectural Intent]** **Why it exists**: Coordinates financial procurement cycles for physical hardware assets and maintains a historical ledger of available stock.

### 7. `attendance_policies` & `holidays` (`AttendancePolicy.js`, `Holiday.js`)
* **[Verified]** **Category**: Registry.
* **[Verified]** **Key Field Groups**: Policy name, full/half-day hours limits, grace minutes, late mark thresholds, weekly off days, holiday calendar entries.
* **[Architectural Intent]** **Why it exists**: Configures business check-in rules, overtime boundaries, and regional calendar holidays for attendance calculations.

### 8. `comments_threads` (`comments_threads.js`)
* **[Verified]** **Category**: Workflow.
* **[Verified]** **Key Field Groups**: Parent model key (e.g. tasks/tickets), document reference (ref), participants array (ref), comments count, last commented at.
* **[Architectural Intent]** **Why it exists**: Links dynamic commentary threads to task boards or tickets, routing mentions to FCM notifier hooks.

### 9. `daily_activities` (`DailyActivity.js`)
* **[Verified]** **Category**: Historical.
* **[Verified]** **Key Field Groups**: Employee reference (ref), activity date, status reports array (activity text, duration, task type, validated flag).
* **[Architectural Intent]** **Why it exists**: Stores daily status updates logged by employees, supplying timesheet data to managers.

### 10. `dashboard_widgets` & `sidebars` (`DashboardWidget.js`, `SideBar.js`)
* **[Verified]** **Category**: Configuration.
* **[Verified]** **Key Field Groups**: User role reference (ref), sidebar links array (name, path, icon), dashboard widget grids (widget ID, x/y coordinates).
* **[Architectural Intent]** **Why it exists**: Defines role-based UI templates, links, and grid locations loaded dynamically by the React frontend.

### 11. `expenses` (`Expense.js`)
* **[Verified]** **Category**: Financial / Workflow.
* **[Verified]** **Key Field Groups**: Employee reference (ref), expense category, amount, claim date, status (Pending, Approved, Rejected), approvals ledger.
* **[Architectural Intent]** **Why it exists**: Manages reimbursement claims for travel, client visits, or materials, routing them to finance.

### 12. `feed_channels` & `feed_comments` & `feed_groups` (`FeedChannel.js`, `FeedComment.js`, `FeedGroup.js`)
* **[Verified]** **Category**: Operational.
* **[Verified]** **Key Field Groups**: Channel title, comment content, author reference (ref), private group members array (ref).
* **[Architectural Intent]** **Why it exists**: Stores sub-entities, comments, and visibility cohorts that power the Social Communication Hub (Feed).

### 13. `leave_transactions` (`LeaveTransaction.js`)
* **[Verified]** **Category**: Historical.
* **[Verified]** **Key Field Groups**: Employee reference (ref), leave type reference (ref), transaction type (Credit/Debit/Rollover), quantity, source record (ref).
* **[Architectural Intent]** **Why it exists**: Maintains a ledger of leave credit accruals and debits, supplying balances to time-off requests.

### 14. `notifications` & `notification_preferences` & `NotificationReceptionist` (`notification.js`, `NotificationPreference.js`, `NotificationReceptionist.js`)
* **[Verified]** **Category**: Operational.
* **[Verified]** **Key Field Groups**: Recipient reference (ref), message text, read status, channel preference flags (Email/Push), push retry logs.
* **[Architectural Intent]** **Why it exists**: Powers system alerts, storing user preferences and tracking push delivery statuses.

### 15. `status_configss` & `status_mappings` (`status_configs.js`, `status_mapping.js`)
* **[Verified]** **Category**: Configuration.
* **[Verified]** **Key Field Groups**: Model name, status values list, transition rules matrix.
* **[Architectural Intent]** **Why it exists**: Configures state transitions for workflow models, validating moves between states.

### 16. `ticket_comments` & `ticket_comment_reads` & `ticket_attachments` & `ticket_activity_logs` & `ticket_assignments` & `ticket_participants` & `ticket_status_history` (`TicketComment.js` etc.)
* **[Verified]** **Category**: Workflow / Historical.
* **[Verified]** **Key Field Groups**: Ticket reference (ref), attachment files list, assignees array (ref), status history steps list, commentary text.
* **[Architectural Intent]** **Why it exists**: Manages helpdesk interactions, file attachments, and assignment changes for the Support Ticketing System (Tickets).



