import mongoose from 'mongoose';

const employeeLifecycleHistorySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees',
    required: true,
    index: true
  },
  changeType: {
    type: String,
    enum: [
      'InitialBaseline',
      'Promotion',
      'Transfer',
      'SalaryRevision',
      'DesignationChange',
      'DepartmentChange',
      'ManagerChange',
      'RoleChange',
      'StatusChange'
    ],
    required: true
  },
  effectiveDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees',
    default: null
  },
  reason: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

employeeLifecycleHistorySchema.index({ employeeId: 1, effectiveDate: -1 });
employeeLifecycleHistorySchema.index({ changeType: 1, effectiveDate: -1 });

export default mongoose.model('employee_life_cycle_histories', employeeLifecycleHistorySchema);
