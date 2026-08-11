// models/AssetAllocation.js
import { Schema, model } from 'mongoose';

/**
 * AssetAllocation — Manages the lifecycle of an asset assigned to an employee.
 * Includes workflows for Allocation, Return, and Transfer requests.
 */
const assets_allocationsSchema = new Schema({
  assetId: {
    type: Schema.Types.ObjectId,
    ref: 'assets',
    required: true,
    index: true
  },

  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    required: true,
    index: true
  },

  departmentId: {
    type: Schema.Types.ObjectId,
    ref: 'departments',
    index: true
  },

  // ── Allocation Details ───────────────────────────────────────────────────────

  allocationType: {
    type: String,
    enum: ['Allocation', 'Transfer', 'Temporary'],
    default: 'Allocation',
    required: true
  },

  allocationDate: {
    type: Date,
    default: Date.now,
    required: true
  },

  expectedReturn: {
    type: Date
  },

  actualReturn: {
    type: Date
  },

  // ── Return Details ───────────────────────────────────────────────────────────

  returnedCondition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Lost']
  },

  returnNotes: {
    type: String,
    maxLength: 500,
    trim: true
  },

  // ── Status ───────────────────────────────────────────────────────────────────

  status: {
    type: String,
    enum: ['Pending Approval', 'Active', 'Returned', 'Transferred', 'Rejected'],
    default: 'Pending Approval',
    index: true
  },

  metaStatus: {
    type: String,
    default: 'active',
    index: true
  },

  // ── Approval Workflow (mirrors Leave/Regularization pattern) ─────────────────

  currentStepIndex: {
    type: Number,
    default: 0
  },

  workflowId: {
    type: Schema.Types.ObjectId,
    ref: 'workflows',
    index: true
  },

  approvals: [{
    stepIndex: { type: Number },
    approverId: { type: Schema.Types.ObjectId, ref: 'employees' },
    approverType: { type: String },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Escalated'], default: 'Pending' },
    comment: { type: String },
    actionedAt: { type: Date }
  }],

  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    index: true
  },

  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'employees'
  },

  approvedAt: {
    type: Date
  },

  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'employees'
  },

  rejectedAt: {
    type: Date
  },

  remarks: {
    type: String,
    maxLength: 500,
    trim: true
  },

  // ── Transfer Details ─────────────────────────────────────────────────────────

  transferFromEmployee: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    index: true
  },

  transferToEmployee: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    index: true
  },

  transferReason: {
    type: String,
    maxLength: 500,
    trim: true
  },

  // ── Metadata ─────────────────────────────────────────────────────────────────

  notes: {
    type: String,
    maxLength: 500,
    trim: true
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    required: true
  }
}, { timestamps: true });

// ── Compound Indexes for Fast Lookups ─────────────────────────────────────────
assets_allocationsSchema.index({ assetId: 1, status: 1 });
assets_allocationsSchema.index({ employeeId: 1, status: 1, createdAt: -1 });
assets_allocationsSchema.index({ managerId: 1, status: 1, createdAt: -1 });
assets_allocationsSchema.index({ expectedReturn: 1, status: 1 });

export default model('assets_allocations', assets_allocationsSchema);
