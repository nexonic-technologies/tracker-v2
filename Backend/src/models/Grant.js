// models/Grant.js
// Maps designations/roles to UI capabilities for frontend visibility
// This does NOT replace access_policies - it only controls UI display

import mongoose from "mongoose";

const GrantSchema = new mongoose.Schema({
  granteeType: {
    type: String,
    enum: ['designation', 'role', 'designation_role'],
    required: true
  },
  designationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'designations',
    required: function () {
      return this.granteeType === 'designation' || this.granteeType === 'designation_role';
    }
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'roles',
    required: function () {
      return this.granteeType === 'role' || this.granteeType === 'designation_role';
    }
  },
  capabilityKey: {
    type: String,
    required: true,
    trim: true
  },
  effect: {
    type: String,
    enum: ['allow', 'deny'],
    required: true
  }
}, {
  timestamps: true,
  collection: 'grants'
});

// Compound indexes for efficient grant resolution
GrantSchema.index({ granteeType: 1, designationId: 1, capabilityKey: 1 });
GrantSchema.index({ granteeType: 1, roleId: 1, capabilityKey: 1 });
GrantSchema.index({ capabilityKey: 1, effect: 1 });
GrantSchema.index({ designationId: 1, roleId: 1 });

export default mongoose.model("Grant", GrantSchema);
