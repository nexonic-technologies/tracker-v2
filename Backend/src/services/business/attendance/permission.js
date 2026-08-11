// Backend/src/services/business/attendance/permission.js

/**
 * Attendance Business Handler: permission
 * Evaluates short leave / permission hours to offset lateness or early exit.
 */
export default async function permission(state) {
  const permRules = state.policy?.permissionRules || {};

  if (!permRules.enabled) {
    return state;
  }

  // Placeholder for approved permission records check if model exists
  // Adjusts graceMinutesCheckIn if an approved permission exists for the day
  const approvedPermissionHours = state.approvedPermissionHours || 0;
  if (approvedPermissionHours > 0) {
    const extraGraceMins = approvedPermissionHours * 60;
    return {
      ...state,
      permissionHoursApplied: approvedPermissionHours,
      effectiveGraceCheckIn: (state.policy?.shiftConfig?.graceMinutesCheckIn || 15) + extraGraceMins
    };
  }

  return state;
}
