---
Purpose: Document references, dependencies, and change impacts between shared MongoDB collections.
Audience: Database Administrators, Integration Engineers, and Backend Developers.
Status: IMPLEMENTED
Related Documents:
  - [System Architecture Guide](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/SYSTEM_ARCHITECTURE_GUIDE.md)
  - [Collections Reference](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/COLLECTIONS_REFERENCE.md)
Owner: Database Administrator
Last Review: 2026-06-27
Architecture Version: 2.2.0
---

# System Module Dependencies: Shared Collections Encyclopedia

This document serves as the dependency registry for all cross-collection references in the Tracker database. It details database reference mapping, ownership models, runtime dependencies, and impact analysis guidelines.

---

## 1. Dependency Encyclopedia (Reference Mapping)

### 1.1 Inbound & Outbound Reference Graph

The table below maps the structural relationships between collections.

| Target Model | Inbound References (Referenced By) | Outbound References | Shared Ownership / Consumers |
| :--- | :--- | :--- | :--- |
| `employees` | `Attendance`, `comments_threads`, `DailyActivity`, `Leave`, `notifications`, `NotificationReceptionist`, `Regularization`, `Session`, `Tasks`, `Ticket`, `Todo`, `Asset`, `AssetAllocation`, `AssetIncident`, `AssetRepair`, `AssetCategory`, `AssetPurchase`, `AssetStockLedger`, `FeedPost`, `FeedComment`, `FeedGroup`, `FeedChannel`, `TicketComment`, `TicketCommentRead`, `EmployeeLifecycleHistory` | `departments` (department), `designations` (designation), `roles` (role), `employees` (manager), `leave_policies` (leavePolicyOverride), `salary_structures` (salaryStructure) | Owned by HR Module; consumed by all transactional, payroll, and authorization systems. |
| `employee_life_cycle_histories` | None (Audit Timeline UI, Reporting) | `employees` (employeeId, changedBy) | Career lifecycle audit timeline owned by HR Module; immutable audit log. |
| `salary_structures` | `Employee`, `Payroll`, `PayrollRun` | `employees` (employeeId, createdBy) | Versioned salary package structures owned by Payroll & HR Module. |
| `departments` | `Employee`, `Agent`, `Leave`, `Regularization`, `SideBar`, `AssetAllocation`, `AssetIncident`, `Ticket`, `LeavePolicy` | `leave_policies` (leavePolicy), `attendance_policies` (attendancePolicy), `employees` (manager), `designations` (designations) | Managed by HR Masters; consumed by Attendance, Payroll, and Ticketing routing. |
| `roles` | `access_policies`, `Employee`, `LeavePolicy` | None | Owned by Security Core; consumed by authorization checks and menus. |
| `status_configss` | `Tasks`, `Tickets`, `Expenses`, `Leaves`, `Regularizations`, `daily_activities`, `HRPolicies` | None | Central configuration registry; consumed by frontend workflows to render labels/colors. |
| `status_mappings` | `ticketTaskSync.js` | None | Synchronization router; maps tasks to tickets to coordinate state changes. |
| `clients` | `Agent`, `DailyActivity`, `Expense`, `Tasks`, `Ticket` | None | Client portal registries; consumed by Project Tracking and Billing systems. |
| `leave_types` | `Attendance`, `Employee`, `Leave`, `LeavePolicy` | None | HR policies config; consumed by attendance logs and payroll calculations. |
| `project_types` | `Client`, `DailyActivity`, `Tasks`, `Ticket` | None | Project registries; consumed by Task board and time tracking. |

---

## 2. Dynamic Status & Workflow State System

All workflow models carry two status fields to decouple operational workflow positions from record lifecycles.

### Field Definitions
1. **`status`**: Represents the operational position of a record in its workflow (e.g., *Pending*, *In Progress*, *Resolved*, *Closed*). Governed by `status_configss.workflowStatuses`.
2. **`metaStatus`**: Represents the system-wide record state (e.g., *active*, *inactive*, *draft*, *archive*, *deleted*). Governed by `status_configss.metaStatuses`.

### Workflow Status Mapping Matrix

| Model Name | Target Collection | Default `status` | Default `metaStatus` | Action Hook / Consumers |
| :--- | :--- | :--- | :--- | :--- |
| `tasks` | `tasks` | Backlogs | active | `ticketTaskSync.js` / Kanban board |
| `tickets` | `tickets` | Open | active | `ticketSocketEmitter.js` / Client portal |
| `expenses` | `expenses` | pending | active | `payrollEngine.js` / Finance audit |
| `leaves` | `leaves` | Pending | active | `attendanceService.js` / HR approvals |
| `regularizations` | `regularizations` | Pending | active | `attendanceService.js` / Clock-in corrections |
| `daily_activities` | `daily_activities` | Pending | active | Time tracker sessions |
| `hrpolicies` | `hrpolicies` | Draft | active | Global Employee Portal |

---

## 3. Relational Impact & Dependency Analysis

Modifying or deleting documents in parent collections has direct consequences on downstream runtime engines.

### 3.1 Role Modification Impact
- **Runtime Dependency**: Access tokens and route guards resolve authorizations via `professionalInfo.role` lookup.
- **Impact of Deletion**: Deleting a role breaks active access tokens. Access checks fail closed (ADR-005), locking users out of the system.
- **Safety Rule**: Block role deletions if active policy matrices or active employee profiles reference the role ID.

### 3.2 Department Deletion Impact
- **Runtime Dependency**: Payroll, leave allocations, and shift roster calculations populate department policies to compute ratios.
- **Impact of Deletion**: Orphaned department IDs on employees cause policy resolution crashes inside `payrollEngine.js` or `attendanceService.js`.
- **Safety Rule**: Block department deletion if active employee profiles, asset allocations, or workflow tickets reference the department ID.

### 3.3 Employee Status Change Impact
- **Runtime Dependency**: Workflow assignments (e.g. assigned developer, reporting manager) rely on active employee profiles.
- **Impact of Status Change**: Transitioning an employee to `Terminated` or `Inactive` must invalidate active sessions, lock credentials, and halt notifications.
- **Safety Rule**: Block employee inactivation if active asset allocations exist (enforced by exit clearance service gates).
