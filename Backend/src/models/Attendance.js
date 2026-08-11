// models/Attendance.js
import { Schema, model } from "mongoose";

const AttendanceSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: "employees", required: true, index: true },
  date: { type: Date, required: true, index: true },
  status: {
    type: String,
    enum: [
      "Present", "Absent", "Leave", "Half Day", "Work From Home",
      "Early check-out", "Check-Out", "Unchecked", "LOP",
      "Holiday", "Week Off", "Pending", "Late Entry"
    ],
    default: "Present",
    index: true
  },
  leaveType: { type: Schema.Types.ObjectId, ref: "leave_types" },
  checkIn: { type: Date },
  checkOut: { type: Date },
  location: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  punches: [{
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    location: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  }],
  request: { type: String },
  managerId: { type: Schema.Types.ObjectId, ref: "employees", index: true },
  employeeName: { type: String },
  workHours: { type: Number, min: 0, max: 24 }, // Calculated field
  overtimeHours: { type: Number, min: 0, default: 0 }, // Auto-computed by afterUpdate hook
  employeeModel: { type: String, enum: ['employees', 'agents'], default: 'employees' },

  // Policy & Shift References
  policyId: { type: Schema.Types.ObjectId, ref: "attendance_policies" },
  policyVersion: { type: Number, default: 1 },
  shiftId: { type: Schema.Types.ObjectId, ref: "Shift" },

  // Frozen Context & Calculation Snapshot
  snapshot: {
    policy: {
      id: { type: Schema.Types.ObjectId, ref: "attendance_policies" },
      name: { type: String },
      version: { type: Number, default: 1 }
    },
    shift: {
      id: { type: Schema.Types.ObjectId, ref: "Shift" },
      name: { type: String },
      startTime: { type: String },
      endTime: { type: String }
    },
    result: {
      status: { type: String },
      workedMinutes: { type: Number, default: 0 },
      lateMinutes: { type: Number, default: 0 },
      earlyExitMinutes: { type: Number, default: 0 },
      overtimeMinutes: { type: Number, default: 0 },
      payableOvertimeMinutes: { type: Number, default: 0 },
      fineAmount: { type: Number, default: 0 },
      lopDays: { type: Number, default: 0 }
    },
    calculatedAt: { type: Date, default: Date.now }
  },

  // ── Payroll Lock ─────────────────────────────────────────────────────────────
  // Stamped by payroll_runs.js when PayrollRun status transitions to 'Paid'.
  // Once set, beforeUpdate blocks all edits (except _forceUnlock for HR override).
  payrollLockedAt: { type: Date, default: null },
  payrollLockedBy: { type: Schema.Types.ObjectId, ref: 'employees', default: null }
}, { timestamps: true });

// Compound indexes for performance
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ employee: 1, status: 1, date: -1 });
AttendanceSchema.index({ managerId: 1, status: 1, date: -1 });
AttendanceSchema.index({ date: -1, status: 1 }); // Recent attendance by status
AttendanceSchema.index({ status: 1, date: -1 }); // Status-based queries

// Calculate work hours before saving
AttendanceSchema.pre('save', function (next) {
  if (this.punches && this.punches.length > 0) {
    let totalMs = 0;
    this.punches.forEach(p => {
      if (p.checkIn && p.checkOut) {
        totalMs += Math.max(0, new Date(p.checkOut) - new Date(p.checkIn));
      }
    });
    this.workHours = Math.min(24, totalMs / (1000 * 60 * 60));

    // Sync top-level fields for compatibility
    this.checkIn = this.punches[0].checkIn;
    const lastPunch = this.punches[this.punches.length - 1];
    this.checkOut = lastPunch.checkOut || null;
  } else if (this.checkIn && this.checkOut) {
    this.workHours = Math.min(24, (this.checkOut - this.checkIn) / (1000 * 60 * 60));
  }
  next();
});

export default model("attendances", AttendanceSchema);
