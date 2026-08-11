// models/Department.js
import { Schema, model } from 'mongoose';

const DepartmentSchema = new Schema({
  name: {
    type: String,
    trim: true,
    unique: true
  },
  shortCode: {
    type: String,
    trim: true,
    unique: true
  },
  description: { type: String },
  leavePolicy: { type: Schema.Types.ObjectId, ref: 'leave_policies' },
  attendancePolicy: { type: Schema.Types.ObjectId, ref: 'attendance_policies' },
  designations: [{ type: Schema.Types.ObjectId, ref: 'designations' }],
  manager: { type: Schema.Types.ObjectId, ref: 'employees', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

DepartmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default model('departments', DepartmentSchema);