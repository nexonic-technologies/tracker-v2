# Settings Module Brain

## Overview
This module manages sidebar/menu configuration, role-permissions (RBAC/ABAC), and the new CBAC (Capability-Based Access Control) system for UI visibility.

## Backend Models
| Model | File | Lines | References |
|---|---|---|---|
| SideBar | SideBar.js | 52 | departments, designations, sidebars, resources |
| Capability | Capability.js | 28 | — (standalone key/module/label) |
| Role | Role.js | 30 | capabilities[] (ObjectId refs to Capability) |
| access_policies | access_policies.js | 39 | roles |
| Resource | Resource.js | 45 | — (key, modelName, displayName) |

## Backend Services
| Service File | Hooks | Notes |
|---|---|---|
| `roles.js` | `afterUpdate` | Increments `permissionVersion`, calls `invalidatePermissions()` to refresh caches + socket broadcast |
| `sidebars.js` | various | Menu item lifecycle hooks |

## Frontend Pages
| Page | File | Purpose |
|---|---|---|
| Menu List | `Settings/Menu/index.jsx` | Sidebar item CRUD table. Actions guarded by `hasCapability('Sidebar:create/edit/delete')` |
| Menu Form | `Settings/Menu/form.jsx` | Two-tab form: **Menu Item** (title, route, icon, parent, order) + **Capabilities** (linked resource, auto-generate CRUD, custom capability creation) |
| Role Permissions | `Settings/role-permissions.jsx` | RBAC/ABAC policy editor for models |
| Designation Permissions | `Settings/designation-permissions.jsx` | CBAC capability assignment per designation/role |

## CBAC Architecture (Capability-Based Access Control)

### How It Works
1. **Capabilities** are key strings like `Sidebar:view`, `Employee:create`, `Feed:view`
2. **Roles** have a `capabilities[]` array of ObjectId refs to Capability documents
3. On login/context refresh, `buildUserContext()` resolves capabilities → string array → sent to frontend as `uiCapabilities`
4. Frontend `PermissionProvider` exposes `hasCapability(key)` to check UI visibility

### Permission Flow
```
Role.capabilities[] → buildUserContext() → context.uiCapabilities → PermissionProvider.hasCapability()
```

### Cache Invalidation Flow
```
Role updated → roles.service afterUpdate → $inc permissionVersion → invalidatePermissions(roleId)
  → setCache() refreshes policy + roleMeta caches
  → Socket broadcast to connected clients
  → ETag changes → next /auth/me/context returns fresh data (not 304)
```

### Key Rules
- **Sidebar visibility**: Controlled by CBAC, NOT by deprecated `allowedDepartments`/`allowedDesignations` fields
- **All sidebar items** have `visibility: "protected"` — CBAC controls who sees what
- **Menu form** removed deprecated fields; capabilities are managed via the Capabilities tab
- **`hasCapability(key)`** checks `uiCapabilities` array (CBAC) — use for in-page button visibility
- **`can(action, model)`** checks `access_policies` (ABAC) — use for data-level CRUD permissions

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|
| Menu/index.jsx | POST | /populate/read/sidebars | sidebars |
| Menu/index.jsx | DELETE | /populate/delete/sidebars/${id} | sidebars |
| Menu/form.jsx | GET | /populate/read/sidebars/${id} | sidebars |
| Menu/form.jsx | POST | /populate/create/sidebars | sidebars |
| Menu/form.jsx | PUT | /populate/update/sidebars/${id} | sidebars |
| Menu/form.jsx | GET | /populate/read/resources/${id} | resources |
| Menu/form.jsx | POST | /populate/read/capabilities | capabilities |
| Menu/form.jsx | POST | /populate/create/capabilities | capabilities |
| Menu/form.jsx | DELETE | /populate/delete/capabilities/${id} | capabilities |
| role-permissions.jsx | POST | /populate/read/roles | roles |
| role-permissions.jsx | GET | /populate/read/access_policies | access_policies |
| role-permissions.jsx | POST | /populate/bulk-upsert/access_policies | access_policies |
