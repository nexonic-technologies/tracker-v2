import mongoose from 'mongoose';

const ticketactivity_logsSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'tickets',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true // e.g. created, assigned, status_changed, comment_added, etc.
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'performedByModel',
    required: true
  },
  performedByModel: {
    type: String,
    enum: ['employees', 'agents'],
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed // holds meta info like { oldStatus, newStatus, commentId, etc. }
  }
}, {
  timestamps: true
});

ticketactivity_logsSchema.index({ ticketId: 1, createdAt: -1 });

export default mongoose.model('ticket_activity_logs', ticketactivity_logsSchema);
