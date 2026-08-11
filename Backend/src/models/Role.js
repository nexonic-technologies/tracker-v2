// models/Role.js
import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // Formal super admin flag — replaces string-matching ("super admin")
  // Super admins bypass all policy checks; context builder returns all perms = true
  isSuperAdmin: { type: Boolean, default: false, index: true },
  capabilities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Capability",
  }],
  level: {
    type: Number,
    min: 1,
    max: 10,
    default: 1,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // Incremented when access_policies for this role change.
  // JWT carries this version; if JWT.permissionVersion ≠ role.permissionVersion,
  // the frontend must re-fetch /me/context. Works even without Socket.IO.
  permissionVersion: { type: Number, default: 1 },
  description: { type: String }
}, { timestamps: true });

// Compound index for active roles
roleSchema.index({ isActive: 1, level: 1 });
roleSchema.index({ isActive: 1, name: 1 });

export default mongoose.model("roles", roleSchema);