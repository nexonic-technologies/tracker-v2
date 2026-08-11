// models/AssetCategory.js
import { Schema, model } from 'mongoose';

/**
 * AssetCategory — Master lookup table for asset types.
 * Pattern: isActive boolean only (no status/metaStatus workflow).
 * Matches: roles, leave_types, designations.
 */
const AssetCategorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
    // Examples: LAP, MOB, VEH, IDC, SWL
  },
  description: {
    type: String,
    trim: true
  },
  // Phase 5 placeholder — depreciation engine. Field exists now, unused until then.
  depreciationRate: {
    type: Number,
    min: 0,
    max: 100,
    default: null  // % per year (Straight-Line or WDV — engine decision in Phase 5)
  },
  // Default warranty period for assets in this category (in months).
  warrantyMonths: {
    type: Number,
    min: 0,
    default: null  // null = no default warranty defined for category
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    required: true
  }
}, { timestamps: true });

// Compound indexes
AssetCategorySchema.index({ name: 1, isActive: 1 });
AssetCategorySchema.index({ isActive: 1, createdAt: -1 });

export default model('assets_categories', AssetCategorySchema);
