// Backend/src/services/business/time/workHours.js

/**
 * Reusable Time Calculation Handler: workHours
 * Calculates total worked duration (in hours and minutes) based on punches or checkIn/checkOut times.
 * Subtracts break durations if configured on the shift.
 * Reusable across Attendance, Payroll, and Time Tracking sessions.
 */
export default async function workHours(state) {
  let totalMs = 0;
  const punches = state.punches || [];

  if (punches.length > 0) {
    punches.forEach(p => {
      if (p.checkIn && p.checkOut) {
        totalMs += Math.max(0, new Date(p.checkOut) - new Date(p.checkIn));
      }
    });
  } else if (state.checkIn && state.checkOut) {
    totalMs = Math.max(0, new Date(state.checkOut) - new Date(state.checkIn));
  }

  let workHours = Math.min(24, totalMs / (1000 * 60 * 60));
  
  // Apply break duration deduction if available on shift
  const breakMins = state.shift?.breakDuration || 0;
  if (breakMins > 0 && workHours > (breakMins / 60)) {
    // Break deduction is applied only if total span exceeds break deduction threshold from policy
    const minHoursForBreakDeduction = state.policy?.attendanceRules?.breakDeductionMinHours !== undefined 
      ? state.policy.attendanceRules.breakDeductionMinHours 
      : 5.0;

    const breakHours = breakMins / 60;
    // Don't deduct break if explicitly logged as multiple punches
    if (punches.length <= 1 && workHours > minHoursForBreakDeduction) { 
      workHours = Math.max(0, workHours - breakHours);
    }
  }

  return {
    ...state,
    workHours: Math.round(workHours * 100) / 100,
    workedMinutes: Math.round(workHours * 60)
  };
}
