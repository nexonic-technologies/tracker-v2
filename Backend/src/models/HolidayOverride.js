// Backend/src/models/HolidayOverride.js
import { Schema, model } from 'mongoose';

const HolidayOverrideSchema = new Schema({
  holiday: { type: Schema.Types.ObjectId, ref: 'holidays', required: true, index: true },
  overrideType: { type: String, enum: ['WORKING_DAY', 'OPTIONAL_CANCELLED'], default: 'WORKING_DAY' },
  scope: { 
    type: String, 
    enum: ['GLOBAL', 'LOCATION', 'DEPARTMENT', 'SHIFT', 'EMPLOYEE'], 
    default: 'DEPARTMENT',
    required: true 
  },
  targetId: { type: Schema.Types.ObjectId, index: true }, // DepartmentId, ShiftId, or EmployeeId
  effectiveDate: { type: Date, required: true, index: true },
  compensationPolicy: {
    type: { 
      type: String, 
      enum: ['REGULAR_PAY', 'OVERTIME_MULTIPLIER', 'COMP_OFF', 'DOUBLE_PAY'], 
      default: 'REGULAR_PAY' 
    },
    otMultiplier: { type: Number, default: 1.0 },
    compOffCreditDays: { type: Number, default: 0.0 }
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'employees' }
}, { timestamps: true });

HolidayOverrideSchema.index({ scope: 1, targetId: 1, effectiveDate: 1 });

export default model('holiday_overrides', HolidayOverrideSchema);
