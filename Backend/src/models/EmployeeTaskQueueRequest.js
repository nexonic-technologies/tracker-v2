import mongoose from "mongoose";

const employee_task_queue_requestschema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "departments", index: true },
  requestedQueue: [{
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "tasks", required: true },
    order: { type: Number, required: true },
    taskName: { type: String, trim: true },
    clientName: { type: String, trim: true },
    estimatedHours: { type: Number },
    priorityLevel: { type: String }
  }],
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending", index: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", index: true },
  currentStepIndex: { type: Number, default: 0 },
  approvals: [{
    stepIndex: Number,
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: "employees" },
    status: { type: String, enum: ["Pending", "Approved", "Rejected", "Escalated"] },
    comment: String,
    actionedAt: Date,
    _id: false
  }]
}, { timestamps: true });

export default mongoose.model("employee_task_queue_requests", employee_task_queue_requestschema);
