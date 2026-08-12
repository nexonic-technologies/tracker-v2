import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance, { getDeviceUUID } from '@api/axiosInstance';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

// ── 9-Stage provisioning pipeline ───────────────────────────────────────────
const DEFAULT_STAGES = [
  { step: 1, label: 'Validate Inputs',           desc: 'Org name, slug, email, password' },
  { step: 2, label: 'Resolve Modules',           desc: 'Module ObjectIds & entitlement keys' },
  { step: 3, label: 'Create Tenant Record',      desc: 'Insert Tenant doc — Provisioning status' },
  { step: 4, label: 'Provision Database',        desc: 'DB pool established, models compiled' },
  { step: 5, label: 'Seed Roles & Master Data',  desc: 'Super Admin role, dept, designation' },
  { step: 6, label: 'Seed Policies',            desc: 'Access policies for compiled models' },
  { step: 7, label: 'Seed Sidebars',            desc: 'Filter sidebars by enabled modules' },
  { step: 8, label: 'Create User',               desc: 'Super Admin employee + Global UserLogin' },
  { step: 9, label: 'Verify Provisioning',       desc: 'Scoped verification — set status Active' },
];

const STEP_STATUS_STYLE = {
  completed: {
    row:   'border-[var(--tracker-success)] bg-[var(--tracker-success-light)]/30',
    dot:   'bg-[var(--tracker-success)] text-white',
    badge: 'bg-[var(--tracker-success-light)] text-[var(--tracker-success)]',
  },
  running: {
    row:   'border-[var(--brand-solid)] bg-[var(--tracker-surface-1)] ring-1 ring-[var(--brand-solid)]/30',
    dot:   'bg-[var(--brand-solid)] text-white animate-pulse',
    badge: 'bg-[var(--tracker-info-light)] text-[var(--tracker-info)]',
  },
  failed: {
    row:   'border-[var(--tracker-danger)] bg-[var(--tracker-danger-light)]/20',
    dot:   'bg-[var(--tracker-danger)] text-white',
    badge: 'bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]',
  },
  pending: {
    row:   'border-[var(--tracker-border)] opacity-50',
    dot:   'bg-[var(--tracker-surface-2)] text-[var(--tracker-ink-subtle)]',
    badge: 'bg-[var(--tracker-surface-2)] text-[var(--tracker-ink-subtle)]',
  },
};

// ── Form field helpers ───────────────────────────────────────────────────────
function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[var(--tracker-ink-muted)] mb-1">
        {label}{required && <span className="text-[var(--tracker-danger)] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[var(--tracker-ink-subtle)] mt-0.5">{hint}</p>}
    </div>
  );
}

function Input({ name, type = 'text', placeholder, required, mono, value, onChange }) {
  return (
    <input
      type={type}
      name={name}
      required={required}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`lmx-input !text-[12px] !py-1.5 ${mono ? 'font-mono' : ''}`}
    />
  );
}

function Select({ name, value, onChange, children }) {
  return (
    <select name={name} value={value} onChange={onChange} className="lmx-input !text-[12px] !py-1.5 cursor-pointer">
      {children}
    </select>
  );
}

// ── Section card wrapper ─────────────────────────────────────────────────────
function Section({ step, title, children }) {
  return (
    <div className="tracker-card-plain overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--tracker-border)] bg-[var(--tracker-surface-1)]">
        <span className="w-5 h-5 rounded-full bg-[var(--brand-solid)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{step}</span>
        <h2 className="text-[12px] font-bold text-[var(--tracker-ink)]">{title}</h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export default function TenantProvisioningPage() {
  const navigate = useNavigate();

  const [availableModules, setAvailableModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningRunId, setProvisioningRunId] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [stageStatuses, setStageStatuses] = useState(
    DEFAULT_STAGES.reduce((acc, s) => ({ ...acc, [s.step]: { status: 'pending', detail: '' } }), {})
  );
  const [provisionResult, setProvisionResult] = useState(null);
  const [provisionError, setProvisionError] = useState(null);

  const [formData, setFormData] = useState({
    name: '', legalName: '', slug: '',
    industry: 'Technology', country: 'India', currency: 'INR',
    timezone: 'Asia/Kolkata', ownerName: '', ownerEmail: '',
    phone: '', password: '',
    plan: 'Professional', billingCycle: 'Annual',
    maxUsers: 50, fiscalYearStart: 'April',
    language: 'English', enabledModules: []
  });

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await axiosInstance.get('/admin/modules').catch(() => ({ data: { modules: [] } }));
        const fetched = res.data?.modules || [];
        setAvailableModules(fetched);
        setFormData(prev => ({ ...prev, enabledModules: fetched.map(m => m.moduleId || m.id || m._id) }));
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

  const toggleModule = (key) =>
    setFormData(prev => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(key)
        ? prev.enabledModules.filter(m => m !== key)
        : [...prev.enabledModules, key]
    }));

  const selectAllModules = () =>
    setFormData(prev => ({ ...prev, enabledModules: availableModules.map(m => m.moduleId || m.id || m._id) }));

  const clearAllModules = () =>
    setFormData(prev => ({ ...prev, enabledModules: [] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ownerEmail || !formData.password) {
      toast.error('Organization name, owner email, and password are required');
      return;
    }
    if (formData.enabledModules.length === 0) {
      toast.error('At least one module must be selected');
      return;
    }

    setSubmitting(true);
    setIsProvisioning(true);
    setProvisionError(null);
    setProvisionResult(null);
    setActiveStep(1);
    setStageStatuses(DEFAULT_STAGES.reduce((acc, s) => ({ ...acc, [s.step]: { status: 'pending', detail: '' } }), {}));

    const slugToUse = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const payload = {
      name: formData.name, legalName: formData.legalName,
      slug: slugToUse, dbName: `tracker_tenant_${slugToUse}`,
      ownerEmail: formData.ownerEmail, ownerName: formData.ownerName,
      phone: formData.phone, password: formData.password,
      plan: formData.plan, billingCycle: formData.billingCycle,
      maxUsers: Number(formData.maxUsers),
      enabledModules: formData.enabledModules,
      settings: {
        industry: formData.industry, country: formData.country,
        currency: formData.currency, timezone: formData.timezone,
        fiscalYearStart: formData.fiscalYearStart, language: formData.language
      }
    };

    try {
      const token = Cookies.get('auth_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
      const deviceUuid = getDeviceUUID();
      const response = await fetch('/api/admin/tenants/provision-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'x-device-uuid': deviceUuid || '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Provisioning request failed';
        try { errMsg = JSON.parse(errText).error || errMsg; } catch (_) {}
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
        buffer = lines.pop();

        for (const block of lines) {
          if (!block.trim()) continue;
          const eventMatch = block.match(/^event:\s*(.+)$/m);
          const dataMatch  = block.match(/^data:\s*(.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const eventType = eventMatch[1].trim();
          let data = {};
          try { data = JSON.parse(dataMatch[1].trim()); } catch (_) {}

          if (eventType === 'progress') {
            if (data.runId) setProvisioningRunId(data.runId);
            if (data.step) {
              setActiveStep(data.step);
              setStageStatuses(prev => ({
                ...prev,
                [data.step]: { status: data.status || 'running', detail: data.detail || '', error: data.error || null }
              }));
            }
          } else if (eventType === 'complete') {
            setProvisionResult(data);
            setStageStatuses(prev => {
              const u = { ...prev };
              Object.keys(u).forEach(k => { u[k] = { ...u[k], status: 'completed' }; });
              return u;
            });
            toast.success(`${formData.name} provisioned & verified!`);
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

  // ── PROVISIONING PROGRESS VIEW ─────────────────────────────────────────────
  if (isProvisioning) {
    const completed = Object.values(stageStatuses).filter(s => s.status === 'completed').length;
    const progress = Math.round((completed / DEFAULT_STAGES.length) * 100);

    return (
      <div className="tracker-page space-y-3 p-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <div>
            <p className="lmx-page-eyebrow mb-0.5">Provision Stream</p>
            <h1 className="text-[15px] font-bold text-[var(--tracker-ink)] leading-tight">
              {provisionResult ? '✓ Provisioning Complete' : provisionError ? '✕ Provisioning Failed' : 'Provisioning Tenant…'}
            </h1>
            <p className="text-[11px] text-[var(--tracker-ink-subtle)] font-mono mt-0.5">
              {formData.name} ({formData.slug || '…'}){provisioningRunId ? ` · Run ${provisioningRunId}` : ''}
            </p>
          </div>
          {provisionResult && (
            <button
              onClick={() => navigate('/platform-admin/tenant-management')}
              className="tracker-btn-primary !px-4 !py-1.5 !text-[12px]"
            >
              View Tenants →
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-[var(--tracker-surface-2)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'var(--tracker-gradient-brand)' }}
          />
        </div>

        {/* Stage list */}
        <div className="tracker-card-plain overflow-hidden">
          {DEFAULT_STAGES.map((s, idx) => {
            const state = stageStatuses[s.step] || { status: 'pending' };
            const isCurrent = activeStep === s.step;
            const isRunning = state.status === 'running' || (isCurrent && state.status === 'pending' && !provisionResult && !provisionError);
            const effectiveStatus = isRunning ? 'running' : state.status;
            const style = STEP_STATUS_STYLE[effectiveStatus] || STEP_STATUS_STYLE.pending;

            return (
              <div
                key={s.step}
                className={`flex items-start gap-3 px-4 py-2.5 border-l-2 transition-all ${style.row} ${idx < DEFAULT_STAGES.length - 1 ? 'border-b border-b-[var(--tracker-border-soft)]' : ''}`}
              >
                {/* Step dot */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${style.dot}`}>
                  {effectiveStatus === 'completed' ? '✓' : effectiveStatus === 'failed' ? '✕' : s.step}
                </div>

                {/* Label + desc */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[var(--tracker-ink)]">{s.label}</span>
                    {isRunning && (
                      <span className="text-[10px] text-[var(--brand-solid)] font-medium animate-pulse">Processing…</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--tracker-ink-subtle)]">{s.desc}</p>
                  {state.detail && (
                    <p className="text-[10px] font-mono text-[var(--tracker-ink-muted)] mt-0.5 truncate">{state.detail}</p>
                  )}
                  {state.error && (
                    <p className="text-[10px] font-mono text-[var(--tracker-danger)] mt-0.5">{state.error}</p>
                  )}
                </div>

                {/* Status badge */}
                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0 ${style.badge}`}>
                  {effectiveStatus}
                </span>
              </div>
            );
          })}
        </div>

        {/* Success result */}
        {provisionResult && (
          <div className="tracker-card-plain overflow-hidden">
            <div className="h-[3px]" style={{ background: 'var(--tracker-success)' }} />
            <div className="px-4 py-3">
              <p className="text-[11px] font-bold text-[var(--tracker-success)] mb-2">Scoped verification audit passed</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                {[
                  ['Tenant ID', provisionResult.tenant?.tenantId],
                  ['Database', provisionResult.tenant?.dbName],
                  ['Admin Email', provisionResult.user?.email],
                  ['Sidebars', provisionResult.verification?.sidebarCount],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--tracker-ink-subtle)]">{k}</p>
                    <p className="text-[11px] font-mono font-semibold text-[var(--tracker-ink)] truncate">{v || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error retry */}
        {provisionError && (
          <div className="flex justify-end">
            <button
              onClick={() => setIsProvisioning(false)}
              className="tracker-btn-secondary !px-4 !py-1.5 !text-[12px]"
            >
              ← Back to Form (Retry)
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── FORM VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="tracker-page space-y-3 p-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <div>
          <p className="lmx-page-eyebrow mb-0.5">Control Plane</p>
          <h1 className="text-[15px] font-bold text-[var(--tracker-ink)] leading-tight">Tenant Provisioning</h1>
          <p className="text-[11px] text-[var(--tracker-ink-subtle)] mt-0.5">
            Isolated database · Super Admin credentials · module entitlements
          </p>
        </div>
        <button
          onClick={() => navigate('/platform-admin/tenant-management')}
          className="tracker-btn-ghost !px-3 !py-1.5 !text-[12px]"
        >
          ← Tenants
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* 1. Organization & Subscription */}
        <Section step={1} title="Organization & Subscription">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Organization Name" required>
              <Input name="name" required placeholder="AcroCorp Industries" value={formData.name} onChange={handleChange} />
            </Field>
            <Field label="Tenant Slug / Subdomain" required hint="Lowercase alphanumeric only">
              <Input name="slug" required mono placeholder="acrocorp" value={formData.slug} onChange={handleChange} />
            </Field>
            <Field label="Billing Cycle" required>
              <Select name="billingCycle" value={formData.billingCycle} onChange={handleChange}>
                <option value="Annual">Annual — 1 year default expiry</option>
                <option value="Monthly">Monthly — 1 month default expiry</option>
                <option value="Lifetime">Lifetime — no expiry</option>
              </Select>
            </Field>
            <Field label="Max Active Users" required hint="Enforced at employee service layer">
              <Input name="maxUsers" type="number" required placeholder="50" value={formData.maxUsers} onChange={handleChange} />
            </Field>
            <Field label="Industry">
              <Select name="industry" value={formData.industry} onChange={handleChange}>
                {['Technology','Finance','Healthcare','Education','Manufacturing','Retail','Construction','Legal','Consulting','Other'].map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </Select>
            </Field>
            <Field label="Country">
              <Select name="country" value={formData.country} onChange={handleChange}>
                {['India','United States','United Kingdom','Canada','Australia','Singapore','UAE','Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Currency">
              <Select name="currency" value={formData.currency} onChange={handleChange}>
                {['INR','USD','GBP','CAD','AUD','SGD','AED','EUR'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Fiscal Year Start">
              <Select name="fiscalYearStart" value={formData.fiscalYearStart} onChange={handleChange}>
                {['January','February','March','April','July','October'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>

        {/* 2. Owner Credentials */}
        <Section step={2} title="Owner Account Credentials">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner Name">
              <Input name="ownerName" placeholder="John Doe" value={formData.ownerName} onChange={handleChange} />
            </Field>
            <Field label="Owner Email" required>
              <Input name="ownerEmail" type="email" required placeholder="admin@acrocorp.com" value={formData.ownerEmail} onChange={handleChange} />
            </Field>
            <Field label="Phone">
              <Input name="phone" type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={handleChange} />
            </Field>
            <Field label="Initial Super Admin Password" required>
              <div className="relative">
                <Input name="password" type={showPassword ? 'text' : 'password'} required mono placeholder="SuperAdminSecret123!" value={formData.password} onChange={handleChange} />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] transition"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
          </div>
        </Section>

        {/* 3. Module Licensing */}
        <Section step={3} title="Module Licensing Entitlements">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-[var(--tracker-ink-subtle)]">
              {formData.enabledModules.length} of {availableModules.length} modules selected
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={selectAllModules} className="text-[11px] font-semibold text-[var(--brand-solid)] hover:underline">Select all</button>
              <span className="text-[var(--tracker-border)]">·</span>
              <button type="button" onClick={clearAllModules} className="text-[11px] font-semibold text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] hover:underline">Clear</button>
            </div>
          </div>

          {loadingModules ? (
            <p className="text-[11px] text-[var(--tracker-ink-subtle)]">Loading modules…</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {availableModules.map(mod => {
                const key = mod.moduleId || mod.id || mod._id;
                const isChecked = formData.enabledModules.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-start justify-between px-3 py-2 rounded-[var(--tracker-radius-sm)] border cursor-pointer transition-all ${
                      isChecked
                        ? 'border-[var(--brand-solid)] bg-[var(--tracker-surface-1)]'
                        : 'border-[var(--tracker-border)] hover:bg-[var(--tracker-surface-1)]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--tracker-ink)] truncate">{mod.name}</p>
                      {mod.description && (
                        <p className="text-[10px] text-[var(--tracker-ink-subtle)] truncate">{mod.description}</p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleModule(key)}
                      className="mt-0.5 w-3.5 h-3.5 accent-[var(--brand-solid)] rounded flex-shrink-0"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </Section>

        {/* Submit */}
        <div className="flex justify-end gap-2 pb-1">
          <button
            type="button"
            onClick={() => navigate('/platform-admin/tenant-management')}
            className="tracker-btn-ghost !px-4 !py-2 !text-[12px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="tracker-btn-brand !px-5 !py-2 !text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Provisioning…' : 'Provision Tenant & Database'}
          </button>
        </div>
      </form>
    </div>
  );
}
