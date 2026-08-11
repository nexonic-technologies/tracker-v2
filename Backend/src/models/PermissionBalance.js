// Backend/src/models/PermissionBalance.js
import { Schema, model } from 'mongoose';

const PermissionBalanceSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'employees', required: true, index: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 }, // 1-12
  grantedHours: { type: Number, default: 2.0, min: 0 },
  carriedForwardHours: { type: Number, default: 0.0, min: 0 },
  usedHours: { type: Number, default: 0.0, min: 0 },
  expiredHours: { type: Number, default: 0.0, min: 0 },
  remainingHours: { type: Number, default: 2.0, min: 0 }
}, { timestamps: true });

PermissionBalanceSchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });

export default model('permission_balances', PermissionBalanceSchema);
