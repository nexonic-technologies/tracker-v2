// models/CompOffRequest.js
import { Schema, model } from 'mongoose';

const comp_off_requestsSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'employees', required: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'departments', index: true },
  workedDate: { type: Date, required: true },
  hoursWorked: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], default: 'Pending', index: true },
  managerId: { type: Schema.Types.ObjectId, ref: 'employees' },
  approverComment: { type: String },
  expiryDate: { type: Date } // Usually 90 days after workedDate
}, { timestamps: true });

comp_off_requestsSchema.index({ employeeId: 1, workedDate: 1 });
comp_off_requestsSchema.index({ departmentId: 1, status: 1 });

export default model('comp_off_requests', comp_off_requestsSchema);
