import { useState, useEffect } from 'react';
import axiosInstance from '../../../api/axiosInstance';
import { useAuth } from '../../../context/authProvider';

/**
 * Fetches the enabled widget IDs for the current user's role.
 * Super Admins automatically receive full access to all widgets without role restriction.
 */
export function useWidgetPermissions(roleId) {
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin || !!user?.role?.isSuperAdmin;
  const resolvedRoleId = roleId || user?.role?._id || user?.role?.id || user?.roleId;

  const [widgets, setWidgets] = useState(new Set());
  const [loading, setLoading] = useState(!isSuperAdmin);
  const [hasConfig, setHasConfig] = useState(isSuperAdmin);

  useEffect(() => {
    if (isSuperAdmin) {
      setLoading(false);
      setHasConfig(true);
      return;
    }

    if (!resolvedRoleId) {
      setLoading(false);
      return;
    }

    const fetchWidgets = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.post('/populate/read/dashboard_widgets', {
          filter: { role: resolvedRoleId },
          limit: 1,
        });

        const doc = res.data?.data?.[0];
        const ids = doc?.widgets || [];

        setWidgets(new Set(ids));
        setHasConfig(!!doc);
      } catch (err) {
        console.error('useWidgetPermissions fetch error:', err);
        setWidgets(new Set());
        setHasConfig(false);
      } finally {
        setLoading(false);
      }
    };

    fetchWidgets();
  }, [resolvedRoleId, isSuperAdmin]);

  const can = (widgetId) => {
    if (isSuperAdmin) return true;
    if (!hasConfig) return true;
    return widgets.has(widgetId);
  };

  return { widgets, can, loading, hasConfig };
}
