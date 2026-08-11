import { useState, useEffect, useCallback } from 'react';
import { MasterDataService } from '@services';
import toast from 'react-hot-toast';

/**
 * Custom domain hook for Assets, Repairs, GRN & Vendors Management.
 * Follows 4-tier model: Page -> Hook -> Service -> API -> Axios
 */
export function useAssets(initialOptions = {}) {
  const [assets, setAssets] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAssets = useCallback(async (options = initialOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await MasterDataService.getItems('assets', options);
      setAssets(data?.data || data || []);
    } catch (err) {
      console.error('useAssets fetchAssets error:', err);
      setError(err);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  const fetchVendors = useCallback(async (options = initialOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await MasterDataService.getItems('assets_vendors', options);
      setVendors(data?.data || data || []);
    } catch (err) {
      console.error('useAssets fetchVendors error:', err);
      setError(err);
      toast.error('Failed to load asset vendors');
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  const fetchRepairs = useCallback(async (options = initialOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await MasterDataService.getItems('assets_repairs', options);
      setRepairs(data?.data || data || []);
    } catch (err) {
      console.error('useAssets fetchRepairs error:', err);
      setError(err);
      toast.error('Failed to load asset repairs');
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return {
    assets,
    vendors,
    repairs,
    loading,
    error,
    fetchAssets,
    fetchVendors,
    fetchRepairs,
  };
}
