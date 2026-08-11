// models/permission_audit.js
// Audit trail for UI permission changes
// This does NOT replace access_policies - it only tracks UI capability changes

import mongoose from "mongoose";

const permission_auditSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees',
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees'
  },
  change: {
    type: String,
    required: true,
    trim: true
  },
  reason: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
});

// Indexes for audit log queries
permission_auditSchema.index({ actor: 1, timestamp: -1 });
permission_auditSchema.index({ targetUser: 1, timestamp: -1 });
permission_auditSchema.index({ timestamp: -1 });

export default mongoose.model("permission_audit", permission_auditSchema);
