import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../../api/axiosInstance';
import { usePermission } from '../../../context/permissionProvider';
import FormPageLayout from '../../../components/Forms/FormPageLayout';

function getCleanId(id) {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (id.$oid) return id.$oid;
  if (id._id) return getCleanId(id._id);
  return id.toString();
}

const BASE_PATH = '/master-data/Roles';

export default function RoleFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const { isSuperAdmin: currentUserIsSuperAdmin } = usePermission();

  const [form, setForm] = useState({ name: '', description: '', isActive: true, isSuperAdmin: false, capabilities: [] });
  const [dbCapabilities, setDbCapabilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch active business capabilities
  useEffect(() => {
    axiosInstance.post('/populate/read/capabilities', {
      filter: { status: 'active', type: 'business' },
      limit: 1000
    })
      .then(res => {
        setDbCapabilities(res.data?.data || []);
      })
      .catch(err => console.error('Failed to fetch capabilities:', err));
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axiosInstance.get(`/populate/read/roles/${id}`)
      .then(res => {
        const d = res.data?.data || {};
        setForm({
          name: d.name || '',
          description: d.description || '',
          isActive: d.isActive ?? true,
          isSuperAdmin: d.isSuperAdmin || false,
          capabilities: (d.capabilities || []).map(c => getCleanId(c._id || c)),
        });
      })
      .catch(() => toast.error('Failed to load role'))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleCap = (capId) => {
    setForm(f => ({
      ...f,
      capabilities: f.capabilities.includes(capId)
        ? f.capabilities.filter(c => c !== capId)
        : [...f.capabilities, capId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Role name is required');
    setSaving(true);
    try {
      const body = { 
        ...form, 
        isActive: form.isActive === 'false' ? false : Boolean(form.isActive),
        isSuperAdmin: Boolean(form.isSuperAdmin)
      };
      if (id) {
        await axiosInstance.put(`/populate/update/roles/${id}`, body);
        toast.success('Role updated');
      } else {
        await axiosInstance.post('/populate/create/roles', body);
        toast.success('Role created');
      }
      navigate(BASE_PATH);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPageLayout
      title={id ? 'Edit Role' : 'Add Role'}
      subtitle="Manage role details and capabilities"
      backTo={BASE_PATH}
    >
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic fields */}
          <div className="tracker-card-plain p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="lmx-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. HR Admin"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
                  Status
                </label>
                <select
                  className="lmx-input"
                  value={String(form.isActive)}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            
            {currentUserIsSuperAdmin && (
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isSuperAdmin}
                    onChange={e => setForm(f => ({ ...f, isSuperAdmin: e.target.checked }))}
                    className="rounded border-hairline text-accent focus:ring-accent h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-ink uppercase tracking-wide select-none">
                    Super Admin Role (Bypasses all security policies)
                  </span>
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
                Description
              </label>
              <textarea
                className="lmx-input resize-none"
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
          </div>

          {/* Capabilities */}
          <div className="tracker-card p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-hairline-soft">
              <span className="lmx-icon-tile">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Capabilities</p>
                <p className="text-xs text-ink-muted">
                  {form.capabilities.length} of {dbCapabilities.length} selected
                </p>
              </div>
              <button
                type="button"
                className="ml-auto text-xs font-medium text-accent hover:underline"
                onClick={() =>
                  setForm(f => ({
                    ...f,
                    capabilities: f.capabilities.length === dbCapabilities.length
                      ? []
                      : dbCapabilities.map(c => getCleanId(c._id)),
                  }))
                }
              >
                {form.capabilities.length === dbCapabilities.length ? 'Clear all' : 'Select all'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dbCapabilities.map(cap => {
                const capId = getCleanId(cap._id);
                const active = form.capabilities.includes(capId);
                return (
                  <button
                    key={capId}
                    type="button"
                    onClick={() => toggleCap(capId)}
                    className={`flex items-start gap-3 p-3 rounded-tracker-md border text-left transition-all ${
                      active
                        ? 'border-accent bg-accent-muted'
                        : 'border-hairline bg-surface hover:bg-surface-1'
                    }`}
                  >
                    {/* checkbox indicator */}
                    <span className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                      active ? 'border-accent bg-accent' : 'border-hairline bg-surface'
                    }`}>
                      {active && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 8">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span>
                      <span className={`block text-xs font-semibold ${active ? 'text-accent' : 'text-ink'}`}>
                        {cap.label || cap.key}
                      </span>
                      <span className="block text-xs text-ink-muted mt-0.5">{cap.description || cap.desc || `Access to ${cap.key}`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => navigate(BASE_PATH)} className="tracker-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="tracker-btn-accent">
              {saving ? 'Saving…' : id ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      )}
    </FormPageLayout>
  );
}
