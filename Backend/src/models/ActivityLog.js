import mongoose from "mongoose";

const activity_logsSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'tasks', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'project_types', index: true },
  action: {
    type: String,
    enum: ['CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'COMMENTED', 'TIME_LOGGED', 'SLA_BREACH', 'FOLLOWER_ADDED'],
    index: true
  },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  details: {
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    comment: String,
    mentionedUsers: [mongoose.Schema.Types.ObjectId],
    timeLogged: Number // minutes
  },
  timestamp: { type: Date, default: Date.now },
  metadata: {
    ipAddress: String,
    userAgent: String
  }
});

// Compound indexes for common queries
activity_logsSchema.index({ taskId: 1, timestamp: -1 });
activity_logsSchema.index({ projectId: 1, timestamp: -1 });
activity_logsSchema.index({ performedBy: 1, timestamp: -1 });
activity_logsSchema.index({ action: 1, timestamp: -1 });

// TTL index: keep activity for 2 years
activity_logsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

export default mongoose.models.ActivityLog || mongoose.model("activity_logs", activity_logsSchema);
