import { useState, useEffect, useCallback } from 'react';
import { PayrollService } from '@services';
import toast from 'react-hot-toast';

/**
 * Custom domain hook for Payroll & Payslip Management.
 * Follows 4-tier model: Page -> Hook -> Service -> API -> Axios
 */
export function usePayroll(initialOptions = {}) {
  const [runs, setRuns] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRuns = useCallback(async (options = initialOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await PayrollService.getpayroll_runs(options);
      setRuns(data?.data || data || []);
    } catch (err) {
      console.error('usePayroll fetchRuns error:', err);
      setError(err);
      toast.error('Failed to load payroll runs');
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  const fetchPayslips = useCallback(async (options = initialOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await PayrollService.getPayslips(options);
      setPayslips(data?.data || data || []);
    } catch (err) {
      console.error('usePayroll fetchPayslips error:', err);
      setError(err);
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const approveRun = useCallback(async (id) => {
    try {
      await PayrollService.updatePayrollRun(id, { status: 'Approved' });
      setRuns((prev) =>
        prev.map((run) => (run._id === id ? { ...run, status: 'Approved' } : run))
      );
      toast.success('Payroll run approved');
    } catch (err) {
      console.error('usePayroll approveRun error:', err);
      toast.error('Failed to approve payroll run');
    }
  }, []);

  return {
    runs,
    payslips,
    loading,
    error,
    fetchRuns,
    fetchPayslips,
    approveRun,
  };
}
