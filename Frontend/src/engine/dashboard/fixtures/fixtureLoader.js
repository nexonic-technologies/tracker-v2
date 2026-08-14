/**
 * Dashboard Engine — Fixture Loader
 *
 * Resolves static dashboard JSON schemas based on role name.
 * This is the Phase 1 fallback. In Phase 5, this is replaced by
 * a fetch to /api/dashboard/schema/:roleId.
 *
 * One role = one dashboard (confirmed requirement).
 */
import adminDashboard from './admin-dashboard.json';
import managerDashboard from './manager-dashboard.json';
import employeeDashboard from './employee-dashboard.json';

/** Role name → fixture mapping */
const FIXTURE_MAP = {
  'super admin': adminDashboard,
  superadmin: adminDashboard,
  admin: adminDashboard,
  manager: managerDashboard,
  employee: employeeDashboard,
};

/**
 * Get the dashboard fixture for a given role name.
 * Falls back to employee dashboard for unknown roles.
 *
 * @param {string} roleName - lowercase role name
 * @returns {Object} dashboard schema
 */
export function getFixtureForRole(roleName) {
  if (!roleName) return employeeDashboard;
  const normalized = String(roleName).toLowerCase().trim();
  return FIXTURE_MAP[normalized] || FIXTURE_MAP[normalized.replace(/\s+/g, '')] || employeeDashboard;
}
