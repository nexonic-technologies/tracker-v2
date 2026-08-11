import { useState, useEffect, useCallback } from 'react';
import { AttendanceService, LeaveService } from '@services';
import toast from 'react-hot-toast';

/**
 * Custom domain hook for Attendance & Leave Management.
 * Follows 4-tier model: Page -> Hook -> Service -> API -> Axios
 */
export function useAttendance(initialOptions = {}) {
  const [attendances, setAttendances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAttendances = useCallback(async (options = initialOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await AttendanceService.getAttendances(options);
      setAttendances(data?.data || data || []);
    } catch (err) {
      console.error('useAttendance fetchAttendances error:', err);
      setError(err);
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  const fetchLeaves = useCallback(async (options = initialOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await LeaveService.getLeaves(options);
      setLeaves(data?.data || data || []);
    } catch (err) {
      console.error('useAttendance fetchLeaves error:', err);
      setError(err);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  useEffect(() => {
    fetchAttendances();
    fetchLeaves();
  }, [fetchAttendances, fetchLeaves]);

  const updateLeaveStatus = useCallback(async (leaveId, status) => {
    try {
      await LeaveService.updateLeave(leaveId, { status });
      setLeaves((prev) =>
        prev.map((l) => (l._id === leaveId ? { ...l, status } : l))
      );
      toast.success(`Leave request ${status.toLowerCase()}`);
    } catch (err) {
      console.error('useAttendance updateLeaveStatus error:', err);
      toast.error('Failed to update leave status');
    }
  }, []);

  return {
    attendances,
    leaves,
    loading,
    error,
    fetchAttendances,
    fetchLeaves,
    updateLeaveStatus,
  };
}
