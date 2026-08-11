import mongoose from 'mongoose';

const lead_typesSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  Status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

lead_typesSchema.index({ name: 1 });
lead_typesSchema.index({ Status: 1 });

export default mongoose.model('lead_types', lead_typesSchema);