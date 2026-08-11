import mongoose from 'mongoose';

/**
 * JobOpening — represents an open position / job posting.
 * Flow: Draft → Published → Closed / Filled
 */
const job_openingsSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'departments' },
  designation: { type: mongoose.Schema.Types.ObjectId, ref: 'designations' },
  location: { type: String, trim: true },
  jobType: { type: String, enum: ['Full-Time', 'Part-Time', 'Contract', 'Intern'], default: 'Full-Time' },
  experienceRange: { type: String, trim: true },
  salaryRange: { type: String, trim: true },
  description: { type: String },
  requirements: { type: String },
  openings: { type: Number, default: 1, min: 1 },
  filled: { type: Number, default: 0 },
  status: { type: String, enum: ['Draft', 'Published', 'On Hold', 'Closed', 'Filled'], default: 'Draft', index: true },
  publishedAt: { type: Date },
  closedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

job_openingsSchema.index({ status: 1, department: 1 });
job_openingsSchema.index({ createdAt: -1 });

export default mongoose.model('job_openings', job_openingsSchema);
