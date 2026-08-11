// src/Models/SideBar.js
import mongoose from "mongoose";

const IconSchema = new mongoose.Schema({
  iconName: { type: String },
  iconPackage: { type: String }
}, { _id: false });

const SideBarSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  icon: IconSchema,

  mainRoute: {
    type: String,
    trim: true
  },

  visibility: {
    type: String,
    enum: ["public", "protected"],
    default: "protected",
    index: true
  },

  capabilities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Capability',
    default: []
  }],

  // Associated Module reference & key
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    default: null,
    index: true
  },
  moduleKey: {
    type: String,
    trim: true,
    lowercase: true,
    default: 'core',
    index: true
  },

  // Parent-child structure
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'sidebars', default: null },
  hasChildren: { type: Boolean, default: false },
  isParent: { type: Boolean, default: false },

  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },

}, { timestamps: true });

// Compound index for active+sorting queries
SideBarSchema.index({ isActive: 1, order: 1 });
SideBarSchema.index({ parentId: 1, order: 1 });
SideBarSchema.index({ isParent: 1, hasChildren: 1 });
SideBarSchema.index({ moduleId: 1, isActive: 1 });
SideBarSchema.index({ moduleKey: 1, isActive: 1 });

export default mongoose.model("sidebars", SideBarSchema);
