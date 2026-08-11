/**
 * attendanceResolver.js
 *
 * Resolves past and today's attendance statuses.
 */
import models from "../../models/Collection.js";


export async function resolveAttendanceForRange(employeeId, startDate, endDate) {
  try {
    const attendanceLogs = await models.attendances.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    return attendanceLogs;
  } catch (err) {
    console.error("[attendanceResolver] Error resolving attendance:", err.message);
    return [];
  }
}
