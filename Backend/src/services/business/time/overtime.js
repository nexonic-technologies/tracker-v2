// Backend/src/services/business/time/overtime.js

/**
 * Reusable Time Calculation Handler: overtime
 * Evaluates net worked hours against overtime thresholds and computes eligible overtime.
 * Reusable across Attendance, Payroll, and Performance Analytics.
 */
export default async function overtime(state) {
  const policyOt = state.policy?.overtimeRules || {};
  const shiftOtThreshold = state.shift?.overtimeThreshold || policyOt.overtimeThresholdMins || 480; // 8 hrs
  
  if (!policyOt.enabled && !state.shift?.overtimeThreshold) {
    return { ...state, overtimeHours: 0, overtimeMinutes: 0 };
  }

  const workedMins = (state.workHours || 0) * 60;
  const thresholdMins = shiftOtThreshold;
  
  let otMins = 0;
  if (workedMins > thresholdMins) {
    otMins = workedMins - thresholdMins;

    // Apply minimum overtime window check
    const minOtMins = policyOt.minOvertimeMins || 0;
    if (otMins < minOtMins) {
      otMins = 0;
    }

    // Apply rounding if configured (e.g. round to nearest 15 mins)
    const roundMins = policyOt.roundToNearestMins || 1;
    if (roundMins > 1 && otMins > 0) {
      otMins = Math.floor(otMins / roundMins) * roundMins;
    }

    // Apply daily overtime cap if configured
    const maxOtMins = policyOt.maxOvertimeMinsPerDay || 1440;
    otMins = Math.min(otMins, maxOtMins);
  }

  const otHours = Math.round((otMins / 60) * 100) / 100;

  return {
    ...state,
    overtimeHours: otHours,
    overtimeMinutes: otMins
  };
}
