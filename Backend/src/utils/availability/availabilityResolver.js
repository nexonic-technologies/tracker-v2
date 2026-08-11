/**
 * availabilityResolver.js
 *
 * Main orchestrator of the Availability Stack.
 * Walks a date range day-by-day, applying precedence priority order:
 *   Company Holiday -> Approved Leave -> Attendance (past/today) -> Shift
 *
 * Returns explainable details for prediction engine and dashboards.
 */
import { resolveShiftForDate } from "./shiftResolver.js";
import { resolveLeaveForRange } from "./leaveResolver.js";
import { resolveAttendanceForRange } from "./attendanceResolver.js";
import { resolveHolidaysForRange } from "./holidayResolver.js";

/**
 * @param {string|ObjectId} employeeId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Array<{
 *   date: Date,
 *   isWorkingDay: boolean,
 *   capacityHours: number,
 *   reason: string,
 *   source: { model: string|null, id: string|null }
 * }>>}
 */
export async function resolveEmployeeAvailabilityRange(employeeId, startDate, endDate) {
  // Ensure dates are parsed and standardized to midnight
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Pre-fetch all overlapping databases in parallel for high performance
  const [leaves, attendances, holidays] = await Promise.all([
    resolveLeaveForRange(employeeId, start, end),
    resolveAttendanceForRange(employeeId, start, end),
    resolveHolidaysForRange(start, end)
  ]);

  const schedule = [];
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  for (let i = 0; i < totalDays; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    // 1. Resolve Standard Shift Capacity
    const shift = await resolveShiftForDate(employeeId, day);

    // 2. Precedence Order 1: Company / National Holidays
    const matchedHoliday = holidays.find(h => {
      const hDate = new Date(h.date);
      return hDate.getFullYear() === day.getFullYear() &&
             hDate.getMonth() === day.getMonth() &&
             hDate.getDate() === day.getDate();
    });

    if (matchedHoliday) {
      schedule.push({
        date: new Date(day),
        isWorkingDay: false,
        capacityHours: 0,
        reason: "HOLIDAY",
        source: { model: "holidays", id: matchedHoliday._id.toString() }
      });
      continue;
    }

    // 3. Precedence Order 2: Approved Leaves (Full or Half Day)
    const matchedLeave = leaves.find(l => {
      const lStart = new Date(l.startDate);
      lStart.setHours(0,0,0,0);
      const lEnd = new Date(l.endDate);
      lEnd.setHours(23,59,59,999);
      return dayStart >= lStart && dayEnd <= lEnd;
    });

    if (matchedLeave) {
      const isHalfDay = matchedLeave.totalDays === 0.5;
      schedule.push({
        date: new Date(day),
        isWorkingDay: !isHalfDay,
        capacityHours: isHalfDay ? shift.capacityHours * 0.5 : 0,
        reason: isHalfDay ? "HALF_DAY_LEAVE" : "APPROVED_LEAVE",
        source: { model: "leaves", id: matchedLeave._id.toString() }
      });
      continue;
    }

    // 4. Precedence Order 3: Past / Today's Attendance logs (Absent / LOP / Unchecked)
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (dayEnd <= today) {
      const matchedAtt = attendances.find(a => {
        const aDate = new Date(a.date);
        return aDate.getFullYear() === day.getFullYear() &&
               aDate.getMonth() === day.getMonth() &&
               aDate.getDate() === day.getDate();
      });

      if (matchedAtt) {
        const status = matchedAtt.status;
        if (status === 'Absent' || status === 'LOP' || status === 'Unchecked' || status === 'Leave') {
          schedule.push({
            date: new Date(day),
            isWorkingDay: false,
            capacityHours: 0,
            reason: status.toUpperCase(),
            source: { model: "attendances", id: matchedAtt._id.toString() }
          });
          continue;
        } else if (status === 'Half Day') {
          schedule.push({
            date: new Date(day),
            isWorkingDay: true,
            capacityHours: shift.capacityHours * 0.5,
            reason: "HALF_DAY_ATTENDANCE",
            source: { model: "attendances", id: matchedAtt._id.toString() }
          });
          continue;
        }
      }
    }

    // 5. Fallback: Shift Default
    schedule.push({
      date: new Date(day),
      isWorkingDay: shift.isWorkingDay,
      capacityHours: shift.capacityHours,
      reason: shift.reason,
      source: { model: "shifts", id: null }
    });
  }

  return schedule;
}
