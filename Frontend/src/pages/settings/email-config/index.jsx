import React, { useState, useEffect } from 'react';
import { Mail, Save, Loader } from 'lucide-react';
import api from '@api/axiosInstance';

const email_config = () => {
  const [config, setConfig] = useState({
    enabled: true,
    service: 'gmail',
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromName: '',
    fromEmail: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchemail_config();
  }, []);

  const fetchemail_config = async () => {
    setLoading(true);
    try {
      const response = await api.get('/populate/read/email_configs');
      if (response.data.success && response.data.data?.length > 0) {
        setConfig(response.data.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch email config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.post('/populate/create/email_configs', config);
      if (response.data.success) {
        setMessage('Email configuration saved successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Failed to save email configuration');
      setTimeout(() => setMessage(''), 3000);
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Email Configuration</h1>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Enable Email Service</label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleChange('enabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Service</label>
              <select
                value={config.service}
                onChange={(e) => handleChange('service', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="yahoo">Yahoo</option>
                <option value="custom">Custom SMTP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => handleChange('host', e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => handleChange('port', parseInt(e.target.value))}
                placeholder="587"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Use SSL/TLS</label>
              <input
                type="checkbox"
                checked={config.secure}
                onChange={(e) => handleChange('secure', e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Username</label>
              <input
                type="email"
                value={config.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="your-email@gmail.com"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Password</label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Enter password or app password"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
              <input
                type="text"
                value={config.fromName}
                onChange={(e) => handleChange('fromName', e.target.value)}
                placeholder="WorkHub HR System"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
              <input
                type="email"
                value={config.fromEmail}
                onChange={(e) => handleChange('fromEmail', e.target.value)}
                placeholder="noreply@company.com"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default email_config;