# Tenant Module — Data Flow & Dynamic API Maps

Detailed end-to-end user actions and internal execution data flows for tenant provisioning and management.

## Flow 1: 9-Step Atomic Tenant Provisioning

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Platform Admin
    participant FE as tenant-provisioning.jsx
    participant Ctrl as AdminControlController.js
    participant Seed as tenantSeedingService.js
    participant TCM as TenantConnectionManager.js
    participant DB as MongoDB (Global & Tenant DB)

    Admin->>FE: Fills Provisioning Wizard (Name, Slug, Email, Modules)
    FE->>Ctrl: POST /api/admin/tenants/provision
    Ctrl->>Seed: provisionTenant({ name, slug, ownerEmail, enabledModules })
    Seed->>DB: Step 1: Create ProvisioningRun (status: 'running')
    Seed->>DB: Step 2: Validate unique slug & ownerEmail
    Seed->>DB: Step 3: Resolve module entitlement ObjectIds from Global DB
    Seed->>DB: Step 4: Create Global Tenant Record (tracker_global.tenants)
    Seed->>TCM: Step 5: Instantiate database tracker_tenant_{slug}
    TCM->>DB: useDb(tracker_tenant_{slug}) + compileTenantModels
    Seed->>DB: Step 6: Seed Super Admin Role, Department, & Designation
    Seed->>DB: Step 7: Seed Access Policies & Page Capabilities
    Seed->>DB: Step 8: Copy Filtered Sidebars from Global DB (Module Entitlement filter)
    Seed->>DB: Step 9: Create Owner Employee & UserLogin credential record
    Seed->>DB: Mark ProvisioningRun (status: 'completed', verification: 100%)
    Seed-->>Ctrl: Return populated Tenant & User details
    Ctrl-->>FE: HTTP 201 Created + runId
    FE->>Admin: Displays Success Modal + Verification Summary
```

---

## Flow 2: Multi-Tenant Connection Resolution & Context Propagation

```
Incoming Request (e.g. GET /populate/read/employee)
  │
  ├─► tenantContextMiddleware (tenantContext.js)
  │     ├── Extract X-Tenant-ID header or Subdomain slug
  │     ├── Fetch tenant metadata from tracker_global.tenants
  │     ├── Call TenantConnectionManager.getTenantConnection(dbName, enabledModules)
  │     │     ├── Check RAM LRU connectionCache (Map)
  │     │     │     ├── If Hit: Reuse mongoose.connection.useDb socket pool
  │     │     │     └── If Miss: Compile models via tenantRegistry.js & cache in LRU
  │     │     └── Async non-blocking: runTenantMigrations & ensureTenantIndexes
  │     └── Enter AsyncLocalStorage store: { tenantId, dbName, models, conn }
  │
  └─► Controller / populateHelper.js
        └── Access models via req.tenantContext.models[modelName]
```

---

## Flow 3: Tenant Status & Module Entitlement Update

1. **Platform Admin Action**: Toggles tenant status (e.g. `Active` ➔ `Suspended`) or updates module entitlements in `tenant-management.jsx`.
2. **API Request**: `PUT /api/admin/tenants/:tenantId/status` or `PUT /api/admin/tenants/:tenantId/modules`.
3. **Database Write**: `AdminControlController.js` updates `tracker_global.tenants` document.
4. **Cache Invalidation**: Invokes `TenantConnectionManager.invalidate(tenantId)` to immediately evict the stale cached connection/model mapping from RAM.
5. **Subsequent Request**: Re-compiles model schemas with the new module key permissions on next incoming user payload.
