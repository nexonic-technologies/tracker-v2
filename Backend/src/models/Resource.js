// src/models/Resource.js
//
// Canonical registry of all business resources.
// Decouples permission keys from Mongoose model names.
//
// SideBar.resourceId   → references Resource._id
// access_policies.modelName → matches Resource.modelName (policy engine)
// Frontend can("update", "leave") → uses Resource.key
//
// If a Mongoose model is renamed (e.g., "leaves" → "leaveRequests"),
// update Resource.modelName ONCE. Everything else stays the same.

import mongoose from "mongoose";

const ResourceSchema = new mongoose.Schema({
  // Stable business-facing identifier. Used in frontend can() calls.
  // NEVER changes once set. e.g., "leave", "ticket", "employee", "dashboard"
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },

  // Maps to the Mongoose model name in Collection.js.
  // Can change if models are renamed — only update here.
  modelName: {
    type: String,
    trim: true,
    default: null
  },

  // Human-readable name for admin UI display
  displayName: {
    type: String,
    required: true,
    trim: true
  },

  // Optional grouping for admin UI (e.g., "hr", "assets", "tickets", "settings")
  module: {
    type: String,
    trim: true,
    lowercase: true,
    default: "general"
  },

  // Description for admin reference
  description: { type: String, default: "" },

  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

ResourceSchema.index({ module: 1, isActive: 1 });
ResourceSchema.index({ modelName: 1 }, { sparse: true });

export default mongoose.model("resources", ResourceSchema);
