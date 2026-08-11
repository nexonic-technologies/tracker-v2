# Tenant Module — Method & Component Index

Alphabetical lookup index of functions, methods, schemas, and React components in the Tenant module.

## 1. Backend Functions & Methods (Alphabetical)

| Method / Function | File | Lines | Purpose | Callers |
|---|---|---|---|---|
| `clearCache()` | [TenantConnectionManager.js](file:///e:/Loigmax/trackerV1/Backend/src/tenant/TenantConnectionManager.js) | L138-L140 | Clears entire RAM connection pool | AdminControlController.js |
| `clearTenantCache(dbName)` | [TenantConnectionManager.js](file:///e:/Loigmax/trackerV1/Backend/src/tenant/TenantConnectionManager.js) | L114-L120 | Clears specific tenant connection from LRU cache | AdminControlController.js |
| `compileTenantModels(conn, modules)` | [tenantRegistry.js](file:///e:/Loigmax/trackerV1/Backend/src/models/tenantRegistry.js) | L1-L80 | Compiles schemas onto tenant connection | TenantConnectionManager.js |
| `createTenant(req, res)` | [AdminControlController.js](file:///e:/Loigmax/trackerV1/Backend/src/Controller/AdminControlController.js) | L45-L110 | Controller action for tenant provisioning | adminSystemRoutes.js |
| `getAllTenants(req, res)` | [AdminControlController.js](file:///e:/Loigmax/trackerV1/Backend/src/Controller/AdminControlController.js) | L115-L160 | Lists all active and suspended tenants | adminSystemRoutes.js |
| `getModel(tenantContext, modelName)` | [TenantConnectionManager.js](file:///e:/Loigmax/trackerV1/Backend/src/tenant/TenantConnectionManager.js) | L99-L112 | Safely resolves Mongoose model from tenantContext | Express Controllers / Generic API |
| `getProvisioningRun(req, res)` | [AdminControlController.js](file:///e:/Loigmax/trackerV1/Backend/src/Controller/AdminControlController.js) | L165-L195 | Polls status of provisioning run by runId | adminSystemRoutes.js |
| `getTenantConnection(dbName, modules)` | [TenantConnectionManager.js](file:///e:/Loigmax/trackerV1/Backend/src/tenant/TenantConnectionManager.js) | L33-L78 | Resolves or creates cached connection for tenant DB | tenantContext middleware |
| `invalidate(tenantIdOrDbName)` | [TenantConnectionManager.js](file:///e:/Loigmax/trackerV1/Backend/src/tenant/TenantConnectionManager.js) | L84-L91 | Evicts tenant connection from LRU cache | AdminControlController.js |
| `provisionTenant(params)` | [tenantSeedingService.js](file:///e:/Loigmax/trackerV1/Backend/src/utils/tenantSeedingService.js) | L16-L439 | 9-stage atomic tenant provisioning handler | AdminControlController.js |
| `runTenantMigrations(conn)` | [TenantMigrationRunner.js](file:///e:/Loigmax/trackerV1/Backend/src/tenant/TenantMigrationRunner.js) | L1-L60 | Applies schema migrations non-destructively | TenantConnectionManager.js |
| `seedTenantDatabase(params)` | [tenantSeedingService.js](file:///e:/Loigmax/trackerV1/Backend/src/utils/tenantSeedingService.js) | L441-L740 | Seeds roles, sidebars, policies, and super admin employee | provisionTenant & CLI seeders |
| `tenantContextMiddleware(req, res, next)` | [tenantContext.js](file:///e:/Loigmax/trackerV1/Backend/src/tenant/tenantContext.js) | L1-L80 | Resolves tenant ID from domain/headers & attaches context | Express App Server |
| `updateTenantModules(req, res)` | [AdminControlController.js](file:///e:/Loigmax/trackerV1/Backend/src/Controller/AdminControlController.js) | L240-L290 | Updates entitled module list for a tenant | adminSystemRoutes.js |
| `updateTenantStatus(req, res)` | [AdminControlController.js](file:///e:/Loigmax/trackerV1/Backend/src/Controller/AdminControlController.js) | L200-L235 | Toggles tenant status (Active / Suspended) | adminSystemRoutes.js |
| `validateDbName(dbName)` | [TenantConnectionManager.js](file:///e:/Loigmax/trackerV1/Backend/src/tenant/TenantConnectionManager.js) | L16-L25 | Regex check against SQL/NoSQL injection in DB names | getTenantConnection |

---

## 2. React Components (Alphabetical)

| Component | File | Lines | Purpose | Endpoints Consumed |
|---|---|---|---|---|
| `DatabaseUtilization` | [db-utilization.jsx](file:///e:/Loigmax/trackerV1/Frontend/src/platformAdmin/db-utilization.jsx) | L1-L210 | Connection pool stats & DB size metrics | `/api/admin/metrics/db` |
| `ModuleManagement` | [module-management.jsx](file:///e:/Loigmax/trackerV1/Frontend/src/platformAdmin/module-management.jsx) | L1-L320 | Platform-wide module catalog editor | `/api/admin/modules` |
| `TenantManagement` | [tenant-management.jsx](file:///e:/Loigmax/trackerV1/Frontend/src/platformAdmin/tenant-management.jsx) | L1-L480 | Tenant listing, status toggle, module updater | `/api/admin/tenants` |
| `TenantProvisioning` | [tenant-provisioning.jsx](file:///e:/Loigmax/trackerV1/Frontend/src/platformAdmin/tenant-provisioning.jsx) | L1-L550 | Multi-step provisioning wizard with live SSE/polling | `/api/admin/tenants/provision` |
