import React, { useEffect, useState } from 'react';

const defaultPolicyValues = {
  name: '',
  description: '',
  version: 1,
  status: 'Active',
  effectiveFrom: new Date().toISOString().split('T')[0],
  effectiveTo: '',
  assignmentType: 'Company',
  assignmentIds: [],

  shiftConfig: {
    defaultShiftId: '',
    allowFlexibleTiming: false,
    graceMinutesCheckIn: 15,
    graceMinutesCheckOut: 15,
    splitShiftEnabled: false,
    minimumSplitIntervalMins: 60
  },

  attendanceRules: {
    fullDayMinHours: 8.0,
    halfDayMinHours: 4.0,
    absentMinHours: 2.0,
    lateMarkCutoffMins: 15,
    earlyExitCutoffMins: 15,
    lateMarksForHalfDay: 3,
    missingPunchAction: 'RegularizationRequired'
  },

  permissionRules: {
    enabled: true,
    monthlyMaxHours: 2.0,
    allowCarryForward: false,
    maxCarryForwardHours: 0,
    expiryCycle: 'MONTHLY',
    excessAction: 'HOURLY_LOP',
    hourlyRateBasis: 'BASIC_ONLY',
    roundingGranularity: 'EXACT'
  },

  lateEscalationRules: {
    enabled: true,
    gracePeriodMins: 15,
    consumePermissionFirst: true,
    occurrenceThreshold: 3,
    occurrenceScope: 'SEPARATE_LATE_EARLY',
    thresholdAction: 'CONVERT_HALF_DAY_LOP',
    halfDayLopPenalty: 0.5,
    resetFrequency: 'MONTHLY'
  },

  holidayWorkRules: {
    enabled: true,
    allowHolidayOverride: true,
    defaultCompensation: 'REGULAR_PAY',
    otMultiplier: 2.0,
    compOffCreditDays: 1.0,
    minHoursForCompensation: 7.0
  },

  overtimeRules: {
    enabled: false,
    overtimeThresholdMins: 480,
    minOvertimeMins: 60,
    maxOvertimeMinsPerDay: 240,
    roundToNearestMins: 15,
    weekdayMultiplier: 1.25,
    weekendMultiplier: 1.5,
    holidayMultiplier: 2.0
  },

  fineAndLopRules: {
    enableLateFines: false,
    lateFineType: 'Fixed',
    lateFineAmount: 0,
    sandwichRuleEnabled: false
  },

  leaveEncashmentRules: {
    enabled: true,
    triggerCycle: 'YEAR_END',
    leaveTypeConfigs: [
      {
        leaveTypeCode: 'CL',
        encashable: true,
        maxDays: 12,
        salaryBasis: 'BASIC_ONLY',
        divisor: 30
      }
    ]
  }
};

const mergePolicyData = (initialData) => {
  if (!initialData) return defaultPolicyValues;
  return {
    ...defaultPolicyValues,
    ...initialData,
    shiftConfig: { ...defaultPolicyValues.shiftConfig, ...(initialData.shiftConfig || {}) },
    attendanceRules: { ...defaultPolicyValues.attendanceRules, ...(initialData.attendanceRules || {}) },
    permissionRules: { ...defaultPolicyValues.permissionRules, ...(initialData.permissionRules || {}) },
    lateEscalationRules: { ...defaultPolicyValues.lateEscalationRules, ...(initialData.lateEscalationRules || {}) },
    holidayWorkRules: { ...defaultPolicyValues.holidayWorkRules, ...(initialData.holidayWorkRules || {}) },
    overtimeRules: { ...defaultPolicyValues.overtimeRules, ...(initialData.overtimeRules || {}) },
    fineAndLopRules: { ...defaultPolicyValues.fineAndLopRules, ...(initialData.fineAndLopRules || {}) },
    leaveEncashmentRules: { ...defaultPolicyValues.leaveEncashmentRules, ...(initialData.leaveEncashmentRules || {}) }
  };
};

export default function AttendancePolicyEditor({ initialData, onSave, onCancel, onTestDryRun }) {
  const [formData, setFormData] = useState(() => mergePolicyData(initialData));

  useEffect(() => {
    setFormData(mergePolicyData(initialData));
  }, [initialData]);

  const [activeTab, setActiveTab] = useState('basic');

  const handleChange = (section, field, value) => {
    if (!section) {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    }
  };

  const handleEncashmentChange = (field, value) => {
    setFormData(prev => {
      const currentConfigs = prev.leaveEncashmentRules?.leaveTypeConfigs || [{}];
      const updatedConfigs = [{ ...currentConfigs[0], [field]: value }];
      return {
        ...prev,
        leaveEncashmentRules: {
          ...prev.leaveEncashmentRules,
          leaveTypeConfigs: updatedConfigs
        }
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const tabs = [
    { id: 'basic', label: '1. Basic & Scope' },
    { id: 'shift', label: '2. Shift & Grace' },
    { id: 'attendance', label: '3. Hours & Status' },
    { id: 'permission', label: '4. Permission Quota' },
    { id: 'escalation', label: '5. Late Escalation' },
    { id: 'holiday', label: '6. Holiday Work' },
    { id: 'overtime', label: '7. Overtime & Fines' },
    { id: 'encashment', label: '8. Leave Encashment' }
  ];

  return (
    <div className="tracker-card shadow-lg overflow-hidden" data-module="hr">
      {/* Header Banner */}
      <div className="p-4 bg-surface-1 border-b border-hairline flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-ink">Unified Attendance Policy Editor</h2>
          <p className="text-xs text-ink-muted">Single Source of Truth for Attendance, Shift, Permission, Overtime & Payroll Integration</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
            formData.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
          }`}>
            Status: {formData.status} (v{formData.version})
          </span>
        </div>
      </div>

      {/* Policy Editor Navigation Tabs */}
      <div className="flex border-b border-hairline bg-surface-1/50 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'border-[var(--module-accent)] text-[var(--module-accent)] bg-surface'
                : 'border-transparent text-ink-subtle hover:text-ink hover:bg-surface-1/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Tab 1: Basic & Scope */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Policy Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange(null, 'name', e.target.value)}
                  placeholder="e.g. Corporate Standard Policy 2026"
                  className="lmx-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange(null, 'status', e.target.value)}
                  className="lmx-input"
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Policy Version</label>
                <input
                  type="number"
                  disabled
                  value={formData.version}
                  className="lmx-input opacity-70 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Effective From *</label>
                <input
                  type="date"
                  required
                  value={formData.effectiveFrom}
                  onChange={(e) => handleChange(null, 'effectiveFrom', e.target.value)}
                  className="lmx-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Effective To (Optional)</label>
                <input
                  type="date"
                  value={formData.effectiveTo}
                  onChange={(e) => handleChange(null, 'effectiveTo', e.target.value)}
                  className="lmx-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Assignment Scope</label>
                <select
                  value={formData.assignmentType}
                  onChange={(e) => handleChange(null, 'assignmentType', e.target.value)}
                  className="lmx-input"
                >
                  <option value="Company">Company-Wide Default</option>
                  <option value="Branch">Specific Branch</option>
                  <option value="Department">Department Specific</option>
                  <option value="Role">Role Specific</option>
                  <option value="Employee">Employee Specific</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleChange(null, 'description', e.target.value)}
                  placeholder="Notes or scope details"
                  className="lmx-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Shift & Grace */}
        {activeTab === 'shift' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Check-In Grace (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.shiftConfig.graceMinutesCheckIn}
                  onChange={(e) => handleChange('shiftConfig', 'graceMinutesCheckIn', Number(e.target.value))}
                  className="lmx-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Check-Out Grace (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.shiftConfig.graceMinutesCheckOut}
                  onChange={(e) => handleChange('shiftConfig', 'graceMinutesCheckOut', Number(e.target.value))}
                  className="lmx-input"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-hairline-soft">
              <input
                type="checkbox"
                id="flexiTiming"
                checked={formData.shiftConfig.allowFlexibleTiming}
                onChange={(e) => handleChange('shiftConfig', 'allowFlexibleTiming', e.target.checked)}
                className="rounded border-hairline accent-[var(--module-accent)] cursor-pointer"
              />
              <label htmlFor="flexiTiming" className="text-sm font-medium text-ink cursor-pointer">
                Allow Flexible Shift Timing (No rigid check-in cutoff)
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="splitShift"
                checked={formData.shiftConfig.splitShiftEnabled}
                onChange={(e) => handleChange('shiftConfig', 'splitShiftEnabled', e.target.checked)}
                className="rounded border-hairline accent-[var(--module-accent)] cursor-pointer"
              />
              <label htmlFor="splitShift" className="text-sm font-medium text-ink cursor-pointer">
                Enable Split Shift Interval Support
              </label>
            </div>
          </div>
        )}

        {/* Tab 3: Status & Hours */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Full Day Minimum Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.attendanceRules.fullDayMinHours}
                  onChange={(e) => handleChange('attendanceRules', 'fullDayMinHours', Number(e.target.value))}
                  className="lmx-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Half Day Minimum Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.attendanceRules.halfDayMinHours}
                  onChange={(e) => handleChange('attendanceRules', 'halfDayMinHours', Number(e.target.value))}
                  className="lmx-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Absent Minimum Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.attendanceRules.absentMinHours}
                  onChange={(e) => handleChange('attendanceRules', 'absentMinHours', Number(e.target.value))}
                  className="lmx-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Missing Punch Action</label>
                <select
                  value={formData.attendanceRules.missingPunchAction}
                  onChange={(e) => handleChange('attendanceRules', 'missingPunchAction', e.target.value)}
                  className="lmx-input"
                >
                  <option value="RegularizationRequired">Require HR Regularization</option>
                  <option value="AutoHalfDay">Auto Mark Half Day</option>
                  <option value="AutoAbsent">Auto Mark Absent / LOP</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Permission Quota */}
        {activeTab === 'permission' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="enablePermission"
                checked={formData.permissionRules.enabled}
                onChange={(e) => handleChange('permissionRules', 'enabled', e.target.checked)}
                className="rounded border-hairline accent-[var(--module-accent)] cursor-pointer"
              />
              <label htmlFor="enablePermission" className="text-sm font-semibold text-ink cursor-pointer">
                Enable Monthly Permission Quota
              </label>
            </div>

            {formData.permissionRules.enabled && (
              <div className="space-y-4 pt-2 border-t border-hairline-soft">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Monthly Entitlement (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.permissionRules.monthlyMaxHours}
                      onChange={(e) => handleChange('permissionRules', 'monthlyMaxHours', Number(e.target.value))}
                      className="lmx-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Excess Usage Action</label>
                    <select
                      value={formData.permissionRules.excessAction}
                      onChange={(e) => handleChange('permissionRules', 'excessAction', e.target.value)}
                      className="lmx-input"
                    >
                      <option value="HOURLY_LOP">Hourly LOP Salary Deduction</option>
                      <option value="DEDUCT_LEAVE_BALANCE">Deduct from Leave Balance</option>
                      <option value="FINE_ONLY">Apply Attendance Fine</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Hourly Deduction Salary Basis</label>
                    <select
                      value={formData.permissionRules.hourlyRateBasis}
                      onChange={(e) => handleChange('permissionRules', 'hourlyRateBasis', e.target.value)}
                      className="lmx-input"
                    >
                      <option value="BASIC_ONLY">Basic Salary Only (Standard)</option>
                      <option value="GROSS_SALARY">Gross Salary</option>
                      <option value="CTC">Cost To Company (CTC)</option>
                      <option value="BASIC_PLUS_DA">Basic + Dearness Allowance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Minutes Rounding Granularity</label>
                    <select
                      value={formData.permissionRules.roundingGranularity}
                      onChange={(e) => handleChange('permissionRules', 'roundingGranularity', e.target.value)}
                      className="lmx-input"
                    >
                      <option value="EXACT">Exact Minute Calculation</option>
                      <option value="CEIL_15">Ceil to 15 Mins (e.g. 17m → 30m)</option>
                      <option value="NEAREST_15">Nearest 15 Mins (e.g. 17m → 15m)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Expiry Cycle</label>
                    <select
                      value={formData.permissionRules.expiryCycle}
                      onChange={(e) => handleChange('permissionRules', 'expiryCycle', e.target.value)}
                      className="lmx-input"
                    >
                      <option value="MONTHLY">Lapse Monthly at Month-End</option>
                      <option value="QUARTERLY">Lapse Quarterly</option>
                      <option value="YEARLY">Lapse Fiscal Year-End</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Late Escalation */}
        {activeTab === 'escalation' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="enableEscalation"
                checked={formData.lateEscalationRules.enabled}
                onChange={(e) => handleChange('lateEscalationRules', 'enabled', e.target.checked)}
                className="rounded border-hairline accent-[var(--module-accent)] cursor-pointer"
              />
              <label htmlFor="enableEscalation" className="text-sm font-semibold text-ink cursor-pointer">
                Enable Late / Early Occurrence Escalation Pipeline
              </label>
            </div>

            {formData.lateEscalationRules.enabled && (
              <div className="space-y-4 pt-2 border-t border-hairline-soft">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Occurrence Threshold Count</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.lateEscalationRules.occurrenceThreshold}
                      onChange={(e) => handleChange('lateEscalationRules', 'occurrenceThreshold', Number(e.target.value))}
                      className="lmx-input"
                    />
                    <p className="text-[10px] text-ink-subtle mt-1">e.g. 3rd late triggers threshold</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Threshold Action Trigger</label>
                    <select
                      value={formData.lateEscalationRules.thresholdAction}
                      onChange={(e) => handleChange('lateEscalationRules', 'thresholdAction', e.target.value)}
                      className="lmx-input"
                    >
                      <option value="CONVERT_HALF_DAY_LOP">Convert Day to 0.5 Half-Day LOP</option>
                      <option value="CONVERT_FULL_DAY_LOP">Convert Day to Full Day LOP</option>
                      <option value="FINE_AMOUNT">Deduct Fixed Fine Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Occurrence Counter Reset</label>
                    <select
                      value={formData.lateEscalationRules.resetFrequency}
                      onChange={(e) => handleChange('lateEscalationRules', 'resetFrequency', e.target.value)}
                      className="lmx-input"
                    >
                      <option value="MONTHLY">Reset Counter Monthly on 1st</option>
                      <option value="PAY_CYCLE">Reset Every Pay-Cycle</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="consumePerm"
                    checked={formData.lateEscalationRules.consumePermissionFirst}
                    onChange={(e) => handleChange('lateEscalationRules', 'consumePermissionFirst', e.target.checked)}
                    className="rounded border-hairline accent-[var(--module-accent)] cursor-pointer"
                  />
                  <label htmlFor="consumePerm" className="text-sm font-medium text-ink cursor-pointer">
                    Consume available Permission Balance before counting as Late Occurrence
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Holiday Work */}
        {activeTab === 'holiday' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="enableHoliday"
                checked={formData.holidayWorkRules.enabled}
                onChange={(e) => handleChange('holidayWorkRules', 'enabled', e.target.checked)}
                className="rounded border-hairline accent-[var(--module-accent)] cursor-pointer"
              />
              <label htmlFor="enableHoliday" className="text-sm font-semibold text-ink cursor-pointer">
                Enable Declared Holiday Working Override Rules
              </label>
            </div>

            {formData.holidayWorkRules.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-hairline-soft">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Default Compensation Mode</label>
                  <select
                    value={formData.holidayWorkRules.defaultCompensation}
                    onChange={(e) => handleChange('holidayWorkRules', 'defaultCompensation', e.target.value)}
                    className="lmx-input"
                  >
                    <option value="REGULAR_PAY">Normal Day Salary Only</option>
                    <option value="OVERTIME_MULTIPLIER">Holiday Overtime Rate</option>
                    <option value="COMP_OFF">Grant 1.0 Comp-Off Credit</option>
                    <option value="DOUBLE_PAY">Double Pay Allowance (2.0x)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Holiday OT Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.holidayWorkRules.otMultiplier}
                    onChange={(e) => handleChange('holidayWorkRules', 'otMultiplier', Number(e.target.value))}
                    className="lmx-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Minimum Hours Worked</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.holidayWorkRules.minHoursForCompensation}
                    onChange={(e) => handleChange('holidayWorkRules', 'minHoursForCompensation', Number(e.target.value))}
                    className="lmx-input"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Overtime & Fines */}
        {activeTab === 'overtime' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableOT"
                checked={formData.overtimeRules.enabled}
                onChange={(e) => handleChange('overtimeRules', 'enabled', e.target.checked)}
                className="rounded border-hairline accent-[var(--module-accent)] cursor-pointer"
              />
              <label htmlFor="enableOT" className="text-sm font-semibold text-ink cursor-pointer">
                Enable Overtime Calculation
              </label>
            </div>

            {formData.overtimeRules.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-hairline-soft">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Min Overtime Window (Mins)</label>
                  <input
                    type="number"
                    value={formData.overtimeRules.minOvertimeMins}
                    onChange={(e) => handleChange('overtimeRules', 'minOvertimeMins', Number(e.target.value))}
                    className="lmx-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Weekday Multiplier</label>
                  <input
                    type="number"
                    step="0.05"
                    value={formData.overtimeRules.weekdayMultiplier}
                    onChange={(e) => handleChange('overtimeRules', 'weekdayMultiplier', Number(e.target.value))}
                    className="lmx-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Weekend Multiplier</label>
                  <input
                    type="number"
                    step="0.05"
                    value={formData.overtimeRules.weekendMultiplier}
                    onChange={(e) => handleChange('overtimeRules', 'weekendMultiplier', Number(e.target.value))}
                    className="lmx-input"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 8: Leave Encashment */}
        {activeTab === 'encashment' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="enableEncashment"
                checked={formData.leaveEncashmentRules.enabled}
                onChange={(e) => handleChange('leaveEncashmentRules', 'enabled', e.target.checked)}
                className="rounded border-hairline accent-[var(--module-accent)] cursor-pointer"
              />
              <label htmlFor="enableEncashment" className="text-sm font-semibold text-ink cursor-pointer">
                Enable Unused Leave Year-End Payroll Encashment Integration
              </label>
            </div>

            {formData.leaveEncashmentRules.enabled && (
              <div className="space-y-4 pt-2 border-t border-hairline-soft">
                <div className="p-3 bg-brand/5 border border-brand/20 rounded text-xs text-ink-muted">
                  ℹ️ <strong>Statutory Guarantee</strong>: Unused Casual Leave / Privilege Leave payout is computed <strong>strictly inside payroll calculation</strong> as an earned allowance line item (<code>earnedBreakdown['Unused CL Encashment']</code>). Attendance records and present days in <code>Attendance.js</code> are never modified.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Encashment Trigger Cycle</label>
                    <select
                      value={formData.leaveEncashmentRules.triggerCycle}
                      onChange={(e) => handleChange('leaveEncashmentRules', 'triggerCycle', e.target.value)}
                      className="lmx-input"
                    >
                      <option value="YEAR_END">Fiscal Year-End Payroll Run</option>
                      <option value="EXIT_ONLY">Full & Final (F&F) Exit Settlement</option>
                      <option value="MONTHLY">Monthly Roll-over</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Max Encashable Days</label>
                    <input
                      type="number"
                      value={formData.leaveEncashmentRules.leaveTypeConfigs[0]?.maxDays || 12}
                      onChange={(e) => handleEncashmentChange('maxDays', Number(e.target.value))}
                      className="lmx-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Daily Rate Basis</label>
                    <select
                      value={formData.leaveEncashmentRules.leaveTypeConfigs[0]?.salaryBasis || 'BASIC_ONLY'}
                      onChange={(e) => handleEncashmentChange('salaryBasis', e.target.value)}
                      className="lmx-input"
                    >
                      <option value="BASIC_ONLY">Basic Salary Only (Standard)</option>
                      <option value="GROSS">Gross Monthly Salary</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Working Day Divisor</label>
                    <select
                      value={formData.leaveEncashmentRules.leaveTypeConfigs[0]?.divisor || 30}
                      onChange={(e) => handleEncashmentChange('divisor', Number(e.target.value))}
                      className="lmx-input"
                    >
                      <option value={30}>30 Days (Standard Monthly Rate)</option>
                      <option value={26}>26 Working Days (Factories Act Basis)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t border-hairline flex items-center justify-between">
          <button
            type="button"
            onClick={() => onTestDryRun && onTestDryRun(formData)}
            className="tracker-btn-secondary flex items-center gap-2 cursor-pointer"
          >
            <span>⚡</span> Test Preview Sandbox
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="tracker-btn-ghost cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tracker-btn-brand cursor-pointer shadow-md"
            >
              Save Policy
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
