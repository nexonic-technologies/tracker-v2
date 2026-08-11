# Multi-Tenancy Implementation Phase Plan

## Document Purpose

This document converts the approved multi-tenancy architecture in `tenet.md` into an executable engineering roadmap.

The implementation objective is to introduce database-per-tenant isolation while preserving the existing generic platform pipeline:

```text
populateHelper
    ↓
buildQuery
    ↓
CRUD Builder
    ↓
Service / Generic Fallback
    ↓
tenantContext.getModel(modelName)
    ↓
Tenant Database
```

The architecture is approved, but implementation remains blocked until the tenant-context seams and their security invariants are proven.

---

# 0. Implementation Principles

## 0.1 Preserve the Existing Generic Engine

Do not rewrite the generic CRUD architecture. The migration replaces static model resolution:

```javascript
const Model = models[modelName];
```

with tenant-aware resolution:

```javascript
const Model = tenantContext.getModel(modelName);
```

The existing `populateHelper → buildQuery → CRUD Builder` flow remains the platform contract.

## 0.2 Tenant Context Is the Single Source of Truth

Every tenant request must establish one request-scoped context:

```javascript
req.tenantContext = {
  tenantId,
  tenantSlug,
  tenant,
  subscription,
  enabledModules,
  actor: { id, role },
  effectiveUser: { id, role },
  isImpersonated,
  connection,
  getModel(modelName)
};
```

Downstream code must consume this context rather than independently resolving tenant, user, connection, or model state.

## 0.3 No Direct Tenant Model Imports

Tenant-aware services and CRUD code must not directly import business models such as:

```javascript
import Attendance from "../models/Attendance.js";
```

Instead:

```javascript
const Attendance = tenantContext.getModel("Attendance");
```

## 0.4 Global DB and Tenant DB Have Different Responsibilities

### Global DB
Owns: `Tenant`, `UserLogin`, `Subscription`, `Billing`, `Plan`, `Module`, `ModelDefinition`, `GlobalPolicy`, `ImpersonationAuditLog`.

### Tenant DB
Owns: `Employee`, `Attendance`, `Task`, `Payroll`, tenant-specific operational data, dynamic model collections.

---

# Phase 1 --- Core Tenant Context Foundation

## 1.1 Tenant Connection Manager

### Deliverables
Create `src/tenant/TenantConnectionManager.js`.

### Responsibilities
- Resolve tenant database name (`tracker_tenant_:tenantSlug`).
- Create/reuse Mongoose `useDb()` connections.
- Maintain connection cache.
- Prevent accidental cross-tenant database leaks.
- Expose connection cleanup/invalidation methods.

### Conceptual API
```javascript
getConnection(tenant)
getModel(tenantContext, modelName)
invalidate(tenantId)
```

### Acceptance Criteria
- [ ] Tenant A resolves exclusively to database `tracker_tenant_a`.
- [ ] Tenant B resolves exclusively to database `tracker_tenant_b`.
- [ ] Subsequent requests for Tenant A reuse the existing Mongoose socket connection pool without re-authenticating to MongoDB.
- [ ] Invalid/malformed tenant slugs (e.g. `../admin`, `drop_db`, SQL/NoSQL injection payloads) are rejected immediately before database driver execution.
- [ ] `TenantConnectionManager.invalidate(tenantId)` cleanly closes connection handles and clears target memory references.

---

## 1.2 Tenant Context Factory & Middleware

### Deliverables
Create `src/tenant/tenantContext.js` and `src/middlewares/tenantMiddleware.js`.

### Responsibilities
1. Extract and validate tenant claims from authenticated requests.
2. Load Global `Tenant` record and verify tenant status.
3. Attach active subscription and `enabledModules` metadata.
4. Obtain connection via `TenantConnectionManager`.
5. Construct standardized `req.tenantContext`.

### Acceptance Criteria
- [ ] Every request to `/:tenantSlug/*` populates `req.tenantContext` with `tenantId`, `tenantSlug`, `tenant`, `subscription`, `enabledModules`, `actor`, `effectiveUser`, `isImpersonated`, `connection`, and `getModel`.
- [ ] Requests missing valid tenant context fail immediately with HTTP `401 Unauthorized` or `404 Tenant Not Found`.
- [ ] `req.tenantContext.getModel(modelName)` returns a connection-bound Mongoose model.
- [ ] No downstream controller or middleware needs to perform redundant tenant database lookups.

---

## 1.3 Tenant Authentication Overhaul

### Current Problem
The existing authentication middleware executes `Employee.findById(decoded.id)` against a static global model.

### Target Flow
```text
JWT Claims ──► tenantSlug ──► Global Tenant Lookup ──► Tenant Connection ──► Tenant Employee.findById() ──► req.tenantContext
```

### Acceptance Criteria
- [ ] Tenant users authenticate against their specific tenant database `tracker_tenant_:tenantSlug`.
- [ ] Employee ID from Tenant A cannot authenticate into Tenant B APIs under any circumstances.
- [ ] Suspended or inactive tenants reject authentication requests with HTTP `402 Payment Required` / `403 Account Suspended`.
- [ ] Request parameters or headers attempting to override JWT tenant identity are ignored; tenant identity is strictly derived from trusted signed token claims.

---

## 1.4 Tenant Model Registry

### Deliverables
Create `src/tenant/tenantRegistry.js`.

### Responsibilities
- Register static core models (`Employee`, `Attendance`, `Task`).
- Compile models on specific tenant connection handles without triggering Mongoose `OverwriteModelError`.
- Cache compiled model instances per tenant connection.

### Acceptance Criteria
- [ ] `tenantRegistry.getModel(connA, "Attendance")` and `tenantRegistry.getModel(connB, "Attendance")` return isolated model instances bound to `connA` and `connB` respectively.
- [ ] Calling `getModel` multiple times on the same connection reuses cached Mongoose models without memory leaks or model re-registration errors.
- [ ] Model compilation failure on one tenant does not disrupt active model registries of other tenants.

---

## Phase 1 Exit Gate

- [ ] Tenant A authentication: **PASS**
- [ ] Tenant B authentication: **PASS**
- [ ] Tenant A database isolation: **PASS**
- [ ] Tenant B database isolation: **PASS**
- [ ] Model resolution isolation: **PASS**
- [ ] Invalid tenant rejection: **PASS**
- [ ] Cross-tenant access attempts: **BLOCKED**

---

# Phase 2 --- Generic CRUD Dependency Injection

## 2.1 Refactor `buildQuery`

### Deliverables
Refactor `src/utils/buildQuery.js` (or equivalent query entrypoint).

### Target Seam
```javascript
// BEFORE
const Model = models[modelName];

// AFTER
const Model = tenantContext.getModel(modelName);
```

### Acceptance Criteria
- [ ] `buildQuery` accepts `tenantContext` as a required parameter.
- [ ] `buildQuery` derives target Mongoose model strictly through `tenantContext.getModel(modelName)`.
- [ ] Passing an uninitialized or null `tenantContext` to `buildQuery` throws a explicit `TenantContextRequiredError`.
- [ ] Direct imports from `models/Collection.js` are removed from `buildQuery.js`.

---

## 2.2 Refactor CRUD Builders

### Deliverables
Update:
- `src/utils/buildReadQuery.js`
- `src/utils/buildCreateQuery.js`
- `src/utils/buildUpdateQuery.js`
- `src/utils/buildDeleteQuery.js`

### Acceptance Criteria
- [ ] All four CRUD builders (`buildReadQuery`, `buildCreateQuery`, `buildUpdateQuery`, `buildDeleteQuery`) resolve target models via `tenantContext.getModel()`.
- [ ] Standard generic routes (`/api/populate/:action/:model`) execute flawlessly through `populateHelper`.
- [ ] Zero raw model imports remain in `buildReadQuery.js`, `buildCreateQuery.js`, `buildUpdateQuery.js`, or `buildDeleteQuery.js`.
- [ ] Existing response payload structure for generic CRUD remains 100% backward compatible.

---

## 2.3 Populate & Aggregation Tenant Safety

### Deliverables
Refactor query population and aggregation helpers to enforce tenant connection boundaries.

### Acceptance Criteria
- [ ] Mongoose `populate()` paths execute strictly within the active tenant database connection.
- [ ] User-supplied aggregation pipelines cannot cross database boundaries or access global system collections.
- [ ] Nested populated references (e.g. `Employee -> Department`) resolve from the tenant DB without throwing missing model schema errors.

---

## Phase 2 Exit Gate

- [ ] Generic Read CRUD on Tenant DB: **PASS**
- [ ] Generic Create CRUD on Tenant DB: **PASS**
- [ ] Generic Update CRUD on Tenant DB: **PASS**
- [ ] Generic Delete CRUD on Tenant DB: **PASS**
- [ ] Tenant-bound Population: **PASS**
- [ ] Tenant-bound Aggregation: **PASS**

---

# Phase 3 --- Domain Service Migration

## 3.1 Attendance Service Migration

### Deliverables
Refactor `src/services/attendance.service.js` (or `src/services/Attendance.js`).

### Target
Remove `import Attendance from "../models/Attendance.js"` and inject `tenantContext.getModel("Attendance")`.

### Acceptance Criteria
- [ ] Attendance service functions receive `tenantContext` in their options argument.
- [ ] All database queries within attendance service execute against `tenantContext.getModel("Attendance")`.
- [ ] Domain business logic (leave modification rules, Sunday calculations, check-in/check-out calculations, overtime rules) operates identically without regression.
- [ ] Zero static model file imports remain in attendance service.

---

## 3.2 Employee Service Migration

### Deliverables
Refactor `src/services/employee.service.js`.

### Acceptance Criteria
- [ ] Employee service operates strictly via `tenantContext.getModel("Employee")`.
- [ ] Employee lifecycle hooks (onboarding, termination, role updates) execute within the tenant connection boundary.
- [ ] Administrative soft-delete semantics and search filters operate without regression.

---

## 3.3 Service Contract Standardization

### Deliverables
Enforce standard service method signature across all domain services:

```javascript
serviceMethod({ tenantContext, body, query, params, actor, effectiveUser })
```

### Acceptance Criteria
- [ ] All domain services in `src/services/` adopt the standardized signature.
- [ ] No domain service directly imports MongoDB connection drivers or file-based static Mongoose models.
- [ ] Unit tests for domain services mock `tenantContext.getModel()` cleanly.

---

## Phase 3 Exit Gate

- [ ] Attendance business logic regression test: **PASS**
- [ ] Employee lifecycle regression test: **PASS**
- [ ] Domain service tenant isolation: **PASS**
- [ ] Zero direct model file imports in `/src/services`: **PASS**

---

# Phase 4 --- Dynamic ABAC Policy Architecture

## 4.1 Effective Policy Resolution Engine

### Deliverables
Refactor policy resolution to calculate effective policies dynamically:

```text
Global Baseline Policy + Tenant Policy Overrides + Role + Identity + Model + Action ──► Effective Policy
```

### Acceptance Criteria
- [ ] Policy engine evaluates permissions using `tenantContext` context.
- [ ] Tenant-specific policy overrides stored in Global DB take precedence over platform baseline rules.
- [ ] Policy evaluation completes in under 5ms per request using local in-memory policy cache.

---

## 4.2 Dynamic Model Policy Seeding

### Deliverables
Implement automatic ABAC policy template generator when a new model definition is created.

### Acceptance Criteria
- [ ] Creating a new `ModelDefinition` automatically generates default policy templates (`CompanyAdmin` -> Full Access, `Employee` -> Self-Read).
- [ ] Newly created dynamic models enforce ABAC policy rules immediately on generic CRUD routes without requiring server restarts.

---

## 4.3 Policy Security & Override Tests

### Acceptance Criteria
- [ ] Employee reading own record: **ALLOWED (200)**.
- [ ] Employee reading unauthorized colleague record: **BLOCKED (403)**.
- [ ] Tenant policy override granting custom role access: **APPLIED & VERIFIED**.
- [ ] Admin accessing permitted tenant resources: **ALLOWED (200)**.

---

## Phase 4 Exit Gate

- [ ] Baseline ABAC enforcement: **PASS**
- [ ] Tenant policy override: **PASS**
- [ ] Dynamic model default policy auto-seeding: **PASS**

---

# Phase 5 --- Module Licensing & Runtime Gating

## 5.1 Module Gate Middleware

### Deliverables
Create `src/middlewares/moduleGateMiddleware.js`.

### Acceptance Criteria
- [ ] Middleware checks requested `:model` against `req.tenantContext.enabledModules`.
- [ ] Accessing a model belonging to an un-subscribed module returns HTTP `403 Module License Required`.
- [ ] Disabling a module in Super Admin immediately blocks tenant Data Plane API calls to that module.

---

## 5.2 Subscription Lifecycle State Machine

### Deliverables
Implement handlers for tenant subscription states: `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELED`.

### Acceptance Criteria
- [ ] `ACTIVE`: Full API access to subscribed modules.
- [ ] `PAST_DUE`: Data Plane API accessible; warning header/banner flag returned in response metadata.
- [ ] `SUSPENDED`: All Data Plane APIs return HTTP `402 Payment Required` / `403 Account Suspended`. Control Plane access retained for Super Admin billing remediation.
- [ ] `CANCELED`: Tenant DB set to read-only state. Write requests return HTTP `403 Account Canceled`.

---

## Phase 5 Exit Gate

- [ ] Module whitelist enforcement: **PASS**
- [ ] Unlicensed module block (403): **PASS**
- [ ] Suspended tenant block (402/403): **PASS**
- [ ] Non-destructive data retention on downgrade: **PASS**

---

# Phase 6 --- Dynamic No-Code Model Engine

## 6.1 Global `ModelDefinition` & `Module` Schemas

### Deliverables
Create `src/models/global/ModelDefinition.js` and `src/models/global/Module.js`.

### Acceptance Criteria
- [ ] `ModelDefinition` schema validates field types (`String`, `Number`, `Date`, `Boolean`, `Array`, `ObjectId ref`).
- [ ] Schema includes `modelName`, `collectionName`, `moduleId`, `fields`, `version`, `isLatest`, and `upcasterKeys`.

---

## 6.2 Dynamic Schema Compiler

### Deliverables
Create `src/tenant/dynamicSchemaEngine.js`.

### Acceptance Criteria
- [ ] `dynamicSchemaEngine.buildSchema(modelDef)` compiles JSON field definitions into valid Mongoose `Schema` objects.
- [ ] Dynamic schemas support indexing, default values, required constraints, and `ObjectId` references.
- [ ] Automatically appends schema version tag `__sv` (default `1`) to compiled schemas.

---

## 6.3 Static & Dynamic Resolution Integration

### Deliverables
Update `tenantRegistry.js` to resolve static models from code and dynamic models from Global DB `ModelDefinition`.

### Acceptance Criteria
- [ ] `tenantContext.getModel("CustomExpense")` fetches `ModelDefinition` from Global DB and compiles it dynamically on the tenant connection handle.
- [ ] Static models (`Employee`, `Attendance`) and dynamic models (`CustomExpense`) coexist seamlessly in generic CRUD APIs.

---

## Phase 6 Exit Gate

- [ ] Dynamic schema compilation: **PASS**
- [ ] Zero-downtime model creation via UI: **PASS**
- [ ] Generic CRUD execution on dynamic models: **PASS**

---

# Phase 7 --- Schema Versioning & Upcaster Registry

## 7.1 Version Pinning (`Tenant.schemaVersions`)

### Acceptance Criteria
- [ ] Global `Tenant` record tracks schema versions per model (e.g. `schemaVersions: { Employee: 2 }`).
- [ ] Tenants can be pinned to specific model versions independently.

---

## 7.2 Secure Code-Based Upcaster Registry

### Deliverables
Create `src/tenant/UpcasterRegistry.js`.

### Acceptance Criteria
- [ ] Transformation logic lives strictly in code files (`src/tenant/upcasters/*.js`).
- [ ] Global DB stores string lookup keys (`transformKey: "employee.v1_to_v2"`).
- [ ] Execution of arbitrary stringified JavaScript from MongoDB is strictly prohibited.

---

## 7.3 Read-Time & Write-Time Upcasting

### Acceptance Criteria
- [ ] Fetching a document where `doc.__sv < activeVersion` triggers the registered upcaster in memory before API response delivery.
- [ ] Updating/saving an upcasted document persists it back to MongoDB with updated `__sv` tag and transformed schema layout.

---

## 7.4 Bulk Migration Worker Queue

### Deliverables
Create background worker job `/admin/tenants/:id/migrate` for batch processing breaking schema changes.

### Acceptance Criteria
- [ ] Bulk migrations process in configurable batches (e.g. 500 docs/batch) with progress tracking.
- [ ] Bulk migration failures log exact document IDs without halting unrelated tenant connections.

---

## Phase 7 Exit Gate

- [ ] Version pinning: **PASS**
- [ ] Secure code upcasting: **PASS**
- [ ] Read-time lazy upcasting: **PASS**
- [ ] Bulk background migration worker: **PASS**

---

# Phase 8 --- Secure Impersonation & Audit

## 8.1 Impersonation Session Engine

### Deliverables
Create `/admin/tenants/:id/impersonate` API generating short-lived (15-min) signed support JWT tokens.

### Acceptance Criteria
- [ ] Impersonation JWT claims contain `tenantId`, `tenantSlug`, `adminUserId`, `impersonatedUserId`, `isImpersonated: true`, `sessionId`, `expiresAt`.
- [ ] Token expires automatically after 15 minutes.

---

## 8.2 Dual Identity & Immutable Audit Logging

### Deliverables
Create `GlobalDB.Impersonationaudit_logs` collection and audit middleware.

### Acceptance Criteria
- [ ] Every write operation during impersonation preserves both identities (`actor = SuperAdmin` and `effectiveUser = TenantUser`).
- [ ] All impersonated actions log to `Impersonationaudit_logs` with `sessionId`, `tenantId`, `actorId`, `effectiveUserId`, `action`, `model`, `documentId`, `timestamp`.

---

## Phase 8 Exit Gate

- [ ] Impersonation JWT signing & verification: **PASS**
- [ ] Dual-identity propagation in `req.tenantContext`: **PASS**
- [ ] Immutable audit log creation on write operations: **PASS**

---

# Phase 9 --- Redis Distributed Cache Invalidation

## 9.1 Unified Event Family & Pub/Sub Bus

### Deliverables
Create Redis Pub/Sub event listener in `src/utils/redisCacheBus.js`.

### Event Family
- `tenant.module.changed`
- `tenant.schema.changed`
- `tenant.policy.changed`
- `tenant.subscription.changed`
- `tenant.suspended`
- `tenant.cache.invalidate`

### Acceptance Criteria
- [ ] Publishing an event on Node 1 triggers targeted local cache invalidation on Node 2 within 100ms.
- [ ] Local caches (`TenantConnectionManager`, `ModelCompilation`, `PolicyCache`) invalidate only affected tenant keys rather than flushing global memory.

---

## Phase 9 Exit Gate

- [ ] Multi-node Redis Pub/Sub messaging: **PASS**
- [ ] Targeted tenant cache invalidation: **PASS**

---

# Phase 10 --- Aggregation & Reliability Hardening

## 10.1 `safeAggregator` Hardening

### Deliverables
Audit and harden `src/utils/safeAggregator.js`.

### Acceptance Criteria
- [ ] `safeAggregator.js` error handling references `model.modelName` cleanly without `ReferenceError` crashes.
- [ ] Aggregation pipeline limits enforced: `MAX_LOOKUPS = 9`, `MAX_UNWINDS = 9`, `MAX_MATCHES = 10`, `MAX_TOTAL_STAGES = 25`.
- [ ] Aborted or failed aggregations return structured error objects (`AGGREGATION_LIMIT_EXCEEDED`) instead of misleading fallback data.

---

## 10.2 Pipeline Sanitization

### Acceptance Criteria
- [ ] User-supplied aggregation stages cannot execute `$out` or `$merge` into system or foreign collections.
- [ ] Aggregations execute strictly on the tenant-bound model handle.

---

## Phase 10 Exit Gate

- [ ] `safeAggregator` bugfix verification: **PASS**
- [ ] Pipeline limit enforcement: **PASS**
- [ ] Structured error response on failure: **PASS**

---

# Phase 11 --- Cross-Tenant Security & Regression Verification

## 11.1 Multi-Tenant Isolation Matrix

### Setup
Provision two isolated test tenants (`Tenant A` and `Tenant B`) with distinct seed records.

### Acceptance Criteria
- [ ] **Mandatory Invariant Test:** A request authenticated for Tenant A must be technically incapable of obtaining a Tenant B model, document, query output, or connection through generic CRUD, domain services, aggregations, population, dynamic models, or impersonation.

---

## 11.2 Penetration & Negative Tests

### Acceptance Criteria
- [ ] Tenant A JWT + Tenant B Slug: **BLOCKED (403/404)**.
- [ ] Tenant A JWT + Tenant B Document ID: **BLOCKED (404/403)**.
- [ ] Tenant A JWT + Body Parameter Injection (`tenantId: "tenant_b"`): **IGNORED / BLOCKED**.
- [ ] Tenant A Impersonation + Tenant B Target: **BLOCKED (403)**.

---

## Phase 11 Exit Gate

- [ ] Mandatory isolation invariant test: **PASS**
- [ ] Negative security penetration tests: **PASS**
- [ ] Core domain regression suite: **PASS**

---

# Phase 12 --- Performance, Scale & Production Validation

## 12.1 Connection Scale & Pool Benchmark

### Acceptance Criteria
- [ ] System handles 100 concurrently active tenant database connection handles under 500MB memory footprint.
- [ ] Connection reuse latency: `< 2ms` overhead over single-tenant DB queries.

---

## 12.2 Dynamic Compilation Load Benchmark

### Acceptance Criteria
- [ ] Cold model schema compilation time: `< 15ms`.
- [ ] Warm model schema fetch time: `< 0.5ms`.

---

## Phase 12 Exit Gate

- [ ] 100 Tenant Pool Benchmark: **PASS**
- [ ] Redis Pub/Sub Propagation Latency Benchmark (<100ms): **PASS**
- [ ] Migration Worker Resumability Test: **PASS**

---

# Phase 13 --- Production Code Freeze Gate

Production deployment is authorized only when every item in this checklist is verified:

### Architecture & Isolation
- [ ] `req.tenantContext` is mandatory for all tenant data requests.
- [ ] All tenant business model access resolves via `tenantContext.getModel(modelName)`.
- [ ] Zero static model file imports (`import Attendance...`) remain in `/src/services`.
- [ ] Database-per-tenant isolation is physically enforced on MongoDB connection level.

### Security & Compliance
- [ ] Mandatory cross-tenant isolation invariant passes 100%.
- [ ] ABAC dynamic policy resolution engine active.
- [ ] Support impersonation JWT tokens cryptographically bound and audited.
- [ ] Unlicensed module requests rejected with HTTP 403.
- [ ] Suspended tenants blocked from Data Plane APIs.

### Data & Upcasters
- [ ] Schema versioning (`__sv`) active on all dynamic and static tenant collections.
- [ ] Upcaster transformations use secure `UpcasterRegistry` codebase lookup strings.
- [ ] Non-destructive data preservation verified on module downgrade.

### Infrastructure & Reliability
- [ ] Redis Pub/Sub cache invalidation bus verified across multi-node cluster.
- [ ] `safeAggregator.js` hardened with structured error contract.
- [ ] Connection pool memory consumption remains within threshold (<500MB for 100 active connections).

---

## Definition of Done

> **Tenant identity is established once, propagated through the entire request lifecycle, used for every model resolution and policy decision, and impossible for downstream code or client input to override.**
