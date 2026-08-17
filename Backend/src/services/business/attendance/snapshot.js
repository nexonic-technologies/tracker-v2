// Backend/src/services/business/attendance/snapshot.js

/**
 * Pure Snapshot Builder for Attendance
 * Constructs the frozen Attendance.snapshot object stored on every Attendance document.
 * 
 * @param {Object} state - Calculated state result from calculation pipeline
 * @returns {Object} Frozen snapshot object
 */
export function buildAttendanceSnapshot(state) {
  return {
    policy: {
      id: state.policy?._id || null,
      name: state.policy?.name || null,
      version: state.policy?.version || 1
    },
    shift: {
      id: state.shift?._id || null,
      name: state.shift?.name || null,
      startTime: state.shift?.startTime || null,
      endTime: state.shift?.endTime || null
    },
    result: {
      status: state.status || 'Present',
      workedMinutes: Math.round((state.workHours || 0) * 60),
      lateMinutes: state.lateMinutes || 0,
      earlyExitMinutes: state.earlyExitMinutes || 0,
      payableOvertimeMinutes: Math.round((state.overtimeHours || 0) * 60),
      fineAmount: state.fineAmount || 0,
      lopDays: state.lopDays || 0
    },
    calculatedAt: new Date()
  };
}

export default buildAttendanceSnapshot;
