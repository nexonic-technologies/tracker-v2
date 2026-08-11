// models/WFHRequest.js
import { Schema, model } from 'mongoose';

const wfh_requestschema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'employees', required: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'departments', index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], default: 'Pending', index: true },
  managerId: { type: Schema.Types.ObjectId, ref: 'employees' },
  approverComment: { type: String },
  currentStepIndex: { type: Number, default: 0 },
  workflowId: { type: Schema.Types.ObjectId, ref: 'workflows', index: true },
  approvals: [{
    stepIndex: { type: Number },
    approverId: { type: Schema.Types.ObjectId, ref: 'employees' },
    approverType: { type: String },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Escalated'], default: 'Pending' },
    comment: { type: String },
    actionedAt: { type: Date }
  }],
  approvedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  approvedAt: { type: Date },
  rejectedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  rejectedAt: { type: Date }
}, { timestamps: true });

wfh_requestschema.index({ employeeId: 1, startDate: 1, endDate: 1 });
wfh_requestschema.index({ departmentId: 1, status: 1 });

export default model('wfh_requests', wfh_requestschema);
