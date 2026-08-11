import React, { useState, useEffect } from 'react';
import { Database, HardDrive, RefreshCw, Layers } from 'lucide-react';
import axiosInstance from '@api/axiosInstance';

export default function DbUtilizationPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/admin/metrics/db-utilization');
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load DB utilization metrics:', err);
      setError(err.response?.data?.error || 'Failed to connect to Global Control Plane metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-5 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Database className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Multi-Tenant Database Utilization & Storage Metrics
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Real-time isolation statistics monitoring database sizes, active Mongoose connections, and collection object counts across all provisioned client pools.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Storage Metrics
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">Active Tenant Connection Pools</p>
            <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">{metrics?.summary?.activeConnections ?? 0}</p>
            <p className="text-xs text-neutral-400 mt-1">Cached Connections in RAM</p>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-xl">
            <Layers className="w-8 h-8" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">Total Multi-Tenant Storage</p>
            <p className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-2">{metrics?.summary?.totalStorageMB ?? 0} MB</p>
            <p className="text-xs text-neutral-400 mt-1">Sum of all tenant DB sizes</p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
            <HardDrive className="w-8 h-8" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">Provisioned Client Databases</p>
            <p className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-2">{metrics?.summary?.totalTenants ?? 0}</p>
            <p className="text-xs text-neutral-400 mt-1">Isolated Databases</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
            <Database className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 font-semibold text-neutral-900 dark:text-white">
          Tenant Database Storage Breakdown
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b dark:border-neutral-800">
              <tr>
                <th className="px-6 py-3">Tenant Name</th>
                <th className="px-6 py-3">Database Name</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Storage Size (MB)</th>
                <th className="px-6 py-3">Total Objects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">Loading DB storage metrics...</td></tr>
              ) : metrics?.tenants?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No database metrics available.</td></tr>
              ) : (
                metrics?.tenants?.map((t) => (
                  <tr key={t.tenantId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <td className="px-6 py-4 font-semibold text-neutral-900 dark:text-white">{t.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">{t.dbName}</td>
                    <td className="px-6 py-4 font-medium text-xs">{t.status}</td>
                    <td className="px-6 py-4 font-bold">{t.storageMB} MB</td>
                    <td className="px-6 py-4 font-mono">{t.objects}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
