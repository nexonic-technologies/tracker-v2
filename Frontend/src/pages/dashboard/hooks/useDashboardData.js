import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../../api/axiosInstance';

/**
 * Fetches dashboard data based on the single stats aggregation endpoint.
 *
 * Exposes:
 *   dashboardData — the raw hierarchical stats from the backend
 *   stats         — V1-compatible flat stats object
 *   pendingLeaves — V1-compatible pending leaves array
 *   loading       — boolean loading state
 *   error         — any error string
 *   refresh       — function to trigger a manual reload of stats
 */
export function useDashboardData({ enabledWidgets, userId }) {
  const [stats, setStats] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/dashboard/stats');
      const data = res.data?.data;
      setDashboardData(data);

      // Build V1-compatible stats object to prevent crashing V1 widgets if active
      if (data) {
        const attendance = data.employee?.attendance;
        const attendanceStatus =
          attendance?.checkIn && !attendance?.checkOut
            ? 'check-in'
            : attendance?.checkOut
              ? 'check-out'
              : 'not-started';

        const myTasks = data.employee?.tasks?.length || 0;
        const leaveBalance = data.employee?.leaveBalance?.[0]?.available || 0;

        setStats({
          attendanceStatus,
          pendingLeaves: data.stats?.pendingApprovals?.value || 0,
          leaveBalance,
          myTasks,
          totalEmployees: data.pulse?.total || 0,
          presentToday: (data.pulse?.present || 0) + (data.pulse?.wfh || 0) + (data.pulse?.late || 0),
        });

        // Map pending leaves from action center for V1 widget compatibility
        if (data.actionCenter) {
          const mappedLeaves = data.actionCenter
            .filter((item) => item.sourceModel === 'leaves')
            .map((item) => {
              const parts = item.subtitle ? item.subtitle.split(' · ') : [];
              return {
                _id: item.sourceId,
                status: 'Pending',
                employeeId: {
                  basicInfo: {
                    firstName: parts[0] || 'Employee',
                    lastName: '',
                    profileImage: null,
                  },
                },
                leaveType: {
                  name: parts[1] || 'Leave',
                },
                fromDate: new Date().toISOString(), // fallback
              };
            });
          setPendingLeaves(mappedLeaves);
        }
      }
    } catch (err) {
      console.error('Dashboard V2 fetch error:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchStats();
  }, [userId, fetchStats]);

  return { stats, pendingLeaves, dashboardData, loading, error, refresh: fetchStats };
}
