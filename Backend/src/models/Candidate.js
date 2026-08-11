import mongoose from 'mongoose';

/**
 * Candidate — an applicant in the recruitment pipeline.
 * Flow: Applied → Screening → Interview → Offered → Hired / Rejected
 */
const candidateSchema = new mongoose.Schema({
  // Personal
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  linkedinUrl: { type: String, trim: true },
  resumeUrl: { type: String },

  // Personal Info (Optional at application time)
  dob: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
  fatherName: { type: String, trim: true },
  motherName: { type: String, trim: true },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    country: { type: String, trim: true }
  },

  // Application context
  applicationId: { type: String, unique: true, sparse: true, trim: true, index: true },
  jobOpeningId: { type: mongoose.Schema.Types.ObjectId, ref: 'job_openings', required: true, index: true },
  source: { type: String, enum: ['Career Page', 'Referral', 'LinkedIn', 'Job Portal', 'Direct', 'Other'], default: 'Direct' },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },

  // Pipeline stage
  stage: { type: String, enum: ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected', 'Withdrawn'], default: 'Applied', index: true },
  stageHistory: [{
    stage: { type: String },
    movedAt: { type: Date, default: Date.now },
    movedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
    note: { type: String }
  }],

  // Interview
  interviewDate: { type: Date },
  interviewTime: { type: String },
  interviewType: { type: String, enum: ['In-Person', 'Video Call', 'Phone', 'Written Test'], default: 'In-Person' },
  interviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'employees' }],
  interviewNotes: { type: String },
  interviewRating: { type: Number, min: 1, max: 5 },

  // Offer
  offeredSalary: { type: Number },
  offerLetterUrl: { type: String },
  offerExpiryDate: { type: Date },
  joiningDate: { type: Date },

  // Rejection
  rejectionReason: { type: String },
  rejectionMailSent: { type: Boolean, default: false },

  // Linking
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' }, // set after Hired→Onboarded

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

candidateSchema.index({ jobOpeningId: 1, stage: 1 });
candidateSchema.index({ email: 1 });
candidateSchema.index({ stage: 1, createdAt: -1 });

export default mongoose.model('candidates', candidateSchema);
