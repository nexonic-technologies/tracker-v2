# Backend Architecture Audit Log & Technical Debt Inventory

This document serves as the master tracking log for architectural refactoring, misplaced files, redundant hooks, and anti-patterns identified in the Tracker Backend codebase.

---

## 1. 🧹 Misplaced Utility Classes in `/src/services/`

The `/src/services/` directory is reserved **STRICTLY for 1-to-1 Mongoose Model Lifecycle Hooks** returning `{ beforeCreate, afterCreate, beforeUpdate, afterUpdate, beforeDelete, afterDelete }`. 

The following **27 non-hook utility files** pollute `/src/services/` and must be relocated to `/src/utils/` or `/src/services/business/`:

| File Name | Current Location | Recommended Target Location | Description |
| :--- | :--- | :--- | :--- |
| `AgentInviteService.js` | `/src/services/` | `/src/utils/mail/` | Ad-hoc email invitation class. Consolidate into generic `EmailService`. |
| `activityService.js` | `/src/services/` | `/src/utils/activityService.js` | Activity logging & timeline class. |
| `assetHooksService.js` | `/src/services/` | `/src/services/business/assetDomainHelper.js` | Shared asset ledger & GRN domain helper. |
| `authService.js` | `/src/services/` | `/src/utils/authService.js` | Auth helper functions. |
| `cacheService.js` | `/src/services/` | `/src/utils/cacheService.js` | Cache management utility. |
| `cbacCacheService.js` | `/src/services/` | `/src/utils/cbacCacheService.js` | CBAC cache manager. |
| `cbacResolutionService.js` | `/src/services/` | `/src/utils/cbacResolutionService.js` | CBAC capability resolution helper. |
| `computationService.js` | `/src/services/` | `/src/services/business/computationService.js` | Business computation utility. |
| `dashboardService.js` | `/src/services/` | `/src/services/business/dashboardService.js` | Dashboard analytics aggregator. |
| `databaseIndexer.js` | `/src/services/` | `/src/utils/databaseIndexer.js` | Database index initialization utility. |
| `domainEventService.js` | `/src/services/` | `/src/utils/domainEventService.js` | Event bus / event emitter. |
| `dynamicNotificationDispatcher.js` | `/src/services/` | `/src/utils/notification/` | Notification dispatcher. |
| `exportService.js` | `/src/services/` | `/src/utils/exportService.js` | CSV/Excel export helper. |
| `fcmService.js` | `/src/services/` | `/src/utils/notification/fcmService.js` | Push notification service. |
| `jobQueue.js` | `/src/services/` | `/src/utils/jobQueue.js` | Job queue manager. |
| `menuVisibilityService.js` | `/src/services/` | `/src/utils/menuVisibilityService.js` | Navigation menu visibility helper. |
| `milestoneService.js` | `/src/services/` | `/src/services/business/milestoneService.js` | Project milestone calculator. |
| `NotificationDispatcher.js` | `/src/services/` | `/src/utils/notification/` | Dispatcher utility. |
| `asyncNotificationService.js` | `/src/services/` | `/src/utils/notification/` | Async notification worker. |
| `payrollEngine.js` | `/src/services/` | `/src/services/business/payrollEngine.js` | Pure payroll calculation & attendance summary engine. Not a 1-to-1 model lifecycle hook. |
| `pdfService.js` | `/src/services/` | `/src/utils/pdfService.js` | PDF generation utility. |
| `policySeedingService.js` | `/src/services/` | `/src/utils/policySeedingService.js` | Policy seeding utility. |
| `raceConditionHandler.js` | `/src/services/` | `/src/utils/raceConditionHandler.js` | Concurrency lock manager. |
| `readReceiptsService.js` | `/src/services/` | `/src/utils/readReceiptsService.js` | Message read receipt helper. |
| `reportService.js` | `/src/services/` | `/src/services/business/reportService.js` | Report aggregator service. |
| `requestQueue.js` | `/src/services/` | `/src/utils/requestQueue.js` | API request queue manager. |
| `salaryRevisionService.js` | `/src/services/` | `/src/services/business/salaryRevisionService.js` | Payroll revision helper. |
| `taskAnalytics.js` | `/src/services/` | `/src/services/business/taskAnalytics.js` | Task analytics aggregator. |
| `taskStatus/taskStatusService.js` | `/src/services/taskStatus/` | `/src/services/business/attendanceCheckoutHelper.js` | Employee checkout task-pause helper. Belongs in business services. |
| `taskStatus/taskStatusRules.js` | `/src/services/taskStatus/` | **Delete** | Redundant wrapper for hardcoded status arrays. |
| `taskStatus/taskStatusConstants.js` | `/src/services/taskStatus/` | **Delete** | Hardcoded status string constants violating anti-hardcode law. |

---

## 2. ⚡ Redundant & Zero-Logic Hook Files in `/src/services/`

| File Name | Issue Identified | Status / Resolution |
| :--- | :--- | :--- |
| `accesspolicies.js` | Created solely for role version bumping & cache flushes. | **Refactored**: Version bumping moved to generic `processGenericVersionInvalidation` pipeline in `populateHelper.js`. |
| `grants.js` | Created solely for role version bumping & cache flushes. | **Refactored**: Version bumping moved to generic `processGenericVersionInvalidation` pipeline in `populateHelper.js`. |
| `roles.js` | `afterUpdate` duplicated role version bumping. | **Refactored**: Removed redundant `afterUpdate` (retained `isSuperAdmin` privilege escalation guards). |
| `assetinvoices.js` | Set `status = 'Pending'`, which is already defined natively in `AssetInvoice.js` Mongoose schema (`default: 'Pending'`). | **Marked for Removal**: Zero domain logic; redundant with schema defaults. |

---

## 3. 🛠️ CRUD Builder Audit (`/src/crud/`)

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `buildEscalateQuery.js` | Orphaned non-standard CRUD builder. Only referenced in a test script. Live system uses `EscalationCron.js` / `approvalEngine.js`. | **Marked for Removal**: Keep `/src/crud/` strictly limited to standard CRUD operations. |
| `buildCreateQuery.js` | Repeated permission check `if (!policy?.permissions?.create)`. | **Refactored**: `policyEngine.js` evaluates security fail-closed prior to dispatching. |
| `buildReadQuery.js` | Repeated permission check `if (!policy?.permissions?.read)`. | **Refactored**: `policyEngine.js` evaluates security fail-closed prior to dispatching. |
| `buildUpdateQuery.js` | Repeated permission check `if (!policy?.permissions?.update)`. | **Refactored**: `policyEngine.js` evaluates security fail-closed prior to dispatching. |
| `buildDeleteQuery.js` | Repeated permission check `if (!policy?.permissions?.delete)`. | **Refactored**: `policyEngine.js` evaluates security fail-closed prior to dispatching. |
| `buildReportQuery.js` | Repeated permission check `if (!policy?.permissions?.read)`. | **Refactored**: `policyEngine.js` evaluates security fail-closed prior to dispatching. |

---

## 4. 🗂️ Legacy Hardcoded Config Files

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/Config/pageCapabilityMapping.js` | Hardcoded route-to-string file. | **Deprecate**: Replaced by dynamic MongoDB `SideBar` ➔ `Capability` database relationships and `/auth/me/context` engine. |
| `Backend/src/services/taskStatus/taskStatusConstants.js` | Hardcodes task status strings (`'working'`, `'doing'`, `'processing'`, etc.) and active status arrays in static JS. | **Marked for Deletion**: Violates anti-hardcode law. Status definitions and active/terminal flags belong strictly in dynamic MongoDB `status_configs` / `status_mappings`. |

---

## 5. 🎯 Frontend Component Engine

| Component | Target Location | Purpose |
| :--- | :--- | :--- |
| `RouteCapabilityGuard.jsx` | `/src/components/` | Intercepts manual page URL entry in `BaseLayout.jsx` and checks route capabilities dynamically against DB context. |
| `PolicyGuard.jsx` | `/src/components/` | Declarative container component evaluating capability gates. |
| `ActionButton.jsx` | `/src/components/` | Drop-in action button for pages (`create`, `edit`, `delete`), enforcing capability checks and Workhub ERP design system tokens. |

---

## 6. 🌐 Global Singleton Registries vs Tenant Context

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/utils/appRegistry.js` | Global in-memory singleton object (`registry = { models, services }`). | **Refactor to Pure Pass-Through**: In a multi-tenant SaaS architecture, all model lookups must delegate 100% to `tenantContext` / `getTenantModel()` to prevent cross-tenant memory leaks. Eliminate global `registry` state. |

---

## 7. 📜 Central Pipeline Audit Logging vs Manual Service Calls

| File / Component | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/utils/auditLogger.js` | `saveAuditLog()` was called manually & inconsistently across `tasks.js`, `payments.js`, `orderacknowledgments.js`, `buildUpdateQuery.js`, and `buildDeleteQuery.js` (and missing in `buildCreateQuery.js`). | **Integrate into Populate Pipeline**: Move audit logging into a default pipeline execution step inside `populateHelper.js` / CRUD Builders. Automatically record `beforeDoc`, `afterDoc`, `action`, and `userId` for all mutations centrally without ad-hoc code in service files. |

---

## 8. 🔍 Schema Single Source of Truth for Database Indexes

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/services/databaseIndexer.js` | 300-line hardcoded indexer class in `/src/services/` hardcoding index fields for 15+ models (`employees`, `tasks`, `attendances`, `leaves`). | **Marked for Removal**: Index definitions MUST live strictly inside Mongoose Model Schemas (`/src/models/`). Multi-tenant index syncing is executed generically by `utils/databaseIndexer.js` (`model.syncIndexes()`). |

---

## 9. 🛡️ Validator.js vs policyEngine.js & Sanitizer Duplication

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/utils/Validator.js` | Completely redundant utility. Re-implements `bodyValidator`, `fieldsValidator`, `filterValidator` duplicating what `sanitizeRead.js`, `sanitizeWrite.js`, `sanitizeUpdate.js`, and `sanitizePopulated.js` already do natively. Also adds a 3rd duplicate permission re-check and hardcoded model flags (`isLeave`, `isSalary`). | **Marked for Removal**: Delete `Validator.js`. Rely 100% on `policyEngine.js` for security validation and the 4 dedicated `sanitize*.js` utilities inside the CRUD builders. |

---

## 10. ⏰ Shift Schedule Resolution & Unimported Reference Bugs

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/utils/shiftResolver.js` | Abandoned, broken duplicate file. Calls `getTenantModel('ShiftAssignment')` without importing `getTenantModel` (throws `ReferenceError`). Zero production imports across the codebase (active shift resolution is handled by `utils/availability/shiftResolver.js`). | **Marked for Deletion**: Safe to delete completely (dead code). Shift schedule logic is centralized in `utils/availability/shiftResolver.js`. |

---

## 11. 🔐 Session Cleanup Utility vs AuthController Logout & TTL Indexes

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/utils/sessionCleanup.js` | Zero imports across the codebase. `AuthController.js` (lines 554–566) natively handles deactivating user sessions on logout (`status: 'DeActive'`), and MongoDB TTL indexes on `sessions` automatically purge stale sessions after inactivity. | **Marked for Deletion**: Delete `sessionCleanup.js` completely (dead code). Session deactivation is handled natively by `AuthController.logout`, and TTL auto-cleanup is handled by MongoDB schema indexes. |

---

## 12. 🧪 Test Scripts in `/src/utils/` & Server Boot Side-Effects

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/utils/securityIntegrationTest.js` | Integration test script with hardcoded ObjectId strings (`"68d8b98af397d1d97620ba97"`). Placed in `/src/utils/` and executed on production server boot in `index.js:498`. | **Move to `/src/scripts/` & Remove Server Boot Call**: Relocate test script to `Backend/src/scripts/test-security.js` so it runs via CLI (`npm run test:security`). Remove execution side-effect from `index.js` server startup. |

---

## 13. ⚙️ Domain Business Engines in `/src/utils/`

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/utils/scheduleETARecalculation.js` | Core task queue & ETA domain engine placed in `/src/utils/`. Consumed across `tasks.js`, `tickets.js`, `employeetaskqueues.js`, `attendances.js`, and `ganttRoutes.js`. | **Relocate to Business Services**: Move from root `/src/utils/` to `/src/services/business/etaEngine.js` so task queue business logic resides cleanly in domain service space. |

---

## 14. 🔑 ABAC Registry Executor Placement

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/utils/registryExecutor.js` | ABAC condition evaluator (`runRegistry`) executing dynamic rules (`isSelf`, `isManager`, `isAssigned`, `isCreatedBy`). Placed in root `/src/utils/` while its registry rules live in `/src/utils/policy/registry/`. | **Relocate to Policy Engine**: Move `registryExecutor.js` to `/src/utils/policy/registryExecutor.js` alongside `policyEngine.js` for clean security module cohesion. |

---

## 15. 📲 Push Notification Fragmentation & Queue Safety

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/utils/pushSender.js` | Obsolete Expo push batcher (`exp.host`). Mobile app uses **Flutter** (not Expo) which receives FCM push notifications. | **Marked for Deletion**: Safe to delete completely (obsolete Expo legacy code). All Flutter mobile push notifications use **FCM** via `fcmService.js` & `JobQueue`. |
| `Backend/src/utils/ProviderRegistry.js` | Isolated provider registry class with 0 external imports across the codebase. Registers obsolete `expo` push handler. | **Marked for Deletion**: Delete `ProviderRegistry.js`. Consolidate active notification channels (Socket.io, FCM, Email) under `/src/utils/notification/`. |

---

## 16. 🔔 Notification Service Hardcoding & Dual Dispatcher Fragmentation

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/utils/notificationService.js` | 1) Hardcodes `ALLOWED_TYPES` & `TYPE_MAPPING` strings (`attendance_request`, `leave_request`, `assets_*`), forcing code edits for every new model type. 2) Imports obsolete `pushSender.js` (Expo). 3) Creates split dispatching (`useDynamicNotifications` bypass check vs legacy inline dispatch). | **Consolidate into Dynamic Notification Engine**: Replace hardcoded `TYPE_MAPPING` & `ALLOWED_TYPES` with dynamic Mongoose schema enum validation. Remove obsolete `pushSender.js` import. Merge into `/src/utils/notification/notificationEngine.js` for single unified dispatching. |

---

## 17. 🛡️ Policy Engine Directory Audit (`/src/utils/policy/`)

| File Name | Audit Finding | Resolution |
| :--- | :--- | :--- |
| `Backend/src/utils/policy/todos.js` | Hardcoded static policy JSON file for `todos`. Zero imports across the codebase. Violates database-driven policy rule (`access_policies` collection). | **Marked for Deletion**: Delete `todos.js` completely (dead code). All model policies are stored dynamically in MongoDB `access_policies`. |
| `Backend/src/utils/policy/index.js` | 3-line comment placeholder with 0 exports or imports. | **Marked for Deletion**: Delete `index.js` placeholder (dead code). |
| `Backend/src/utils/policy/policyEngine.js` | Core security controller (`buildQuery`). Evaluates permissions, `isSuperAdmin` schema boolean, and dispatches to CRUD builders. | **Keep & Protect**: Primary security gatekeeper for Gate 2 (ABAC & policy checks). |
| `Backend/src/utils/policy/registry/` | Directory containing dynamic ABAC rules (`isSelf.js`, `isManager.js`, `isAssigned.js`, `isCreatedBy.js`). | **Keep & Consolidate**: Relocate `registryExecutor.js` here so all ABAC rule execution lives cohesively in this directory. |

---

## 18. 📐 Strict Rule: Model Lifecycle Hook Naming Law (`/src/services/`)

| Naming Pattern | Pipeline Behavior | Architectural Rule |
| :--- | :--- | :--- |
| `<modelName>.js` (e.g. `employees.js`, `tickets.js`, `tasks.js`) | **MATCHED BY PIPELINE**: `servicesCache.js` maps `<modelName>` to the database collection. Lifecycle hooks (`beforeCreate`, `afterUpdate`) fire automatically on CRUD mutations. | **ALLOWED IN `/src/services/`**: Standard 1-to-1 model lifecycle hook files ONLY. |
| `*Service.js`, `*Engine.js`, `*Dispatcher.js`, `*Emitter.js`, `*Sync.js` (e.g. `activityService.js`, `AgentInviteService.js`, `payrollEngine.js`) | **IGNORED BY PIPELINE**: The Populate Pipeline never invokes these as lifecycle hooks because no database collection matches `activityService` or `AgentInviteService`. | **FORBIDDEN IN ROOT `/src/services/`**: Must be relocated to `/src/services/business/` or `/src/utils/`. |

---

## 19. 🧠 Relocation of System Cache & CBAC Engines out of `/src/services/`

| File Name | Current Location | Target Location | Purpose & Architectural Justification |
| :--- | :--- | :--- | :--- |
| `cacheService.js` | `/src/services/cacheService.js` | `/src/utils/cacheService.js` | Core Redis + Memory cache client wrapper. Belongs in `/src/utils/`. |
| `cbacCacheService.js` | `/src/services/cbacCacheService.js` | `/src/utils/cbacCacheService.js` | CBAC capability & navigation cache manager. Belongs in `/src/utils/`. |
| `cbacResolutionService.js` | `/src/services/cbacResolutionService.js` | `/src/utils/cbacResolutionService.js` | Capability resolution engine (`resolveUserCapabilities`). Belongs in `/src/utils/`. |

---

## 20. ⚙️ Central Pipeline Auto-Stamping vs Service Hook Laws

| Reference Example | File Name | Category | Architectural Rule |
| :--- | :--- | :--- | :--- |
| **✅ POSITIVE EXEMPLAR** | `Backend/src/services/contacts.js` | **Real Domain Business Hook** | **MODEL SERVICE GOAL**: Contains actual domain business logic (automates CRM lead-to-client conversion, stamps interaction state, handles post-commit side effects in `afterUpdate`). This is the standard for when a `/src/services/` hook file MUST exist. |
| **✅ STATE-MACHINE AUDIT STAMP** | `Backend/src/services/payrolls.js` | **State-Machine Transition Audit** | **VALID SERVICE HOOK PATTERN**: Setting `approvedBy = userId`, `approvedAt = new Date()`, `frozenAt = new Date()` inside conditional state checks (`status === 'Approved'`) MUST remain in backend service hooks to prevent frontend actor impersonation & timestamp spoofing. |
| **❌ NEGATIVE ANTI-PATTERN** | `Backend/src/services/crmactivities.js` | **Trivial Auto-Stamp Hook** | **ANTI-PATTERN (MARK FOR DELETION)**: Created solely to set `timestamp = new Date()` and `performedBy = userId`. The Populate Pipeline (`buildCreateQuery.js`) & Mongoose schema defaults handle auto-stamping natively. Do NOT create service files for this. |

---

## 21. 🧹 Inventory of Trivial Auto-Stamp Service Hooks (Marked for Deletion)

| File Name | Current Contents | Resolution |
| :--- | :--- | :--- |
| `Backend/src/services/crmactivities.js` | Auto-stamps `timestamp` & `performedBy`. | **Delete**: Handled natively by Mongoose schema defaults & pipeline auto-stamping. |
| `Backend/src/services/dailyactivities.js` | Auto-stamps `timestamp`. | **Delete**: Handled natively by Mongoose schema defaults & pipeline auto-stamping. |
| `Backend/src/services/hrpolicies.js` | Minor default assignment. | **Delete**: Handled natively by Mongoose schema defaults & pipeline auto-stamping. |
| `Backend/src/services/notificationpreferences.js` | Zero domain logic. | **Delete**: Handled natively by Mongoose schema defaults & pipeline auto-stamping. |
| `Backend/src/services/notificationrules.js` | Zero domain logic. | **Delete**: Handled natively by Mongoose schema defaults & pipeline auto-stamping. |

---

## 22. 🏦 Payroll Module Service Hook & Tenant Context Audit

| File Name | Audit Finding | Recommended Resolution |
| :--- | :--- | :--- |
| `Backend/src/services/payrolls.js` | **Valid Domain Hook**, but contains two context propagation anti-patterns:<br>1. Static model imports (`await import('../models/Payroll.js')`) bypass `ctx.tenantContext`, risking connection loss in multi-tenant mode.<br>2. Calls `payrollEngine.computePayrollPayload(...)` passing scalar primitives (`employeeId, month, year, userId`) without forwarding `ctx`/`tenantContext`. | **Refactor**: Keep `payrolls.js` as the valid domain hook for `payrolls` collection. Update model resolution to use `ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('Payroll') : Payroll` and forward `ctx` into `payrollEngine` calls for multi-tenant isolation. |

---

## 23. 🗂️ Task Status Subdirectory & Hardcoding Audit (`/src/services/taskStatus/`)

| File Name | Audit Finding | Recommended Resolution |
| :--- | :--- | :--- |
| `taskStatusConstants.js` | Hardcodes 15+ status strings (`'working'`, `'doing'`, `'processing'`, `'Hold'`) and active status arrays. | **Delete**: Violates anti-hardcode law. Status keys and `isTerminal`/`isSequential` flags belong strictly in dynamic MongoDB `status_configs` / `status_mappings`. |
| `taskStatusRules.js` | 33-line trivial wrapper class around `ACTIVE_TASK_STATUSES.includes()`. | **Delete**: Over-abstraction bloat. |
| `taskStatusService.js` | Rogue singleton in `/src/services/taskStatus/` (violates 1-to-1 model hook directory law). Uses static model imports (`models.tasks`) bypassing `tenantContext`. Has path syntax typo on line 6 (`.TimeTrackerSessions.js`). | **Relocate & Refactor**: Move `handleEmployeeCheckout` to `/src/services/business/attendanceCheckoutHelper.js`. Query `status_configs` dynamically for active task statuses and use `tenantContext` model isolation. |

---

## 24. 🛣️ Unused & Zero-Consumer Route Files Audit (`/src/routes/`)

| File Name | Current Status in `index.js` | Audit Finding | Recommended Resolution |
| :--- | :--- | :--- | :--- |
| `cronRoutes.js` | **NOT MOUNTED** | Unmounted 4.3KB route file. Zero consumers across the entire codebase. Cron jobs run via background node-cron schedules. | **Delete File**: Dead code. |
| `agentAuth.js` | **NOT MOUNTED** | Unmounted 9-line legacy route file (`/login`, `/logout`). Agent authentication is handled via `agentAuthMiddleware` & `agentRoutes.js`. | **Delete File**: Dead code. |
| `bankRoutes.js` | **MOUNTED** (`/api`) | Defines `GET /api/bank-details/:ifscCode` with a sample mock map of 8 Indian bank IFSC codes. Zero consumers across Frontend & External apps. | **Delete File / Deprecate**: Unused mock endpoint. |


