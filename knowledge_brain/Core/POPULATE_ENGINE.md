   # The Populate Engine (Core API Architecture)

   This document centralizes the knowledge regarding the dynamic `populateHelper.js` API, which forms the spine of the entire application. When debugging any API issue, start here.

   ## 1. The Core Files
   The engine is distributed across these crucial core files:

   | Responsibility | File Path |
   |---|---|
   | **Routing & Entry Gates** | `backend/src/routes/populateRoutes.js` |
   | **Dynamic Tenant Model Registry** | `backend/src/models/tenantRegistry.js`, `tenantContext.js` |
   | **Centralized Model Proxy** | `backend/src/models/Collection.js` (`dynamicModelsProxy`) |
   | **Authentication** | `backend/src/Controller/AuthController.js` (`authMiddleware`) |
   | **File Uploads (Multer)**| `backend/src/middlewares/multerConfig.js` (`upload`) |
   | **Request Orchestrator** | `backend/src/helper/populateHelper.js` |
   | **Security & Policies** | `backend/src/utils/policy/policyEngine.js` |
   | **Policy Registry (FBAC)**| `backend/src/utils/policy/registry/` (e.g. `isSelf`, `isManager`) |
   | **CRUD Query Builders** | `backend/src/crud/build*Query.js` |
   | **Data Parsing & Compilation** | `filterParser.js`, `mongoFilterCompiler.js` |
   | **Query Optimization** | `queryOptimizer.js`, `safeAggregator.js`, `defaultPopulateFields.js` |
   | **Data Sanitization** | `sanitizeWrite.js`, `sanitizeUpdate.js`, `sanitizeRead.js`, `sanitizePopulated.js` |
   | **Field Validation** | `validateFieldUpdateRules.js` |
   | **Service Execution** | `servicesCache.js`, `registryExecutor.js` |
   | **Tracing & Auditing** | `requestTracer.js`, `apiHitLogger.js`, `auditLogger.js`, `errorHandler.js` |
   | **Concurrency & Queuing**| `backend/src/services/requestQueue.js` & `raceConditionHandler.js` |
   | **Isolation Verification Gate** | `backend/scripts/verify-zero-static-models.js` |

   ## 2. Multi-Tenant Data-Plane Isolation Invariant

   The Populate Engine enforces **strict multi-tenant database isolation** at the data-plane layer:

   ```text
   JWT Decode / X-Tenant-Id Header
                 ↓
      Tenant Middleware (`tenantMiddleware.js`)
                 ↓
      TenantConnectionManager.getTenantConnection(dbName)
                 ↓
      AsyncLocalStorage Context (`runWithTenantContext`)
                 ↓
      Tenant-Bound User & Session Resolution (`getTenantModel`)
                 ↓
      Module Entitlement Gate (`moduleGateMiddleware.js`)
                 ↓
      Policy Engine & Canonical Model Resolution (`getTenantModel`)
                 ↓
      Generic CRUD Query Builders / Domain Service Hooks
                 ↓
      Isolated Tenant MongoDB Database
   ```

   ### Key Invariants:
   - **Zero Static Model Imports**: Neither CRUD query builders, domain services, crons, nor `authMiddleware` statically import Mongoose model files. All model instances are dynamically resolved from `req.tenantContext.getModel(modelName)` or `getTenantModel(modelName)`.
   - **Canonical Model Map (`CANONICAL_MODEL_NAMES`)**: Normalizes all singular, plural, and case variations (`employee`, `employees`, `Employee`) into a canonical PascalCase name (`Employee`) before database lookup.
   - **Centralized `Collection.js` Proxy (`dynamicModelsProxy`)**: The default export of `Collection.js` is wrapped in a dynamic Proxy that intercepts accesses (`models.employees`, `models.tickets`) and delegates directly to `getTenantModel(prop)`.
   - **Fail-Closed Tenant Resolution**: If tenant identity is missing on non-admin/public endpoints, `tenantMiddleware.js` rejects with **HTTP 400 Bad Request**. If JWT tenantId mismatches `X-Tenant-Id` header, it rejects with **HTTP 403 Forbidden**.

   ## 3. Request Lifecycle (The "One API" Flow)

   When the frontend issues a dynamic request (e.g. `axiosInstance.post('/populate/read/tickets', payload)`), the following sequence occurs:

   1. **Routing & Entry Gates (`tenantMiddleware.js`, `populateRoutes.js`)**: 
      - **Request Tracing (`requestTracer.js`)**: Every incoming request is assigned a unique `req.id` (Trace ID).
      - **Tenant Context Resolution (`tenantMiddleware.js`)**: Resolves tenant connection pool from `TenantConnectionManager`, sets up `AsyncLocalStorage`, and passes context down via `runWithTenantContext()`.
      - **Authentication (`authMiddleware`)**: Validates token and checks session against tenant-bound `Session` model.
      - **Module Entitlement Check (`moduleGateMiddleware.js`)**: Checks if target model's module is enabled in `tenantContext.enabledModules`. Rejects with **HTTP 403 Forbidden** if un-licensed.
   2. **Orchestration & Concurrency (`populateHelper.js`)**: 
      - Checks request action (`read`, `create`, `update`, `delete`, `report`).
      - Enqueues request in **Request Queue** (`requestQueue.js`) for concurrency and rate-limiting.
      - Delegates to `policyEngine.js`.
   3. **Data Parsing & Input Sanitization**:
      - `filterParser.js` tokenizes user filter syntax tree.
      - `mongoFilterCompiler.js` compiles secure NoSQL filter without injection risks.
      - Inputs sanitized via `sanitizeWrite.js` / `sanitizeUpdate.js`.
   4. **Security Check & Policy Routing (`policyEngine.js` & `registry/`)**:
      - Looks up tenant-scoped policy (`${tenantId}:${role}:${modelName}`).
      - Evaluates hybrid RBAC and FBAC (e.g., `isSelf`, `isManager`).
      - Validates field updates using `validateFieldUpdateRules.js`.
   5. **Execution, Hooks, & Query Optimization**:
      - Dynamically resolves model via `ctx.tenantContext.getModel(modelName)`.
      - `registryExecutor.js` executes `before*` lifecycle hooks.
      - CRUD Query Builder executes Mongoose query against the **isolated tenant MongoDB database**.
      - **Fail-Closed Aggregation (`safeAggregator.js`)**: Enforces stage limits ($lookup, $unwind). Fails closed with structured errors if limits are exceeded—**zero fallback `find(10)` queries are executed**.
      - `auditLogger.js` logs mutations.
      - `registryExecutor.js` executes `after*` lifecycle hooks.
   6. **Output Sanitization & Finalization**:
      - Data passed through `sanitizeRead.js` and `sanitizePopulated.js`.
      - Response finalized and logged by `apiHitLogger.js`.

   ## 4. How Business Logic is Injected

   If you need to add custom business logic (e.g., "when a task is created, update the milestone"), **DO NOT edit `populateHelper.js`**. 

   Instead, find or create the corresponding service file in `backend/src/services/` and export the designated lifecycle hooks. Import `models` directly from `Collection.js`:

   ```javascript
   // backend/src/services/tasks.js
   import models from '../models/Collection.js';

   export async function beforeCreate({ data, user }) {
     // Validate or mutate data before saving
     if (!data.dueDate) throw new Error("Due date required");
     return { ...data, status: 'Pending' };
   }

   export async function afterCreate({ doc, user }) {
     // Side-effects execute against tenant-bound models
     const ticket = await models.tickets.findById(doc.ticketId);
     await sendNotification(user, `Task ${doc.title} assigned`);
   }
   ```

   ## 5. Tenant-Scoped Caching Strategy

   To prevent cross-tenant cache contamination:
   - **Navigation Tree Cache (`contextBuilder.js`)**: Scoped by tenant: `${tenantId}:${roleStr}:${userDeptStr}:${userDesigStr}`.
   - **Access Policy Cache (`cache.js`)**: Scoped by tenant: `${tenantId}:${role}`.

   ## 6. Doctor's Diagnostic Cheat Sheet (HTTP Status & Error Matrix)

   When diagnosing an issue in the Populate Engine pipeline, match the HTTP status code and error fingerprint to locate the exact cause:

   | HTTP Status | Error Code / Fingerprint | Root Cause | File to Inspect |
   |---|---|---|---|
   | **400 Bad Request** | `TENANT_IDENTIFIER_MISSING` | Missing JWT `tenantId` or `X-Tenant-Id` header on non-public route | `tenantMiddleware.js` |
   | **400 Bad Request** | `No modelName specified` | Frontend request payload missing target `modelName` parameter | `populateHelper.js` |
   | **401 Unauthorized** | `Access token required` | Missing or expired JWT `Authorization` header | `authMiddleware` |
   | **402 Payment Required**| `TENANT_SUSPENDED` | Tenant account suspended due to billing/policy constraints | `tenantMiddleware.js`, `moduleGateMiddleware.js` |
   | **403 Forbidden** | `TENANT_MISMATCH` | Header `X-Tenant-Id` differs from token's `tenantId` | `tenantMiddleware.js` |
   | **403 Forbidden** | `MODULE_LICENSE_REQUIRED` | Model belongs to a module not enabled in tenant's `enabledModules` | `moduleGateMiddleware.js` |
   | **403 Forbidden** | `⛔ CRITICAL SECURITY: No policy...` | No access policy document defined for `(role, modelName)` | `policyEngine.js`, `cache.js` |
   | **403 Forbidden** | `⛔ ACCESS DENIED: Role... has no...` | Policy exists but explicit `permissions[action]` is `false` | `policyEngine.js`, `Validator.js` |
   | **500 Internal Error** | `[safeAggregate] Threshold exceeded` | Aggregation pipeline breached `$lookup` (9) or `$unwind` (9) stage limits | `safeAggregator.js` |
   | **500 Internal Error** | `[ServiceHookError]` | Unhandled exception thrown inside domain service `before*` / `after*` hook | `backend/src/services/<model>.js` |

   ## 7. Populate Strategy: Flat Populate & Path Collision Guard

   > **Critical**: `buildReadQuery.js` uses a **flat populate** approach. Each dot-notation path from `defaultPopulateFields.js` is checked directly against the Mongoose schema and populated individually.

   ### How Flat Populate Works
   ```text
   populateFields = {
     "professionalInfo.designation": "title",
     "professionalInfo.department": "name"
   }

   → Schema check: schema.path("professionalInfo.designation") → ObjectId ref ✓
   → Schema check: schema.path("professionalInfo.department") → ObjectId ref ✓
   → query.populate([
        { path: "professionalInfo.designation", select: "title" },
        { path: "professionalInfo.department", select: "name" }
     ])
   ```

   ### Path Collision Guard (`sanitizeRead.js`)
   `sanitizeRead.js` automatically collapses parent/child field conflicts before executing queries:
   - **Input**: `['professionalInfo', 'professionalInfo.designation']`
   - **Output**: `['professionalInfo']` (child path removed, top-level parent covers nested fields)
   This prevents Mongoose `.select()` projection collision errors globally across main queries and populated sub-queries.

   ## 8. Preventive Maintenance Checklist for Developers

   Before committing code touching the Populate Engine:
   1. **Run Static Model CI Check**: `node backend/scripts/verify-zero-static-models.js` (Must pass with 0 static imports).
   2. **No Direct Model Imports**: Services must consume models exclusively via `import models from '../models/Collection.js'` or `req.tenantContext.getModel()`.
   3. **No Logic in Controllers**: Controllers must remain generic orchestrators; all domain rules must live in `backend/src/services/<model>.js` hooks.
   4. **Tenant Cache Invalidation**: When modifying sidebar navigation or access policies, trigger `clearNavigationCache()` or `invalidatePermissions()`.



