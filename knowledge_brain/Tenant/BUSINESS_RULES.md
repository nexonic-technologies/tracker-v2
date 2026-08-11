# Tenant Module — Business Rules & Constraints

Catalog of business rules, schema validations, and security constraints governing multi-tenancy.

## Business Rule Catalog

### RULE-TENANT-001: Strict Slug Formatting & Global Uniqueness
- **Formula**: `slug` must be lowercase alphanumeric only (no spaces, hyphens, or special characters).
- **Implementation**: [Tenant.js:L17-L24](file:///e:/Loigmax/trackerV1/Backend/src/models/global/Tenant.js#L17-L24) + [tenantSeedingService.js:L28](file:///e:/Loigmax/trackerV1/Backend/src/utils/tenantSeedingService.js#L28).
- **Validation**: Both Frontend form validation (`tenant-provisioning.jsx`) and Mongoose unique index.
- **Edge Cases**: Attempting to provision `Acme Corp!` transforms slug to `acmecorp`.

### RULE-TENANT-002: Database Name Sanitization & Injection Prevention
- **Formula**: `dbName` must match `/^[a-zA-Z0-9_-]+$/`.
- **Implementation**: [TenantConnectionManager.js:L16-L25](file:///e:/Loigmax/trackerV1/Backend/src/tenant/TenantConnectionManager.js#L16-L25).
- **Validation**: Backend guard executed before any Mongoose `useDb()` call.
- **Edge Cases**: Direct API calls attempting path traversal (`../`) or command injection are immediately rejected with error.

### RULE-TENANT-003: Mandatory Module Entitlement Flagging
- **Formula**: Every tenant must have at least 1 enabled module key unless explicitly flagged as `allowAllModules: true`.
- **Implementation**: [tenantSeedingService.js:L446-L453](file:///e:/Loigmax/trackerV1/Backend/src/utils/tenantSeedingService.js#L446-L453).
- **Validation**: Backend service layer guard.
- **Edge Cases**: Empty module selection throws `[tenantSeedingService] Tenant must have at least one enabled module`.

### RULE-TENANT-004: Parent-Child Sidebar Hierarchy Integrity
- **Formula**: A tenant database receives sidebars filtered by `enabledModuleKeys`. If a parent sidebar is excluded by entitlement, child sidebars referencing that parent are rejected to prevent broken UI trees.
- **Implementation**: [tenantSeedingService.js:L600-L640](file:///e:/Loigmax/trackerV1/Backend/src/utils/tenantSeedingService.js#L600-L640).
- **Validation**: Backend seeding script.
- **Edge Cases**: Logged as `[tenantSeedingService] ⚠ Rejected N orphaned child sidebar(s)`.

### RULE-TENANT-005: Atomic 9-Stage Provisioning Rollback & Audit
- **Formula**: Tenant creation runs through 9 discrete stages tracked in `ProvisioningRun`. If any stage fails, `ProvisioningRun.status` is set to `failed` with stage-specific error logs.
- **Implementation**: [tenantSeedingService.js:L33-L438](file:///e:/Loigmax/trackerV1/Backend/src/utils/tenantSeedingService.js#L33-L438).
- **Validation**: Backend transaction & progress tracking wrapper.
- **Edge Cases**: Partially created tenant databases can be inspected via `runId`.

### RULE-TENANT-006: License Expiry & 7-Day Grace Period Enforcement
- **Formula**: `licenseExpiredAt` defaults to +1 Year (`Annual`) or +1 Month (`Monthly`) from provisioning. Incoming requests past `licenseExpiredAt` are allowed within a 7-day grace period with header warning (`X-Tenant-License-Warning`). Beyond 7 days, requests are blocked with HTTP 403 `LICENSE_EXPIRED`.
- **Implementation**: [Tenant.js:L56-L61](file:///e:/Loigmax/trackerV1/Backend/src/models/global/Tenant.js#L56-L61) + [tenantMiddleware.js:L77-L93](file:///e:/Loigmax/trackerV1/Backend/src/middlewares/tenantMiddleware.js#L77-L93).
- **Validation**: Request middleware resolution gate.
- **Edge Cases**: Custom dates set by Super Admin override default monthly/annual calculations.

### RULE-TENANT-007: Payment Status Auto-Suspension & Reactivation
- **Formula**: Transitioning `paymentStatus` to `'Unpaid'` automatically sets `tenant.status = 'Suspended'`, evicts connection pool cache, and blocks API access (HTTP 402 `TENANT_UNPAID`). Transitioning `paymentStatus` to `'Paid'` automatically restores `tenant.status = 'Active'`.
- **Implementation**: [AdminControlController.js:L318-L325](file:///e:/Loigmax/trackerV1/Backend/src/Controller/AdminControlController.js#L318-L325) + [tenantMiddleware.js:L72-L75](file:///e:/Loigmax/trackerV1/Backend/src/middlewares/tenantMiddleware.js#L72-L75).
- **Validation**: Admin Control Plane controller & tenant middleware.
- **Edge Cases**: Inbound requests for unpaid tenants receive immediate 402 Payment Required response.

### RULE-TENANT-008: Maximum Active Users Capacity Guard
- **Formula**: Total non-terminated employees (`status` in `['Active', 'OnLeave', 'Probation']`) cannot exceed `tenant.settings.maxUsers` (default: 50).
- **Implementation**: [employees.js:L144-L165](file:///e:/Loigmax/trackerV1/Backend/src/services/employees.js#L144-L165).
- **Validation**: Service layer `beforeCreate` hook (enforced across forms, bulk imports, and generic API calls).
- **Edge Cases**: Reaching `maxUsers` throws `[MaxUsersExceeded] Maximum user limit reached for this tenant subscription`.
