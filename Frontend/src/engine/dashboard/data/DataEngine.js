/**
 * Dashboard Engine — Data Engine (§2.7)
 *
 * Widgets NEVER call APIs directly. The Data Engine:
 *  1. Collects all dataSource keys from the dashboard schema
 *  2. Deduplicates and batches API calls
 *  3. Maps responses to widget data payloads
 *  4. Manages refresh intervals per widget
 *  5. Sets data.status (loading | ready | empty | error | stale)
 *
 * In Phase 1, this wraps the existing /dashboard/stats endpoint.
 * In Phase 5, it switches to the query-based backend.
 */
import { DATA_STATUS } from '../registry/widgetManifest';

/**
 * Data source registry — maps named queries to API configuration.
 * Admin configures which query a widget uses (Phase 5).
 * For now, all queries resolve from the single /dashboard/stats response.
 */
const DATA_SOURCES = {
  // Pulse & Org
  'pulse': { path: 'pulse' },
  'pulse.total': { path: 'pulse.total' },
  'pulse.attendanceRate': { path: 'pulse.attendanceRate' },
  'pulse.present': { path: 'pulse.present' },
  'pulse.leave': { path: 'pulse.leave' },
  'pulse.wfh': { path: 'pulse.wfh' },
  'pulse.late': { path: 'pulse.late' },
  'pulse.unchecked': { path: 'pulse.unchecked' },

  // Stats
  'stats': { path: 'stats' },
  'stats.pendingApprovals': { path: 'stats.pendingApprovals' },
  'stats.overdueTasks': { path: 'stats.overdueTasks' },
  'stats.openTickets': { path: 'stats.openTickets' },
  'stats.attendanceIssues': { path: 'stats.attendanceIssues' },
  'stats.payrollStatus': { path: 'stats.payrollStatus' },
  'stats.payrollCost': { path: 'stats.payrollCost' },
  'stats.workforceHealth': { path: 'stats.workforceHealth' },
  'stats.financialExposure': { path: 'stats.financialExposure' },

  // Employee
  'employee.attendance': { path: 'employee.attendance' },
  'employee.tasks': { path: 'employee.tasks' },
  'employee.leaveBalance': { path: 'employee.leaveBalance' },

  // Collections
  'actionCenter': { path: 'actionCenter' },
  'teamGrid': { path: 'teamGrid' },
  'celebrations': { path: 'celebrations' },
  'alerts': { path: 'alerts' },
};

/**
 * Resolve a dotted path from an object.
 * @param {Object} obj - source object
 * @param {string} path - dotted path (e.g. "pulse.total")
 * @returns {*} resolved value
 */
function resolvePath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * Hydrate widget descriptors with data from the dashboard stats response.
 *
 * @param {Array<Object>} widgets - widget descriptors from schema
 * @param {Object|null} dashboardData - raw response from /dashboard/stats
 * @param {boolean} loading - whether data is currently loading
 * @param {string|null} error - error message if fetch failed
 * @returns {Array<Object>} widgets with hydrated data payloads
 */
export function hydrateWidgets(widgets, dashboardData, loading, error) {
  return widgets.map((widget) => {
    const dataSource = widget.config?.dataSource;

    // Loading state
    if (loading) {
      return {
        ...widget,
        data: { status: DATA_STATUS.LOADING, payload: null },
      };
    }

    // Error state
    if (error) {
      return {
        ...widget,
        data: { status: DATA_STATUS.ERROR, error, payload: null },
      };
    }

    // No data source configured — use static data if present
    if (!dataSource) {
      const existingData = widget.data;
      if (existingData?.payload !== undefined) return widget;
      return {
        ...widget,
        data: { status: DATA_STATUS.READY, payload: existingData?.payload || {} },
      };
    }

    // Resolve data from the dashboard response
    if (!dashboardData) {
      return {
        ...widget,
        data: { status: DATA_STATUS.EMPTY, payload: null },
      };
    }

    const pathKey = DATA_SOURCES[dataSource]?.path || dataSource;
    const resolved = resolvePath(dashboardData, pathKey);

    // Determine status
    let status = DATA_STATUS.READY;
    if (resolved === undefined || resolved === null) {
      status = DATA_STATUS.EMPTY;
    } else if (Array.isArray(resolved) && resolved.length === 0) {
      status = DATA_STATUS.EMPTY;
    }

    return {
      ...widget,
      data: { status, payload: resolved },
    };
  });
}

/**
 * Collect unique data sources from a widget list.
 * Used to determine which API calls to make.
 * @param {Array<Object>} widgets
 * @returns {string[]} unique data source keys
 */
export function collectDataSources(widgets) {
  const sources = new Set();
  widgets.forEach((w) => {
    if (w.config?.dataSource) sources.add(w.config.dataSource);
  });
  return [...sources];
}
