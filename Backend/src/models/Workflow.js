// src/models/Workflow.js
import { Schema, model } from "mongoose";

const castEmptyToNull = v => v === "" ? null : v;

const WorkflowSchema = new Schema({
  name: { type: String, required: true },
  modelName: {
    type: String,
    enum: ['leaves', 'regularizations', 'wfh_requests', 'comp_off_requests', 'assets_allocations', 'assets_incidents', 'tasks', 'tickets', 'candidates', 'onboardings', 'leads', 'deals'],
    required: true,
    index: true
  },
  triggerType: {
    type: String,
    enum: ['Approval', 'Escalation', 'Onboarding'],
    required: true,
    index: true
  },
  conditions: {
    departmentId: { type: Schema.Types.ObjectId, ref: 'departments', index: true, set: castEmptyToNull },
    priorityLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical', 'Weekly Priority'] }
  },
  steps: [{
    stepOrder: { type: Number, required: true }, // Equivalent to level or sequence order
    timeoutHours: { type: Number, default: 72 },   // Conversion target: timeoutDays -> timeoutHours
    actorType: {
      type: String,
      enum: ['Reporting Manager', 'Department Manager', 'HR', 'Specific Role', 'Specific User', 'Candidate'],
      required: true
    },
    specificRoleId: { type: Schema.Types.ObjectId, ref: 'roles', set: castEmptyToNull },
    specificUserId: { type: Schema.Types.ObjectId, ref: 'employees', set: castEmptyToNull },
    actions: [{
      type: String,
      enum: ['SendNotification', 'ChangeAssignee', 'AddFollower', 'UpdateStatus', 'VerifyDocument'],
      default: ['SendNotification']
    }],
    updateStatusTo: { type: String },
    requiredDocumentType: { type: String } // Dynamic slot e.g., 'Resume', 'Photo', 'Aadhaar'
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'employees' }
}, { timestamps: true });

// Index for routing lookups
WorkflowSchema.index({ modelName: 1, triggerType: 1, 'conditions.departmentId': 1 }, { name: "workflow_routing_idx" });

export default model('workflows', WorkflowSchema);
