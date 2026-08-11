import mongoose from 'mongoose';
import models from '../../../models/Collection.js';

const Holiday = models.holidays;

/**
 * Attendance Business Handler: holiday
 * Checks if target date is a registered holiday.
 * If true, sets status to 'Holiday' and short-circuits the pipeline (stop: true).
 */
export default async function holiday(state) {
  if (!state.date) return state;

  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  if (!isDbConnected) return state;

  const targetDate = new Date(state.date);
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  const holidayRecord = await Holiday.findOne({
    date: { $gte: startOfDay, $lte: endOfDay }
  }).lean();

  if (holidayRecord) {
    // If employee worked on a holiday, mark Present with Holiday OT multiplier
    if (state.checkIn || (state.punches && state.punches.length > 0)) {
      return {
        ...state,
        isHolidayWork: true,
        holidayName: holidayRecord.title || holidayRecord.name
      };
    }

    return {
      ...state,
      status: 'Holiday',
      workHours: 0,
      stop: true // Short-circuit pipeline
    };
  }

  return state;
}
