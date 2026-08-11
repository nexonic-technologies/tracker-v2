// models/Regularization.js
import mongoose from "mongoose";

const RegularizationSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true, index: true },
  employeeName: { type: String, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "departments", index: true },
  requestType: { type: String, default: "Regularization", enum: ["Regularization"], index: true },
  requestDate: { type: Date, required: true, index: true },
  
  // Original attendance data
  originalCheckIn: { type: Date },
  originalCheckOut: { type: Date },
  
  // Requested times
  requestedCheckIn: { type: Date, required: true },
  requestedCheckOut: { type: Date, required: true },
  
  reason: { type: String, required: true, maxLength: 500, minLength: 5, trim: true },
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
  
  // Approval workflow
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", index: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees" },
  approvedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees" },
  rejectedAt: { type: Date },
  approverComment: { type: String, maxLength: 500, trim: true },
  
  // Reference to attendance record
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: "attendances", required: true },
  
  // Audit fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees" }
}, { timestamps: true });

// Compound indexes for optimal filtering
RegularizationSchema.index({ employeeId: 1, requestDate: 1 });
RegularizationSchema.index({ employeeId: 1, status: 1, createdAt: -1 });
RegularizationSchema.index({ managerId: 1, status: 1, requestDate: -1 });
RegularizationSchema.index({ departmentId: 1, status: 1, requestDate: -1 });
RegularizationSchema.index({ status: 1, requestDate: -1 }); // Pending requests by date
RegularizationSchema.index({ attendanceId: 1 }, { unique: true }); // One regularization per attendance

export default mongoose.model("regularizations", RegularizationSchema);