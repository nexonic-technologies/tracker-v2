// Frontend/src/pages/attendance/ShiftEditorModal.jsx
import React, { useState } from 'react';

export default function ShiftEditorModal({ shiftData, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(shiftData || {
    name: '',
    startTime: '09:00',
    endTime: '20:30',
    workingHours: 10.5,
    breakDuration: 60,
    allowedLateness: 15,
    applicableGender: 'ALL', // 'ALL' | 'MALE' | 'FEMALE'
    dayOverrides: [
      { dayOfWeek: 'Sunday', startTime: '10:00', endTime: '17:00', workingHours: 7.0 }
    ],
    weeklyOff: ['Sunday'],
    isActive: true,
    description: ''
  });

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSundayOverrideChange = (field, value) => {
    setFormData(prev => {
      const overrides = [...(prev.dayOverrides || [])];
      if (overrides.length === 0) {
        overrides.push({ dayOfWeek: 'Sunday', startTime: '10:00', endTime: '17:00', workingHours: 7.0 });
      }
      overrides[0] = { ...overrides[0], [field]: value };
      return { ...prev, dayOverrides: overrides };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" data-module="hr">
      <div className="tracker-card shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between bg-surface-1/60">
          <div>
            <h3 className="text-lg font-bold text-ink">
              {formData._id ? 'Edit Shift Configuration' : 'Create New Shift Profile'}
            </h3>
            <p className="text-xs text-ink-subtle mt-0.5">Configure start/end timings, gender scopes, and Sunday overrides</p>
          </div>
          <button 
            onClick={onClose}
            className="text-ink-subtle hover:text-ink text-xl font-bold p-1 rounded-md transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Shift Name & Gender Scope */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Shift Profile Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Male General Shift 9am-8:30pm"
                className="lmx-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Applicable Gender Scope</label>
              <select
                value={formData.applicableGender}
                onChange={(e) => handleChange('applicableGender', e.target.value)}
                className="lmx-input"
              >
                <option value="ALL">All Genders</option>
                <option value="MALE">Male Employees Only</option>
                <option value="FEMALE">Female Employees Only</option>
              </select>
            </div>
          </div>

          {/* Standard Mon-Sat Timings */}
          <div className="p-4 bg-surface-1/40 border border-hairline rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Standard Shift Timings (Mon–Sat)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1 uppercase">Start Time *</label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="lmx-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1 uppercase">End Time *</label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  className="lmx-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1 uppercase">Net Working Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.workingHours}
                  onChange={(e) => handleChange('workingHours', Number(e.target.value))}
                  className="lmx-input"
                />
              </div>
            </div>
          </div>

          {/* Sunday Special Timings Override */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>☀️</span> Sunday Special Timing Override (Client Specific)
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1 uppercase">Sunday Start Time</label>
                <input
                  type="time"
                  value={formData.dayOverrides?.[0]?.startTime || '10:00'}
                  onChange={(e) => handleSundayOverrideChange('startTime', e.target.value)}
                  className="lmx-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1 uppercase">Sunday End Time</label>
                <input
                  type="time"
                  value={formData.dayOverrides?.[0]?.endTime || '17:00'}
                  onChange={(e) => handleSundayOverrideChange('endTime', e.target.value)}
                  className="lmx-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1 uppercase">Sunday Net Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.dayOverrides?.[0]?.workingHours || 7.0}
                  onChange={(e) => handleSundayOverrideChange('workingHours', Number(e.target.value))}
                  className="lmx-input"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Description / Notes</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="e.g. Standard male shift with Sunday 10am-5pm override"
              className="lmx-input"
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-hairline flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="tracker-btn-ghost cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tracker-btn-brand cursor-pointer shadow-md"
            >
              Save Shift Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
