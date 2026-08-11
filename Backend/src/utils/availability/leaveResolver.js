/**
 * leaveResolver.js
 *
 * Checks leaves collection for approved employee leaves.
 */
import models from "../../models/Collection.js";


export async function resolveLeaveForRange(employeeId, startDate, endDate) {
  try {
    const activeLeaves = await models.leaves.find({
      employeeId,
      status: 'Approved',
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    }).lean();

    return activeLeaves;
  } catch (err) {
    console.error("[leaveResolver] Error resolving leaves:", err.message);
    return [];
  }
}
