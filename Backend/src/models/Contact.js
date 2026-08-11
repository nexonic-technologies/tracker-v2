import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  companyName: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  designation: { type: String, trim: true },
  source: { type: String, trim: true },
  leadTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'lead_types' },
  referenceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'reference_types' },
  notes: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', index: true },
  contactedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', index: true },
  contactedAt: { type: Date },
  contactHistory: [{
    contactedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
    contactedAt: { type: Date, default: Date.now },
    method: { type: String, enum: ['Call', 'Email', 'Meeting', 'WhatsApp', 'Other'] },
    notes: { type: String },
    outcome: { type: String, enum: ['Interested', 'Not Interested', 'Follow Up', 'No Response', 'Converted'] }
  }],
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'],
    default: 'New',
    index: true
  },
  metaStatus: {
    type: String,
    default: 'active',
    index: true
  },
  convertedClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients' },
  tags: [{ type: String }]
}, { timestamps: true });

ContactSchema.index({ email: 1 });
ContactSchema.index({ companyName: 1 });
ContactSchema.index({ status: 1, assignedTo: 1 });

export default mongoose.model('contacts', ContactSchema);
