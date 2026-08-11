// models/TaskType.js
import mongoose from "mongoose";

const task_typeschema = new mongoose.Schema({
  name: { type: String, trim: true, required: true, unique: true },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true, index: true },
  estimatedHours: { type: Number, min: 0 },
  category: { type: String, enum: ['Development', 'Testing', 'Design', 'Documentation', 'Meeting'], default: 'Development', index: true },
  icon: { type: String },
  color: { type: String }
}, { timestamps: true });

// Compound indexes
task_typeschema.index({ isActive: 1, category: 1 });
task_typeschema.index({ isActive: 1, name: 1 });

export default mongoose.model('task_types', task_typeschema);