// models/AssetIncident.js
import { Schema, model } from 'mongoose';

/**
 * AssetIncident — Tracks damages, theft, loss, or negligence related to assets.
 * Integrates with Approval Workflow for salary recovery validation.
 */
const assets_incidentschema = new Schema({
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

  allocationId: {
    type: Schema.Types.ObjectId,
    ref: 'assets_allocations',
    index: true
  },

  incidentType: {
    type: String,
    enum: ['Damage', 'Theft', 'Loss', 'Negligence'],
    required: true,
    index: true
  },

  incidentDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  description: {
    type: String,
    required: true,
    trim: true,
    maxLength: 1000
  },

  estimatedRepairCost: {
    type: Number,
    min: 0,
    default: 0
  },

  recoveryAmount: {
    type: Number,
    min: 0,
    default: 0
  },

  recoveryApproved: {
    type: Boolean,
    default: false
  },

  recoveryDeductedInPayroll: {
    type: Boolean,
    default: false
  },

  recoveryPayrollId: {
    type: Schema.Types.ObjectId,
    ref: 'payrolls',
    default: null
  },

  status: {
    type: String,
    enum: ['Reported', 'Under Investigation', 'Approved', 'Rejected', 'Closed'],
    default: 'Reported',
    index: true
  },

  metaStatus: {
    type: String,
    default: 'active',
    index: true
  },

  // ── Approval Workflow (mirrors Leave/Allocation pattern) ─────────────────

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

  rejectedAt: {
    type: Date
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
assets_incidentschema.index({ assetId: 1, status: 1 });
assets_incidentschema.index({ employeeId: 1, status: 1, createdAt: -1 });
assets_incidentschema.index({ managerId: 1, status: 1, createdAt: -1 });

export default model('assets_incidents', assets_incidentschema);
