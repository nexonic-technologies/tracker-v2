/**
 * holidayResolver.js
 *
 * Checks holidays collection for company/national holidays.
 */
import models from "../../models/Collection.js";


export async function resolveHolidaysForRange(startDate, endDate) {
  try {
    const list = await models.holidays.find({
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    return list;
  } catch (err) {
    console.error("[holidayResolver] Error resolving holidays:", err.message);
    return [];
  }
}
