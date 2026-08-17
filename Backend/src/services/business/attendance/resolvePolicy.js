import mongoose from 'mongoose';
import { getTenantModel } from '../../../tenant/tenantContext.js';
import { getModel } from '../../../utils/appRegistry.js';

function resolveModel(name) {
  try {
    return getTenantModel(name) || getModel(name);
  } catch (_) {
    return null;
  }
}

/**
 * Attendance Business Handler: resolvePolicy
 * Resolves the effective AttendancePolicy and Shift for the employee on the target date.
 */
export default async function resolvePolicy(state) {
  // If policy & shift are already provided in context state, return immediately
  if (state.policy && state.shift) {
    return state;
  }

  const { employeeId, date } = state;
  const targetDate = date ? new Date(date) : new Date();

  let resolvedPolicy = state.policy || null;
  let resolvedShift = state.shift || null;

  // Only query MongoDB if Mongoose is connected
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

  if (isDbConnected) {
    const EmployeeModel = resolveModel('Employee');
    const AttendancePolicyModel = resolveModel('AttendancePolicy');
    const ShiftModel = resolveModel('Shift');

    if (employeeId && !resolvedPolicy && EmployeeModel) {
      // 1. Check Employee document for active date-ranged policyAssignments
      const emp = await EmployeeModel.findById(employeeId)
        .populate({ path: 'professionalInfo.policyAssignments.policy' })
        .populate({ path: 'professionalInfo.policyAssignments.shift' })
        .populate({ path: 'professionalInfo.department', populate: { path: 'attendancePolicy' } })
        .lean();

      if (emp) {
        const assignments = emp.professionalInfo?.policyAssignments || [];
        const matchedAssignment = assignments.find(a => {
          const start = new Date(a.startDate);
          const end = a.endDate ? new Date(a.endDate) : null;
          return start <= targetDate && (!end || end >= targetDate);
        });

        if (matchedAssignment) {
          resolvedPolicy = matchedAssignment.policy;
          resolvedShift = matchedAssignment.shift;
        } else if (emp.professionalInfo?.department?.attendancePolicy) {
          resolvedPolicy = emp.professionalInfo.department.attendancePolicy;
        }
      }
    }

    if (!resolvedPolicy && AttendancePolicyModel) {
      resolvedPolicy = await AttendancePolicyModel.findOne({ status: 'Active' })
        .sort({ createdAt: -1 })
        .lean();
    }

    if (!resolvedShift && resolvedPolicy?.shiftConfig?.defaultShiftId && ShiftModel) {
      resolvedShift = await ShiftModel.findById(resolvedPolicy.shiftConfig.defaultShiftId).lean();
    }

    if (!resolvedShift && ShiftModel) {
      resolvedShift = await ShiftModel.findOne({ isActive: true }).lean();
    }
  }

  if (!resolvedPolicy) {
    throw new Error('ATTENDANCE_POLICY_REQUIRED: No active attendance policy configured for employee or department.');
  }

  if (!resolvedShift) {
    throw new Error('ATTENDANCE_POLICY_REQUIRED: No active shift configured for employee attendance calculation.');
  }

  return {
    ...state,
    policy: resolvedPolicy,
    shift: resolvedShift
  };
}
