// models/Designation.js
import { Schema, model } from 'mongoose';

const DesignationSchema = new Schema({
  title: {
    type: String,
    trim: true,
    unique: true
  },
  description: { type: String },
  leavePolicy: { type: Schema.Types.ObjectId, ref: 'leave_policies' },
  attendancePolicy: { type: Schema.Types.ObjectId, ref: 'attendance_policies' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

DesignationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default model('designations', DesignationSchema);