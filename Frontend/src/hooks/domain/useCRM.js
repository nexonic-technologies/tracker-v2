import { useState, useEffect, useCallback } from 'react';
import { CRMService } from '@services';
import toast from 'react-hot-toast';

/**
 * Custom domain hook for CRM & Quotations Management.
 * Follows 4-tier model: Page -> Hook -> Service -> API -> Axios
 */
export function useCRM(initialOptions = {}) {
  const [quotations, setQuotations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuotations = useCallback(async (options = initialOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await CRMService.getQuotations(options);
      setQuotations(data?.data || data || []);
    } catch (err) {
      console.error('useCRM fetchQuotations error:', err);
      setError(err);
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  const fetchOrders = useCallback(async (options = initialOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await CRMService.getOrders(options);
      setOrders(data?.data || data || []);
    } catch (err) {
      console.error('useCRM fetchOrders error:', err);
      setError(err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  const fetchContacts = useCallback(async (options = initialOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await CRMService.getContacts(options);
      setContacts(data?.data || data || []);
    } catch (err) {
      console.error('useCRM fetchContacts error:', err);
      setError(err);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  return {
    quotations,
    orders,
    payments,
    contacts,
    loading,
    error,
    fetchQuotations,
    fetchOrders,
    fetchContacts,
  };
}
