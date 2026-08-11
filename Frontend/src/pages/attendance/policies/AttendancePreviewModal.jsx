import React, { useEffect, useState } from 'react';
import axiosInstance from '../../../api/axiosInstance';

export default function AttendancePreviewModal({ policy, isOpen, onClose }) {
  const [shifts, setShifts] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('08:30');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [permissionBalance, setPermissionBalance] = useState(0);
  const [currentLateCount, setCurrentLateCount] = useState(0);
  const [unusedCLDays, setUnusedCLDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    (async () => {
      try {
        const res = await axiosInstance.get('/populate/read/shifts');
        const data = res.data?.data;
        const shiftList = Array.isArray(data) ? data : [];
        if (!isMounted) return;
        setShifts(shiftList);

        const defaultId = policy?.shiftConfig?.defaultShiftId;
        const initialShift = shiftList.find(s => s._id === defaultId) || shiftList[0];

        if (initialShift) {
          setSelectedShiftId(initialShift._id);
          if (initialShift.startTime) setShiftStartTime(initialShift.startTime);
        }
      } catch (err) {
        console.error('Failed to load shifts for sandbox:', err);
      }
    })();
    return () => { isMounted = false; };
  }, [isOpen, policy]);

  const handleShiftChange = (shiftId) => {
    setSelectedShiftId(shiftId);
    const found = shifts.find(s => s._id === shiftId);
    if (found?.startTime) {
      setShiftStartTime(found.startTime);
    }
  };

  if (!isOpen) return null;

  const handleSimulate = (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const checkInDate = checkInTime ? new Date(`${dateStr}T${checkInTime}:00Z`) : null;
      const checkOutDate = checkOutTime ? new Date(`${dateStr}T${checkOutTime}:00Z`) : null;

      let totalMs = 0;
      if (checkInDate && checkOutDate) {
        totalMs = Math.max(0, checkOutDate - checkInDate);
      }

      let workHours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
      const workedMins = Math.round(workHours * 60);

      // Punctuality & Grace Rules Evaluation
      let shiftStartMins = 8 * 60 + 30; // Default 08:30 AM
      if (shiftStartTime) {
        const [sh, sm] = shiftStartTime.split(':').map(Number);
        shiftStartMins = sh * 60 + sm;
      }
      const graceMins = policy?.lateEscalationRules?.gracePeriodMins || policy?.shiftConfig?.graceMinutesCheckIn || 15;
      
      let rawLateMins = 0;
      if (checkInTime) {
        const [h, m] = checkInTime.split(':').map(Number);
        const checkInMins = h * 60 + m;
        if (checkInMins > shiftStartMins) {
          rawLateMins = checkInMins - shiftStartMins;
        }
      }

      // Option A vs Option B Pipeline Evaluation
      let permissionConsumed = 0;
      let chargeableLateMins = 0;

      if (policy?.lateEscalationRules?.consumePermissionFirst) {
        // Option A: Permission First (Deducts all lateness from Minute 1 from Permission Balance)
        if (rawLateMins > 0 && permissionBalance > 0) {
          permissionConsumed = Math.min(rawLateMins, permissionBalance);
          chargeableLateMins = rawLateMins - permissionConsumed;
        } else {
          chargeableLateMins = rawLateMins;
        }
      } else {
        // Option B: Direct LOP Mode (Grace Period buffer applies, then direct LOP)
        const lateAfterGrace = Math.max(0, rawLateMins - graceMins);
        chargeableLateMins = lateAfterGrace;
      }

      // Step 3: Occurrence Count Escalation
      let newOccurrenceCount = currentLateCount;
      let status = 'Present';
      let lopDays = 0;

      if (chargeableLateMins > 0) {
        newOccurrenceCount += 1;
        const threshold = policy?.lateEscalationRules?.occurrenceThreshold || 3;
        if (newOccurrenceCount >= threshold) {
          status = 'Half Day';
          lopDays = policy?.lateEscalationRules?.halfDayLopPenalty || 0.5;
        } else {
          status = 'Late Entry';
        }
      }

      // Step 4: Overtime Evaluation
      let overtimeHours = 0;
      const otEnabled = policy?.overtimeRules?.enabled;
      const otThresholdMins = policy?.overtimeRules?.overtimeThresholdMins || 480;
      if (otEnabled && workedMins > otThresholdMins) {
        overtimeHours = Math.round(((workedMins - otThresholdMins) / 60) * 100) / 100;
      }

      // Step 5: Leave Encashment Simulation
      let clEncashmentAmount = 0;
      if (policy?.leaveEncashmentRules?.enabled && unusedCLDays > 0) {
        const dailyRate = 30000 / 30; // Simulated ₹30,000 / 30
        const maxEncashable = policy?.leaveEncashmentRules?.leaveTypeConfigs[0]?.maxDays || 12;
        const paidDays = Math.min(unusedCLDays, maxEncashable);
        clEncashmentAmount = paidDays * dailyRate;
      }

      const snapshot = {
        policy: {
          name: policy?.name || 'Draft Enterprise Policy',
          version: policy?.version || 1
        },
        pipeline: {
          rawLateMinutes: rawLateMins,
          graceMinutes: graceMins,
          permissionConsumedMinutes: permissionConsumed,
          remainingPermissionBalance: Math.max(0, permissionBalance - permissionConsumed),
          chargeableLateMinutes: chargeableLateMins,
          occurrenceCountBefore: currentLateCount,
          occurrenceCountAfter: newOccurrenceCount,
          escalationTriggered: newOccurrenceCount >= (policy?.lateEscalationRules?.occurrenceThreshold || 3)
        },
        payrollImpact: {
          status,
          lopDays,
          hourlyPermissionLopCharge: chargeableLateMins > 0 ? `₹${(chargeableLateMins * 10).toFixed(2)}` : '₹0.00',
          unusedCLEncashmentAllowance: `₹${clEncashmentAmount.toFixed(2)}`
        },
        calculatedAt: new Date()
      };

      setPreviewResult({
        status,
        workHours,
        overtimeHours,
        clEncashmentAmount,
        snapshot
      });
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" data-module="hr">
      <div className="tracker-card shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline flex items-center justify-between bg-surface-1/60">
          <div>
            <h3 className="text-lg font-bold text-ink">Attendance Rule Sandbox Dry-Run</h3>
            <p className="text-xs text-ink-subtle mt-0.5">Simulate multi-tier policy execution (Permissions $\rightarrow$ Occurrences $\rightarrow$ LOP $\rightarrow$ Encashment)</p>
          </div>
          <button 
            onClick={onClose}
            className="text-ink-subtle hover:text-ink text-xl font-bold p-1 rounded-md transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <form onSubmit={handleSimulate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Select Shift</label>
              <select
                value={selectedShiftId}
                onChange={(e) => handleShiftChange(e.target.value)}
                className="lmx-input"
              >
                {shifts.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </option>
                ))}
                {shifts.length === 0 && <option value="">Custom Shift</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Shift Start Time</label>
              <input
                type="time"
                value={shiftStartTime}
                onChange={(e) => setShiftStartTime(e.target.value)}
                className="lmx-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Check-In Time</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="lmx-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Permission Balance (Mins)</label>
              <input
                type="number"
                value={permissionBalance}
                onChange={(e) => setPermissionBalance(Number(e.target.value))}
                className="lmx-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Current Late Occurrences</label>
              <input
                type="number"
                value={currentLateCount}
                onChange={(e) => setCurrentLateCount(Number(e.target.value))}
                className="lmx-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">Unused CL Days</label>
              <input
                type="number"
                value={unusedCLDays}
                onChange={(e) => setUnusedCLDays(Number(e.target.value))}
                className="lmx-input"
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="tracker-btn-brand w-full flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? 'Evaluating Pipeline...' : '⚡ Run Multi-Tier Simulation'}
              </button>
            </div>
          </form>

          {/* Results Output */}
          {previewResult && (
            <div className="border border-hairline rounded-xl bg-surface-1/40 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-hairline-soft pb-3">
                <span className="text-xs font-semibold uppercase text-ink-subtle tracking-wider">Simulated Pipeline Result</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  previewResult.status === 'Present' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                  previewResult.status === 'Late Entry' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {previewResult.status} ({previewResult.snapshot.payrollImpact.lopDays} LOP)
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="bg-surface p-3 rounded-lg border border-hairline-soft">
                  <div className="text-xs text-ink-subtle">Permission Consumed</div>
                  <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {previewResult.snapshot.pipeline.permissionConsumedMinutes} mins
                  </div>
                </div>
                <div className="bg-surface p-3 rounded-lg border border-hairline-soft">
                  <div className="text-xs text-ink-subtle">Late Counter</div>
                  <div className="text-base font-bold text-ink">
                    {previewResult.snapshot.pipeline.occurrenceCountAfter} / {policy?.lateEscalationRules?.occurrenceThreshold || 3}
                  </div>
                </div>
                <div className="bg-surface p-3 rounded-lg border border-hairline-soft">
                  <div className="text-xs text-ink-subtle">LOP Penalty</div>
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                    {previewResult.snapshot.payrollImpact.lopDays} Days
                  </div>
                </div>
                <div className="bg-surface p-3 rounded-lg border border-hairline-soft">
                  <div className="text-xs text-ink-subtle">Unused CL Payout</div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {previewResult.snapshot.payrollImpact.unusedCLEncashmentAllowance}
                  </div>
                </div>
              </div>

              {/* Pipeline Breakdown JSON Preview */}
              <div>
                <span className="text-xs font-semibold text-ink-muted block mb-1 uppercase tracking-wider">Calculation Snapshot Payload:</span>
                <pre className="p-3 bg-surface border border-hairline-soft rounded-lg text-xs font-mono text-ink-muted overflow-x-auto">
                  {JSON.stringify(previewResult.snapshot, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-hairline bg-surface-1/60 flex justify-end">
          <button
            onClick={onClose}
            className="tracker-btn-secondary cursor-pointer"
          >
            Close Sandbox
          </button>
        </div>
      </div>
    </div>
  );
}
