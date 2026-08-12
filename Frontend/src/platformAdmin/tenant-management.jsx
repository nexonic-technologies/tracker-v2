import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@api/axiosInstance';
import { useAuth } from '@context/authProvider';
import toast from 'react-hot-toast';

// ── Semantic status helpers (no raw color strings) ──────────────────────────
const STATUS_META = {
  ACTIVE:    { label: 'Active',    dot: 'bg-[var(--tracker-success)]',  chip: 'bg-[var(--tracker-success-light)] text-[var(--tracker-success)]',  pulse: true },
  SUSPENDED: { label: 'Suspended', dot: 'bg-[var(--tracker-danger)]',   chip: 'bg-[var(--tracker-danger-light)]  text-[var(--tracker-danger)]',   pulse: false },
  PAST_DUE:  { label: 'Past Due',  dot: 'bg-[var(--tracker-warning)]',  chip: 'bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]',  pulse: false },
  CANCELED:  { label: 'Canceled',  dot: 'bg-[var(--tracker-ink-tertiary)]', chip: 'bg-[var(--tracker-surface-1)] text-[var(--tracker-ink-muted)]', pulse: false },
};

const PAYMENT_META = {
  Paid:    { chip: 'bg-[var(--tracker-success-light)] text-[var(--tracker-success)]' },
  PastDue: { chip: 'bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]' },
  Unpaid:  { chip: 'bg-[var(--tracker-danger-light)]  text-[var(--tracker-danger)]'  },
  Trial:   { chip: 'bg-[var(--tracker-info-light)]    text-[var(--tracker-info)]'    },
};

function StatusChip({ status }) {
  const s = STATUS_META[status?.toUpperCase()] || STATUS_META.ACTIVE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${s.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot} ${s.pulse ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  );
}

function PaymentChip({ status }) {
  const p = PAYMENT_META[status] || PAYMENT_META.Paid;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.chip}`}>
      {status}
    </span>
  );
}

// ── Stat card: number + label + optional delta ───────────────────────────────
function StatCard({ label, value, color, delta, deltaLabel }) {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--tracker-radius-card)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)]"
      style={{ boxShadow: 'var(--tracker-shadow-card)' }}
    >
      {/* accent gradient top-bar */}
      <div className="h-[3px] w-full" style={{ background: color }} />
      <div className="px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--tracker-ink-subtle)]">{label}</p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <span className="text-2xl font-extrabold tabular-nums leading-none" style={{ color }}>{value}</span>
          {delta !== undefined && (
            <span className={`text-[10px] font-semibold flex items-center gap-0.5 mb-0.5 ${delta >= 0 ? 'text-[var(--tracker-success)]' : 'text-[var(--tracker-danger)]'}`}>
              {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)} {deltaLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TenantManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

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
          { moduleId: 'core',        name: 'Core Platform',       description: 'Settings, roles, security, sessions' },
          { moduleId: 'hrms',        name: 'HRMS Suite',          description: 'Employee lifecycle, onboardings, HR policies' },
          { moduleId: 'attendance',  name: 'Attendance & Leave',  description: 'Shifts, punches, leaves, WFH' },
          { moduleId: 'payroll',     name: 'Payroll Engine',      description: 'Salary structures, pay slips, expenses' },
          { moduleId: 'tasks',       name: 'Tasks & Projects',    description: 'Sprints, tasks, todos, queues' },
          { moduleId: 'tickets',     name: 'Helpdesk',            description: 'Support tickets, activity logs' },
          { moduleId: 'crm',         name: 'CRM',                 description: 'Leads, meetings, quotations' },
          { moduleId: 'assets',      name: 'Asset Management',    description: 'Hardware allocation, incidents' },
          { moduleId: 'recruitment', name: 'Recruitment',         description: 'Openings, candidate pipeline' },
          { moduleId: 'feed',        name: 'Team Feed',           description: 'Feeds, posts, comments, notifications' }
        ];
      }
      setAvailableModules(fetchedModules);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load tenant control plane data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q ||
        (t.name || '').toLowerCase().includes(q) ||
        (t.slug || '').toLowerCase().includes(q) ||
        (t.dbName || '').toLowerCase().includes(q) ||
        (t.ownerEmail || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || (t.status || '').toUpperCase() === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [tenants, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total:     tenants.length,
    active:    tenants.filter(t => t.status === 'Active').length,
    pastDue:   tenants.filter(t => t.paymentStatus === 'PastDue' || t.paymentStatus === 'Unpaid').length,
    suspended: tenants.filter(t => t.status === 'Suspended').length,
  }), [tenants]);

  const handleUpdateStatus = async () => {
    if (!selectedTenant) return;
    try {
      await axiosInstance.put(`/admin/tenants/${selectedTenant._id}/status`, { status: targetStatus });
      toast.success(`${selectedTenant.name} → ${targetStatus}`);
      setStatusModalOpen(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update status'); }
  };

  const handleUpdateModules = async () => {
    if (!selectedTenant) return;
    try {
      await axiosInstance.put(`/admin/tenants/${selectedTenant._id}/modules`, { enabledModules: selectedModules });
      toast.success(`Module licensing updated for ${selectedTenant.name}`);
      setModuleModalOpen(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update modules'); }
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
      toast.success(`Subscription updated for ${selectedTenant.name}`);
      setSubModalOpen(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update subscription'); }
  };

  const openSubModal = (tenant) => {
    setSelectedTenant(tenant);
    setSubBillingCycle(tenant.billingCycle || 'Annual');
    setSubPaymentStatus(tenant.paymentStatus || 'Paid');
    setSubMaxUsers(tenant.settings?.maxUsers || 50);
    setSubExpiry(tenant.licenseExpiredAt ? new Date(tenant.licenseExpiredAt).toISOString().split('T')[0] : '');
    setSubModalOpen(true);
  };

  const openModuleModal = (tenant) => {
    setSelectedTenant(tenant);
    setSelectedModules((tenant.enabledModules || []).map(m => typeof m === 'string' ? m : m.moduleId || m._id));
    setModuleModalOpen(true);
  };

  const toggleModule = (key) =>
    setSelectedModules(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]);

  return (
    <div className="tracker-page space-y-3 p-0">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <div>
          <p className="lmx-page-eyebrow mb-0.5">Control Plane</p>
          <h1 className="text-[15px] font-bold text-[var(--tracker-ink)] leading-tight">Tenant Management</h1>
          <p className="text-[11px] text-[var(--tracker-ink-subtle)] mt-0.5">
            Subscriptions · databases · module entitlements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-1)] transition-all"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
          <button
            onClick={() => navigate('/platform-admin/tenant-provisioning')}
            className="tracker-btn-brand inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[11px]"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Provision Tenant
          </button>
        </div>
      </div>

      {/* ── Stat Cards Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Total Tenants"        value={stats.total}     color="var(--brand-solid)" />
        <StatCard label="Active Subscriptions" value={stats.active}    color="var(--tracker-success)" delta={stats.active > 0 ? stats.active : undefined} deltaLabel="active" />
        <StatCard label="Past Due"             value={stats.pastDue}   color="var(--tracker-warning)" />
        <StatCard label="Suspended / Locked"   value={stats.suspended} color="var(--tracker-danger)" />
      </div>

      {/* ── Command Search + Filter ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Command-grade search */}
        <div className="relative flex-1">
          <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tracker-ink-subtle)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search tenant, slug, email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="lmx-input !pl-8 !pr-14 !py-1.5 !text-[12px] !rounded-[var(--tracker-radius-md)]"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--tracker-surface-1)] text-[var(--tracker-ink-subtle)] border border-[var(--tracker-border)] pointer-events-none">⌘K</kbd>
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="lmx-input !w-auto !py-1.5 !text-[12px] !rounded-[var(--tracker-radius-md)] cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAST_DUE">Past Due</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CANCELED">Canceled</option>
        </select>
      </div>

      {/* ── Tenant Table ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="tracker-card px-4 py-10 text-center text-[12px] text-[var(--tracker-ink-subtle)]">
          Loading control plane data…
        </div>
      ) : (
        <div className="tracker-card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--tracker-border)]">
                {['Tenant', 'Slug / DB', 'Billing & Expiry', 'Payment & Capacity', 'Status', 'Modules', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--tracker-ink-subtle)] whitespace-nowrap first:pl-4 last:pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[12px] text-[var(--tracker-ink-subtle)]">
                    No tenants match your search.{' '}
                    <button
                      onClick={() => navigate('/platform-admin/tenant-provisioning')}
                      className="text-[var(--brand-solid)] font-semibold hover:underline"
                    >
                      Provision one →
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => {
                  const status = (tenant.status || 'Active').toUpperCase();
                  const paymentStatus = tenant.paymentStatus || 'Paid';
                  const expiryStr = tenant.licenseExpiredAt
                    ? new Date(tenant.licenseExpiredAt).toLocaleDateString()
                    : 'No limit';
                  const maxUsers = tenant.settings?.maxUsers || 50;
                  const moduleCount = Array.isArray(tenant.enabledModules) ? tenant.enabledModules.length : '—';

                  return (
                    <tr
                      key={tenant._id}
                      className="border-b border-[var(--tracker-border-soft)] hover:bg-[var(--tracker-surface-1)] transition-colors group"
                    >
                      {/* Tenant name */}
                      <td className="pl-4 pr-3 py-2">
                        <div className="text-[12px] font-semibold text-[var(--tracker-ink)]">{tenant.name}</div>
                        <div className="text-[10px] font-mono text-[var(--tracker-ink-subtle)]">{tenant.tenantId}</div>
                      </td>

                      {/* Slug / DB */}
                      <td className="px-3 py-2">
                        <div className="text-[11px] font-semibold text-[var(--brand-solid)] font-mono">{tenant.slug}</div>
                        <div className="text-[10px] font-mono text-[var(--tracker-ink-subtle)]">{tenant.dbName}</div>
                      </td>

                      {/* Billing */}
                      <td className="px-3 py-2">
                        <div className="text-[11px] font-medium text-[var(--tracker-ink)]">{tenant.billingCycle || 'Annual'}</div>
                        <div className="text-[10px] text-[var(--tracker-ink-subtle)]">Expires {expiryStr}</div>
                      </td>

                      {/* Payment & capacity */}
                      <td className="px-3 py-2">
                        <PaymentChip status={paymentStatus} />
                        <div className="text-[10px] font-mono text-[var(--tracker-ink-subtle)] mt-1">{maxUsers} users max</div>
                      </td>

                      {/* Lifecycle status */}
                      <td className="px-3 py-2">
                        <StatusChip status={status} />
                      </td>

                      {/* Module count */}
                      <td className="px-3 py-2">
                        <span
                          className="text-[11px] font-semibold tabular-nums text-[var(--brand-solid)] cursor-pointer hover:underline"
                          onClick={() => openModuleModal(tenant)}
                        >
                          {moduleCount} modules
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="pr-4 pl-2 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openSubModal(tenant)}
                            className="px-2 py-1 text-[10px] font-semibold rounded-[var(--tracker-radius-sm)] bg-[var(--tracker-success-light)] text-[var(--tracker-success)] hover:brightness-95 transition"
                          >
                            Subscription
                          </button>
                          <button
                            onClick={() => { setSelectedTenant(tenant); setTargetStatus(tenant.status || 'Active'); setStatusModalOpen(true); }}
                            className="px-2 py-1 text-[10px] font-semibold rounded-[var(--tracker-radius-sm)] bg-[var(--tracker-surface-1)] text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] border border-[var(--tracker-border)] transition"
                          >
                            Status
                          </button>
                          <button
                            onClick={() => openModuleModal(tenant)}
                            className="px-2 py-1 text-[10px] font-semibold rounded-[var(--tracker-radius-sm)] bg-[var(--tracker-info-light)] text-[var(--tracker-info)] hover:brightness-95 transition"
                          >
                            Modules
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Subscription Modal ───────────────────────────────────────────────── */}
      {subModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="tracker-card-plain p-0 max-w-md w-full overflow-hidden" style={{ boxShadow: 'var(--tracker-shadow-overlay)' }}>
            <div className="px-4 py-3 border-b border-[var(--tracker-border)] flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-bold text-[var(--tracker-ink)]">Subscription & License</h3>
                <p className="text-[11px] text-[var(--tracker-ink-subtle)]">{selectedTenant.name} · {selectedTenant.slug}</p>
              </div>
              <button onClick={() => setSubModalOpen(false)} className="text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] p-1 rounded transition">✕</button>
            </div>

            <div className="p-4 space-y-3">
              <ModalField label="Billing Cycle">
                <select value={subBillingCycle} onChange={e => setSubBillingCycle(e.target.value)} className="lmx-input !text-[12px] !py-1.5">
                  <option value="Annual">Annual — 1 year default expiry</option>
                  <option value="Monthly">Monthly — 1 month default expiry</option>
                  <option value="Lifetime">Lifetime — no expiry</option>
                </select>
              </ModalField>

              <ModalField label="License Expiration" hint="7-day grace period auto-enforced after expiry">
                <input type="date" value={subExpiry} onChange={e => setSubExpiry(e.target.value)} className="lmx-input !text-[12px] !py-1.5" />
              </ModalField>

              <ModalField label="Payment Status">
                <select value={subPaymentStatus} onChange={e => setSubPaymentStatus(e.target.value)} className="lmx-input !text-[12px] !py-1.5">
                  <option value="Paid">Paid — active access</option>
                  <option value="PastDue">Past Due — grace period warning</option>
                  <option value="Unpaid">Unpaid — auto-suspend</option>
                  <option value="Trial">Trial period</option>
                </select>
              </ModalField>

              <ModalField label="Max Active Users" hint="Enforced at employee service layer">
                <input type="number" min="1" max="10000" value={subMaxUsers} onChange={e => setSubMaxUsers(e.target.value)} className="lmx-input !text-[12px] !py-1.5" />
              </ModalField>
            </div>

            <div className="px-4 py-3 border-t border-[var(--tracker-border)] flex justify-end gap-2">
              <button onClick={() => setSubModalOpen(false)} className="tracker-btn-ghost !px-3 !py-1.5 !text-[12px]">Cancel</button>
              <button onClick={handleUpdateSubscription} className="tracker-btn-primary !px-4 !py-1.5 !text-[12px]">Save Subscription</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Modal ─────────────────────────────────────────────────────── */}
      {statusModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="tracker-card-plain p-0 max-w-sm w-full overflow-hidden" style={{ boxShadow: 'var(--tracker-shadow-overlay)' }}>
            <div className="px-4 py-3 border-b border-[var(--tracker-border)] flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-bold text-[var(--tracker-ink)]">Lifecycle Status</h3>
                <p className="text-[11px] text-[var(--tracker-ink-subtle)]">{selectedTenant.name} · {selectedTenant.tenantId}</p>
              </div>
              <button onClick={() => setStatusModalOpen(false)} className="text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] p-1 rounded transition">✕</button>
            </div>

            <div className="p-4 space-y-1.5">
              {[
                { s: 'Active',    desc: 'Full Data Plane API access' },
                { s: 'PAST_DUE', desc: 'API access with warning banner' },
                { s: 'Suspended', desc: 'Data plane locked — HTTP 402' },
                { s: 'CANCELED',  desc: 'Read-only mode, mutations blocked' },
              ].map(({ s, desc }) => (
                <label
                  key={s}
                  className={`flex items-center gap-3 px-3 py-2 rounded-[var(--tracker-radius-sm)] border cursor-pointer transition-all ${
                    targetStatus === s
                      ? 'border-[var(--brand-solid)] bg-[var(--tracker-surface-1)]'
                      : 'border-[var(--tracker-border)] hover:bg-[var(--tracker-surface-1)]'
                  }`}
                >
                  <input type="radio" name="status" value={s} checked={targetStatus === s} onChange={e => setTargetStatus(e.target.value)} className="accent-[var(--brand-solid)] w-3.5 h-3.5" />
                  <div>
                    <div className="text-[12px] font-semibold text-[var(--tracker-ink)]">{s}</div>
                    <div className="text-[10px] text-[var(--tracker-ink-subtle)]">{desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-[var(--tracker-border)] flex justify-end gap-2">
              <button onClick={() => setStatusModalOpen(false)} className="tracker-btn-ghost !px-3 !py-1.5 !text-[12px]">Cancel</button>
              <button onClick={handleUpdateStatus} className="tracker-btn-primary !px-4 !py-1.5 !text-[12px]">Save Status</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Module Licensing Modal ───────────────────────────────────────────── */}
      {moduleModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="tracker-card-plain p-0 max-w-md w-full overflow-hidden" style={{ boxShadow: 'var(--tracker-shadow-overlay)' }}>
            <div className="px-4 py-3 border-b border-[var(--tracker-border)] flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-bold text-[var(--tracker-ink)]">Module Licensing</h3>
                <p className="text-[11px] text-[var(--tracker-ink-subtle)]">{selectedTenant.name} — {selectedModules.length} active</p>
              </div>
              <button onClick={() => setModuleModalOpen(false)} className="text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] p-1 rounded transition">✕</button>
            </div>

            <div className="p-3 max-h-72 overflow-y-auto space-y-1">
              {availableModules.map(mod => {
                const key = mod.moduleId || mod.id || mod._id;
                const checked = selectedModules.includes(key) || selectedModules.includes(mod._id);
                return (
                  <label
                    key={key}
                    className="flex items-center justify-between px-3 py-2 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)] cursor-pointer hover:bg-[var(--tracker-surface-1)] transition-colors group"
                  >
                    <div>
                      <div className="text-[12px] font-semibold text-[var(--tracker-ink)]">{mod.name}</div>
                      {mod.description && <div className="text-[10px] text-[var(--tracker-ink-subtle)]">{mod.description}</div>}
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModule(key)}
                      className="w-3.5 h-3.5 accent-[var(--brand-solid)] rounded flex-shrink-0"
                    />
                  </label>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-[var(--tracker-border)] flex justify-end gap-2">
              <button onClick={() => setModuleModalOpen(false)} className="tracker-btn-ghost !px-3 !py-1.5 !text-[12px]">Cancel</button>
              <button onClick={handleUpdateModules} className="tracker-btn-primary !px-4 !py-1.5 !text-[12px]">Apply Licensing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared modal form field ────────────────────────────────────────────────
function ModalField({ label, hint, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[var(--tracker-ink-muted)] mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[var(--tracker-ink-subtle)] mt-0.5">{hint}</p>}
    </div>
  );
}
