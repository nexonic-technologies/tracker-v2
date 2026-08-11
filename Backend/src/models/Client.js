// models/Client.js
import { Schema, model } from 'mongoose';

const ClientSchema = new Schema({
  name: { type: String, trim: true, unique: true },
  ownerName: { type: String, trim: true },
  businessType: { type: String, trim: true },
  contactInfo: [{
    name: { type: String },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String },
    designation: { type: String }
  }],
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  gstIN: { type: String, trim: true, uppercase: true, constraints: { length: 15 } },
  source: { type: String },
  leadStatus: {
    type: String,
    enum: ['New', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    default: 'New'
  },
  leadType: { type: Schema.Types.ObjectId, ref: 'lead_types' },
  referenceType: { type: Schema.Types.ObjectId, ref: 'reference_types' },
  Status: { type: String, enum: ['Active', 'Inactive'], default: 'Inactive' },
  agent: [{ type: Schema.Types.ObjectId, ref: 'agents' }],
  accountManager: { type: Schema.Types.ObjectId, ref: 'Employee' },
  projectManager: { type: Schema.Types.ObjectId, ref: 'Employee' },
  project_types: [{ type: Schema.Types.ObjectId, ref: 'project_types' }],
  proposedProducts: [{ type: Schema.Types.ObjectId, ref: 'products' }],
  milestones: [{
    milestoneId: { type: Schema.Types.ObjectId, ref: 'milestones' }, // Optional template reference
    name: { type: String, required: true }, // Client-specific name
    description: { type: String }, // Client-specific description
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Achieved', 'On Hold'],
      default: 'Pending'
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
    dueDate: { type: Date },
    completedDate: { type: Date },
    notes: { type: String }
  }]
}, { timestamps: true });

ClientSchema.index({ email: 1 });
ClientSchema.index({ accountManager: 1 });

export default model('clients', ClientSchema);