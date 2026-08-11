# Core Module Brain

## Overview
This module contains the platform's core runtime: the Populate Engine, Policy Engine, CBAC system, cache layer, and authentication infrastructure.

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

## Populate Engine Critical Fixes (2026-07-05)

### Path Collision Fix (`buildReadQuery.js`)
**Problem**: Mongoose "Path collision at professionalInfo" error when populating nested refs.

**Root Cause**: The old tree-based populate builder split `professionalInfo.designation` into a tree where `professionalInfo` was the parent node. `Model.schema.path('professionalInfo')` returns `undefined` for nested subdocument parents, so the fallback incorrectly treated it as a ref (`isRef = true`). Mongoose then tried `.populate({ path: 'professionalInfo', populate: [...] })` — but `professionalInfo` is NOT a ref.

**Fix**: Replaced tree-based approach with **flat populate**. Each full dot-notation path (e.g., `professionalInfo.designation`) is checked directly against the schema. Non-ref paths are skipped.

### sanitizeRead Path Collision Guard
Added deduplication in `sanitizeRead.js` to automatically collapse parent/child field selections:
- `['professionalInfo', 'professionalInfo.designation']` → `['professionalInfo']`
- Prevents Mongoose projection conflicts globally (main queries AND populated sub-queries)

### Validator.js Bug Fix
Found and fixed `if (fields) // console.log(...)` pattern that was swallowing the next statement. This caused `bodyValidator` to be skipped for create/update actions when `fields` was falsy — a security-impacting bug.

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|
| Teams.jsx | POST | /populate/read/employees | employees |
| useGenericAPI.js | POST | /populate/create/${model} | ${model} |
| useGenericAPI.js | PUT | /populate/update/${model}/${id} | ${model} |
| useGenericAPI.js | DELETE | /populate/delete/${model}/${id} | ${model} |
| useGenericAPI.js | POST | /populate/bulk-create/${model} | ${model} |
| useGenericAPI.js | PUT | /populate/bulk-update/${model} | ${model} |
| useGenericAPI.js | DELETE | /populate/bulk-delete/${model} | ${model} |
