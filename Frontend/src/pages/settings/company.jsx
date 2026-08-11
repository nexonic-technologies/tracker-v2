import { useEffect, useState, useRef } from 'react';
import {
  Building2,
  Mail,
  MapPin,
  Globe,
  Sparkles,
  Save,
  RefreshCw,
  FileText,
  CheckCircle2,
  Image as ImageIcon,
  ShieldCheck,
  Building,
  Briefcase,
  Upload,
  X,
  Link as LinkIcon,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '@api/axiosInstance';
import FormPageLayout from '@components/Forms/FormPageLayout';

const DEFAULT_COMPANY_STATE = {
  _id: '',
  companyName: 'Workhub',
  legalName: 'Axinix Technologies Pvt. Ltd.',
  tagline: 'Make New Generation Applications',
  aboutText:
    "Axinix Technologies Pvt. Ltd. is a conglomerate with the vision 'Leverage Technology to Enable Outcomes that Matter', focuses on cutting-edge technology areas in Biometric, IoT, Cloud, & IT System Integration solutions and IT infrastructure management services.",
  logoUrl: '',
  website: 'www.axinixtech.com',
  hrEmail: 'hr@axinixtech.com',
  itEmail: 'it@axinixtech.com',
  payrollEmail: 'payroll@axinixtech.com',
  contactEmail: 'prism@axinixtech.com',
  address: {
    street: 'Headquarters, Main Road',
    city: 'coimbatore',
    state: 'Tamil Nadu',
    country: 'India',
    zip: '641001'
  },
  isDefault: true
};

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(DEFAULT_COMPANY_STATE);

  // File Upload States
  const [logoFile, setLogoFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [logoMode, setLogoMode] = useState('upload'); // 'upload' | 'url'
  const fileInputRef = useRef(null);

  const fetchCompanySettings = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/populate/read/company');
      const list = res.data?.data || [];
      if (list.length > 0) {
        const doc = list[0];
        setCompany({
          _id: doc._id || '',
          companyName: doc.companyName || 'Workhub',
          legalName: doc.legalName || 'Axinix Technologies Pvt. Ltd.',
          tagline: doc.tagline || '',
          aboutText: doc.aboutText || '',
          logoUrl: doc.logoUrl || '',
          website: doc.website || '',
          hrEmail: doc.hrEmail || '',
          itEmail: doc.itEmail || '',
          payrollEmail: doc.payrollEmail || '',
          contactEmail: doc.contactEmail || '',
          address: {
            street: doc.address?.street || '',
            city: doc.address?.city || '',
            state: doc.address?.state || '',
            country: doc.address?.country || '',
            zip: doc.address?.zip || ''
          },
          isDefault: doc.isDefault ?? true
        });
        if (doc.logoUrl && !doc.logoUrl.startsWith('data:')) {
          setLogoMode('upload');
        }
      }
    } catch (err) {
      console.error('Failed to load company profile:', err);
      toast.error('Failed to load company profile settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const handleChange = (field, value) => {
    if (field.startsWith('address.')) {
      const subField = field.split('.')[1];
      setCompany(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [subField]: value
        }
      }));
    } else {
      setCompany(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Handle Logo File Select
  const handleFileSelect = file => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Logo file size must be less than 10MB');
      return;
    }

    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
  };

  const handleClearFile = () => {
    setLogoFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getDisplayedLogo = () => {
    if (filePreview) return filePreview;
    if (!company.logoUrl) return '';
    if (
      company.logoUrl.startsWith('http://') ||
      company.logoUrl.startsWith('https://') ||
      company.logoUrl.startsWith('data:')
    ) {
      return company.logoUrl;
    }
    if (company.logoUrl.startsWith('/api/')) return company.logoUrl;
    if (company.logoUrl.startsWith('serve/')) return `/api/files/${company.logoUrl}`;
    return company.logoUrl;
  };

  const handleSubmit = async e => {
    if (e) e.preventDefault();
    if (!company.companyName.trim()) {
      toast.error('Company Name is required');
      return;
    }

    setSaving(true);
    try {
      const { _id, ...payload } = company;

      let responseData = null;

      if (logoFile) {
        // Send via multipart FormData if a new logo image file was staged
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('companyName', payload.companyName);
        formData.append('legalName', payload.legalName || '');
        formData.append('tagline', payload.tagline || '');
        formData.append('aboutText', payload.aboutText || '');
        formData.append('website', payload.website || '');
        formData.append('hrEmail', payload.hrEmail || '');
        formData.append('itEmail', payload.itEmail || '');
        formData.append('payrollEmail', payload.payrollEmail || '');
        formData.append('contactEmail', payload.contactEmail || '');
        formData.append('isDefault', payload.isDefault);
        formData.append('address[street]', payload.address.street || '');
        formData.append('address[city]', payload.address.city || '');
        formData.append('address[state]', payload.address.state || '');
        formData.append('address[country]', payload.address.country || '');
        formData.append('address[zip]', payload.address.zip || '');

        if (_id) {
          const res = await axiosInstance.put(`/populate/update/company/${_id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          responseData = res.data?.data || res.data;
          toast.success('Company profile & logo updated successfully');
        } else {
          const res = await axiosInstance.post('/populate/create/company', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          responseData = res.data?.data || res.data;
          toast.success('Company profile & logo created successfully');
        }
      } else {
        // Submit standard JSON payload
        if (_id) {
          const res = await axiosInstance.put(`/populate/update/company/${_id}`, payload);
          responseData = res.data?.data || res.data;
          toast.success('Company profile updated successfully');
        } else {
          const res = await axiosInstance.post('/populate/create/company', payload);
          responseData = res.data?.data || res.data;
          toast.success('Company profile created successfully');
        }
      }

      // Update state with saved document response
      if (responseData) {
        const savedId = responseData._id || _id;
        const savedLogo = responseData.logoUrl || company.logoUrl;
        setCompany(prev => ({
          ...prev,
          _id: savedId,
          logoUrl: savedLogo
        }));
        handleClearFile();
      }
    } catch (err) {
      console.error('Failed to save company settings:', err);
      toast.error(err?.response?.data?.message || 'Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FormPageLayout
        title="Company Profile Settings"
        subtitle="Manage company identity, department email contacts, and address for documents and emails."
        backTo="/settings/general"
        maxWidth="max-w-6xl"
      >
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-ink-muted">Loading company profile...</p>
        </div>
      </FormPageLayout>
    );
  }

  const displayedLogo = getDisplayedLogo();

  return (
    <div data-module="hr">
      <FormPageLayout
        title="Company Profile Settings"
        subtitle="Manage system-wide company branding, logo upload, legal info, department contacts, and headquarters address."
        backTo="/settings/general"
        maxWidth="max-w-6xl"
        embedded
      >
        <form onSubmit={handleSubmit} className="space-y-6 pb-12">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10 text-accent">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                  {company.companyName || 'Company Profile'}
                  {company.isDefault && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" /> Primary Profile
                    </span>
                  )}
                </h2>
                <p className="text-xs text-ink-muted">
                  Configured for system-wide invoices, payslips, and email headers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  handleClearFile();
                  fetchCompanySettings();
                }}
                disabled={saving}
                className="tracker-btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="tracker-btn-brand text-xs px-4 py-2 inline-flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grid Layout: Identity & Branding */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Brand Preview & Logo File Upload */}
            <div className="tracker-card-plain p-5 sm:p-6 space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2 text-sm font-bold text-ink">
                    <ImageIcon className="w-4 h-4 text-accent" />
                    Company Logo
                  </div>

                  {/* Mode Selector */}
                  <div className="flex bg-canvas p-0.5 rounded-lg border border-border text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => setLogoMode('upload')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        logoMode === 'upload'
                          ? 'bg-surface text-ink font-semibold shadow-xs'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoMode('url')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        logoMode === 'url'
                          ? 'bg-surface text-ink font-semibold shadow-xs'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      URL
                    </button>
                  </div>
                </div>

                {/* Logo Display Box */}
                <div className="mt-4 flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border bg-canvas/50 text-center space-y-3 relative group">
                  {displayedLogo ? (
                    <div className="relative">
                      <img
                        src={displayedLogo}
                        alt="Company Logo"
                        className="h-24 w-auto max-w-full object-contain rounded-lg shadow-sm border border-border p-2 bg-surface"
                        onError={e => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/150?text=Logo+Error';
                        }}
                      />
                      {logoFile && (
                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <Building className="w-10 h-10" />
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-ink">
                      {logoFile ? logoFile.name : company.companyName || 'Company Logo'}
                    </p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {logoFile
                        ? `${(logoFile.size / 1024).toFixed(1)} KB (Staged)`
                        : 'Rendered on official letters & email headers'}
                    </p>
                  </div>

                  {logoFile && (
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 bg-rose-500/10 px-2.5 py-1 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Upload
                    </button>
                  )}
                </div>

                {/* Upload or URL Controls */}
                <div className="mt-4">
                  {logoMode === 'upload' ? (
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif"
                        className="hidden"
                        onChange={e => handleFileSelect(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full tracker-btn-secondary text-xs py-2 px-3 inline-flex items-center justify-center gap-2 border-dashed border-accent/40 text-accent hover:bg-accent/5"
                      >
                        <Upload className="w-4 h-4" />
                        {logoFile ? 'Change Logo Image' : 'Choose Logo Image File'}
                      </button>
                      <p className="text-[11px] text-ink-muted text-center">
                        Supports PNG, JPG, WebP, SVG (Max 10MB)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-ink">Logo Image URL</label>
                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-muted" />
                        <input
                          type="url"
                          value={company.logoUrl}
                          onChange={e => {
                            handleClearFile();
                            handleChange('logoUrl', e.target.value);
                          }}
                          placeholder="https://example.com/logo.png"
                          className="lmx-input text-xs pl-8"
                        />
                      </div>
                      <p className="text-[11px] text-ink-muted">
                        Paste direct HTTPS image link if hosted externally.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-ink">Primary Default Profile</p>
                  <p className="text-[11px] text-ink-muted">Set as system default</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={company.isDefault}
                    onChange={e => handleChange('isDefault', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
                </label>
              </div>
            </div>

            {/* Right 2 Columns: Core Identity Fields */}
            <div className="lg:col-span-2 tracker-card-plain p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-ink mb-2 pb-2 border-b border-border">
                <Briefcase className="w-4 h-4 text-accent" />
                Core Corporate Identity
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Display Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={company.companyName}
                    onChange={e => handleChange('companyName', e.target.value)}
                    placeholder="e.g. Workhub"
                    className="lmx-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Legal Name</label>
                  <input
                    type="text"
                    value={company.legalName}
                    onChange={e => handleChange('legalName', e.target.value)}
                    placeholder="e.g. Axinix Technologies Pvt. Ltd."
                    className="lmx-input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Corporate Tagline
                  </label>
                  <input
                    type="text"
                    value={company.tagline}
                    onChange={e => handleChange('tagline', e.target.value)}
                    placeholder="e.g. Make New Generation Applications"
                    className="lmx-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Official Website URL
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-2.5 text-ink-muted" />
                    <input
                      type="text"
                      value={company.website}
                      onChange={e => handleChange('website', e.target.value)}
                      placeholder="www.axinixtech.com"
                      className="lmx-input text-xs pl-9"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">About Company</label>
                <textarea
                  rows={4}
                  value={company.aboutText}
                  onChange={e => handleChange('aboutText', e.target.value)}
                  placeholder="Summary of company profile, mission, and background..."
                  className="lmx-input text-xs leading-relaxed"
                />
                <p className="text-[11px] text-ink-muted mt-1">
                  This text is populated in system reports, offer letters, and footer signatures.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Department Email Contacts */}
          <div className="tracker-card-plain p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink mb-2 pb-2 border-b border-border">
              <Mail className="w-4 h-4 text-accent" />
              Department Email Contacts
            </div>
            <p className="text-xs text-ink-muted -mt-2 mb-4">
              Routing addresses used by automated modules (HR letters, IT tickets, payroll payslips, and public inquiries).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">HR Email</label>
                <input
                  type="email"
                  value={company.hrEmail}
                  onChange={e => handleChange('hrEmail', e.target.value)}
                  placeholder="hr@axinixtech.com"
                  className="lmx-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">IT Support Email</label>
                <input
                  type="email"
                  value={company.itEmail}
                  onChange={e => handleChange('itEmail', e.target.value)}
                  placeholder="it@axinixtech.com"
                  className="lmx-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Payroll Email</label>
                <input
                  type="email"
                  value={company.payrollEmail}
                  onChange={e => handleChange('payrollEmail', e.target.value)}
                  placeholder="payroll@axinixtech.com"
                  className="lmx-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">General Contact Email</label>
                <input
                  type="email"
                  value={company.contactEmail}
                  onChange={e => handleChange('contactEmail', e.target.value)}
                  placeholder="prism@axinixtech.com"
                  className="lmx-input text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Headquarters & Registered Address */}
          <div className="tracker-card-plain p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink mb-2 pb-2 border-b border-border">
              <MapPin className="w-4 h-4 text-accent" />
              Registered Corporate Address
            </div>
            <p className="text-xs text-ink-muted -mt-2 mb-4">
              Physical address rendered on official tax documents, compliance records, and contracts.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Street Address</label>
                <input
                  type="text"
                  value={company.address?.street}
                  onChange={e => handleChange('address.street', e.target.value)}
                  placeholder="Headquarters, Main Road"
                  className="lmx-input text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">City</label>
                  <input
                    type="text"
                    value={company.address?.city}
                    onChange={e => handleChange('address.city', e.target.value)}
                    placeholder="coimbatore"
                    className="lmx-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">State / Province</label>
                  <input
                    type="text"
                    value={company.address?.state}
                    onChange={e => handleChange('address.state', e.target.value)}
                    placeholder="Tamil Nadu"
                    className="lmx-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Country</label>
                  <input
                    type="text"
                    value={company.address?.country}
                    onChange={e => handleChange('address.country', e.target.value)}
                    placeholder="India"
                    className="lmx-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">ZIP / Postal Code</label>
                  <input
                    type="text"
                    value={company.address?.zip}
                    onChange={e => handleChange('address.zip', e.target.value)}
                    placeholder="641001"
                    className="lmx-input text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </FormPageLayout>
    </div>
  );
}
