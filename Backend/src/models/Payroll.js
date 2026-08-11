import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', required: true, index: true },
  // Denormalized at compute time for department-level payroll reports
  // (avoids expensive Employee join on every aggregation)
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'departments', index: true, default: null },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'salary_structures' },
  payrollRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'payroll_runs', index: true },

  // Day accounting
  workingDays: { type: Number, required: true },
  presentDays: { type: Number, required: true },
  lopDays: { type: Number, default: 0 },
  leaveDays: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  overtimePay: { type: Number, default: 0 },

  // Computed breakdown snapshots — immutable after Approved
  earnedBreakdown: { type: Map, of: Number, default: {} },
  deductionBreakdown: { type: Map, of: Number, default: {} },

  // Employer-side statutory contributions (not deducted from employee pay)
  // Required for full Employee Cost Sheet = grossSalary + pfEmployer + esiEmployer
  pfEmployerContribution: { type: Number, default: 0 },
  esiEmployerContribution: { type: Number, default: 0 },

  grossSalary: { type: Number, required: true },
  netSalary: { type: Number, required: true },

  status: { type: String, enum: ['Draft', 'Processing', 'Processed', 'Approved', 'Paid'], default: 'Draft', index: true },

  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  processedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  approvedAt: { type: Date },
  frozenAt: { type: Date },
  paidAt: { type: Date },

  // Phase 2 placeholder — PDF payslip
  payslipUrl: { type: String, default: null },
  generatedAt: { type: Date, default: null },

  remarks: { type: String }
}, { timestamps: true });

payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ status: 1, createdAt: -1 });
payrollSchema.index({ status: 1, month: 1, year: 1 });
payrollSchema.index({ processedAt: -1 });
payrollSchema.index({ departmentId: 1, month: 1, year: 1 }); // Department payroll summary
payrollSchema.index({ departmentId: 1, status: 1 });          // Department + status filter

export default mongoose.model('payrolls', payrollSchema);
