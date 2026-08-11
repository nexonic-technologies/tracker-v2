import mongoose from 'mongoose';

const ticketStatusHistorySchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'tickets',
    required: true
  },
  fromStatus: {
    type: String
  },
  toStatus: {
    type: String,
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'changedByModel',
    required: true
  },
  changedByModel: {
    type: String,
    enum: ['employees', 'agents'],
    required: true
  },
  durationSeconds: {
    type: Number // Time in seconds spent in fromStatus before transitioning
  }
}, {
  timestamps: true
});

ticketStatusHistorySchema.index({ ticketId: 1, createdAt: -1 });

export default mongoose.model('ticket_status_history', ticketStatusHistorySchema);
