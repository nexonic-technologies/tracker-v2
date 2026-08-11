# Tenant & Platform Provisioning — Module Brain

## 1. Module Overview
The **Tenant & Platform Provisioning** module governs multi-tenant database isolation, platform subscription entitlements, dynamic connection pooling, 9-stage atomic tenant provisioning, license expiration enforcement, payment status reactivity, and maximum active user capacity guards in Workhub ERP.

```
Browser (Platform Admin UI) 
  → React Components (tenant-provisioning.jsx / tenant-management.jsx / usage-metrics.jsx)
  → Express Admin Routes (/api/admin/*)
  → AdminControlController.js
  → tenantSeedingService.js (provisionTenant & seedTenantDatabase)
  → TenantConnectionManager.js (useDb socket reuse & compileTenantModels)
  → MongoDB (tracker_global + tracker_tenant_{slug})
```

## 2. Component File Map

### Backend Layer
| File | Lines | Purpose |
|---|---|---|
| [Tenant.js](file:///e:/Loigmax/trackerV1/Backend/src/models/global/Tenant.js) | L1-L90 | Schema for Global DB tenant metadata, billingCycle, licenseExpiredAt, paymentStatus, and maxUsers |
| [ProvisioningRun.js](file:///e:/Loigmax/trackerV1/Backend/src/models/global/ProvisioningRun.js) | L1-L53 | Atomic 9-step progress tracker schema for tenant provisioning runs |
| [UserLogin.js](file:///e:/Loigmax/trackerV1/Backend/src/models/global/UserLogin.js) | L1-L60 | Global user credential map linking email to tenantId |
| [TenantConnectionManager.js](file:///e:/Loigmax/trackerV1/Backend/src/tenant/TenantConnectionManager.js) | L1-L145 | LRU cached multi-tenant connection pool manager with `useDb` reuse |
| [tenantMiddleware.js](file:///e:/Loigmax/trackerV1/Backend/src/middlewares/tenantMiddleware.js) | L1-L127 | Resolves tenant ID, enforces license expiry, grace period, and payment status checks |
| [employees.js](file:///e:/Loigmax/trackerV1/Backend/src/services/employees.js) | L1-L325 | Service hook enforcing `maxUsers` capacity guard on employee creation |
| [tenantSeedingService.js](file:///e:/Loigmax/trackerV1/Backend/src/utils/tenantSeedingService.js) | L1-L744 | Pure single-tenant provisioning engine & DB seeder |
| [AdminControlController.js](file:///e:/Loigmax/trackerV1/Backend/src/Controller/AdminControlController.js) | L1-L587 | Controller handling admin routes for tenant management, subscription parameters, & analytics |
| [adminSystemRoutes.js](file:///e:/Loigmax/trackerV1/Backend/src/routes/adminSystemRoutes.js) | L1-L49 | Express router exposing `/api/admin/*` endpoints |

### Frontend Layer
| File | Lines | Purpose |
|---|---|---|
| [tenant-provisioning.jsx](file:///e:/Loigmax/trackerV1/Frontend/src/platformAdmin/tenant-provisioning.jsx) | L1-L508 | 4-step wizard for tenant provisioning, billing cycle, maxUsers, & verification |
| [tenant-management.jsx](file:///e:/Loigmax/trackerV1/Frontend/src/platformAdmin/tenant-management.jsx) | L1-L415 | Tenant dashboard for filtering, status toggling, subscription parameters, & module entitlements |
| [usage-metrics.jsx](file:///e:/Loigmax/trackerV1/Frontend/src/platformAdmin/usage-metrics.jsx) | L1-L240 | Global platform analytics dashboard tracking active tenants, user capacity, billing cycles, & licenses |
| [module-management.jsx](file:///e:/Loigmax/trackerV1/Frontend/src/platformAdmin/module-management.jsx) | L1-L320 | Platform-wide module entitlement manager |

---

## 3. Key Endpoints & Routes

| Endpoint | Method | Controller Handler | Purpose |
|---|---|---|---|
| `/api/admin/tenants/provision` | `POST` | `createTenant` | Triggers 9-step atomic tenant provisioning |
| `/api/admin/tenants` | `GET` | `listTenants` | Returns paginated list of tenants with module populates |
| `/api/admin/tenants/:id/status` | `PUT` | `updateTenantStatus` | Toggles status (`Active`, `Suspended`, `Canceled`) |
| `/api/admin/tenants/:id/subscription` | `PUT` | `updateTenantSubscription` | Updates `billingCycle`, `licenseExpiredAt`, `paymentStatus`, and `maxUsers` |
| `/api/admin/tenants/:id/modules` | `PUT` | `updateTenantModules` | Modifies entitled module keys & refreshes cache |
| `/api/admin/metrics/usage` | `GET` | `getUsageMetrics` | Real-time platform adoption, license, payment, & capacity analytics |

---

## 4. Known Risks & Edge Cases
- **Unpaid Tenant Access**: Payment status `Unpaid` automatically sets `status = 'Suspended'` and blocks access with HTTP 402.
- **License Expiration past Grace Period**: Requests 7 days past `licenseExpiredAt` are rejected with HTTP 403.
- **Capacity Overflow**: Adding employees beyond `tenant.settings.maxUsers` is blocked at the `employees.js` service hook layer.
