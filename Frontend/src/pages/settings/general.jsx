import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Settings2, CalendarRange, Globe, Landmark, Clock, RefreshCw,
  Bell, Plus, Trash2, Edit2, AlertCircle, Save, CheckCircle, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '@api/axiosInstance';
import FormPageLayout from '@components/Forms/FormPageLayout';

const TIMEZONES = [
  'Asia/Kolkata', 'UTC', 'GMT', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore'
];

const CURRENCIES = [
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD'
];

const MODEL_CHOICES = [
  'tasks', 'tickets', 'attendances', 'comments_threads', 'feed_posts', 'feed_comments', 'expenses', 'regularizations'
];

const TRIGGER_CHOICES = [
  'create', 'update', 'delete', 'approve', 'reject', 'transition', 'custom'
];

const OPERATOR_CHOICES = [
  'equals', 'not_equals', 'changed', 'exists', 'contains', 'in', 'gt', 'gte', 'lt', 'lte', 'regex'
];

const NOTIF_TYPES = [
  'system', 'task', 'ticket', 'leave', 'comment', 'mention', 'reaction', 'post'
];

export default function general_settingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    _id: '',
    organization: { companyName: '', branding: { primaryColor: '#6366F1' } },
    localization: { timezone: 'Asia/Kolkata', currency: 'INR' },
    release: {
      web: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 },
      android: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 },
      ios: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 }
    },
    maintenance: {
      globalEnabled: false,
      webEnabled: false,
      mobileEnabled: false,
      message: 'System is currently undergoing scheduled maintenance.',
      bypassRoles: { web: [], mobile: [] },
      scheduledStart: '',
      scheduledEnd: ''
    },
    taskETA: {
      enabled: true,
      multiplier: 3
    },
    payroll: { pfCeiling: 15000, pfPercent: 12, esiThreshold: 21000, esiPercent: 0.75 },
    attendance: { workingHours: 8, lateGraceMinutes: 15 },
    notification: {
      enabled: true,
      useDynamicNotifications: false,
      defaultProviders: ['socket'],
      firebase: {
        enabled: false,
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
        measurementId: '',
        vapidKey: '',
        serviceAccountKey: '',
        serviceAccountKeyEncrypted: ''
      }
    },
    cron: []
  });

  // Dynamic rules state
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [showRuleModal, setShowRuleModal] = useState(false);

  const fetchSettings = () => {
    setLoading(true);
    axiosInstance.get('/populate/read/general_settings')
      .then(res => {
        const list = res.data?.data || [];
        if (list.length > 0) {
          const doc = list[0];
          setSettings({
            _id: doc._id,
            organization: doc.organization || { companyName: '', branding: { primaryColor: '#6366F1' } },
            localization: doc.localization || { timezone: 'Asia/Kolkata', currency: 'INR' },
            release: doc.release || {
              web: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 },
              android: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 },
              ios: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 }
            },
            maintenance: doc.maintenance || {
              globalEnabled: false,
              webEnabled: false,
              mobileEnabled: false,
              message: '',
              bypassRoles: { web: [], mobile: [] },
              scheduledStart: '',
              scheduledEnd: ''
            },
            taskETA: doc.taskETA || { enabled: true, multiplier: 3 },
            payroll: doc.payroll || { pfCeiling: 15000, pfPercent: 12, esiThreshold: 21000, esiPercent: 0.75 },
            attendance: doc.attendance || { workingHours: 8, lateGraceMinutes: 15 },
            notification: doc.notification || {
              enabled: true,
              useDynamicNotifications: false,
              defaultProviders: ['socket'],
              firebase: {
                enabled: false,
                apiKey: '',
                authDomain: '',
                projectId: '',
                storageBucket: '',
                messagingSenderId: '',
                appId: '',
                measurementId: '',
                vapidKey: '',
                serviceAccountKey: '',
                serviceAccountKeyEncrypted: ''
              }
            },
            cron: doc.cron || []
          });
        }
      })
      .catch(err => {
        console.error('Failed to load settings:', err);
        toast.error('Failed to load general settings');
      })
      .finally(() => setLoading(false));
  };

  const fetchRules = () => {
    setRulesLoading(true);
    axiosInstance.get('/populate/read/notificationrules')
      .then(res => {
        setRules(res.data?.data || []);
      })
      .catch(err => {
        console.error('Failed to load notification rules:', err);
        toast.error('Failed to load notification rules');
      })
      .finally(() => setRulesLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchRules();
    }
  }, [activeTab]);

  const handleUpdate = (path, value) => {
    setSettings(prev => {
      const copy = { ...prev };
      const keys = path.split('.');
      let current = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  const handleCronUpdate = (index, field, value) => {
    setSettings(prev => {
      const copy = { ...prev };
      const updatedCron = [...copy.cron];
      updatedCron[index] = { ...updatedCron[index], [field]: value };
      copy.cron = updatedCron;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { _id, ...payload } = settings;
      if (settings._id) {
        await axiosInstance.put(`/populate/update/general_settings/${settings._id}`, payload);
        toast.success('General settings updated successfully');
      } else {
        const res = await axiosInstance.post('/populate/create/general_settings', payload);
        toast.success('General settings initialized');
        if (res.data?.data?._id) {
          setSettings(s => ({ ...s, _id: res.data.data._id }));
        }
      }
      // Re-fetch to clear plain-text serviceAccountKey and display save placeholder
      fetchSettings();
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(err?.response?.data?.message || 'Failed to save general settings');
    } finally {
      setSaving(false);
    }
  };

  // Rule dialog helper functions
  const openAddRule = () => {
    setSelectedRule({
      name: '',
      modelName: 'tasks',
      trigger: 'create',
      enabled: true,
      priority: 0,
      stopProcessing: false,
      conditionGroups: {
        operator: 'AND',
        conditions: []
      },
      recipients: {
        fields: [],
        roles: [],
        customResolvers: [],
        queries: []
      },
      template: {
        title: '',
        message: '',
        type: 'system',
        path: '',
        icon: '',
        priority: 'normal',
        category: ''
      }
    });
    setShowRuleModal(true);
  };

  const openEditRule = (rule) => {
    setSelectedRule({
      ...rule,
      conditionGroups: rule.conditionGroups || { operator: 'AND', conditions: [] },
      recipients: rule.recipients || { fields: [], roles: [], customResolvers: [], queries: [] },
      template: rule.template || { title: '', message: '', type: 'system', path: '', icon: '', priority: 'normal', category: '' }
    });
    setShowRuleModal(true);
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    try {
      if (selectedRule._id) {
        await axiosInstance.put(`/populate/update/notificationrules/${selectedRule._id}`, selectedRule);
        toast.success('Notification rule updated successfully');
      } else {
        await axiosInstance.post('/populate/create/notificationrules', selectedRule);
        toast.success('Notification rule created successfully');
      }
      setShowRuleModal(false);
      fetchRules();
    } catch (err) {
      console.error('Failed to save rule:', err);
      toast.error(err?.response?.data?.message || 'Failed to save rule');
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification rule?')) return;
    try {
      await axiosInstance.delete(`/populate/delete/notificationrules/${id}`);
      toast.success('Rule deleted successfully');
      fetchRules();
    } catch (err) {
      console.error('Failed to delete rule:', err);
      toast.error('Failed to delete rule');
    }
  };

  const handleAddCondition = () => {
    setSelectedRule(prev => {
      const copy = { ...prev };
      copy.conditionGroups.conditions.push({ field: '', operator: 'equals', value: '' });
      return copy;
    });
  };

  const handleRemoveCondition = (idx) => {
    setSelectedRule(prev => {
      const copy = { ...prev };
      copy.conditionGroups.conditions.splice(idx, 1);
      return copy;
    });
  };

  const handleConditionChange = (idx, field, value) => {
    setSelectedRule(prev => {
      const copy = { ...prev };
      copy.conditionGroups.conditions[idx][field] = value;
      return copy;
    });
  };

  return (
    <FormPageLayout
      title="System Settings"
      subtitle="Configure organization defaults, releases, cron parameters, and rule-driven notifications."
      backTo="/dashboard"
    >
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-xs text-ink-muted mt-3">Loading settings configurations...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs Navigation */}
          <div className="flex gap-2 p-1 bg-surface-1 border border-hairline rounded-tracker-lg w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-tracker-md transition-all ${activeTab === 'general' ? 'bg-surface text-accent shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
            >
              <Settings2 className="h-4 w-4" />
              General Defaults
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('maintenance')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-tracker-md transition-all ${activeTab === 'maintenance' ? 'bg-surface text-accent shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
            >
              <Shield className="h-4 w-4" />
              Maintenance & Releases
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-tracker-md transition-all ${activeTab === 'notifications' ? 'bg-surface text-accent shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
            >
              <Bell className="h-4 w-4" />
              Notifications & Push
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scheduler')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-tracker-md transition-all ${activeTab === 'scheduler' ? 'bg-surface text-accent shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
            >
              <CalendarRange className="h-4 w-4" />
              Cron Scheduler
            </button>
          </div>

          {activeTab !== 'notifications' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  {/* Organization Details */}
                  <div className="tracker-card-plain p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-accent" />
                        <div>
                          <p className="text-sm font-semibold text-ink">Organization & Localization</p>
                          <p className="text-xs text-ink-muted">Configure branding rules and regional defaults</p>
                        </div>
                      </div>
                      <Link
                        to="/settings/company"
                        className="tracker-btn-brand text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                      >
                        Company Profile Settings &rarr;
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Company Name</label>
                        <input
                          className="lmx-input"
                          value={settings.organization?.companyName || ''}
                          onChange={e => handleUpdate('organization.companyName', e.target.value)}
                          placeholder="e.g. Work Hub ERP"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Branding Primary Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            className="h-9 w-12 rounded border border-hairline p-0.5 cursor-pointer bg-transparent"
                            value={settings.organization?.branding?.primaryColor || '#6366F1'}
                            onChange={e => handleUpdate('organization.branding.primaryColor', e.target.value)}
                          />
                          <input
                            className="lmx-input flex-1"
                            value={settings.organization?.branding?.primaryColor || '#6366F1'}
                            onChange={e => handleUpdate('organization.branding.primaryColor', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Timezone</label>
                        <select
                          className="lmx-input"
                          value={settings.localization?.timezone || 'Asia/Kolkata'}
                          onChange={e => handleUpdate('localization.timezone', e.target.value)}
                        >
                          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Default Currency</label>
                        <select
                          className="lmx-input"
                          value={settings.localization?.currency || 'INR'}
                          onChange={e => handleUpdate('localization.currency', e.target.value)}
                        >
                          {CURRENCIES.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Payroll Statutory Thresholds */}
                  <div className="tracker-card-plain p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                      <Landmark className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-sm font-semibold text-ink">Payroll Statutory Defaults</p>
                        <p className="text-xs text-ink-muted">Configure baseline PF ceilings and ESI percentages</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">PF Ceiling Limit (₹)</label>
                        <input
                          type="number"
                          className="lmx-input"
                          value={settings.payroll?.pfCeiling || 0}
                          onChange={e => handleUpdate('payroll.pfCeiling', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">PF Percentage (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="lmx-input"
                          value={settings.payroll?.pfPercent || 0}
                          onChange={e => handleUpdate('payroll.pfPercent', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">ESI Threshold Limit (₹)</label>
                        <input
                          type="number"
                          className="lmx-input"
                          value={settings.payroll?.esiThreshold || 0}
                          onChange={e => handleUpdate('payroll.esiThreshold', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">ESI Percentage (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="lmx-input"
                          value={settings.payroll?.esiPercent || 0}
                          onChange={e => handleUpdate('payroll.esiPercent', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Attendance & Shift Details */}
                  <div className="tracker-card-plain p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                      <Clock className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-sm font-semibold text-ink">Attendance & Shifts</p>
                        <p className="text-xs text-ink-muted">Configure default working hours and late grace bounds</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Daily Working Hours</label>
                        <input
                          type="number"
                          className="lmx-input"
                          value={settings.attendance?.workingHours || 8}
                          onChange={e => handleUpdate('attendance.workingHours', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Late Grace Minutes</label>
                        <input
                          type="number"
                          className="lmx-input"
                          value={settings.attendance?.lateGraceMinutes || 15}
                          onChange={e => handleUpdate('attendance.lateGraceMinutes', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Task ETA Engine Settings */}
                  <div className="tracker-card-plain p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                      <Clock className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-sm font-semibold text-ink">Task Delivery ETA Engine</p>
                        <p className="text-xs text-ink-muted">Configure adhoc queue buffer multipliers and calculate state</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 border border-hairline bg-surface-1 rounded-tracker-md">
                        <div>
                          <span className="text-xs font-bold text-ink uppercase tracking-wide block">Enable ETA Auto-Calculation</span>
                          <span className="text-[10px] text-ink-muted mt-0.5 block">Compute delivery timeline predictions based on developer queues</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.taskETA?.enabled ?? true}
                          onChange={e => handleUpdate('taskETA.enabled', e.target.checked)}
                          className="rounded border-hairline text-accent h-4 w-4"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Delivery Buffer Multiplier</label>
                        <input
                          type="number"
                          className="lmx-input"
                          value={settings.taskETA?.multiplier ?? 3}
                          onChange={e => handleUpdate('taskETA.multiplier', Number(e.target.value))}
                          min={1}
                          placeholder="e.g. 3 (Default)"
                        />
                        <span className="text-[10px] text-ink-tertiary mt-1 block">
                          Formula: Delivery Hours = Queue Hours + (Task Hours × Multiplier)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'maintenance' && (
                <div className="space-y-6">
                  {/* Maintenance Settings */}
                  <div className="tracker-card-plain p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                      <Shield className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-sm font-semibold text-ink">System Maintenance Gateway</p>
                        <p className="text-xs text-ink-muted">Toggle target client maintenance status rules</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 border border-hairline bg-surface-1 rounded-tracker-md flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-ink uppercase tracking-wide">Global System</span>
                          <input
                            type="checkbox"
                            checked={settings.maintenance?.globalEnabled || false}
                            onChange={e => handleUpdate('maintenance.globalEnabled', e.target.checked)}
                            className="rounded border-hairline text-accent h-4 w-4"
                          />
                        </div>
                        <p className="text-xs text-ink-muted">Puts all endpoints on strict bypass (only Super Admin)</p>
                      </div>
                      <div className="p-4 border border-hairline bg-surface-1 rounded-tracker-md flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-ink uppercase tracking-wide">Web Client</span>
                          <input
                            type="checkbox"
                            checked={settings.maintenance?.webEnabled || false}
                            onChange={e => handleUpdate('maintenance.webEnabled', e.target.checked)}
                            className="rounded border-hairline text-accent h-4 w-4"
                          />
                        </div>
                        <p className="text-xs text-ink-muted">Locks down web frontend traffic with custom screens</p>
                      </div>
                      <div className="p-4 border border-hairline bg-surface-1 rounded-tracker-md flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-ink uppercase tracking-wide">Mobile Application</span>
                          <input
                            type="checkbox"
                            checked={settings.maintenance?.mobileEnabled || false}
                            onChange={e => handleUpdate('maintenance.mobileEnabled', e.target.checked)}
                            className="rounded border-hairline text-accent h-4 w-4"
                          />
                        </div>
                        <p className="text-xs text-ink-muted">Bypasses API requests originating from iOS/Android builds</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Custom Maintenance Message</label>
                      <textarea
                        className="lmx-input resize-none"
                        rows={3}
                        value={settings.maintenance?.message || ''}
                        onChange={e => handleUpdate('maintenance.message', e.target.value)}
                        placeholder="e.g. System is currently undergoing scheduled maintenance. Please check back later."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Web Bypass Roles (Comma separated)</label>
                        <input
                          className="lmx-input"
                          value={(settings.maintenance?.bypassRoles?.web || []).join(', ')}
                          onChange={e => {
                            const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            handleUpdate('maintenance.bypassRoles.web', val);
                          }}
                          placeholder="e.g. Super Admin, Developer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Mobile Bypass Roles (Comma separated)</label>
                        <input
                          className="lmx-input"
                          value={(settings.maintenance?.bypassRoles?.mobile || []).join(', ')}
                          onChange={e => {
                            const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            handleUpdate('maintenance.bypassRoles.mobile', val);
                          }}
                          placeholder="e.g. Super Admin"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Scheduled Start Time</label>
                        <input
                          type="datetime-local"
                          className="lmx-input font-medium"
                          value={settings.maintenance?.scheduledStart ? new Date(settings.maintenance.scheduledStart).toISOString().slice(0, 16) : ''}
                          onChange={e => handleUpdate('maintenance.scheduledStart', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Scheduled End Time (For countdown)</label>
                        <input
                          type="datetime-local"
                          className="lmx-input font-medium"
                          value={settings.maintenance?.scheduledEnd ? new Date(settings.maintenance.scheduledEnd).toISOString().slice(0, 16) : ''}
                          onChange={e => handleUpdate('maintenance.scheduledEnd', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Releases Management */}
                  <div className="tracker-card-plain p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                      <RefreshCw className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-sm font-semibold text-ink">Releases & Versioning</p>
                        <p className="text-xs text-ink-muted">Configure version ceilings for web, android, and iOS clients</p>
                      </div>
                    </div>
                    <div className="space-y-4 divide-y divide-hairline-soft">
                      {['web', 'android', 'ios'].map(platform => (
                        <div key={platform} className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 first:pt-0">
                          <div className="flex items-center">
                            <span className="text-xs font-bold text-ink uppercase tracking-wide">{platform} Platform</span>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1 uppercase">Current Version</label>
                            <input
                              className="lmx-input"
                              value={settings.release?.[platform]?.currentVersion || ''}
                              onChange={e => handleUpdate(`release.${platform}.currentVersion`, e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1 uppercase">Minimum Version</label>
                            <input
                              className="lmx-input"
                              value={settings.release?.[platform]?.minimumVersion || ''}
                              onChange={e => handleUpdate(`release.${platform}.minimumVersion`, e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1 uppercase">Build Number</label>
                            <input
                              type="number"
                              className="lmx-input"
                              value={settings.release?.[platform]?.buildNumber || 0}
                              onChange={e => handleUpdate(`release.${platform}.buildNumber`, Number(e.target.value))}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'scheduler' && (
                <div className="space-y-6">
                  {/* Cron Scheduler Setup */}
                  <div className="tracker-card-plain p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                      <CalendarRange className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-sm font-semibold text-ink">Background Workers (Cron Scheduler)</p>
                        <p className="text-xs text-ink-muted">Dynamically schedule database jobs and background threads</p>
                      </div>
                    </div>

                    {settings.cron.length === 0 ? (
                      <div className="py-8 text-center text-xs text-ink-subtle">
                        No cron scheduler jobs defined in settings document.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {settings.cron.map((cronItem, index) => (
                          <div key={cronItem.jobName} className="p-4 border border-hairline bg-surface rounded-tracker-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-accent">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-ink">{cronItem.jobName}</span>
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${cronItem.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                <span className="text-[10px] text-ink-subtle">{cronItem.enabled ? 'Active/Scheduled' : 'Paused/Disabled'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="w-48">
                                <label className="block text-[10px] font-bold text-ink-subtle mb-1 uppercase">Cron Schedule Expression</label>
                                <input
                                  className="lmx-input text-xs font-mono"
                                  value={cronItem.cronExpression || ''}
                                  onChange={e => handleCronUpdate(index, 'cronExpression', e.target.value)}
                                />
                              </div>
                              <div className="w-36">
                                <label className="block text-[10px] font-bold text-ink-subtle mb-1 uppercase">Job Timezone</label>
                                <input
                                  className="lmx-input text-xs"
                                  value={cronItem.timezone || ''}
                                  onChange={e => handleCronUpdate(index, 'timezone', e.target.value)}
                                />
                              </div>
                              <div className="flex flex-col items-start pt-3">
                                <label className="flex items-center gap-2 cursor-pointer mt-1">
                                  <input
                                    type="checkbox"
                                    checked={cronItem.enabled || false}
                                    onChange={e => handleCronUpdate(index, 'enabled', e.target.checked)}
                                    className="rounded border-hairline text-accent h-4 w-4"
                                  />
                                  <span className="text-xs text-ink-muted">Enabled</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-hairline">
                <button type="submit" disabled={saving} className="tracker-btn-accent flex items-center gap-2 text-xs font-semibold">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving Settings...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          ) : (
            // Dynamic Notifications Rules & Credentials Tab
            <div className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Integration Toggles & Settings */}
                <div className="tracker-card-plain p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-sm font-semibold text-ink">Global Settings</p>
                        <p className="text-xs text-ink-muted">Configure dynamic routing and messaging pipelines</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 border border-hairline bg-surface-1 rounded-tracker-md">
                      <div>
                        <span className="text-xs font-bold text-ink uppercase tracking-wide block">Global Enable Notifications</span>
                        <span className="text-[10px] text-ink-muted mt-0.5 block">Toggle standard notifications across the entire ERP</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notification?.enabled ?? true}
                        onChange={e => handleUpdate('notification.enabled', e.target.checked)}
                        className="rounded border-hairline text-accent h-4 w-4"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border border-hairline bg-surface-1 rounded-tracker-md">
                      <div>
                        <span className="text-xs font-bold text-ink uppercase tracking-wide block">Use Dynamic Rules Engine</span>
                        <span className="text-[10px] text-ink-muted mt-0.5 block">Evaluate rules dynamically instead of legacy hardcoded hooks</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notification?.useDynamicNotifications ?? false}
                        onChange={e => handleUpdate('notification.useDynamicNotifications', e.target.checked)}
                        className="rounded border-hairline text-accent h-4 w-4"
                      />
                    </div>
                  </div>
                </div>

                {/* Firebase Push Integration Configs */}
                <div className="tracker-card-plain p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-rose-500" />
                      <div>
                        <p className="text-sm font-semibold text-ink">Firebase Cloud Messaging (FCM)</p>
                        <p className="text-xs text-ink-muted">Configure active Firebase app credentials and encrypted service accounts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-ink-subtle uppercase">Status</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${settings.notification?.firebase?.enabled ? 'bg-emerald-500' : 'bg-ink-muted'}`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 border border-hairline bg-surface-1 rounded-tracker-md">
                    <input
                      type="checkbox"
                      id="fcm-enabled"
                      checked={settings.notification?.firebase?.enabled || false}
                      onChange={e => handleUpdate('notification.firebase.enabled', e.target.checked)}
                      className="rounded border-hairline text-accent h-4 w-4"
                    />
                    <label htmlFor="fcm-enabled" className="text-xs font-semibold text-ink cursor-pointer">
                      Enable Firebase Cloud Messaging Client & Web Pushes
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase tracking-wide">API Key</label>
                      <input
                        className="lmx-input text-xs"
                        value={settings.notification?.firebase?.apiKey || ''}
                        onChange={e => handleUpdate('notification.firebase.apiKey', e.target.value)}
                        placeholder="AIzaSy..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase tracking-wide">Auth Domain</label>
                      <input
                        className="lmx-input text-xs"
                        value={settings.notification?.firebase?.authDomain || ''}
                        onChange={e => handleUpdate('notification.firebase.authDomain', e.target.value)}
                        placeholder="project.firebaseapp.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase tracking-wide">Project ID</label>
                      <input
                        className="lmx-input text-xs"
                        value={settings.notification?.firebase?.projectId || ''}
                        onChange={e => handleUpdate('notification.firebase.projectId', e.target.value)}
                        placeholder="project-id"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase tracking-wide">Storage Bucket</label>
                      <input
                        className="lmx-input text-xs"
                        value={settings.notification?.firebase?.storageBucket || ''}
                        onChange={e => handleUpdate('notification.firebase.storageBucket', e.target.value)}
                        placeholder="project.appspot.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase tracking-wide">Messaging Sender ID</label>
                      <input
                        className="lmx-input text-xs"
                        value={settings.notification?.firebase?.messagingSenderId || ''}
                        onChange={e => handleUpdate('notification.firebase.messagingSenderId', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase tracking-wide">App ID</label>
                      <input
                        className="lmx-input text-xs"
                        value={settings.notification?.firebase?.appId || ''}
                        onChange={e => handleUpdate('notification.firebase.appId', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase tracking-wide">Web Push VAPID Public Key Pair</label>
                      <input
                        className="lmx-input text-xs font-mono"
                        value={settings.notification?.firebase?.vapidKey || ''}
                        onChange={e => handleUpdate('notification.firebase.vapidKey', e.target.value)}
                        placeholder="BBdOYk..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase tracking-wide">Firebase Private Service Account JSON</label>
                      <textarea
                        className="lmx-input text-xs font-mono resize-none"
                        rows={2}
                        value={settings.notification?.firebase?.serviceAccountKey || ''}
                        onChange={e => handleUpdate('notification.firebase.serviceAccountKey', e.target.value)}
                        placeholder={settings.notification?.firebase?.serviceAccountKeyEncrypted ? "(Decrypt-Safe Saved Credentials on Server)" : "Paste JSON file block containing private_key..."}
                      />
                    </div>
                  </div>
                </div>

                {/* Save settings actions */}
                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={saving} className="tracker-btn-accent flex items-center gap-2 text-xs font-semibold">
                    <Save className="h-4 w-4" />
                    {saving ? 'Encrypting & Saving...' : 'Save Service Account & Configs'}
                  </button>
                </div>
              </form>

              {/* Dynamic Notification Rules List */}
              <div className="tracker-card-plain p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
                  <div>
                    <p className="text-sm font-semibold text-ink">Dynamic Notification Trigger Rules</p>
                    <p className="text-xs text-ink-muted">Evaluate rule-based dispatches automatically on CRUD lifecycle actions</p>
                  </div>
                  <button
                    type="button"
                    onClick={openAddRule}
                    className="tracker-btn flex items-center gap-1.5 text-xs font-semibold bg-surface-1 border border-hairline hover:bg-surface"
                  >
                    <Plus className="h-4 w-4 text-accent" />
                    Add Notification Rule
                  </button>
                </div>

                {rulesLoading ? (
                  <div className="py-12 flex justify-center items-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-ink-muted" />
                  </div>
                ) : rules.length === 0 ? (
                  <div className="py-12 text-center text-xs text-ink-subtle">
                    No dynamic notification rules configured in database. Click Add Rule to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-hairline-soft">
                    {rules.map((rule) => (
                      <div key={rule._id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-ink">{rule.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rule.trigger === 'create' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                              {rule.trigger}
                            </span>
                            <span className="text-[10px] font-mono text-ink-muted">
                              on {rule.modelName}
                            </span>
                          </div>
                          <p className="text-[10px] text-ink-muted">
                            Template: <span className="font-semibold text-ink-subtle">"{rule.template?.title}"</span> &rarr; {rule.template?.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditRule(rule)}
                            className="p-1.5 hover:text-accent rounded hover:bg-surface transition-all text-ink-muted"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule._id)}
                            className="p-1.5 hover:text-rose-500 rounded hover:bg-surface transition-all text-ink-muted"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Notification Rule Dialog Modal */}
              {showRuleModal && selectedRule && (
                <div className="fixed inset-0 bg-ink-charcoal/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                  <div className="bg-surface border border-hairline rounded-tracker-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-ink">
                        {selectedRule._id ? 'Edit Notification Rule' : 'New Notification Rule'}
                      </h3>
                      <p className="text-[10px] text-ink-muted">Configure model trigger conditions, recipient resolver matrices, and templates.</p>
                    </div>

                    <form onSubmit={handleSaveRule} className="space-y-4">
                      {/* Name, Model, and Trigger */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Rule Name</label>
                          <input
                            required
                            className="lmx-input text-xs"
                            value={selectedRule.name || ''}
                            onChange={e => setSelectedRule(r => ({ ...r, name: e.target.value }))}
                            placeholder="e.g. Task Assigned Alert"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Model Target</label>
                          <select
                            className="lmx-input text-xs"
                            value={selectedRule.modelName || 'tasks'}
                            onChange={e => setSelectedRule(r => ({ ...r, modelName: e.target.value }))}
                          >
                            {MODEL_CHOICES.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Trigger Action</label>
                          <select
                            className="lmx-input text-xs"
                            value={selectedRule.trigger || 'create'}
                            onChange={e => setSelectedRule(r => ({ ...r, trigger: e.target.value }))}
                          >
                            {TRIGGER_CHOICES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Rule execution details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-ink-muted mb-1 uppercase">Priority Rank</label>
                          <input
                            type="number"
                            className="lmx-input text-xs"
                            value={selectedRule.priority ?? 0}
                            onChange={e => setSelectedRule(r => ({ ...r, priority: Number(e.target.value) }))}
                            placeholder="e.g. 0 (Default)"
                          />
                        </div>
                        <div className="flex items-center gap-4 pt-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedRule.stopProcessing || false}
                              onChange={e => setSelectedRule(r => ({ ...r, stopProcessing: e.target.checked }))}
                              className="rounded border-hairline text-accent h-4 w-4"
                            />
                            <span className="text-xs text-ink-muted">Stop Processing Next Matching Rules</span>
                          </label>
                        </div>
                      </div>

                      {/* Grouped Condition Evaluator Section */}
                      <div className="border border-hairline p-4 rounded-tracker-md bg-surface-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-ink-muted uppercase block">Condition Evaluation Group</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-ink-muted">Matches Operator:</span>
                            <select
                              className="h-7 border border-hairline text-[10px] font-bold rounded bg-surface px-2"
                              value={selectedRule.conditionGroups?.operator || 'AND'}
                              onChange={e => setSelectedRule(r => {
                                const copy = { ...r };
                                copy.conditionGroups.operator = e.target.value;
                                return copy;
                              })}
                            >
                              <option value="AND">AND (All match)</option>
                              <option value="OR">OR (Any match)</option>
                            </select>
                          </div>
                        </div>

                        {selectedRule.conditionGroups.conditions.length === 0 ? (
                          <div className="text-center py-4 text-[10px] text-ink-subtle">
                            No trigger conditions set. Rule will match unconditionally.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedRule.conditionGroups.conditions.map((cond, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <input
                                  placeholder="Field name, e.g. status"
                                  className="lmx-input text-[10px] h-8 flex-1"
                                  value={cond.field || ''}
                                  onChange={e => handleConditionChange(idx, 'field', e.target.value)}
                                />
                                <select
                                  className="h-8 border border-hairline text-[10px] rounded bg-surface px-2 w-32"
                                  value={cond.operator || 'equals'}
                                  onChange={e => handleConditionChange(idx, 'operator', e.target.value)}
                                >
                                  {OPERATOR_CHOICES.map(op => <option key={op} value={op}>{op}</option>)}
                                </select>
                                <input
                                  placeholder="Target value"
                                  className="lmx-input text-[10px] h-8 flex-1"
                                  value={cond.value || ''}
                                  onChange={e => handleConditionChange(idx, 'value', e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCondition(idx)}
                                  className="p-1 hover:text-rose-500 rounded transition-all text-ink-muted"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleAddCondition}
                          className="flex items-center gap-1 text-[10px] font-semibold text-accent hover:text-accent-hover pt-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Condition
                        </button>
                      </div>

                      {/* Dynamic Recipients Resolution Matrix */}
                      <div className="border border-hairline p-4 rounded-tracker-md bg-surface-1 space-y-3">
                        <span className="text-[10px] font-bold text-ink-muted uppercase block">Recipient Resolution Matrix</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1">Document Fields (Comma separated)</label>
                            <input
                              className="lmx-input text-[10px] h-8"
                              value={(selectedRule.recipients?.fields || []).join(', ')}
                              onChange={e => {
                                const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                setSelectedRule(r => {
                                  const copy = { ...r };
                                  copy.recipients.fields = val;
                                  return copy;
                                });
                              }}
                              placeholder="e.g. assignedTo, createdBy"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1">Static Roles (Comma separated)</label>
                            <input
                              className="lmx-input text-[10px] h-8"
                              value={(selectedRule.recipients?.roles || []).join(', ')}
                              onChange={e => {
                                const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                setSelectedRule(r => {
                                  const copy = { ...r };
                                  copy.recipients.roles = val;
                                  return copy;
                                });
                              }}
                              placeholder="e.g. Manager, HR"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1">Custom Resolvers (Comma separated)</label>
                            <input
                              className="lmx-input text-[10px] h-8"
                              value={(selectedRule.recipients?.customResolvers || []).join(', ')}
                              onChange={e => {
                                const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                setSelectedRule(r => {
                                  const copy = { ...r };
                                  copy.recipients.customResolvers = val;
                                  return copy;
                                });
                              }}
                              placeholder="e.g. feed_posts.groupMembers"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1">Query Resolution Object (JSON Filter)</label>
                            <textarea
                              rows={1}
                              className="lmx-input text-[10px] font-mono resize-none py-1.5"
                              value={selectedRule.recipients?.queries && selectedRule.recipients.queries.length > 0 ? JSON.stringify(selectedRule.recipients.queries[0].filter) : ''}
                              onChange={e => {
                                try {
                                  const filter = JSON.parse(e.target.value);
                                  setSelectedRule(r => {
                                    const copy = { ...r };
                                    copy.recipients.queries = [{ model: 'employees', filter }];
                                    return copy;
                                  });
                                } catch {
                                  // ignore syntax typing error
                                }
                              }}
                              placeholder='e.g. {"department":"{{new.departmentId}}","roleName":"Manager"}'
                            />
                          </div>
                        </div>
                      </div>

                      {/* Template Configurations */}
                      <div className="border border-hairline p-4 rounded-tracker-md bg-surface-1 space-y-3">
                        <span className="text-[10px] font-bold text-ink-muted uppercase block">Message Template Builder</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1">Template Title</label>
                            <input
                              required
                              className="lmx-input text-xs"
                              value={selectedRule.template?.title || ''}
                              onChange={e => setSelectedRule(r => {
                                const copy = { ...r };
                                copy.template.title = e.target.value;
                                return copy;
                              })}
                              placeholder="e.g. Task Assigned: {{new.title}}"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1">Notification Category/Type</label>
                            <select
                              className="lmx-input text-xs"
                              value={selectedRule.template?.type || 'system'}
                              onChange={e => setSelectedRule(r => {
                                const copy = { ...r };
                                copy.template.type = e.target.value;
                                return copy;
                              })}
                            >
                              {NOTIF_TYPES.map(nt => <option key={nt} value={nt}>{nt}</option>)}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1">Template Message</label>
                            <textarea
                              required
                              rows={2}
                              className="lmx-input text-xs resize-none"
                              value={selectedRule.template?.message || ''}
                              onChange={e => setSelectedRule(r => {
                                const copy = { ...r };
                                copy.template.message = e.target.value;
                                return copy;
                              })}
                              placeholder="e.g. {{actor.basicInfo.firstName}} assigned you a task: {{new.title}}"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1">Deep Link Path</label>
                            <input
                              className="lmx-input text-xs font-mono"
                              value={selectedRule.template?.path || ''}
                              onChange={e => setSelectedRule(r => {
                                const copy = { ...r };
                                copy.template.path = e.target.value;
                                return copy;
                              })}
                              placeholder="e.g. /tasks/{{new._id}}"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-ink-subtle mb-1">Push Icon Class / Key</label>
                            <input
                              className="lmx-input text-xs"
                              value={selectedRule.template?.icon || ''}
                              onChange={e => setSelectedRule(r => {
                                const copy = { ...r };
                                copy.template.icon = e.target.value;
                                return copy;
                              })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowRuleModal(false)}
                          className="px-4 py-2 border border-hairline hover:bg-surface-1 text-xs font-semibold rounded-tracker-md text-ink-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="tracker-btn-accent text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
                        >
                          <Save className="h-4 w-4" />
                          Save Rule
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </FormPageLayout>
  );
}
