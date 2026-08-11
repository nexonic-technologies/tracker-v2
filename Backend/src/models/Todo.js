// models/Todo.js
import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "employees",
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  completed: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  },
  dueDate: {
    type: Date,
    index: true
  },
  category: {
    type: String,
    enum: ['personal', 'work', 'meeting', 'deadline'],
    default: 'work',
    index: true
  }
}, {
  timestamps: true
});

// Text search index
todoSchema.index({ text: 'text' });

// Compound indexes for performance
todoSchema.index({ employee: 1, completed: 1, createdAt: -1 });
todoSchema.index({ employee: 1, priority: 1, dueDate: 1 });
todoSchema.index({ employee: 1, category: 1, completed: 1 });
todoSchema.index({ dueDate: 1, completed: 1 }); // Overdue tasks

export default mongoose.model("todos", todoSchema);