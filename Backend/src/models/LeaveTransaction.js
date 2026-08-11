// models/LeaveTransaction.js
import { Schema, model } from 'mongoose';

const leave_transactionsSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'employees', required: true, index: true },
  leaveTypeId: { type: Schema.Types.ObjectId, ref: 'leave_types', index: true },
  type: {
    type: String,
    enum: ['COMPOFF_CREDIT', 'MONTHLY_CREDIT', 'YEARLY_ROLLOVER', 'LEAVE_DEBIT', 'LEAVE_CREDIT_REVERSAL', 'MANUAL_ADJUSTMENT'],
    required: true
  },
  sourceId: { type: Schema.Types.ObjectId, index: true }, // Refers to CompOffRequest, Leave, etc.
  sourceModel: { type: String }, // 'wfh_requests', 'comp_off_requests', 'leaves', etc.
  quantity: { type: Number, required: true }, // Positive for credit, negative for debit
  description: { type: String },
  expiryDate: { type: Date }, // Optional expiry for comp-offs
}, { timestamps: true });

leave_transactionsSchema.index({ employeeId: 1, type: 1 });

export default model('leave_transactions', leave_transactionsSchema);
