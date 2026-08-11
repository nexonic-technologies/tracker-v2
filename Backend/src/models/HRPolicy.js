import mongoose from 'mongoose';

const hr_policiesSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  category: {
    type: String,
    enum: ['Leave Policy', 'Code of Conduct', 'Attendance', 'Compensation', 'Benefits', 'Performance', 'General'],
    required: true
  },
  content: { type: String, required: true },
  version: { type: String, required: true, default: '1.0' },
  status: {
    type: String,
    default: 'Draft'
  },
  metaStatus: {
    type: String,
    default: 'active',
    index: true
  },
  effectiveDate: { type: Date, required: true },
  expiryDate: { type: Date },
  applicableTo: [{
    type: String,
    enum: ['All Employees', 'Management', 'HR', 'Specific Department', 'Specific Role']
  }],
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  attachments: [{
    filename: String,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  acknowledgments: [{
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    acknowledgedAt: { type: Date, default: Date.now },
    ipAddress: String
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  approvedAt: { type: Date },
  tags: [{ type: String }],
  isPublic: { type: Boolean, default: true },
  requiresAcknowledgment: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes
hr_policiesSchema.index({ category: 1, status: 1 });
hr_policiesSchema.index({ effectiveDate: -1 });
hr_policiesSchema.index({ status: 1, createdAt: -1 });
hr_policiesSchema.index({ 'acknowledgments.employeeId': 1 });
hr_policiesSchema.index({ tags: 1 });
hr_policiesSchema.index({ title: 'text', content: 'text' });

export default mongoose.model('hr_policies', hr_policiesSchema);