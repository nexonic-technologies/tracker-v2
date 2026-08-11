// models/JobCategory.js
import mongoose from 'mongoose';

/**
 * JobCategory — Top-level grouping of work activities.
 * Managed by admin. Rarely changes.
 * 
 * Examples: Development, Testing, Meetings, Support, Management, Training
 * 
 * Part of the Activity-Centric Work Model:
 *   JobCategory (master) → JobType (master) → time_tracker_session (records)
 */
const JobCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: { type: String, trim: true },
  icon: { type: String, default: '📁' },          // Emoji or icon class
  color: { type: String, default: '#6B7280' },     // Hex color for UI chips
  order: { type: Number, default: 0 },             // Display order
  isBillable: { type: Boolean, default: true },    // Default billability for child job types
  isActive: { type: Boolean, default: true },
  metaStatus: { type: String, default: 'active', index: true }
}, { timestamps: true });

// Indexes
JobCategorySchema.index({ isActive: 1, order: 1 });

export default mongoose.model('job_categories', JobCategorySchema);
