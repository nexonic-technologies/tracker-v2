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
export function useDashboardSchema() {
  const { user } = useAuth();
  const { userRole, loading: roleLoading } = useUserRole();
  const userId = user?.id || user?._id;

  const [schema, setSchema] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Step 1: Load the dashboard schema (layout + widget configs)
  const loadSchema = useCallback(async () => {
    if (!userRole) return null;

    try {
      // Phase 5: Fetch dynamic backend dashboard schema
      const res = await axiosInstance.get(`/dashboard/schema/${encodeURIComponent(userRole)}`);
      if (res.data?.success && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      // If 404 (no custom schema saved yet) or offline, fall back to default role fixture
      if (err.response?.status !== 404) {
        console.warn('[DashboardEngine] Backend schema fetch warning:', err.message);
      }
    }

    // Default static fixture fallback
    return getFixtureForRole(userRole);
  }, [userRole]);

  // Step 2: Fetch live data from /dashboard/stats
  const fetchData = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/dashboard/stats');
      return res.data?.data || null;
    } catch (err) {
      console.error('[DashboardEngine] Data fetch error:', err.message);
      throw err;
    }
  }, []);

  // Combined load
  const load = useCallback(async () => {
    if (!userId || !userRole) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [dashSchema, data] = await Promise.all([
        loadSchema(),
        fetchData(),
      ]);

      setDashboardData(data);
      setSchema(dashSchema);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole, loadSchema, fetchData]);

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
    loading: loading || roleLoading,
    error,
    refresh: load,
  };
}
