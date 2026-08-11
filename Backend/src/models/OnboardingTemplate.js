import mongoose from 'mongoose';

/**
 * OnboardingTemplate — Configurable checklist template for new hires.
 * Resolves by department, designation, and employmentType.
 */
const templateItemSchema = new mongoose.Schema({
  task: { type: String, required: true },
  category: { type: String, enum: ['Documents', 'IT Setup', 'HR Formalities', 'Training', 'Asset Allocation', 'Other'], default: 'Other' },
  documentType: { type: String },
  isRequired: { type: Boolean, default: true },
  relativeDueDays: { type: Number, default: 0 } // e.g. -3 (3 days before joining), 0 (joining day), +2 (2 days after)
}, { _id: true });

const onboarding_templatesSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'departments', index: true },
  designation: { type: mongoose.Schema.Types.ObjectId, ref: 'designations', index: true },
  employmentType: { type: String, enum: ['Full-Time', 'Contract', 'Intern', 'All'], default: 'All', index: true },

  checklist: [templateItemSchema],

  isActive: { type: Boolean, default: true, index: true },
  isDefault: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' }
}, { timestamps: true });

onboarding_templatesSchema.index({ department: 1, designation: 1, employmentType: 1, isActive: 1 });

export default mongoose.model('onboarding_templates', onboarding_templatesSchema);
