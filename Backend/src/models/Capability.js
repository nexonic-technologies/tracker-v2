// models/Capability.js
// Defines UI capability vocabulary for frontend visibility decisions
// This does NOT replace access_policies - it only controls UI display

import mongoose from "mongoose";

const CapabilitySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  action: {
    type: String,
    trim: true,
    index: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'deprecated'],
    default: 'active'
  },
  type: {
    type: String,
    enum: ['ui', 'business'],
    default: 'ui',
    index: true
  }
}, {
  timestamps: true,
  collection: 'capabilities'
});

// Indexes for fast capability lookup
CapabilitySchema.index({ module: 1, status: 1 });
CapabilitySchema.index({ status: 1 });

export default mongoose.model("Capability", CapabilitySchema);
