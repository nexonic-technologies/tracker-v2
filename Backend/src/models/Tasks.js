// models/Tasks.js
import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "clients", required: true, index: true },
  projectTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "project_types", required: true, index: true },
  taskTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "task_types", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees", index: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "employees", index: true }],

  // Ticket synchronization fields
  linkedTicketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
  isFromTicket: { type: Boolean, default: false },

  // Milestone fields (optional)
  milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "milestones", index: true },
  milestoneStatus: {
    type: String,
    enum: ["Pending", "In Progress", "Completed", "On Hold"],
    default: "Pending",
    index: true
  },

  title: { type: String, trim: true, required: true },
  referenceUrl: { type: String },
  userStory: { type: String },
  observation: { type: String },
  impacts: { type: String },
  acceptanceCreteria: { type: String },

  attachments: [{ type: String, default: null }],
  commentsThread: { type: mongoose.Schema.Types.ObjectId, ref: "comments_threads" },

  startDate: { type: Date, index: true },
  endDate: { type: Date, index: true },

  priorityLevel: {
    type: String,
    enum: ["Low", "Medium", "High", "Weekly Priority"],
    default: "Low",
    index: true
  },

  tags: [{ type: String }],

  status: {
    type: String,
    default: "Backlogs",
    index: true
  },

  metaStatus: {
    type: String,
    default: 'active',
    index: true
  },

  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "employees", default: [] }],

  // Dependencies
  blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "tasks", default: [] }],
  blocking: [{ type: mongoose.Schema.Types.ObjectId, ref: "tasks", default: [] }],

  estimatedHours: { type: Number, min: 0 },
  actualHours: { type: Number, min: 0 },
  complexity: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: null,
    index: true
  },
  progress: { type: Number, min: 0, max: 100, default: 0 },

  sprintId: { type: mongoose.Schema.Types.ObjectId, ref: "sprints", default: null, index: true },
  sprintHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "sprints", default: [] }],

  // Stage duration tracking
  stageHistory: [{
    stage: String,              // 'backlog', 'assigned', 'in_progress', 'review', 'done'
    enteredAt: { type: Date, default: Date.now },
    duration: { type: Number, default: 0 }, // Seconds
    _id: false
  }],

  // ── Activity-Centric Work Model Fields ──

  // Delivery maturity stage — set by sequential job types or manually by managers
  // "Development", "QAT", "Review", "Deployment", "Delivery"
  // null = not assigned yet (backward compatible)
  deliveryStage: { type: String, default: null, index: true },

  // Denormalized: which time_tracker_session is currently active on this task
  // Enables real-time "who is working on this" without query
  // null = no one actively working
  activeJobSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'time_tracker_session', default: null }
}, { timestamps: true });

// Text search index
TaskSchema.index({ title: 'text', userStory: 'text' });

// Compound indexes for performance optimization
TaskSchema.index({ clientId: 1, status: 1, createdAt: -1 }); // Client view filtering
TaskSchema.index({ assignedTo: 1, status: 1, priorityLevel: 1 }); // Employee task filtering
TaskSchema.index({ createdBy: 1, status: 1, createdAt: -1 }); // Creator filtering
TaskSchema.index({ status: 1, priorityLevel: 1, endDate: 1 }); // Status + priority + deadline
TaskSchema.index({ clientId: 1, projectTypeId: 1, status: 1 }); // Project filtering
TaskSchema.index({ assignedTo: 1, endDate: 1 }); // Deadline tracking
TaskSchema.index({ followers: 1, updatedAt: -1 }); // Follower notifications
TaskSchema.index({ startDate: 1, endDate: 1 }); // Date range queries
TaskSchema.index({ linkedTicketId: 1 }); // Ticket synchronization
TaskSchema.index({ isFromTicket: 1 }); // Ticket-derived tasks
TaskSchema.index({ milestoneId: 1, milestoneStatus: 1 }); // Milestone tracking
TaskSchema.index({ deliveryStage: 1, status: 1 });          // Delivery stage filtering
TaskSchema.index({ activeJobSessionId: 1 });                 // Active work lookup

export default mongoose.model("tasks", TaskSchema);
