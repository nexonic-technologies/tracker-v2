/**
 * shiftResolver.js
 *
 * Resolves standard shift working hours and weekly off days.
 */
import models from "../../models/Collection.js";


const DEFAULT_SHIFT = {
  startTime: '09:00',
  endTime:   '18:00',
  weeklyOff: ['Saturday', 'Sunday'],
  workingHours: 8
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function resolveShiftForDate(employeeId, date) {
  let shiftConfig = DEFAULT_SHIFT;

  try {
    const assignment = await models.shiftassignments
      ?.findOne({ employeeId, isActive: true })
      .sort({ startDate: -1 })
      .lean();

    if (assignment?.shiftId) {
      const shift = await models.shifts?.findById(assignment.shiftId).lean();
      if (shift?.startTime && shift?.endTime) {
        shiftConfig = {
          startTime:    shift.startTime,
          endTime:      shift.endTime,
          weeklyOff:    shift.weeklyOff || ['Saturday', 'Sunday'],
          workingHours: shift.workingHours || 8
        };
      }
    }
  } catch (err) {
    // Graceful fallback
  }

  const dayName = DAY_NAMES[date.getDay()];
  const isWeeklyOff = shiftConfig.weeklyOff.includes(dayName);

  return {
    isWorkingDay: !isWeeklyOff,
    capacityHours: isWeeklyOff ? 0 : shiftConfig.workingHours,
    reason: isWeeklyOff ? "WEEKLY_OFF" : "WORKING_DAY"
  };
}
