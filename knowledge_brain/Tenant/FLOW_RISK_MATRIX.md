# Tenant Module — Flow Risk Matrix

Handoff contracts, state transition matrices, and QA test scenarios for multi-tenant provisioning and connection management.

## 1. State Machine: Tenant Status Lifecycle

```
               ┌─────────────┐
               │ Provisioning│
               └──────┬──────┘
                      │ (ProvisioningRun completed)
                      ▼
   ┌───────────► ┌───────────┐ ◄──────────┐
   │             │  Active   │            │
   │             └─────┬─────┘            │
   │ (Reactivate)      │ (Suspend)        │ (Un-cancel)
   │                   ▼                  │
   │             ┌───────────┐            │
   ├─────────────┤ Suspended │            │
   │             └─────┬─────┘            │
   │                   │ (Cancel)         │
   │                   ▼                  │
   │             ┌───────────┐            │
   └─────────────┤ Canceled  ├────────────┘
                 └─────┬─────┘
                       │ (Hard Purge / Soft Delete)
                       ▼
                 ┌───────────┐
                 │  Deleted  │
                 └───────────┘
```

| Current Status | Allowed Transitions | Trigger / API | Required Operations |
|---|---|---|---|
| `Provisioning` | `Active`, `Failed` | `provisionTenant` | 9-stage seeding script execution |
| `Active` | `Suspended`, `Inactive`, `Canceled` | `updateTenantStatus` | Evict connection cache (`TenantConnectionManager.invalidate`) |
| `Suspended` | `Active`, `Canceled` | `updateTenantStatus` | Invalidate cache & restore routing |
| `Canceled` | `Active`, `Deleted` | `updateTenantStatus` | Block incoming header requests |

---

## 2. Inbound & Outbound Contracts

### Inbound Contract: Provision Tenant Payload
```json
{
  "name": "Acme Corporation",
  "slug": "acme",
  "ownerEmail": "admin@acme.com",
  "password": "SecurePassword123!",
  "plan": "Enterprise",
  "enabledModules": ["6a25cbc1cd36294f5e578610", "6a25cbc1cd36294f5e578611"]
}
```

### Constraints & Validations:
- `slug`: Required, lowercase, alphanumeric only (Regex: `/^[a-z0-9]+$/`). Must be unique in `tracker_global.tenants`.
- `ownerEmail`: Required, valid email format. Must be unique in `tracker_global.userlogins`.
- `enabledModules`: Must contain at least 1 valid module ObjectId reference unless `allowAllModules: true`.

---

## 3. QA Risk Matrix & Edge Case Checklist

| Scenario / Edge Case | Risk Level | Expected Behavior | Verification Step |
|---|---|---|---|
| Malformed `dbName` payload (`tracker_tenant_acme; DROP TABLE`) | 🔴 Blocking | `validateDbName` throws `Malformed dbName detected` | Unit test regex guard in `TenantConnectionManager.js` |
| Orphaned sidebar items during module entitlement filtering | 🔴 Blocking | Seeding script filters out child sidebars whose parent module is not entitled | Check `orphanedChildCount` console log during tenant seed |
| Server restart while LRU cache holds 100 active tenant pools | 🟠 Warning | Re-instantiates connections on-demand cleanly without socket leak | Verify `useDb` option `useCache: true` |
| Simultaneous duplicate provisioning requests for same slug | 🔴 Blocking | MongoDB `unique` index constraint on `slug` rejects second request | Test concurrent POST `/api/admin/tenants/provision` |
| Suspended tenant attempts request via API header | 🔴 Blocking | `tenantContextMiddleware` rejects request with 403 Forbidden | Send `X-Tenant-ID` for suspended tenant |
