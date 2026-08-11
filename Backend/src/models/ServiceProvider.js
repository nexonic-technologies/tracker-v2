import mongoose from 'mongoose';

const ServiceProviderSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  gstIN: { type: String, trim: true, uppercase: true },
  panNumber: { type: String, trim: true, uppercase: true },
  bankDetails: {
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
    branch: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true }
  },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'project_types' }],
  Status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true }
}, { timestamps: true });

ServiceProviderSchema.index({ 'services': 1 });

export default mongoose.model('serviceproviders', ServiceProviderSchema);
