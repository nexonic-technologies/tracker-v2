import React, { useState, useEffect } from 'react';
import { Activity, Users, Building2, Package, RefreshCw, ShieldAlert, CreditCard, Calendar, CheckCircle2 } from 'lucide-react';
import axiosInstance from '@api/axiosInstance';

export default function UsageMetricsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/metrics/usage');
      setMetrics(res.data?.metrics);
    } catch (err) {
      console.error('Failed to load usage metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Global Platform Adoption & Subscription Analytics
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Real-time analytics tracking tenant provisioning, active user capacity, license expiration status, and payment reactivity.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Analytics
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total Tenants</p>
            <p className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1">{metrics?.totalTenants ?? 0}</p>
            <p className="text-xs text-neutral-400 mt-1">Active: {metrics?.activeTenants ?? 0} | Suspended: {metrics?.suspendedTenants ?? 0}</p>
          </div>
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-xl">
            <Building2 className="w-7 h-7" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Active User Logins</p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{metrics?.activeUsers ?? 0}</p>
            <p className="text-xs text-neutral-400 mt-1">Max Capacity: {metrics?.totalCapacityUsers ?? 0} Users</p>
          </div>
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
            <Users className="w-7 h-7" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">License Status</p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{metrics?.licenseBreakdown?.Valid ?? 0} Valid</p>
            <p className="text-xs text-amber-500 mt-1">Grace Period: {metrics?.licenseBreakdown?.GracePeriod ?? 0} | Expired: {metrics?.licenseBreakdown?.Expired ?? 0}</p>
          </div>
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-xl">
            <Calendar className="w-7 h-7" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Paid Invoices</p>
            <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{metrics?.paymentStatusBreakdown?.Paid ?? 0}</p>
            <p className="text-xs text-rose-500 mt-1">Unpaid: {metrics?.paymentStatusBreakdown?.Unpaid ?? 0} | Past Due: {metrics?.paymentStatusBreakdown?.PastDue ?? 0}</p>
          </div>
          <div className="p-3.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-xl">
            <CreditCard className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Subscription Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Billing Cycle Distribution */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2 border-b pb-3 dark:border-neutral-800">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Billing Cycle Distribution
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Annual (1-Year Expiry)</span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">{metrics?.billingCycleBreakdown?.Annual ?? 0}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Monthly (1-Month Expiry)</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">{metrics?.billingCycleBreakdown?.Monthly ?? 0}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Lifetime / Custom</span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">{metrics?.billingCycleBreakdown?.Lifetime ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Payment Reactivity Breakdown */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2 border-b pb-3 dark:border-neutral-800">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Payment Status Breakdown
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Paid (Active)
              </span>
              <span className="font-bold text-emerald-800 dark:text-emerald-300">{metrics?.paymentStatusBreakdown?.Paid ?? 0}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30">
              <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Past Due (Warning)
              </span>
              <span className="font-bold text-amber-800 dark:text-amber-300">{metrics?.paymentStatusBreakdown?.PastDue ?? 0}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30">
              <span className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" /> Unpaid (Auto-Suspended)
              </span>
              <span className="font-bold text-rose-800 dark:text-rose-300">{metrics?.paymentStatusBreakdown?.Unpaid ?? 0}</span>
            </div>
          </div>
        </div>

        {/* License Expiration Guard */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2 border-b pb-3 dark:border-neutral-800">
            <Calendar className="w-5 h-5 text-amber-600" />
            License Expiration & Grace Period
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Valid Active Licenses</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">{metrics?.licenseBreakdown?.Valid ?? 0}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <span className="font-semibold text-amber-700 dark:text-amber-300">Active 7-Day Grace Period</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">{metrics?.licenseBreakdown?.GracePeriod ?? 0}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <span className="font-semibold text-rose-700 dark:text-rose-300">Expired & Locked</span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">{metrics?.licenseBreakdown?.Expired ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Tenant Subscription Detailed Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white border-b pb-3 dark:border-neutral-800">
          Tenant Subscription & Capacity Breakdown
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-300 font-semibold border-b dark:border-neutral-800">
              <tr>
                <th className="p-3">Tenant Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Status</th>
                <th className="p-3">Billing Cycle</th>
                <th className="p-3">License Expiration</th>
                <th className="p-3">Payment Status</th>
                <th className="p-3 text-right">Max Users Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500">Loading analytics...</td>
                </tr>
              ) : !metrics?.tenants || metrics.tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500">No tenant data found.</td>
                </tr>
              ) : (
                metrics.tenants.map(t => {
                  const expiryStr = t.licenseExpiredAt ? new Date(t.licenseExpiredAt).toLocaleDateString() : 'No Limit';
                  return (
                    <tr key={t._id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition">
                      <td className="p-3 font-semibold text-neutral-900 dark:text-white">{t.name}</td>
                      <td className="p-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">{t.slug}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          t.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          t.status === 'Suspended' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-600 dark:text-neutral-300">{t.billingCycle}</td>
                      <td className="p-3 text-xs font-mono text-neutral-500">{expiryStr}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          t.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          t.paymentStatus === 'Unpaid' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {t.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-neutral-900 dark:text-white">{t.maxUsers} Users</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
