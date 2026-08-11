// models/Leave.js
import mongoose from "mongoose";

const LeaveSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true, index: true },
  employeeName: { type: String, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "departments", index: true },
  leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "leave_types", index: true },
  leaveName: { type: String },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  totalDays: { type: Number, required: true, min: 0.5 },
  reason: { type: String, maxLength: 500, minLength: 5, trim: true },
  status: { type: String, default: 'Pending', index: true },
  metaStatus: { type: String, default: 'active', index: true },
  currentStepIndex: { type: Number, default: 0 },
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'workflows', index: true },
  approvals: [{
    stepIndex: { type: Number },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
    approverType: { type: String },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Escalated'], default: 'Pending' },
    comment: { type: String },
    actionedAt: { type: Date }
  }],
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", index: true },
  managerComments: { type: String, maxLength: 500, minLength: 5, trim: true },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  document: { type: String },
  isEmergency: { type: Boolean, default: false, index: true }
}, { timestamps: true });

// Compound indexes for optimal filtering
LeaveSchema.index({ employeeId: 1, startDate: 1, endDate: 1 });
LeaveSchema.index({ employeeId: 1, status: 1, createdAt: -1 });
LeaveSchema.index({ managerId: 1, status: 1, startDate: -1 });
LeaveSchema.index({ departmentId: 1, status: 1, startDate: -1 });
LeaveSchema.index({ status: 1, startDate: -1 }); // Pending leaves by date
LeaveSchema.index({ startDate: 1, endDate: 1, status: 1 }); // Date range queries
LeaveSchema.index({ leaveTypeId: 1, status: 1 }); // Leave type analysis

export default mongoose.model("leaves", LeaveSchema);
