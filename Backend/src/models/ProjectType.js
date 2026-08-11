// models/ProjectType.js
import { Schema, model } from 'mongoose';

const project_typesSchema = new Schema({
  name: { type: String, trim: true, unique: true, required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true, index: true },
  estimatedHours: { type: Number, min: 0 },
  complexity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium', index: true }
}, { timestamps: true });

// Compound index for active project types
project_typesSchema.index({ isActive: 1, complexity: 1 });
project_typesSchema.index({ isActive: 1, name: 1 });

export default model('project_types', project_typesSchema);