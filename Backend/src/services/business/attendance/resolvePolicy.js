import mongoose from 'mongoose';
import { getTenantModel } from '../../../tenant/tenantContext.js';
import { getModel } from '../../../utils/appRegistry.js';

export const DEFAULT_ATTENDANCE_POLICY = Object.freeze({
  _id: null,
  name: 'Default Attendance Policy',
  version: 1,
  status: 'Active',
  shiftConfig: {
    graceMinutesCheckIn: 15,
    graceMinutesCheckOut: 15,
    allowFlexibleTiming: false,
    splitShiftEnabled: false,
    minimumSplitIntervalMins: 60
  },
  attendanceRules: {
    fullDayMinHours: 8.0,
    halfDayMinHours: 4.0,
    absentMinHours: 2.0,
    lateMarkCutoffMins: 15,
    earlyExitCutoffMins: 15,
    lateMarksForHalfDay: 3,
    breakDeductionMinHours: 5.0,
    missingPunchAction: 'RegularizationRequired'
  },
  permissionRules: {
    enabled: true,
    monthlyMaxHours: 2.0,
    allowCarryForward: false,
    maxCarryForwardHours: 0,
    expiryCycle: 'MONTHLY',
    excessAction: 'HOURLY_LOP',
    hourlyRateBasis: 'BASIC_ONLY',
    roundingGranularity: 'EXACT'
  },
  lateEscalationRules: {
    enabled: true,
    gracePeriodMins: 15,
    consumePermissionFirst: true,
    occurrenceThreshold: 3,
    occurrenceScope: 'SEPARATE_LATE_EARLY',
    thresholdAction: 'CONVERT_HALF_DAY_LOP',
    halfDayLopPenalty: 0.5,
    resetFrequency: 'MONTHLY'
  },
  holidayWorkRules: {
    enabled: true,
    allowHolidayOverride: true,
    defaultCompensation: 'REGULAR_PAY',
    otMultiplier: 2.0,
    compOffCreditDays: 1.0,
    minHoursForCompensation: 7.0
  },
  overtimeRules: {
    enabled: false,
    overtimeThresholdMins: 480,
    minOvertimeMins: 60,
    maxOvertimeMinsPerDay: 240,
    roundToNearestMins: 15,
    weekdayMultiplier: 1.25,
    weekendMultiplier: 1.5,
    holidayMultiplier: 2.0
  },
  fineAndLopRules: {
    enableLateFines: false,
    lateFineType: 'Fixed',
    lateFineAmount: 0,
    absentLopDays: 1.0,
    halfDayLopDays: 0.5,
    sandwichRuleEnabled: false
  },
  leaveEncashmentRules: {
    enabled: true,
    triggerCycle: 'YEAR_END'
  },
  fullDayHours: 8,
  halfDayHours: 4,
  minimumPunchHours: 2,
  graceMinutes: 15,
  isActive: true
});

export const DEFAULT_SHIFT = Object.freeze({
  _id: null,
  name: 'Standard General Shift',
  startTime: '09:00',
  endTime: '18:00',
  crossesMidnight: false,
  breakDuration: 60,
  workingHours: 8.0,
  isActive: true,
  allowedLateness: 15,
  overtimeThreshold: 480,
  graceMinutesCheckIn: 15,
  graceMinutesCheckOut: 15,
  weeklyOff: ['Saturday', 'Sunday']
});

function resolveModel(name, ctx) {
  try {
    if (ctx?.tenantContext?.getModel) {
      const m = ctx.tenantContext.getModel(name);
      if (m) return m;
    }
    return getTenantModel(name) || getModel(name);
  } catch (_) {
    return null;
  }
}

/**
 * Attendance Business Handler: resolvePolicy
 * Resolves the effective AttendancePolicy and Shift for the employee on the target date.
 * Implements full declarative hierarchy:
 *  - AttendancePolicy: Employee -> Department -> Role -> Designation -> Company -> Active DB Policy -> Default Fallback
 *  - Shift: Employee ShiftAssignment -> Policy defaultShiftId -> Active Shift -> Default Fallback
 */
export default async function resolvePolicy(state) {
  // If policy & shift are already provided in context state, return immediately
  if (state.policy && state.shift) {
    return state;
  }

  const { employeeId, date, ctx } = state;
  const targetDate = date ? new Date(date) : new Date();

  let resolvedPolicy = state.policy || null;
  let resolvedShift = state.shift || null;

  // Only query MongoDB if Mongoose is connected
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

  if (isDbConnected) {
    const EmployeeModel = resolveModel('Employee', ctx);
    const AttendancePolicyModel = resolveModel('AttendancePolicy', ctx);
    const ShiftModel = resolveModel('Shift', ctx);
    const ShiftAssignmentModel = resolveModel('ShiftAssignment', ctx);

    let emp = null;
    if (employeeId && EmployeeModel) {
      try {
        emp = await EmployeeModel.findById(employeeId)
          .populate({ path: 'professionalInfo.policyAssignments.policy' })
          .populate({ path: 'professionalInfo.policyAssignments.shift' })
          .populate({ path: 'professionalInfo.department', populate: { path: 'attendancePolicy' } })
          .lean();
      } catch (_) {
        // Cleanly continue
      }
    }

    // ==========================================
    // 1. RESOLVE ATTENDANCE POLICY HIERARCHY
    // ==========================================
    if (!resolvedPolicy && AttendancePolicyModel) {
      try {
        const activePolicyFilter = {
          status: { $ne: 'Archived' },
          $or: [
            { isActive: true },
            { isActive: { $exists: false } }
          ],
          $and: [
            { $or: [{ effectiveFrom: { $exists: false } }, { effectiveFrom: null }, { effectiveFrom: { $lte: targetDate } }] },
            { $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: targetDate } }] }
          ]
        };

        // (a) Check Employee subdocument policyAssignments (explicit date range)
        if (emp?.professionalInfo?.policyAssignments?.length) {
          const matched = emp.professionalInfo.policyAssignments.find(a => {
            const start = new Date(a.startDate);
            const end = a.endDate ? new Date(a.endDate) : null;
            return start <= targetDate && (!end || end >= targetDate);
          });
          if (matched?.policy) {
            resolvedPolicy = matched.policy;
            if (!resolvedShift && matched.shift) {
              resolvedShift = matched.shift;
            }
          }
        }

        // (b) Check AttendancePolicy collection by assignmentType: 'Employee'
        if (!resolvedPolicy && emp?._id) {
          resolvedPolicy = await AttendancePolicyModel.findOne({
            ...activePolicyFilter,
            assignmentType: 'Employee',
            assignmentIds: emp._id
          }).sort({ createdAt: -1 }).lean();
        }

        // (c) Check AttendancePolicy collection by assignmentType: 'Department'
        const deptId = emp?.professionalInfo?.department?._id || emp?.professionalInfo?.department;
        if (!resolvedPolicy && deptId) {
          resolvedPolicy = await AttendancePolicyModel.findOne({
            ...activePolicyFilter,
            assignmentType: 'Department',
            assignmentIds: deptId
          }).sort({ createdAt: -1 }).lean();
        }

        // (d) Check Department document's legacy attendancePolicy reference
        if (!resolvedPolicy && emp?.professionalInfo?.department?.attendancePolicy) {
          resolvedPolicy = emp.professionalInfo.department.attendancePolicy;
        }

        // (e) Check AttendancePolicy collection by assignmentType: 'Role'
        const roleId = emp?.professionalInfo?.role?._id || emp?.professionalInfo?.role;
        if (!resolvedPolicy && roleId) {
          resolvedPolicy = await AttendancePolicyModel.findOne({
            ...activePolicyFilter,
            assignmentType: 'Role',
            assignmentIds: roleId
          }).sort({ createdAt: -1 }).lean();
        }

        // (f) Check AttendancePolicy collection by assignmentType: 'Designation'
        const designationId = emp?.professionalInfo?.designation?._id || emp?.professionalInfo?.designation;
        if (!resolvedPolicy && designationId) {
          resolvedPolicy = await AttendancePolicyModel.findOne({
            ...activePolicyFilter,
            assignmentType: 'Designation',
            assignmentIds: designationId
          }).sort({ createdAt: -1 }).lean();
        }

        // (g) Check AttendancePolicy collection by assignmentType: 'Company' (Enterprise company-wide standard)
        if (!resolvedPolicy) {
          resolvedPolicy = await AttendancePolicyModel.findOne({
            ...activePolicyFilter,
            assignmentType: 'Company'
          }).sort({ createdAt: -1 }).lean();
        }

        // (h) General active AttendancePolicy fallback in DB
        if (!resolvedPolicy) {
          resolvedPolicy = await AttendancePolicyModel.findOne({
            $or: [{ status: 'Active' }, { isActive: true }]
          }).sort({ createdAt: -1 }).lean() || await AttendancePolicyModel.findOne().sort({ createdAt: -1 }).lean();
        }
      } catch (err) {
        console.error('[resolvePolicy] Error querying AttendancePolicy hierarchy:', err.message);
      }
    }

    // ==========================================
    // 2. RESOLVE SHIFT HIERARCHY
    // ==========================================
    if (!resolvedShift) {
      try {
        // (a) Check ShiftAssignment collection for active assignment on employee
        if (employeeId && ShiftAssignmentModel && ShiftModel) {
          const shiftAssignment = await ShiftAssignmentModel.findOne({
            employeeId,
            isActive: true,
            startDate: { $lte: targetDate },
            $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: targetDate } }]
          }).sort({ startDate: -1 }).lean();

          if (shiftAssignment?.shiftId) {
            resolvedShift = await ShiftModel.findById(shiftAssignment.shiftId).lean();
          }
        }

        // (b) Check defaultShiftId configured on resolved AttendancePolicy
        if (!resolvedShift && resolvedPolicy?.shiftConfig?.defaultShiftId && ShiftModel) {
          resolvedShift = await ShiftModel.findById(resolvedPolicy.shiftConfig.defaultShiftId).lean();
        }

        // (c) Check any active Shift in DB
        if (!resolvedShift && ShiftModel) {
          resolvedShift = await ShiftModel.findOne({ isActive: true }).lean() || await ShiftModel.findOne().lean();
        }
      } catch (err) {
        console.error('[resolvePolicy] Error querying Shift hierarchy:', err.message);
      }
    }
  }

  // Graceful fallback to sensible system defaults if no active policy or shift is configured
  if (!resolvedPolicy) {
    resolvedPolicy = { ...DEFAULT_ATTENDANCE_POLICY };
  }

  if (!resolvedShift) {
    resolvedShift = { ...DEFAULT_SHIFT };
  }

  return {
    ...state,
    policy: resolvedPolicy,
    shift: resolvedShift
  };
}
