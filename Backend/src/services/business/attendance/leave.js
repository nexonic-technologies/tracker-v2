import mongoose from 'mongoose';
import models from '../../../models/Collection.js';

const Leave = models.leaves;
const WFHRequest = models.wfh_requests;

/**
 * Attendance Business Handler: leave
 * Checks for approved Leave or WFH requests on the date.
 */
export default async function leave(state) {
  if (!state.employeeId || !state.date) return state;

  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  if (!isDbConnected) return state;

  const targetDate = new Date(state.date);

  // 1. Check for Approved Work From Home
  const wfhRecord = await WFHRequest.findOne({
    employeeId: state.employeeId,
    status: 'Approved',
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate }
  }).lean();

  if (wfhRecord && (!state.checkIn && (!state.punches || state.punches.length === 0))) {
    return {
      ...state,
      status: 'Work From Home',
      stop: true
    };
  }

  // 2. Check for Approved Leave
  const leaveRecord = await Leave.findOne({
    employeeId: state.employeeId,
    status: 'Approved',
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate }
  }).lean();

  if (leaveRecord) {
    if (leaveRecord.leaveDuration === 'Half Day' || leaveRecord.halfDay) {
      return {
        ...state,
        isHalfDayLeave: true,
        leaveType: leaveRecord.leaveType
      };
    }

    // Full day leave with no punch -> set status to Leave and short-circuit
    if (!state.checkIn && (!state.punches || state.punches.length === 0)) {
      return {
        ...state,
        status: 'Leave',
        leaveType: leaveRecord.leaveType,
        workHours: 0,
        stop: true
      };
    }
  }

  return state;
}
