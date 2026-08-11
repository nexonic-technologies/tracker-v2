/**
 * shiftResolver.js
 *
 * Loads an employee's shift schedule for the next N calendar days.
 * Returns a day-by-day array consumable by productionTimeCalculator.
 *
 * Fallback behaviour (no ShiftAssignment found):
 *   Uses 09:00–18:00, Monday–Friday — safe default that doesn't break ETA.
 */

const DEFAULT_SHIFT = {
  startTime: '09:00',
  endTime:   '18:00',
  weeklyOff: ['Saturday', 'Sunday'],
  workingHours: 9
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * @param {string|ObjectId} employeeId
 * @param {Date}            startDate    - First day of the schedule window
 * @param {number}          [daysAhead]  - How many days to project (default 30)
 * @returns {Promise<Array<{date:Date, startTime:string, endTime:string, isWorkingDay:boolean}>>}
 */
export async function getEmployeeShiftSchedule(employeeId, startDate, daysAhead = 30) {
  let shiftConfig = DEFAULT_SHIFT;

  try {
    const ShiftAssignment = getTenantModel('ShiftAssignment');
    const Shift = getTenantModel('Shift');

    // Find the most recent active ShiftAssignment for this employee
    const assignment = ShiftAssignment ? await ShiftAssignment
      .findOne({ employeeId, isActive: true })
      .sort({ startDate: -1 })
      .lean() : null;

    if (assignment?.shiftId && Shift) {
      const shift = await Shift.findById(assignment.shiftId).lean();
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
    // Model may not be registered in collection map yet — safe fallback
    console.warn('[shiftResolver] Could not load shift assignment, using default:', err.message);
  }

  // Build day-by-day schedule
  const schedule = [];
  const anchor   = new Date(startDate);
  anchor.setHours(0, 0, 0, 0);

  for (let i = 0; i < daysAhead; i++) {
    const day     = new Date(anchor);
    day.setDate(anchor.getDate() + i);

    const dayName     = DAY_NAMES[day.getDay()];
    const isWorkingDay = !shiftConfig.weeklyOff.includes(dayName);

    schedule.push({
      date:         new Date(day),
      startTime:    shiftConfig.startTime,
      endTime:      shiftConfig.endTime,
      isWorkingDay
    });
  }

  return schedule;
}
