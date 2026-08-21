/**
 * Dashboard Engine — useDashboardSchema Hook
 *
 * Fetches the dashboard JSON schema for the current user's role.
 * In Phase 1: uses static JSON fixtures.
 * In Phase 5: fetches from the backend dashboard API.
 *
 * Also hydrates widgets with live data from /dashboard/stats.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/authProvider';
import { useUserRole } from '../../../hooks/useUserRole';
import axiosInstance from '../../../api/axiosInstance';
import { hydrateWidgets } from '../data/DataEngine';
import { DATA_STATUS } from '../registry/widgetManifest';

// Static fixtures — Phase 1 fallback
import { getFixtureForRole } from '../fixtures/fixtureLoader';

/**
 * @returns {{
 *   schema: Object|null,
 *   loading: boolean,
 *   error: string|null,
 *   refresh: Function
 * }}
 */
export function useDashboardSchema(initialDateRange = { range: '7d' }) {
  const { user } = useAuth();
  const { userRole, loading: roleLoading } = useUserRole();
  const userId = user?.id || user?._id;

  const [dateRange, setDateRange] = useState(initialDateRange);
  const [schema, setSchema] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Step 1: Load the dashboard schema (layout + widget configs)
  const loadSchema = useCallback(async () => {
    if (!userRole) return null;

    try {
      const normalized = (userRole || '').toLowerCase().trim();
      const res = await axiosInstance.post('/populate/read/dashboard_schemas', {
        filter: { role: normalized },
        limit: 1,
      });
      const doc = res.data?.data?.[0];
      if (doc && doc.widgets && doc.widgets.length > 0) {
        return { ...doc, isCustom: true };
      }
    } catch (err) {
      // If no custom schema saved yet or offline, fall back to default role fixture
    }

    // Default static fixture fallback
    return getFixtureForRole(userRole);
  }, [userRole]);

  // Step 2: Fetch live data from /dashboard/stats with date range
  const fetchData = useCallback(async (rangeOpts) => {
    try {
      const params = new URLSearchParams();
      if (rangeOpts?.startDate) params.set('startDate', rangeOpts.startDate);
      if (rangeOpts?.endDate) params.set('endDate', rangeOpts.endDate);
      if (rangeOpts?.range) params.set('range', rangeOpts.range);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await axiosInstance.get(`/dashboard/stats${qs}`);
      return res.data?.data || null;
    } catch (err) {
      console.error('[DashboardEngine] Data fetch error:', err.message);
      return null; // Graceful degradation — widgets show EMPTY, layout survives
    }
  }, []);

  // Combined load — schema and stats are independent.
  const load = useCallback(async (rangeOverride) => {
    if (!userId || !userRole) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const activeRange = rangeOverride || dateRange;

    const [schemaResult, dataResult] = await Promise.allSettled([
      loadSchema(),
      fetchData(activeRange),
    ]);

    const dashSchema = schemaResult.status === 'fulfilled' ? schemaResult.value : null;
    const data = dataResult.status === 'fulfilled' ? dataResult.value : null;

    if (schemaResult.status === 'rejected') {
      setError(schemaResult.reason?.message || 'Failed to load dashboard layout');
    }

    setDashboardData(data);
    setSchema(dashSchema);
    setLoading(false);
  }, [userId, userRole, dateRange, loadSchema, fetchData]);

  useEffect(() => {
    load();
  }, [load]);

  // Step 3: Hydrate widgets with data (re-runs when data or schema changes)
  const hydratedSchema = useMemo(() => {
    if (!schema) return null;

    const hydrated = hydrateWidgets(
      schema.widgets || [],
      dashboardData,
      false, // not loading at this point
      error,
    );

    return {
      ...schema,
      widgets: hydrated,
    };
  }, [schema, dashboardData, error]);

  // While loading, return schema with loading-state widgets
  const displaySchema = useMemo(() => {
    if (loading && schema) {
      return {
        ...schema,
        widgets: (schema.widgets || []).map((w) => ({
          ...w,
          data: { status: DATA_STATUS.LOADING, payload: null },
        })),
      };
    }
    return hydratedSchema;
  }, [loading, schema, hydratedSchema]);

  return {
    schema: displaySchema,
    dashboardData,
    dateRange,
    setDateRange: (newRange) => {
      setDateRange(newRange);
      load(newRange);
    },
    loading: loading || roleLoading,
    error,
    refresh: () => load(),
  };
}
