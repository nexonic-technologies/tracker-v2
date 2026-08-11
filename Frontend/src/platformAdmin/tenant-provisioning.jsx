import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@api/axiosInstance';
import toast from 'react-hot-toast';

const DEFAULT_STAGES = [
  { step: 1, label: 'Validate Inputs', description: 'Validate organization name, slug, email, and password' },
  { step: 2, label: 'Resolve Modules', description: 'Resolve module ObjectIds and entitlement keys' },
  { step: 3, label: 'Create Tenant Record', description: 'Insert Tenant document with Provisioning status' },
  { step: 4, label: 'Provision Database', description: 'Establish database pool and compile tenant models' },
  { step: 5, label: 'Seed Roles & Master Data', description: 'Create Super Admin role, department (SA), and designation' },
  { step: 6, label: 'Seed Policies & Capabilities', description: 'Seed access policies for compiled models and capabilities' },
  { step: 7, label: 'Seed Filtered Sidebars', description: 'Filter platform sidebars by enabled modules & check orphans' },
  { step: 8, label: 'Create User', description: 'Create Super Admin employee and Global UserLogin' },
  { step: 9, label: 'Verify Provisioning', description: 'Scoped verification check, set Tenant status Active' },
];

export default function TenantProvisioningPage() {
  const navigate = useNavigate();

  const [availableModules, setAvailableModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // Live Provisioning State
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningRunId, setProvisioningRunId] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [stageStatuses, setStageStatuses] = useState(
    DEFAULT_STAGES.reduce((acc, s) => ({ ...acc, [s.step]: { status: 'pending', detail: '' } }), {})
  );
  const [provisionResult, setProvisionResult] = useState(null);
  const [provisionError, setProvisionError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    slug: '',
    industry: 'Technology',
    country: 'India',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    ownerName: '',
    ownerEmail: '',
    phone: '',
    password: '',
    plan: 'Professional',
    billingCycle: 'Annual',
    maxUsers: 50,
    fiscalYearStart: 'April',
    language: 'English',
    enabledModules: []
  });

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await axiosInstance.get('/admin/modules').catch(() => ({ data: { modules: [] } }));
        let fetched = res.data?.modules || [];
        setAvailableModules(fetched);

        const modKeys = fetched.map(m => m.moduleId || m.id || m._id);
        setFormData(prev => ({ ...prev, enabledModules: modKeys }));
      } catch (err) {
        console.error('Failed to load module list:', err);
      } finally {
        setLoadingModules(false);
      }
    };

    fetchModules();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'name' && !prev.slug) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
      return updated;
    });
  };

  const toggleModule = (modKey) => {
    setFormData(prev => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(modKey)
        ? prev.enabledModules.filter(m => m !== modKey)
        : [...prev.enabledModules, modKey]
    }));
  };

  const selectAllModules = () => {
    const keys = availableModules.map(m => m.moduleId || m.id || m._id);
    setFormData(prev => ({ ...prev, enabledModules: keys }));
  };

  const clearAllModules = () => {
    setFormData(prev => ({ ...prev, enabledModules: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ownerEmail || !formData.password) {
      toast.error('Organization Name, Owner Email, and Password are required');
      return;
    }
    if (formData.enabledModules.length === 0) {
      toast.error('At least one module entitlement must be selected');
      return;
    }

    setSubmitting(true);
    setIsProvisioning(true);
    setProvisionError(null);
    setProvisionResult(null);
    setActiveStep(1);
    setStageStatuses(
      DEFAULT_STAGES.reduce((acc, s) => ({ ...acc, [s.step]: { status: 'pending', detail: '' } }), {})
    );

    const slugToUse = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const payload = {
      name: formData.name,
      legalName: formData.legalName,
      slug: slugToUse,
      dbName: `tracker_tenant_${slugToUse}`,
      ownerEmail: formData.ownerEmail,
      ownerName: formData.ownerName,
      phone: formData.phone,
      password: formData.password,
      plan: formData.plan,
      billingCycle: formData.billingCycle,
      maxUsers: Number(formData.maxUsers),
      enabledModules: formData.enabledModules,
      settings: {
        industry: formData.industry,
        country: formData.country,
        currency: formData.currency,
        timezone: formData.timezone,
        fiscalYearStart: formData.fiscalYearStart,
        language: formData.language
      }
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/tenants/provision-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Provisioning request failed';
        try {
          errMsg = JSON.parse(errText).error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Keep incomplete chunk

        for (const block of lines) {
          if (!block.trim()) continue;
          const eventMatch = block.match(/^event:\s*(.+)$/m);
          const dataMatch = block.match(/^data:\s*(.+)$/m);

          if (!eventMatch || !dataMatch) continue;
          const eventType = eventMatch[1].trim();
          let data = {};
          try {
            data = JSON.parse(dataMatch[1].trim());
          } catch (_) {}

          if (eventType === 'progress') {
            if (data.runId) setProvisioningRunId(data.runId);
            if (data.step) {
              setActiveStep(data.step);
              setStageStatuses(prev => ({
                ...prev,
                [data.step]: {
                  status: data.status || 'running',
                  detail: data.detail || prev[data.step]?.detail || '',
                  error: data.error || null
                }
              }));
            }
          } else if (eventType === 'complete') {
            setProvisionResult(data);
            setStageStatuses(prev => {
              const updated = { ...prev };
              Object.keys(updated).forEach(k => {
                updated[k] = { ...updated[k], status: 'completed' };
              });
              return updated;
            });
            toast.success(`Tenant ${formData.name} successfully provisioned & verified!`);
          } else if (eventType === 'error') {
            setProvisionError(data.error || 'Provisioning failed');
            toast.error(data.error || 'Provisioning failed');
          }
        }
      }
    } catch (err) {
      setProvisionError(err.message || 'Failed to provision tenant');
      toast.error(err.message || 'Failed to provision tenant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-5 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Tenant Provisioning & Control Plane Engine</h1>
          <p className="text-sm text-neutral-500 mt-1">Provision an isolated multi-tenant database, Super Admin credentials, and module entitlement permissions.</p>
        </div>
        <button
          onClick={() => navigate('/platform-admin/tenant-management')}
          className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
        >
          ← Back to Tenants
        </button>
      </div>

      {/* Live Provisioning Progress View */}
      {isProvisioning ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b pb-4 dark:border-neutral-800">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {provisionResult ? '✅ Provisioning & Verification Complete' : provisionError ? '❌ Provisioning Failed' : '🚀 Provisioning Tenant Database Pool'}
              </h2>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                Target: {formData.name} ({formData.slug}) • {provisioningRunId ? `Run ID: ${provisioningRunId}` : 'Initializing stream...'}
              </p>
            </div>
            {provisionResult && (
              <button
                onClick={() => navigate('/platform-admin/tenant-management')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition"
              >
                Go to Tenant Control Plane →
              </button>
            )}
          </div>

          {/* 9-Stage Progress Timeline */}
          <div className="space-y-3">
            {DEFAULT_STAGES.map((s) => {
              const state = stageStatuses[s.step] || { status: 'pending', detail: '' };
              const isCurrent = activeStep === s.step;
              const isCompleted = state.status === 'completed';
              const isFailed = state.status === 'failed';
              const isRunning = state.status === 'running' || (isCurrent && !isCompleted && !isFailed);

              return (
                <div
                  key={s.step}
                  className={`p-3.5 rounded-lg border transition ${
                    isCompleted ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40' :
                    isFailed ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' :
                    isRunning ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-400' :
                    'bg-neutral-50/50 dark:bg-neutral-800/20 border-neutral-200 dark:border-neutral-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCompleted ? 'bg-emerald-500 text-white' :
                        isFailed ? 'bg-rose-500 text-white' :
                        isRunning ? 'bg-indigo-600 text-white animate-pulse' :
                        'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {isCompleted ? '✓' : isFailed ? '✕' : s.step}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                          {s.label}
                          {isRunning && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-normal animate-pulse">(Processing...)</span>}
                        </div>
                        <p className="text-xs text-neutral-500">{s.description}</p>
                      </div>
                    </div>

                    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isCompleted ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' :
                      isFailed ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' :
                      isRunning ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300' :
                      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}>
                      {state.status}
                    </span>
                  </div>

                  {state.detail && (
                    <div className="mt-2 text-xs font-mono text-neutral-600 dark:text-neutral-300 pl-10 border-l-2 border-neutral-300 dark:border-neutral-700 ml-3.5 py-0.5">
                      {state.detail}
                    </div>
                  )}

                  {state.error && (
                    <div className="mt-2 text-xs font-mono text-rose-600 dark:text-rose-400 pl-10 border-l-2 border-rose-400 ml-3.5 py-0.5">
                      Error: {state.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Provision Result Card */}
          {provisionResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-2">
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Tenant Provisioning & Scoped Verification Audit Passed</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <div><span className="font-semibold">Tenant ID:</span> {provisionResult.tenant?.tenantId}</div>
                <div><span className="font-semibold">Database:</span> {provisionResult.tenant?.dbName}</div>
                <div><span className="font-semibold">Admin Email:</span> {provisionResult.user?.email}</div>
                <div><span className="font-semibold">Sidebar Count:</span> {provisionResult.verification?.sidebarCount}</div>
              </div>
            </div>
          )}

          {/* Error Actions */}
          {provisionError && (
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsProvisioning(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
              >
                ← Back to Form (Retry)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Provisioning Form View */
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white border-b pb-3 dark:border-neutral-800">1. Organization Details & Subscription Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Organization Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. AcroCorp Industries"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Tenant Slug / Subdomain *</label>
                <input
                  type="text"
                  name="slug"
                  required
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="e.g. acrocorp"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Billing Cycle *</label>
                <select
                  name="billingCycle"
                  value={formData.billingCycle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
                >
                  <option value="Annual">Annual (1 Year Expiry Default)</option>
                  <option value="Monthly">Monthly (1 Month Expiry Default)</option>
                  <option value="Lifetime">Lifetime (No Expiry Limit)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Max Active Users Limit *</label>
                <input
                  type="number"
                  name="maxUsers"
                  min="1"
                  max="10000"
                  required
                  value={formData.maxUsers}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white border-b pb-3 dark:border-neutral-800">2. Owner Account Credentials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Owner Name</label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Owner Email *</label>
                <input
                  type="email"
                  name="ownerEmail"
                  required
                  value={formData.ownerEmail}
                  onChange={handleChange}
                  placeholder="admin@acrocorp.com"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Initial Super Admin Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="SuperAdminSecret123!"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b pb-3 dark:border-neutral-800">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">3. Module Licensing Entitlements</h2>
              <div className="space-x-2">
                <button type="button" onClick={selectAllModules} className="text-xs text-indigo-600 hover:underline">Select All</button>
                <button type="button" onClick={clearAllModules} className="text-xs text-neutral-500 hover:underline">Clear All</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableModules.map(mod => {
                const modKey = mod.moduleId || mod.id || mod._id;
                const isChecked = formData.enabledModules.includes(modKey);
                return (
                  <label key={modKey} className="flex items-start justify-between p-3 rounded-lg border dark:border-neutral-800 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition">
                    <div>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">{mod.name}</span>
                      <p className="text-xs text-neutral-500 mt-0.5">{mod.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleModule(modKey)}
                      className="mt-1 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/platform-admin/tenant-management')}
              className="px-5 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-xs transition disabled:opacity-50"
            >
              {submitting ? 'Provisioning...' : 'Provision Tenant & Database'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
