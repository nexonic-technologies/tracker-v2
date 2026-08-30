import { getUserCapabilities } from './cbacCacheService.js';
import { getPolicy } from './cache.js';

/**
 * Check if a menu item should be visible to a user
 *
 * Visibility Logic:
 * 1. Super Admin: Always visible
 * 2. Public / Utility items: Always visible
 * 3. Access Policies: User's role has read permission on the model
 * 4. Sidebar capabilities: User's role has matching capability
 *
 * @param {Object} menuItem - Sidebar menu item with populated capabilities
 * @param {Object} user - User object with designation, role
 * @param {Set<string>} userCapabilities - User's CBAC capabilities
 * @param {Object} roleMeta - Role metadata with capabilities array
 * @returns {boolean} Whether the menu item should be visible
 */
function normalizeCap(cap) {
  if (!cap) return '';
  let key = (typeof cap === 'string' ? cap : (cap.key || cap.name || '')).toLowerCase().trim();
  if (key.includes(':')) {
    const parts = key.split(':');
    let module = parts[0];
    if (module.endsWith('s') && module !== 'hrms' && module !== 'crm' && module !== 'status') {
      module = module.slice(0, -1);
    }
    return `${module}:${parts[1]}`;
  }
  return key;
}

const UTILITY_ROUTES = new Set(['/logout', '/profile', '/search']);

function isUtilityRoute(route) {
  if (!route) return false;
  return UTILITY_ROUTES.has(route.toLowerCase().trim());
}

export function isMenuItemVisible(menuItem, user, userCapabilities, roleMeta) {
  // Super Admin bypasses visibility checks and can see all menu items
  if (roleMeta?.isSuperAdmin || user?.isSuperAdmin) {
    return true;
  }

  // 1. Public or utility routes always visible
  if (menuItem.visibility === 'public' || isUtilityRoute(menuItem.mainRoute)) {
    return true;
  }

  // 2. Check access_policies permission (Single Source of Truth)
  const routeKey = menuItem.mainRoute ? menuItem.mainRoute.replace(/^\//, '').split('/')[0].toLowerCase() : '';
  const modelName = menuItem.modelName?.toLowerCase() || (menuItem.key ? menuItem.key.toLowerCase() : '') || routeKey;

  const MODULE_MODELS = {
    attendance: ['attendances', 'leaves', 'regularizations', 'shifts', 'time_tracker_sessions', 'daily_activities'],
    payroll: ['payrolls', 'payroll_runs', 'salary_structures', 'period_closures'],
    hrms: ['employees', 'departments', 'designations', 'onboardings', 'job_openings', 'candidates'],
    crm: ['contacts', 'orders', 'quotations', 'payments'],
    assets: ['assets', 'asset_allocations', 'asset_incidents']
  };

  const modelsToCheck = [modelName, ...(MODULE_MODELS[modelName] || [])].filter(Boolean);

  for (const m of modelsToCheck) {
    const policy = (roleMeta?.id ? getPolicy(roleMeta.id, m) : null) ||
      (roleMeta?.name ? getPolicy(roleMeta.name, m) : null) ||
      getPolicy(roleMeta?.id, `${m}s`) ||
      getPolicy(roleMeta?.name, `${m}s`) ||
      getPolicy(roleMeta?.id, m.replace(/s$/, '')) ||
      getPolicy(roleMeta?.name, m.replace(/s$/, ''));

    if (policy && policy.permissions && policy.permissions.read === true) {
      return true;
    }
  }

  // 3. Check sidebar capabilities for protected items (Unified CBAC)
  if (menuItem.capabilities && menuItem.capabilities.length > 0) {
    const roleCaps = (roleMeta?.capabilities || []).map(normalizeCap);
    const cbacCaps = userCapabilities instanceof Set
      ? Array.from(userCapabilities).map(normalizeCap)
      : (Array.isArray(userCapabilities) ? userCapabilities.map(normalizeCap) : []);
    const allUserCaps = new Set([...roleCaps, ...cbacCaps]);

    const requiredCaps = menuItem.capabilities.map(c => normalizeCap(c.key || c));
    const hasCapability = requiredCaps.some(cap => allUserCaps.has(cap) || roleCaps.includes(cap));
    if (hasCapability) {
      return true;
    }
  }

  // 4. If item is a parent container with children, allow tree construction to inspect children
  if (menuItem.isParent || menuItem.hasChildren) {
    return true;
  }

  return false;
}

/**
 * Filter menu items based on user capabilities and designation/role
 *
 * @param {Array} menuItems - Array of sidebar menu items
 * @param {Object} user - User object
 * @param {Object} roleMeta - Role metadata with sidebarCapabilities
 * @returns {Promise<Array>} Filtered menu items
 */
export async function filterMenuItems(menuItems, user, roleMeta) {
  if (!user || !menuItems) {
    return [];
  }

  // Get user's CBAC capabilities
  const userCapabilities = await getUserCapabilities(user);

  // Filter menu items
  const visibleItems = menuItems.filter(item =>
    isMenuItemVisible(item, user, userCapabilities, roleMeta)
  );

  return visibleItems;
}

/**
 * Build menu tree with parent-child relationships
 *
 * @param {Array} menuItems - Flat array of menu items
 * @param {Object} user - User object
 * @param {Object} roleMeta - Role metadata with sidebarCapabilities
 * @returns {Promise<Array>} Hierarchical menu tree
 */
export async function buildMenuTree(menuItems, user, roleMeta) {
  const visibleItems = await filterMenuItems(menuItems, user, roleMeta);

  // Helper to map and clean a menu item's fields to keep only the minimum UI fields
  const cleanMenuItem = (item) => ({
    _id: item._id?.toString() || item._id,
    title: item.title,
    icon: item.icon,
    mainRoute: item.mainRoute,
    visibility: item.visibility,
    parentId: item.parentId?.toString() || item.parentId || null,
    hasChildren: !!item.hasChildren,
    isParent: !!item.isParent,
    order: item.order || 0
  });

  // Recursive function to build children hierarchy
  const buildSubTree = (parentIdStr, parentRoute) => {
    return visibleItems
      .filter(child => {
        const childParentIdStr = child.parentId?.toString();
        return childParentIdStr === parentIdStr || child.parentId === parentRoute?.replace(/^\//, '');
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(child => {
        const childIdStr = child._id?.toString() || child._id;
        const subChildren = buildSubTree(childIdStr, child.mainRoute);
        return {
          ...cleanMenuItem(child),
          children: subChildren,
          hasChildren: subChildren.length > 0 || !!child.hasChildren
        };
      });
  };

  // Top-level parents have isParent=true and no parentId
  const parents = visibleItems
    .filter(item => (item.isParent && !item.parentId) || !item.parentId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const tree = parents.map(parent => {
    const parentIdStr = parent._id?.toString() || parent._id;
    const parentChildren = buildSubTree(parentIdStr, parent.mainRoute);
    return {
      ...cleanMenuItem(parent),
      children: parentChildren,
      hasChildren: parentChildren.length > 0 || !!parent.hasChildren
    };
  });

  // Remove empty parent containers (only if parent has no children and has no valid mainRoute)
  return tree.filter(parent => {
    const hasRoute = parent.mainRoute && parent.mainRoute !== '#';
    if (parent.hasChildren && !hasRoute && (!parent.children || parent.children.length === 0)) {
      return false;
    }
    return true;
  });
}

/**
 * Get menu visibility summary stats for a user
 *
 * @param {Array} menuItems - All menu items
 * @param {Object} user - User object
 * @param {Object} roleMeta - Role metadata with sidebarCapabilities
 * @returns {Promise<Object>} Visibility stats
 */
export async function getMenuVisibilityStats(menuItems, user, roleMeta) {
  const visibleItems = await filterMenuItems(menuItems, user, roleMeta);

  return {
    total: menuItems.length,
    visible: visibleItems.length,
    hidden: menuItems.length - visibleItems.length,
    percentage: Math.round((visibleItems.length / menuItems.length) * 100)
  };
}

/**
 * Check if user can access a specific route
 *
 * @param {string} route - Route path
 * @param {Object} user - User object
 * @param {Object} roleMeta - Role metadata with capabilities array
 * @returns {Promise<boolean>} Whether user can access the route
 */
export async function canAccessRoute(route, user, roleMeta) {
  if (!user) return false;

  const userCapabilities = await getUserCapabilities(user);
  const userCaps = roleMeta?.capabilities || [];

  // For now, allow access if user has any capabilities
  // In the future, this can be enhanced with route-to-capability mapping
  if (userCaps.length > 0) {
    return true;
  }

  // Fallback: allow access (backward compatibility)
  return true;
}

export default {
  isMenuItemVisible,
  filterMenuItems,
  buildMenuTree,
  getMenuVisibilityStats,
  canAccessRoute
};
