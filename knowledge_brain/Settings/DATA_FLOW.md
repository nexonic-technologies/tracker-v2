# Data Flow: Settings

## Menu Management Flow
```
Admin → Menu/index.jsx (list) → POST /populate/read/sidebars
Admin → "+ Add" button (guarded by hasCapability('Sidebar:create'))
Admin → Menu/form.jsx → Tab: "Menu Item" (title, route, icon, parent, order)
                       → Tab: "Capabilities" (linked resource, auto-generate, custom add)
Admin → Submit → POST /populate/create/sidebars (or PUT for edit)
```

## Capabilities Auto-Generation Flow
```
Admin selects Linked Resource (e.g., "employees")
  → form.jsx fetches Resource details → derives prefix ("Employee")
  → "Auto-generate CRUD" button creates:
    - Employee:view, Employee:create, Employee:edit, Employee:delete
  → Each capability: POST /populate/create/capabilities
  → Custom capabilities can also be added (e.g., Employee:approve)
```

## Permission Assignment Flow
```
Admin → designation-permissions.jsx
  → Lists all roles with their assigned capabilities
  → Toggle capabilities on/off per role
  → Saves: PUT /populate/update/roles/${roleId} (updates capabilities[] array)
  → Triggers roles.service afterUpdate hook
  → $inc permissionVersion + invalidatePermissions()
  → All logged-in users with that role get fresh context on next poll
```

## Role Permission (ABAC) Flow
```
Admin → role-permissions.jsx
  → POST /populate/read/roles (list all roles)
  → GET /populate/read/access_policies (fetch existing policies)
  → Admin configures CRUD permissions per model per role
  → POST /populate/bulk-upsert/access_policies (save policies)
```
