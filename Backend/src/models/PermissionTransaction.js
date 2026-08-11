// Backend/src/models/PermissionTransaction.js
import { Schema, model } from 'mongoose';

const PermissionTransactionSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'employees', required: true, index: true },
  date: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, required: true, min: 1 },
  type: { 
    type: String, 
    enum: ['LATE_CHECKIN', 'EARLY_CHECKOUT', 'PERSONAL_OUTING'], 
    default: 'LATE_CHECKIN',
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'AutoConsumed'], 
    default: 'AutoConsumed',
    index: true 
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'employees' },
  remarks: { type: String }
}, { timestamps: true });

PermissionTransactionSchema.index({ employee: 1, date: -1 });

export default model('permission_transactions', PermissionTransactionSchema);
