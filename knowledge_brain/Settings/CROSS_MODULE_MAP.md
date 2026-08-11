# Cross-Module Map: Settings

## Upstream Dependencies (Settings depends on)
| Module | Dependency | Reason |
|---|---|---|
| Core | `Role` model | Stores capabilities[] for CBAC |
| Core | `Capability` model | Defines capability keys |
| Core | `Resource` model | Links menu items to model resources |
| Core | `access_policies` model | ABAC permission rules per role per model |
| Core | `permissionInvalidator.js` | Cache invalidation on role update |
| Core | `cache.js` | `getRoleMeta()`, `getCacheVersion()` |
| Core | `contextBuilder.js` | `buildUserContext()` resolves capabilities |
| Frontend_Core | `permissionProvider.jsx` | `hasCapability()`, `can()` |

## Downstream Dependents (depends on Settings)
| Module | Dependency | Reason |
|---|---|---|
| ALL modules | Sidebar visibility | CBAC controls which menu items are visible |
| ALL modules | CRUD permissions | access_policies control data-level access |
| ALL modules | Button visibility | `hasCapability()` guards action buttons |
| Feed | `Feed:view` capability | Controls Feed menu visibility |
| Dashboard | `Dashboard:view` capability | Controls Dashboard menu visibility |
