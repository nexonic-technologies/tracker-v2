import mongoose from 'mongoose';

const earningSchema = new mongoose.Schema({
  code: { type: String, trim: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['fixed', 'variable', 'percentage_of_basic'], required: true },
  amount: { type: Number, required: true, min: 0 },
  taxable: { type: Boolean, default: true },
  isProratable: { type: Boolean, default: true }
}, { _id: false });

const deductionSchema = new mongoose.Schema({
  code: { type: String, trim: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['fixed', 'percentage_of_basic', 'percentage_of_gross', 'statutory'], required: true },
  amount: { type: Number, required: true, min: 0 },
  ceiling: { type: Number }
}, { _id: false });

const salary_structuresSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', required: true, index: true },
  version: { type: Number, required: true, min: 1 },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date, default: null },
  ctc: { type: Number, required: true, min: 0 },
  earnings: { type: [earningSchema], default: [] },
  deductions: { type: [deductionSchema], default: [] },
  pfEmployeePercent: { type: Number, default: 12 },
  pfCeiling: { type: Number, default: 15000 },
  esiApplicable: { type: Boolean, default: true },
  overtimeRate: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' }
}, { timestamps: true });

salary_structuresSchema.index({ employeeId: 1, effectiveFrom: -1 });
salary_structuresSchema.index({ employeeId: 1, effectiveTo: 1 });
salary_structuresSchema.index({ employeeId: 1, version: -1 });

export default mongoose.model('salary_structures', salary_structuresSchema);
