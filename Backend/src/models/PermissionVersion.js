// models/PermissionVersion.js
// Cache invalidation version per user for UI capabilities
// This does NOT replace access_policies - it only controls UI display

import mongoose from "mongoose";

const PermissionVersionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees',
    required: true,
    unique: true
  },
  version: {
    type: Number,
    required: true,
    default: 1
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'permissionversions'
});


export default mongoose.model("PermissionVersion", PermissionVersionSchema);
