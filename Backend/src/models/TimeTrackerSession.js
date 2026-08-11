import mongoose from 'mongoose';

const time_tracker_sessionSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'tasks', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'project_types', index: true },
  // Denormalized from Task.clientId at session start — avoids join for client cost reports
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients', default: null, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', required: true, index: true },

  startTime: { type: Date, required: true, default: Date.now, index: true },
  endTime: { type: Date },

  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active',
    index: true
  },

  // Total duration in seconds for this session
  duration: { type: Number, default: 0 },

  // For multiple pauses within a single high-level session
  pauses: [{
    pausedAt: { type: Date, required: true },
    resumedAt: { type: Date },
    duration: { type: Number, default: 0 } // duration of the pause
  }],

  notes: { type: String, trim: true },

  // ── Activity-Centric Work Model Fields (all nullable for backward compatibility) ──

  // What activity the employee is performing
  jobTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'job_types', default: null, index: true },
  // Denormalized from jobTypeId for fast aggregation queries
  jobCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'job_categories', default: null, index: true },

  // Production cost snapshot — frozen at session start so rate changes don't affect in-flight sessions
  costSnapshot: {
    employeeHourlyRate: { type: Number, default: 0 },
    isBillable: { type: Boolean, default: true },
    currency: { type: String, default: 'INR' }
  },

  // Computed on completion: duration(hrs) × costSnapshot.employeeHourlyRate
  productionCost: { type: Number, default: 0 },

  // Snapshot of the task's delivery stage when session began
  deliveryStageAtStart: { type: String, default: null }

}, { timestamps: true });

// Compound indexes
time_tracker_sessionSchema.index({ taskId: 1, userId: 1, status: 1 });

// Ensure a user only has one active session globally
time_tracker_sessionSchema.index({ userId: 1, status: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'active' }
});

// Activity-Centric indexes
time_tracker_sessionSchema.index({ jobTypeId: 1, userId: 1, startTime: -1 });     // Activity breakdown per employee
time_tracker_sessionSchema.index({ jobCategoryId: 1, startTime: -1 });             // Category aggregation
time_tracker_sessionSchema.index({ taskId: 1, jobTypeId: 1, status: 1 });          // Task activity breakdown
time_tracker_sessionSchema.index({ userId: 1, startTime: -1, status: 1 });         // Employee timeline (Gantt source)
time_tracker_sessionSchema.index({ 'costSnapshot.isBillable': 1, status: 1 });     // Billable vs non-billable analysis

// Client / Project cost indexes
time_tracker_sessionSchema.index({ clientId: 1, startTime: -1 });                   // Client cost by period
time_tracker_sessionSchema.index({ clientId: 1, 'costSnapshot.isBillable': 1 });    // Billable hours per client
time_tracker_sessionSchema.index({ clientId: 1, userId: 1, startTime: -1 });        // Employee contribution per client

export default mongoose.models.time_tracker_session || mongoose.model('time_tracker_session', time_tracker_sessionSchema);
