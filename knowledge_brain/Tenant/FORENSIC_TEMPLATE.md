# Tenant Module — Forensic & Debugging Guide

Layer-by-layer investigation steps for diagnosing multi-tenancy, connection pooling, and provisioning bugs.

## 1. Quick Diagnostic Flowchart

```
Issue Reported (e.g., Tenant Creation Fails / "Cannot read models of undefined")
  │
  ├─► Check ProvisioningRun Document in Global DB
  │     db.provisioningruns.find({ runId: "<runId>" }).pretty()
  │     └── Identify exact failed step (1 to 9) & error message
  │
  ├─► Check Tenant Connection Pool Cache
  │     Node console: import TenantConnectionManager from './src/tenant/TenantConnectionManager.js'
  │     TenantConnectionManager.connectionCache.keys()
  │
  ├─► Check Tenant Status & Entitlements
  │     db.tenants.findOne({ slug: "<slug>" })
  │
  └─► Validate Tenant DB Baseline Collections
        use tracker_tenant_<slug>
        db.employees.findOne()
        db.roles.findOne({ isSuperAdmin: true })
```

---

## 2. Common Bug Patterns & Root Cause Solutions

### Pattern 1: `SyntaxError: A module cannot have multiple default exports`
- **Symptom**: Server crashes on startup when importing `tenantSeedingService.js`.
- **Root Cause**: Duplicate `export default` statements in `tenantSeedingService.js` (e.g. from copy-paste or merge conflict).
- **Fix**: Remove redundant function declaration and ensure exactly 1 `export default` at the bottom.

### Pattern 2: `[TenantConnectionManager] Malformed dbName detected`
- **Symptom**: Tenant requests fail with HTTP 500.
- **Root Cause**: Non-alphanumeric characters (spaces, special chars) passed in `dbName` or slug.
- **Fix**: Sanitize slug using `.toLowerCase().replace(/[^a-z0-9]/g, '')`.

### Pattern 3: Missing Sidebars after Tenant Login
- **Symptom**: Super Admin logs in to new tenant but navigation sidebar is empty.
- **Root Cause**: `tracker_global.sidebars` template collection is empty, OR all sidebars were rejected due to unassigned module keys.
- **Fix**: Ensure platform sidebars are seeded in `tracker_global.sidebars` and tenant has `enabledModuleKeys` populated.
