// src/models/PeriodClosure.js
import mongoose from 'mongoose';

const period_closureSchema = new mongoose.Schema({
  // Human-readable period label for UI (e.g., 'April 2026', 'Q1 FY2026-27')
  // This is derived at creation time and stored for display purposes only
  periodLabel: { type: String, required: true },

  // Period boundaries - always store exact dates, never FY labels
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // Financial year context - derived from general_settings at creation time
  // Used for grouping periods by FY in UI reports
  financialYearLabel: { type: String, required: true }, // e.g., 'FY2026-27'

  // Closure status workflow
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Closed', 'Reopened'],
    default: 'Open',
    index: true
  },

  // Module-level closure flags - granular control over what's locked
  modules: {
    payroll: {
      closed: { type: Boolean, default: false },
      closedAt: { type: Date },
      closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
      remarks: { type: String }
    },
    attendance: {
      closed: { type: Boolean, default: false },
      closedAt: { type: Date },
      closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
      remarks: { type: String }
    },
    expenses: {
      closed: { type: Boolean, default: false },
      closedAt: { type: Date },
      closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
      remarks: { type: String }
    },
    timeTracking: {
      closed: { type: Boolean, default: false },
      closedAt: { type: Date },
      closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
      remarks: { type: String }
    },
    quotations: {
      closed: { type: Boolean, default: false },
      closedAt: { type: Date },
      closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
      remarks: { type: String }
    }
  },

  // Summary statistics - computed at closure time for audit trail
  summary: {
    totalPayrollRecords: { type: Number, default: 0 },
    totalExpenseAmount: { type: Number, default: 0 },
    totalAttendanceRecords: { type: Number, default: 0 },
    totalTimeTrackingHours: { type: Number, default: 0 },
    totalQuotations: { type: Number, default: 0 }
  },

  // Audit trail
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', required: true },
  reopenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  reopenedAt: { type: Date },
  reopenReason: { type: String },

  // Final closure metadata
  closedAt: { type: Date },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  closureRemarks: { type: String }

}, { timestamps: true });

// Indexes for efficient queries
period_closureSchema.index({ startDate: 1, endDate: 1 });
period_closureSchema.index({ status: 1, startDate: -1 });
period_closureSchema.index({ financialYearLabel: 1, startDate: 1 });
period_closureSchema.index({ 'modules.payroll.closed': 1 });
period_closureSchema.index({ 'modules.attendance.closed': 1 });
period_closureSchema.index({ 'modules.expenses.closed': 1 });

// Prevent overlapping periods
period_closureSchema.pre('save', async function (next) {
  if (this.isNew) {
    const PeriodClosure = mongoose.model('period_closures');
    const overlapping = await PeriodClosure.findOne({
      $or: [
        { startDate: { $lte: this.endDate }, endDate: { $gte: this.startDate } },
        { startDate: { $lte: this.startDate }, endDate: { $gte: this.endDate } }
      ]
    });
    if (overlapping) {
      return next(new Error('Period closure dates overlap with an existing closure'));
    }
  }
  next();
});

export default mongoose.model('period_closures', period_closureSchema);
