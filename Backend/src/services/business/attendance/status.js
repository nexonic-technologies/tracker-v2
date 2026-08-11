// Backend/src/services/business/attendance/status.js

/**
 * Attendance Business Handler: status
 * Evaluates punctuality (late check-in, early check-out) and total worked hours
 * to determine the final attendance status (Present, Half Day, Absent, Late Entry, Early check-out, LOP, Unchecked).
 */
export default async function status(state) {
  const policyRules = state.policy?.attendanceRules || {};
  const shift = state.shift || {};
  
  const fullDayMin = policyRules.fullDayMinHours || 8.0;
  const halfDayMin = policyRules.halfDayMinHours || 4.0;
  const absentMin = policyRules.absentMinHours || 2.0;

  const workedHours = state.workHours || 0;
  const checkIn = state.checkIn || (state.punches && state.punches[0]?.checkIn);
  const checkOut = state.checkOut || (state.punches && state.punches[state.punches.length - 1]?.checkOut);

  let lateMinutes = 0;
  let earlyExitMinutes = 0;

  // Calculate Late Check-In Minutes against Shift Start Time (Permission auto-deducts FIRST)
  if (checkIn && shift.startTime) {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const checkInDate = new Date(checkIn);
    const checkInMinsPastMidnight = checkInDate.getUTCHours() * 60 + checkInDate.getUTCMinutes();
    const shiftStartMinsPastMidnight = startH * 60 + startM;

    const baseGraceMins = state.policy?.shiftConfig?.graceMinutesCheckIn || 15;
    const permissionMins = (state.permissionHoursApplied || 0) * 60;
    
    // Total allowable window = Shift Start + Grace + Approved Permission
    const totalAllowedWindow = shiftStartMinsPastMidnight + baseGraceMins + permissionMins;

    if (checkInMinsPastMidnight > totalAllowedWindow) {
      // Chargeable late minutes = Total Lateness minus Permission Mins
      lateMinutes = checkInMinsPastMidnight - shiftStartMinsPastMidnight - permissionMins;
    }
  }

  // Calculate Early Exit Minutes against Shift End Time
  if (checkOut && shift.endTime) {
    const [endH, endM] = shift.endTime.split(':').map(Number);
    const checkOutDate = new Date(checkOut);
    const checkOutMinsPastMidnight = checkOutDate.getUTCHours() * 60 + checkOutDate.getUTCMinutes();
    const shiftEndMinsPastMidnight = endH * 60 + endM;

    const graceOutMins = state.policy?.shiftConfig?.graceMinutesCheckOut || 15;

    if (checkOutMinsPastMidnight < (shiftEndMinsPastMidnight - graceOutMins)) {
      earlyExitMinutes = shiftEndMinsPastMidnight - checkOutMinsPastMidnight;
    }
  }

  let calculatedStatus = 'Present';

  if (!checkIn && !checkOut && workedHours === 0) {
    calculatedStatus = 'LOP';
  } else if (checkIn && !checkOut) {
    calculatedStatus = lateMinutes > 0 ? 'Late Entry' : 'Present';
  } else if (workedHours < absentMin) {
    calculatedStatus = 'Absent';
  } else if (workedHours < halfDayMin) {
    calculatedStatus = 'Half Day';
  } else if (earlyExitMinutes > 0 && workedHours < fullDayMin) {
    calculatedStatus = 'Early check-out';
  } else if (lateMinutes > 0 && workedHours >= fullDayMin) {
    calculatedStatus = 'Late Entry';
  } else if (checkOut) {
    calculatedStatus = 'Check-Out';
  }

  return {
    ...state,
    status: calculatedStatus,
    lateMinutes,
    earlyExitMinutes
  };
}
