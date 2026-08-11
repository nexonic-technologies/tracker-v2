# Multi-Tenancy Architecture & Production Implementation Plan (Database-per-Tenant)

## Section 0: Platform Philosophy & Migration Seam Assessment

* **Decision:** `✓ Platform Enhancement`
* **Rationale:** Introducing database-per-tenant isolation, Dual-Portal SaaS Architecture (Platform Control Plane `/admin/*` vs. Tenant Data Plane `/:tenantSlug/*`), dynamic model schema resolution, and versioned upcasters. 
* **Critical Codebase Integration Seam:** Preserves the existing `populateHelper -> buildQuery -> CRUD Builder` generic pipeline by introducing `tenantContext.getModel(modelName)` dependency injection, preventing the need to rewrite the core CRUD engine.

--- 

## 1. Dual-Portal SaaS Architecture (Control Plane vs. Data Plane)

The system operates on a **Dual-Portal Architecture**:
* **Platform Control Plane (`https://your-app.com/admin`):** Reserved for Company Owner / Super Admin. Operates on the **Global Database** (`Tenant`, `UserLogin`, `Subscription`, `Billing`, `Module`, `ModelDefinition`, `GlobalPolicy`).
* **Tenant Data Plane (`https://your-app.com/:tenantSlug/dashboard`):** Isolated customer portals. Operates on the customer's **Tenant Database** (`tracker_tenant_:tenantSlug`).

```
                          https://your-app.com (Base URL)
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
 [PLATFORM OWNER CONTROL PLANE]                        [TENANT CUSTOMER DATA PLANE]
 https://your-app.com/admin/*                          https://your-app.com/:tenantSlug/*
 Operates on Global Database                           Operates on Tenant Database
 (Tenants, Modules, ModelDefinitions, Billing)        (Employees, Attendance, Payroll, etc.)
```

---

## 2. Four-Context Architectural Separation

```
                 REQUEST
                    │
                    ▼
            Authentication (JWT)
                    │
                    ▼
             Tenant Resolution
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   Global Context          Tenant Context
        │                       │
 Tenant / Plan /          Employee / Task /
 Subscription / Policy    Attendance / Payroll
        │                       │
        └───────────┬───────────┘
                    ▼
              Policy Engine (Global Baseline + Tenant Overrides)
                    │
                    ▼
              Service / Generic CRUD Builder
                    │
                    ▼
              tenantContext.getModel(modelName)
                    │
                    ▼
              Tenant Database (`tracker_tenant_:tenantSlug`)
```

### First-Class `req.tenantContext` Contract
Every tenant request constructs a standardized `req.tenantContext` object passed down through middleware, policy engine, CRUD builders, and domain services:

```javascript
req.tenantContext = {
  tenantId,
  tenantSlug,
  tenant,              // Full tenant record from Global DB
  subscription,        // Subscription tier & status
  enabledModules,      // Active module whitelist
  actor: { id, role },         // SuperAdmin (if impersonated) or Tenant User
  effectiveUser: { id, role }, // Target user identity being acted upon
  isImpersonated,      // Boolean flag
  connection,          // Active Mongoose useDb connection instance
  getModel(modelName)  // Tenant-aware model resolver method
};
```

### Non-Negotiable Implementation Rule
> **No tenant-aware code (generic CRUD or domain services) may import tenant business models directly from file paths (e.g. `import Attendance from "../models/Attendance.js"`).**

All model references MUST resolve dynamically via `tenantContext.getModel(modelName)` to ensure cross-tenant data isolation.

---

## 3. Generic CRUD Integration Seam (`buildQuery` Abstraction)

To preserve the generic CRUD engine without direct model imports:

### Current (Tight Coupling)
```javascript
// BEFORE
import models from "../models/Collection.js";
const Model = models[modelName];
```

### Target Seam (Tenant-Aware Dependency Injection)
```javascript
// AFTER
const Model = req.tenantContext.getModel(modelName);
```

This decouples `buildReadQuery`, `buildCreateQuery`, `buildUpdateQuery`, and `buildDeleteQuery` from static file imports, allowing both static core models (`Employee`, `Attendance`) and runtime dynamic models to be resolved safely per tenant connection.

---

## 4. Phased Implementation Roadmap

```
PHASE 1A: Core Foundation Seams
TenantConnectionManager ──► TenantContext ──► Tenant Authentication ──► Tenant Model Resolver ──► Generic CRUD DI

PHASE 1B: Domain & Policy Alignment
Dynamic Policy Resolution ──► Static Service Model Migration ──► Module Gate Middleware

PHASE 1C: Security & Distributed Invalidation
Cryptographic Impersonation ──► Impersonation Audit ──► Redis Pub/Sub Cache Event Bus ──► Upcaster Registry

PHASE 1D: Hardening & Invariant Gate Verification
Aggregator Hardening ──► Integration Tests ──► Cross-Tenant Isolation Invariant Test ──► Code Freeze
```

### The Phase-1 Invariant Test Gate

> **Invariant:** *A request authenticated for Tenant A must be technically incapable of obtaining a Tenant B model, document, query output, or connection through generic CRUD, domain services, aggregations, population, or impersonation.*

```text
Tenant A → Employee A        ✅ ALLOWED
Tenant A → Employee B        ❌ BLOCKED (403/404)

Tenant A → Attendance A      ✅ ALLOWED
Tenant A → Attendance B      ❌ BLOCKED (403/404)

Tenant A → DynamicModel A    ✅ ALLOWED
Tenant A → DynamicModel B    ❌ BLOCKED (403/404)

Tenant A Aggregation         → Data scoped exclusively to Tenant A DB
Tenant A Populate            → Data scoped exclusively to Tenant A DB
Tenant A Impersonation       → Scoped strictly to Tenant A with dual-identity audit
```


---

## 4. No-Code DB Backed Runtime Model Resolution

* Models and Modules are managed in **Global DB** (`ModelDefinition` and `Module` collections).
* **Runtime Schema Engine (`dynamicSchemaEngine.js`):** Compiles Mongoose schemas on the tenant connection (`conn.model(modelName, schema)`).
* **Safe Historical Isolation:** Disabling or revoking a module removes write access and runtime compilation without dropping MongoDB collections.

---

## 5. Licensing, Upgrade & Downgrade (Degradation) Architecture

### A. Subscription Tiers & Module Gating
* **Runtime Gate (`moduleGateMiddleware`):** Validates requested model belongs to `tenant.enabledModules`. Returns `403 Module License Required` if revoked.

### B. Upgrade Workflow
1. **Instant Expansion:** `Tenant.enabledModules` updated in Global DB. `TenantConnectionManager` invalidates cache and compiles unlocked models instantly.
2. **Billing Sync:** Gateway (Stripe/Razorpay) processes prorated charge and updates `Subscription`.

### C. Downgrade & Seat Limit Resolution
1. **Non-Destructive Degradation:** Revoking modules blocks write/API routes but preserves collections.
2. **Seat Limit Excess:** If user count > downgraded plan limit:
   * Block new user creation (`400 Max User Seat Limit Reached`).
   * Tenant Admin prompted in UI to select active seats.

### D. Lifecycle Automation
* `ACTIVE` -> Full module access.
* `PAST_DUE` -> 7-day grace period with UI banner.
* `SUSPENDED` -> Data Plane locked (`402 Payment Required`). Control Plane access retained.
* `CANCELED` -> Tenant DB read-only for 30 days before cold storage export.

---

## 6. Model Schema Versioning, Security & Upcaster Architecture

```
 Global ModelDefinition (v1 & v2)
               │
      ┌────────┴────────┐
      ▼                 ▼
Tenant A (Pinned v1)  Tenant B (Auto-Upgraded v2)
• Compiles v1 Schema  • Compiles v2 Schema
• Reads legacy docs   • Lazy Upcasters convert v1 -> v2 on Read/Write
```

### A. Secure Code-Based Upcaster Registry
Do **NOT** store arbitrary JavaScript code strings in MongoDB. Use a versioned lookup key:
```json
{
  "from": 1,
  "to": 2,
  "transformKey": "employee.v1_to_v2"
}
```
Mapped to a controlled codebase registry:
```javascript
const UpcasterRegistry = {
  "employee.v1_to_v2": (doc) => {
    const [first, ...last] = (doc.name || "").split(" ");
    return { ...doc, firstName: first, lastName: last.join(" "), __sv: 2 };
  }
};
```

### B. Versioning Mechanics
1. **Schema Version Tag (`__sv`):** Every document written includes `__sv`.
2. **Lazy Read Upcasting:** On fetch, if `doc.__sv < tenantVersion`, `dynamicSchemaEngine` executes the registered upcaster in memory.
3. **On-Write Migration:** Saved back with updated `__sv` tag.

---

## 7. Cryptographically Bound Impersonation & Audit Trail

```
SuperAdmin (Control Plane)
    │
    ▼
Impersonation Session (Signed JWT)
    ├── tenantId / tenantSlug
    ├── adminUserId (Actor)
    ├── impersonatedUserId (Effective User)
    ├── isImpersonated: true
    └── sessionId / expiresAt
           │
           ▼
    Tenant Data Plane
           │
           ▼
    Immutable Audit Log (`actor` vs `effectiveUser`)
```

* **Never Trust Client Params:** Tenant context derived strictly from signed JWT claims.
* **Dual Identity Preservation:** Audit logs preserve both `actor = SuperAdmin` and `effectiveUser = TenantUser` to eliminate compliance loopholes.

---

## 8. Distributed Multi-Cache Invalidation Event Architecture (Redis Pub/Sub)

Single event family broadcast via Redis Pub/Sub across all cluster instances:
* `tenant.module.changed`
* `tenant.schema.changed`
* `tenant.policy.changed`
* `tenant.subscription.changed`
* `tenant.suspended`
* `tenant.cache.invalidate`

Clears target local caches (`TenantConnectionManager`, `ModelCompilation`, `PolicyCache`, `ServiceCache`) on each application node cleanly.

---

## 9. Revised CTO Assessment & Phase-1 Blocker Checklist

### CTO Score Card

| Area | Rating | Status |
|---|:---:|---|
| **Platform Philosophy** | 95 | PASS |
| **Target Architecture** | 90 | PASS |
| **Security & ABAC** | 80 | REQUIRES MITIGATION |
| **Business Rules** | 90 | PASS |
| **Regression Safety** | 70 | REQUIRES MITIGATION |
| **Performance & Scale** | 85 | PASS |
| **Documentation** | 90 | PASS |
| **Developer Experience** | 88 | PASS |
| **Platform Leverage** | 90 | PASS |
| **Production Readiness** | **NOT READY** | BLOCKED ON PHASE-1 SEAMS |

---

### CTO Verdict

## CTO Verdict: ARCHITECTURE APPROVED — IMPLEMENTATION BLOCKED UNTIL TENANT CONTEXT INTEGRATION IS COMPLETED

### Phase-1 Blocker Checklist (Must Complete Before Code Freeze)

- [ ] **1. Tenant Context Authentication (`authMiddleware` Overhaul):** Replace global `Employee.findById()` with `tenantSlug -> Global Tenant DB -> Tenant DB Employee` resolution.
- [ ] **2. Dependency Injection Seam in Generic CRUD:** Update `buildQuery` and CRUD builders to consume `req.tenantContext.getModel(modelName)` instead of direct `models[modelName]` imports.
- [ ] **3. Dynamic Policy Resolution Engine:** Expand `getPolicy()` to evaluate `Global Baseline + Tenant Overrides + Role + Identity + Model + Action`.
- [ ] **4. Cryptographically Bound Impersonation:** Bind `tenantId`, `adminUserId`, and `impersonatedUserId` in JWT; log dual identity to `Impersonationaudit_logs`.
- [ ] **5. Distributed Multi-Cache Invalidation:** Implement Redis Pub/Sub listener for the unified `tenant.*` cache invalidation event family.
- [ ] **6. Static Service Model Import Migration:** Refactor domain services (`Attendance.js`, `Employee.js`) to accept connection-bound models via `tenantContext`.
- [ ] **7. Code-Based Upcaster Registry:** Store `transformKey` string references in Global DB mapped to safe codebase upcasters.
- [ ] **8. Reliability & Aggregator Fix:** Fix `safeAggregator.js` `ReferenceError` (`model.modelName`) and replace silent aggregation fallbacks with structured error responses.
