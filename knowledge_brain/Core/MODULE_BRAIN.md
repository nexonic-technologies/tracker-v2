# Core Module Brain

## Overview
This module contains the platform's core runtime: the Populate Engine, Policy Engine, Multi-Tenant Database Connection Manager, CBAC system, cache layer, and authentication infrastructure.

## Authentication & Performance Architecture (Login Latency Optimization)
- **Zero Cold-Start Pre-Warming**: `Backend/src/index.js` (`initApp()`) pre-warms default and active tenant database connections, static model compilations, dynamic schema definitions, and indexes at server startup. This prevents cold-start delays on initial user logins.
- **Stage Timing Telemetry**: `AuthController.login` measures and emits high-resolution timing breakdowns (`performance.now()`) for:
  - `globalUserLookup`: Global DB identity query
  - `bcryptCompare`: Password hash comparison
  - `tenantResolve`: Tenant record and active module lookup
  - `tenantConnection`: `TenantConnectionManager.getTenantConnection` (instant RAM cache hit after pre-warm)
  - `empLookup`: Tenant Employee and populated Role query (`.lean()`)
  - `tokenSign`: JWT access/refresh secret token generation
  - `sessionCreate`: Database Session record creation

## Backend Models
| Model | File | Lines | References |
|---|---|---|---|
| access_policies | access_policies.js | 39 | roles |
| Role | Role.js | 30 | capabilities[] (ObjectId refs to Capability) |
| Capability | Capability.js | 28 | — (key, module, label, description) |
| Resource | Resource.js | 45 | — (key, modelName, displayName) |
| AgentToken | AgentToken.js | 27 | Client |
| ApiHitLog | ApiHitLog.js | 25 | employees |
| AuditLog | AuditLog.js | 24 | — |
| Collection | Collection.js | 73 | — (model registry) |
| email_config | email_config.js | 63 | — |
| ErrorLog | ErrorLog.js | 12 | employees |
| Session | Session.js | 67 | employees |
| SideBar | SideBar.js | 52 | departments, designations, sidebars, resources |

## Backend Services (Business Logic Hooks)
| Service File | Lines | Exported Functions |
|---|---|---|
| roles.js | 19 | `afterUpdate` — $inc permissionVersion + invalidatePermissions |
| sidebars.js | 148 | Menu lifecycle hooks |
| databaseIndexer.js | 276 | Index management |
| attendanceService.js | 203 | Attendance computation |
| computationService.js | 440 | Payroll computation |
| jobQueue.js | 89 | Background job processing |
| raceConditionHandler.js | 475 | Optimistic/pessimistic locking |
| requestQueue.js | 363 | Request rate limiting |

## CBAC (Capability-Based Access Control)

### Architecture
```
Capability model (key/module/label) ← Role.capabilities[] (ObjectId refs)
                                    ↓
         buildUserContext() resolves capabilities → string array
                                    ↓
         /auth/me/context returns { uiCapabilities: ["Feed:view", "Sidebar:create", ...] }
                                    ↓
         PermissionProvider.hasCapability(key) → boolean
```

### Key Functions
| Utility | File | Usage |
|---|---|---|
| `hasCapability(key)` | `context/permissionProvider.jsx` | Checks if key exists in `uiCapabilities` array (CBAC) |
| `can(action, model)` | `context/permissionProvider.jsx` | Checks `access_policies` (ABAC) for data CRUD |
| `invalidatePermissions(roleId)` | `utils/permissionInvalidator.js` | Refreshes policy + roleMeta caches, broadcasts via socket |
| `getRoleMeta(roleId)` | `utils/cache.js` | Returns cached role metadata (permissionVersion, capabilities[]) |
| `getCacheVersion()` | `utils/cache.js` | Returns global cache version counter |

### ETag / 304 Caching
```
ETag = W/"${userId}-${roleId}-${permissionVersion}-${cacheVersion}"
Client sends If-None-Match → if matches → 304 (no body)
Role update → permissionVersion++ → ETag changes → next request gets fresh context
```
