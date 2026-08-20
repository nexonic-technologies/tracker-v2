import mongoose from 'mongoose';
import { getTenantModel } from '../../../tenant/tenantContext.js';
import { getModel } from '../../../utils/appRegistry.js';
import models from '../../../models/Collection.js';

function resolveLeaveModel(ctx) {
  try {
    if (ctx?.tenantContext?.getModel) {
      const m = ctx.tenantContext.getModel('Leave');
      if (m) return m;
    }
    return getTenantModel('Leave') || getModel('Leave') || models.leaves;
  } catch (_) {
    return models.leaves;
  }
}

function resolveWFHModel(ctx) {
  try {
    if (ctx?.tenantContext?.getModel) {
      const m = ctx.tenantContext.getModel('WFHRequest');
      if (m) return m;
    }
    return getTenantModel('WFHRequest') || getModel('WFHRequest') || models.wfh_requests;
  } catch (_) {
    return models.wfh_requests;
  }
}

/**
 * Attendance Business Handler: leave
 * Checks for approved Leave or WFH requests on the date.
 */
export default async function leave(state) {
  if (!state.employeeId || !state.date) return state;

  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  if (!isDbConnected) return state;

  const targetDate = new Date(state.date);
  const Leave = resolveLeaveModel(state.ctx);
  const WFHRequest = resolveWFHModel(state.ctx);

  // 1. Check for Approved Work From Home
  const wfhRecord = WFHRequest ? await WFHRequest.findOne({
    employeeId: state.employeeId,
    status: 'Approved',
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate }
  }).lean() : null;

  if (wfhRecord && (!state.checkIn && (!state.punches || state.punches.length === 0))) {
    return {
      ...state,
      status: 'Work From Home',
      stop: true
    };
  }

  // 2. Check for Approved Leave
  const leaveRecord = Leave ? await Leave.findOne({
    employeeId: state.employeeId,
    status: 'Approved',
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate }
  }).lean() : null;

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
