// models/AttendancePolicy.js
import { Schema, model } from 'mongoose';

const AttendancePolicySchema = new Schema({
  name: { type: String, trim: true, required: true },
  description: { type: String },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['Draft', 'Active', 'Archived'], default: 'Active', index: true },
  effectiveFrom: { type: Date, default: Date.now, index: true },
  effectiveTo: { type: Date, index: true },

  // Scope Mapping
  assignmentType: {
    type: String,
    enum: ['Company', 'Branch', 'Department', 'Role', 'Designation', 'Employee'],
    default: 'Company',
    index: true
  },
  assignmentIds: [{ type: Schema.Types.ObjectId, index: true }],

  // 1. Shift Rules
  shiftConfig: {
    defaultShiftId: { type: Schema.Types.ObjectId, ref: 'shifts' },
    allowFlexibleTiming: { type: Boolean, default: false },
    graceMinutesCheckIn: { type: Number, default: 15 },
    graceMinutesCheckOut: { type: Number, default: 15 },
    splitShiftEnabled: { type: Boolean, default: false },
    minimumSplitIntervalMins: { type: Number, default: 60 }
  },

  // 2. Attendance & Hours Rules
  attendanceRules: {
    fullDayMinHours: { type: Number, default: 8.0 },
    halfDayMinHours: { type: Number, default: 4.0 },
    absentMinHours: { type: Number, default: 2.0 },
    lateMarkCutoffMins: { type: Number, default: 15 },
    earlyExitCutoffMins: { type: Number, default: 15 },
    lateMarksForHalfDay: { type: Number, default: 3 },
    missingPunchAction: {
      type: String,
      enum: ['AutoAbsent', 'AutoHalfDay', 'RegularizationRequired'],
      default: 'RegularizationRequired'
    }
  },

  // 3. Permission Rules
  permissionRules: {
    enabled: { type: Boolean, default: true },
    monthlyMaxHours: { type: Number, default: 2.0 },
    allowCarryForward: { type: Boolean, default: false },
    maxCarryForwardHours: { type: Number, default: 0 },
    expiryCycle: { type: String, enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'], default: 'MONTHLY' },
    excessAction: { type: String, enum: ['HOURLY_LOP', 'DEDUCT_LEAVE_BALANCE', 'FINE_ONLY'], default: 'HOURLY_LOP' },
    hourlyRateBasis: { type: String, enum: ['BASIC_ONLY', 'GROSS_SALARY', 'CTC', 'BASIC_PLUS_DA'], default: 'BASIC_ONLY' },
    roundingGranularity: { type: String, enum: ['EXACT', 'CEIL_15', 'NEAREST_15'], default: 'EXACT' }
  },

  // 4. Late Escalation Rules
  lateEscalationRules: {
    enabled: { type: Boolean, default: true },
    gracePeriodMins: { type: Number, default: 15 },
    consumePermissionFirst: { type: Boolean, default: true },
    occurrenceThreshold: { type: Number, default: 3 },
    occurrenceScope: { type: String, enum: ['SEPARATE_LATE_EARLY', 'COMBINED_LATE_EARLY'], default: 'SEPARATE_LATE_EARLY' },
    thresholdAction: { type: String, enum: ['CONVERT_HALF_DAY_LOP', 'CONVERT_FULL_DAY_LOP', 'FINE_AMOUNT'], default: 'CONVERT_HALF_DAY_LOP' },
    halfDayLopPenalty: { type: Number, default: 0.5 },
    resetFrequency: { type: String, enum: ['MONTHLY', 'PAY_CYCLE'], default: 'MONTHLY' }
  },

  // 5. Holiday & Weekend Work Rules
  holidayWorkRules: {
    enabled: { type: Boolean, default: true },
    allowHolidayOverride: { type: Boolean, default: true },
    defaultCompensation: { type: String, enum: ['REGULAR_PAY', 'OVERTIME_MULTIPLIER', 'COMP_OFF', 'DOUBLE_PAY'], default: 'REGULAR_PAY' },
    otMultiplier: { type: Number, default: 2.0 },
    compOffCreditDays: { type: Number, default: 1.0 },
    minHoursForCompensation: { type: Number, default: 7.0 }
  },

  // 6. Overtime Rules
  overtimeRules: {
    enabled: { type: Boolean, default: false },
    overtimeThresholdMins: { type: Number, default: 480 }, // 8 hours
    minOvertimeMins: { type: Number, default: 60 },
    maxOvertimeMinsPerDay: { type: Number, default: 240 },
    roundToNearestMins: { type: Number, default: 15 },
    weekdayMultiplier: { type: Number, default: 1.25 },
    weekendMultiplier: { type: Number, default: 1.5 },
    holidayMultiplier: { type: Number, default: 2.0 }
  },

  // 7. Fine & LOP Rules
  fineAndLopRules: {
    enableLateFines: { type: Boolean, default: false },
    lateFineType: { type: String, enum: ['Fixed', 'PerMinute'], default: 'Fixed' },
    lateFineAmount: { type: Number, default: 0 },
    sandwichRuleEnabled: { type: Boolean, default: false }
  },

  // 8. Leave Encashment & Payroll Rules
  leaveEncashmentRules: {
    enabled: { type: Boolean, default: true },
    triggerCycle: { type: String, enum: ['YEAR_END', 'EXIT_ONLY', 'MONTHLY'], default: 'YEAR_END' },
    leaveTypeConfigs: [{
      leaveTypeId: { type: Schema.Types.ObjectId, ref: 'leave_types' },
      leaveTypeCode: { type: String, default: 'CL' },
      encashable: { type: Boolean, default: true },
      maxDays: { type: Number, default: 12 },
      salaryBasis: { type: String, enum: ['BASIC_ONLY', 'GROSS'], default: 'BASIC_ONLY' },
      divisor: { type: Number, enum: [26, 30], default: 30 }
    }]
  },

  // Legacy field compatibility fallbacks
  fullDayHours: { type: Number, default: 8 },
  halfDayHours: { type: Number, default: 4 },
  minimumPunchHours: { type: Number, default: 2 },
  graceMinutes: { type: Number, default: 15 },
  isActive: { type: Boolean, default: true, index: true },

  createdBy: { type: Schema.Types.ObjectId, ref: 'employees' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'employees' },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'employees' },
  publishedAt: { type: Date }
}, { timestamps: true });

AttendancePolicySchema.index({ assignmentType: 1, assignmentIds: 1, status: 1 });

export default model('attendance_policies', AttendancePolicySchema);
