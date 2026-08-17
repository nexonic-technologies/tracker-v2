// Backend/src/services/business/attendance/fine.js

/**
 * Attendance Business Handler: fine
 * Calculates late fines and LOP day deductions based on AttendancePolicy fineAndLopRules.
 */
export default async function fine(state) {
  const fineRules = state.policy?.fineAndLopRules || {};
  
  let fineAmount = 0;
  let lopDays = 0;

  const absentLopFactor = fineRules.absentLopDays !== undefined ? fineRules.absentLopDays : 1.0;
  const halfDayLopFactor = fineRules.halfDayLopDays !== undefined ? fineRules.halfDayLopDays : 0.5;

  if (state.status === 'Absent' || state.status === 'LOP') {
    lopDays = absentLopFactor;
  } else if (state.status === 'Half Day') {
    lopDays = halfDayLopFactor;
  }

  if (fineRules.enableLateFines && state.lateMinutes > 0) {
    if (fineRules.lateFineType === 'Fixed') {
      fineAmount = fineRules.lateFineAmount || 0;
    } else if (fineRules.lateFineType === 'PerMinute') {
      const perMinRate = fineRules.lateFineAmount || 1;
      fineAmount = state.lateMinutes * perMinRate;
    }
  }

  return {
    ...state,
    fineAmount: Math.round(fineAmount * 100) / 100,
    lopDays
  };
}
