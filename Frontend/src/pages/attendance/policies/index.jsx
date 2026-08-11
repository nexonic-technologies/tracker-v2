import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../api/axiosInstance.js';
import AttendancePolicyEditor from './AttendancePolicyEditor.jsx';
import AttendancePreviewModal from './AttendancePreviewModal.jsx';

export default function attendance_policiesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [sandboxPolicy, setSandboxPolicy] = useState(null);
  const [showSandbox, setShowSandbox] = useState(false);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.post('/populate/read/attendance_policies', {
        page: 1,
        limit: 50,
        sort: { createdAt: -1 }
      });
      setPolicies(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch attendance policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSavePolicy = async (formData) => {
    try {
      if (formData._id) {
        await axiosInstance.put(`/populate/update/attendance_policies/${formData._id}`, formData);
      } else {
        await axiosInstance.post('/populate/create/attendance_policies', formData);
      }
      setShowEditor(false);
      setEditingPolicy(null);
      fetchPolicies();
    } catch (err) {
      console.error('Failed to save policy:', err);
      alert('Error saving policy: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenSandbox = (policy) => {
    setSandboxPolicy(policy);
    setShowSandbox(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-module="hr">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Attendance Rule Configurator</h1>
          <p className="text-sm text-ink-subtle mt-0.5">
            Manage company, branch, department & employee-specific attendance policies
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenSandbox(editingPolicy || policies[0])}
            className="tracker-btn-secondary flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <span>⚡</span> Test Preview Sandbox
          </button>
          <button
            onClick={() => { setEditingPolicy(null); setShowEditor(true); }}
            className="tracker-btn-brand flex items-center gap-2 cursor-pointer shadow-md"
          >
            <span>+</span> New Attendance Policy
          </button>
        </div>
      </div>

      {/* Main View: Editor OR Datatable List */}
      {showEditor ? (
        <AttendancePolicyEditor
          initialData={editingPolicy}
          onSave={handleSavePolicy}
          onCancel={() => { setShowEditor(false); setEditingPolicy(null); }}
          onTestDryRun={(currentForm) => handleOpenSandbox(currentForm)}
        />
      ) : (
        <div className="tracker-card">
          <div className="px-6 py-4 border-b border-hairline-soft bg-surface-1/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--module-accent)]"></div>
              <span className="text-sm font-semibold text-ink">Configured Attendance Policies ({policies.length})</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-ink-subtle text-sm">Loading attendance policies...</div>
          ) : policies.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="text-ink-subtle text-sm">No attendance policies configured yet.</div>
              <button
                onClick={() => { setEditingPolicy(null); setShowEditor(true); }}
                className="tracker-btn-brand"
              >
                Create Initial Policy
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-ink">
                <thead className="bg-surface-1/60 border-b border-hairline-soft text-xs uppercase tracking-wider text-ink-subtle font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Policy Name</th>
                    <th className="px-6 py-3.5">Assignment Scope</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Punctuality Grace</th>
                    <th className="px-6 py-3.5">Full Day Min</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft">
                  {policies.map((p) => (
                    <tr key={p._id} className="hover:bg-surface-1/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-ink">
                        <button
                          type="button"
                          onClick={() => { setEditingPolicy(p); setShowEditor(true); }}
                          className="text-left font-bold text-ink hover:text-brand transition-colors cursor-pointer"
                        >
                          {p.name}
                        </button>
                        {p.description && <div className="text-xs text-ink-subtle font-normal mt-0.5">{p.description}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-chip text-ink-muted border border-hairline-soft">
                          {p.assignmentType || 'Company'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                            p.status === 'Draft' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                              'bg-surface-chip text-ink-subtle border-hairline-soft'
                          }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {p.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink-muted">
                        {p.shiftConfig?.graceMinutesCheckIn || p.graceMinutes || 15} mins
                      </td>
                      <td className="px-6 py-4 text-ink-muted">
                        {p.attendanceRules?.fullDayMinHours || p.fullDayHours || 8.0} hrs
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenSandbox(p)}
                          className="px-3 py-1.5 text-xs font-semibold text-brand hover:bg-surface-1 rounded-md border border-hairline-soft transition-colors cursor-pointer"
                        >
                          ⚡ Test
                        </button>
                        <button
                          onClick={() => { setEditingPolicy(p); setShowEditor(true); }}
                          className="px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-1 rounded-md border border-hairline-soft transition-colors cursor-pointer"
                        >
                          View / Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sandbox Simulation Modal */}
      <AttendancePreviewModal
        policy={sandboxPolicy}
        isOpen={showSandbox}
        onClose={() => setShowSandbox(false)}
      />
    </div>
  );
}
