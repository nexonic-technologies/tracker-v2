# UI Mapping Implementation Summary

## Overview

UI mapping has been implemented to map capabilities based on pages and provide menu item visibility based on designation + role + CBAC capabilities.

## What Was Implemented

### 1. Page-to-Capability Mapping Configuration

**File**: `src/config/pageCapabilityMapping.js`

Features:
- Maps frontend routes to CBAC capabilities
- Supports exact route matching and pattern matching for dynamic routes
- Helper functions:
  - `getCapabilityForRoute(route)` - Get capability for a specific route
  - `getRoutesForCapability(capability)` - Get all routes requiring a capability
  - `getAllMappings()` - Get all mappings

Example Mappings:
- `/dashboard` → `Dashboard:view`
- `/employees` → `Employee:view`
- `/employees/create` → `Employee:create`
- `/tickets/:id/edit` → `Ticket:edit`

### 2. Menu Visibility Service

**File**: `src/services/menuVisibilityService.js`

Features:
- Filters menu items based on user's CBAC capabilities
- Respects designation and role filters from sidebar
- Supports public vs protected visibility types
- Functions:
  - `isMenuItemVisible(menuItem, user, userCapabilities)` - Check single item
  - `filterMenuItems(menuItems, user)` - Filter all items
  - `buildMenuTree(menuItems, user)` - Build hierarchical menu tree
  - `getMenuVisibilityStats(menuItems, user)` - Get visibility statistics
  - `canAccessRoute(route, user)` - Check route access

Visibility Logic:
1. Public items: Always visible
2. Department filter: Applied regardless of capability
3. Designation filter: Applied regardless of capability
4. Protected items: Require capability check

### 3. Context Builder Integration

**File**: `src/utils/contextBuilder.js`

Changes:
- Imported `buildMenuTree` from menu visibility service
- Replaced manual sidebar filtering with CBAC-based filtering
- Maintains backward compatibility with `resourceKey` field
- Department/designation filtering still happens at DB level
- CBAC capability filtering applied after DB query

### 4. Frontend Capability Hook

**File**: `frontend/src/hooks/useCapability.js`

Features:
- React hook for checking CBAC capabilities
- Functions:
  - `hasCapability(capabilityKey)` - Check single capability
  - `hasAnyCapability(capabilityKeys)` - Check if any capability exists
  - `hasAllCapabilities(capabilityKeys)` - Check if all capabilities exist
  - `getCapabilitiesByPattern(pattern)` - Get capabilities matching pattern
  - `uiCapabilities` - Direct access to capability array

Usage:
```javascript
const { hasCapability } = useCapability();

if (hasCapability('Ticket:create')) {
  // Show create button
}
```

### 5. Capability Guard Component

**File**: `frontend/src/components/CapabilityGuard.jsx`

Features:
- Conditional rendering based on capabilities
- Supports single or multiple capabilities
- Modes: 'any' or 'all'
- Fallback content support
- HOC: `withCapability(capability, mode)`

Usage:
```javascript
<CapabilityGuard capability="Ticket:create">
  <Button>Create Ticket</Button>
</CapabilityGuard>

<CapabilityGuard capability={["Ticket:edit", "Ticket:delete"]} mode="any">
  <Button>Manage Ticket</Button>
</CapabilityGuard>
```

### 6. Sidebar Capability Seeding Script

**File**: `src/scripts/seedCapabilitiesFromSidebar.js`

Purpose:
- Generates CBAC capabilities from existing sidebar items
- Creates capability definitions for each unique route
- Grants all capabilities to super admin roles
- Uses DNS configuration for MongoDB

Route to Capability Mapping:
- `/employees` → `Employee:view`
- `/employees/create` → `Employee:create`
- `/employees/:id/edit` → `Employee:edit`

Usage:
```bash
node src/scripts/seedCapabilitiesFromSidebar.js
```

## How It Works

### Backend Flow

1. **User logs in** → JWT contains user info
2. **Context endpoint called** → `/api/auth/me/context`
3. **CBAC resolution** → `getUserCapabilities(user)` resolves capabilities
4. **Menu filtering** → `buildMenuTree(sidebarItems, user)` filters based on capabilities
5. **Response** → Returns `uiCapabilities` array and filtered `navigation` tree

### Frontend Flow

1. **Context received** → Stored in AuthContext
2. **Capability check** → `useCapability()` hook checks capabilities
3. **UI rendering** → `CapabilityGuard` conditionally renders elements
4. **Route protection** → Check capability before navigation

### Visibility Decision Matrix

| Visibility Type | Department Filter | Designation Filter | Capability Check | Result |
|---|---|---|---|---|
| Public | Pass | Pass | Skip | Visible |
| Public | Fail | Pass | Skip | Hidden |
| Protected | Pass | Pass | Pass | Visible |
| Protected | Pass | Pass | Fail | Hidden |
| Protected | Fail | Pass | Pass | Hidden |

## Deployment Steps

### 1. Seed Capabilities from Sidebar

```bash
node src/scripts/seedCapabilitiesFromSidebar.js
```

This creates:
- Capability definitions for all sidebar routes
- Grants for super admin roles (all capabilities)

### 2. Migrate access_policies to CBAC (Optional)

```bash
node src/scripts/migrateaccess_policiesToCBAC.js
```

This creates:
- Grants based on existing access_policies
- Role-based capability assignments

### 3. Update Frontend AuthContext

Add `uiCapabilities` to AuthContext:

```javascript
const [uiCapabilities, setUiCapabilities] = useState([]);

// In login/context response
setUiCapabilities(context.uiCapabilities || []);
```

### 4. Use Capability Hook in Components

```javascript
import { useCapability } from '../hooks/useCapability';

function MyComponent() {
  const { hasCapability } = useCapability();
  
  return (
    <div>
      {hasCapability('Ticket:create') && (
        <Button>Create Ticket</Button>
      )}
    </div>
  );
}
```

### 5. Use Capability Guard for Conditional Rendering

```javascript
import { CapabilityGuard } from '../components/CapabilityGuard';

<CapabilityGuard capability="Ticket:edit">
  <Button>Edit Ticket</Button>
</CapabilityGuard>
```

## Configuration

### Adding New Page Capabilities

1. Add to `pageCapabilityMapping.js`:
```javascript
{
  route: "/new-page",
  capability: "NewPage:view",
  description: "View new page"
}
```

2. Run seeding script to create capability definition
3. Create grants for appropriate roles

### Customizing Menu Visibility

1. Update sidebar item in SideBar collection
2. Set `visibility: "public"` for always-visible items
3. Set `visibility: "protected"` for capability-gated items
4. Add `allowedDepartments` and `allowedDesignations` as needed

### Role-Based Grants

Create grants for specific roles:
```javascript
await Grant.create({
  granteeType: 'role',
  roleId: roleId,
  capabilityKey: 'Ticket:view',
  effect: 'allow'
});
```

## Testing

### Test Menu Visibility

1. Create test users with different roles/designations
2. Login as each user
3. Check `/api/auth/me/context` response
4. Verify `uiCapabilities` array
5. Verify `navigation` tree is filtered correctly

### Test Route Access

1. Use `useCapability` hook in components
2. Navigate to different routes
3. Verify capability checks work
4. Test with users lacking capabilities

### Test Capability Guard

1. Wrap components with `CapabilityGuard`
2. Verify conditional rendering
3. Test fallback content
4. Test with multiple capabilities

## Troubleshooting

### Menu Items Not Showing

1. Check if capability exists in Capability collection
2. Check if grant exists for user's role
3. Check if department/designation filters match
4. Check sidebar item `visibility` field

### Capability Check Failing

1. Verify `uiCapabilities` in context response
2. Check CBAC cache initialization
3. Verify grant exists for user's role/designation
4. Check user override if applicable

### Sidebar Not Filtering

1. Verify `buildMenuTree` is called in contextBuilder
2. Check if user object has designation/role
3. Verify CBAC cache is initialized
4. Check server logs for errors

## Files Created/Modified

### Created:
- `src/config/pageCapabilityMapping.js`
- `src/services/menuVisibilityService.js`
- `frontend/src/hooks/useCapability.js`
- `frontend/src/components/CapabilityGuard.jsx`
- `src/scripts/seedCapabilitiesFromSidebar.js`

### Modified:
- `src/utils/contextBuilder.js`

### Not Modified:
- All existing authorization middleware
- All existing CRUD operations
- access_policies system (unchanged)

## Next Steps

1. Run `seedCapabilitiesFromSidebar.js` to generate capabilities
2. Update frontend AuthContext to include `uiCapabilities`
3. Use `useCapability` hook in components
4. Use `CapabilityGuard` for conditional rendering
5. Test with different role/designation combinations
6. Monitor for permission mismatches
