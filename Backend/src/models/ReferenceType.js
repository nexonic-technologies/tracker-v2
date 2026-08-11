import mongoose from 'mongoose';

const reference_typesSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  Status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

reference_typesSchema.index({ name: 1 });
reference_typesSchema.index({ Status: 1 });

export default mongoose.model('reference_types', reference_typesSchema);