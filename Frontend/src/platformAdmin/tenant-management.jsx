import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@api/axiosInstance';
import { useAuth } from '@context/authProvider';
import toast from 'react-hot-toast';

export default function TenantManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantSlug = (user?.tenantSlug || user?.tenantId || '').toLowerCase();
  const isGlobalAdmin = tenantSlug === 'admin' || tenantSlug === 'default';

  const [tenants, setTenants] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedTenant, setSelectedTenant] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);

  const [targetStatus, setTargetStatus] = useState('Active');
  const [selectedModules, setSelectedModules] = useState([]);

  // Subscription parameters state
  const [subBillingCycle, setSubBillingCycle] = useState('Annual');
  const [subExpiry, setSubExpiry] = useState('');
  const [subPaymentStatus, setSubPaymentStatus] = useState('Paid');
  const [subMaxUsers, setSubMaxUsers] = useState(50);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantRes, moduleRes] = await Promise.all([
        axiosInstance.get('/admin/tenants'),
        axiosInstance.get('/admin/modules').catch(() => ({ data: { modules: [] } }))
      ]);

      const fetchedTenants = tenantRes.data?.tenants || tenantRes.data?.data || [];
      setTenants(fetchedTenants);

      let fetchedModules = tenantRes.data?.availableModules || moduleRes.data?.modules || [];
      if (!fetchedModules || fetchedModules.length === 0) {
        fetchedModules = [
          { moduleId: 'core', name: 'Core Platform & System Engine', description: 'Settings, roles, security, sessions' },
          { moduleId: 'hrms', name: 'HRMS Core Personnel Suite', description: 'Employee lifecycle, onboardings, HR policies' },
          { moduleId: 'attendance', name: 'Attendance & Leave Management', description: 'Shifts, punches, leaves, SLA tracking, WFH' },
          { moduleId: 'payroll', name: 'Payroll Engine & Compensation', description: 'Salary structures, pay slips, expenses' },
          { moduleId: 'tasks', name: 'Tasks & Project Management', description: 'Sprints, tasks, todos, queues' },
          { moduleId: 'tickets', name: 'Helpdesk & Ticket System', description: 'Support tickets, activity logs' },
          { moduleId: 'crm', name: 'CRM & Client Management', description: 'Leads, meetings, quotations, ledgers' },
          { moduleId: 'assets', name: 'Asset Management', description: 'Hardware allocation, incidents, repairs' },
          { moduleId: 'recruitment', name: 'Recruitment & Job Openings', description: 'Openings, candidate pipeline' },
          { moduleId: 'feed', name: 'Team Feed & Social Work', description: 'Feeds, posts, comments, notifications' }
        ];
      }
      setAvailableModules(fetchedModules);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load tenant control plane data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const matchesSearch =
        (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.slug || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.dbName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.ownerEmail || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || (t.status || '').toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [tenants, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter(t => t.status === 'Active').length;
    const pastDue = tenants.filter(t => t.paymentStatus === 'PastDue' || t.paymentStatus === 'Unpaid').length;
    const suspended = tenants.filter(t => t.status === 'Suspended').length;
    return { total, active, pastDue, suspended };
  }, [tenants]);

  const handleUpdateStatus = async () => {
    if (!selectedTenant) return;
    try {
      await axiosInstance.put(`/admin/tenants/${selectedTenant._id}/status`, { status: targetStatus });
      toast.success(`Tenant ${selectedTenant.name} status updated to ${targetStatus}`);
      setStatusModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleUpdateModules = async () => {
    if (!selectedTenant) return;
    try {
      await axiosInstance.put(`/admin/tenants/${selectedTenant._id}/modules`, { enabledModules: selectedModules });
      toast.success(`Tenant ${selectedTenant.name} module licensing updated`);
      setModuleModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update modules');
    }
  };

  const handleUpdateSubscription = async () => {
    if (!selectedTenant) return;
    try {
      await axiosInstance.put(`/admin/tenants/${selectedTenant._id}/subscription`, {
        billingCycle: subBillingCycle,
        licenseExpiredAt: subExpiry ? new Date(subExpiry).toISOString() : null,
        paymentStatus: subPaymentStatus,
        maxUsers: Number(subMaxUsers) || 50,
      });
      toast.success(`Updated subscription for ${selectedTenant.name}`);
      setSubModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update subscription');
    }
  };

  const openSubModal = (tenant) => {
    setSelectedTenant(tenant);
    setSubBillingCycle(tenant.billingCycle || 'Annual');
    setSubPaymentStatus(tenant.paymentStatus || 'Paid');
    setSubMaxUsers(tenant.settings?.maxUsers || 50);
    if (tenant.licenseExpiredAt) {
      const d = new Date(tenant.licenseExpiredAt);
      setSubExpiry(d.toISOString().split('T')[0]);
    } else {
      setSubExpiry('');
    }
    setSubModalOpen(true);
  };

  const openModuleModal = (tenant) => {
    setSelectedTenant(tenant);
    const existing = (tenant.enabledModules || []).map(m =>
      typeof m === 'string' ? m : m.moduleId || m._id
    );
    setSelectedModules(existing);
    setModuleModalOpen(true);
  };

  const toggleModule = (modKey) => {
    setSelectedModules(prev =>
      prev.includes(modKey) ? prev.filter(m => m !== modKey) : [...prev, modKey]
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Super Admin — Control Plane</h1>
          <p className="text-sm text-neutral-500 mt-1">Tenant accounts, multi-tenant database provisioning, subscription lifecycles, and module entitlements.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/platform-admin/tenant-provisioning')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Provision Tenant
          </button>
          <button
            onClick={fetchData}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Control Plane
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total Tenants</p>
          <p className="mt-2 text-3xl font-extrabold text-neutral-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Subscriptions</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
        </div>
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Past Due Accounts</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600 dark:text-amber-400">{stats.pastDue}</p>
        </div>
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Suspended / Locked</p>
          <p className="mt-2 text-3xl font-extrabold text-rose-600 dark:text-rose-400">{stats.suspended}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <svg className="w-4 h-4 absolute left-3 top-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search tenant name, slug, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-neutral-500 whitespace-nowrap">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAST_DUE">Past Due</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>
      </div>

      {/* Main Tenant Table */}
      {loading ? (
        <div className="py-16 text-center text-neutral-500">Loading Control Plane Data...</div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-300 font-semibold border-b dark:border-neutral-800">
              <tr>
                <th className="p-4">Tenant Name</th>
                <th className="p-4">Slug / Database</th>
                <th className="p-4">Billing & Expiry</th>
                <th className="p-4">Payment & Capacity</th>
                <th className="p-4">Lifecycle Status</th>
                <th className="p-4">Module Entitlements</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500">
                    <div>No matching tenants found.</div>
                    <button
                      onClick={() => navigate('/platform-admin/tenant-provisioning')}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                    >
                      + Provision First Tenant
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => {
                  const status = (tenant.status || 'Active').toUpperCase();
                  const paymentStatus = tenant.paymentStatus || 'Paid';
                  const expiryStr = tenant.licenseExpiredAt ? new Date(tenant.licenseExpiredAt).toLocaleDateString() : 'No Limit';
                  const maxUsers = tenant.settings?.maxUsers || 50;

                  return (
                    <tr key={tenant._id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition">
                      <td className="p-4">
                        <div className="font-semibold text-neutral-900 dark:text-white">{tenant.name}</div>
                        <div className="text-xs text-neutral-400 font-mono">ID: {tenant.tenantId}</div>
                      </td>
                      <td className="p-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                        <div className="font-semibold text-indigo-600 dark:text-indigo-400">{tenant.slug}</div>
                        <div className="text-neutral-400">{tenant.dbName}</div>
                      </td>
                      <td className="p-4 text-xs text-neutral-600 dark:text-neutral-300">
                        <div className="font-semibold">{tenant.billingCycle || 'Annual'} Cycle</div>
                        <div className="text-neutral-400">Expires: {expiryStr}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${
                            paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            paymentStatus === 'Unpaid' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {paymentStatus}
                          </span>
                          <span className="text-xs text-neutral-500 font-mono">Max Users: {maxUsers}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          status === 'SUSPENDED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          status === 'PAST_DUE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            status === 'ACTIVE' ? 'bg-emerald-500' :
                            status === 'SUSPENDED' ? 'bg-rose-500' :
                            status === 'PAST_DUE' ? 'bg-amber-500' : 'bg-neutral-400'
                          }`} />
                          {tenant.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {Array.isArray(tenant.enabledModules) ? `${tenant.enabledModules.length} Modules Active` : 'All Modules'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openSubModal(tenant)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition shadow-xs"
                        >
                          Subscription
                        </button>
                        <button
                          onClick={() => { setSelectedTenant(tenant); setTargetStatus(tenant.status || 'Active'); setStatusModalOpen(true); }}
                          className="px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-xs font-medium rounded-lg transition"
                        >
                          Status
                        </button>
                        <button
                          onClick={() => openModuleModal(tenant)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition shadow-xs"
                        >
                          Modules
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Subscription & License Parameters Modal */}
      {subModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Subscription & License Parameters</h3>
            <p className="text-sm text-neutral-500">Tenant: <span className="font-semibold text-neutral-900 dark:text-white">{selectedTenant.name}</span> ({selectedTenant.slug})</p>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Billing Cycle</label>
                <select
                  value={subBillingCycle}
                  onChange={(e) => setSubBillingCycle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                >
                  <option value="Annual">Annual (1 Year Default Expiry)</option>
                  <option value="Monthly">Monthly (1 Month Default Expiry)</option>
                  <option value="Lifetime">Lifetime (No Expiry)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">License Expiration Date</label>
                <input
                  type="date"
                  value={subExpiry}
                  onChange={(e) => setSubExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                />
                <p className="text-xs text-neutral-400 mt-1">7-day grace period is automatically enforced after this date.</p>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Payment Status</label>
                <select
                  value={subPaymentStatus}
                  onChange={(e) => setSubPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                >
                  <option value="Paid">Paid (Active Access)</option>
                  <option value="PastDue">Past Due (Grace Period Warning)</option>
                  <option value="Unpaid">Unpaid (Auto-Suspend Tenant)</option>
                  <option value="Trial">Trial Period</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Max Active Users Limit</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={subMaxUsers}
                  onChange={(e) => setSubMaxUsers(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                />
                <p className="text-xs text-neutral-400 mt-1">Enforced at employee service layer before creating/activating users.</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-800">
              <button onClick={() => setSubModalOpen(false)} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400">Cancel</button>
              <button onClick={handleUpdateSubscription} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">Save Subscription</button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Lifecycle Modal */}
      {statusModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Update Subscription Lifecycle</h3>
            <p className="text-sm text-neutral-500">Tenant: <span className="font-semibold text-neutral-900 dark:text-white">{selectedTenant.name}</span> ({selectedTenant.tenantId})</p>

            <div className="space-y-2">
              {[
                { s: 'Active', desc: 'Full Data Plane API Access' },
                { s: 'PAST_DUE', desc: 'API Access with Warning Banner' },
                { s: 'Suspended', desc: 'Data Plane Locked (HTTP 402)' },
                { s: 'CANCELED', desc: 'Read-Only Mode (Mutations Blocked)' }
              ].map(({ s, desc }) => (
                <label key={s} className="flex items-center space-x-3 p-3 rounded-lg border dark:border-neutral-800 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition">
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={targetStatus === s}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold text-sm text-neutral-900 dark:text-white">{s}</span>
                    <p className="text-xs text-neutral-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-800">
              <button onClick={() => setStatusModalOpen(false)} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400">Cancel</button>
              <button onClick={handleUpdateStatus} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Save Status</button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Module Licensing Modal */}
      {moduleModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Dynamic Module Licensing</h3>
            <p className="text-sm text-neutral-500">Enable or disable module licenses for <span className="font-semibold text-neutral-900 dark:text-white">{selectedTenant.name}</span>:</p>

            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
              {availableModules.map(mod => {
                const modKey = mod.moduleId || mod.id || mod._id;
                const modName = mod.name || mod.label || modKey;
                const checked = selectedModules.includes(modKey) || selectedModules.includes(mod._id);
                return (
                  <label key={modKey} className="flex items-center justify-between p-3 rounded-lg border dark:border-neutral-800 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition">
                    <div>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">{modName}</span>
                      {mod.description && <p className="text-xs text-neutral-500">{mod.description}</p>}
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModule(modKey)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-800">
              <button onClick={() => setModuleModalOpen(false)} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400">Cancel</button>
              <button onClick={handleUpdateModules} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Apply Licensing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
