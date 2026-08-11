import mongoose from 'mongoose';

const ticketParticipantSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'tickets',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: true,
    index: true
  },
  userModel: {
    type: String,
    enum: ['employees', 'agents'],
    required: true
  },
  role: {
    type: String,
    enum: ['creator', 'assignee', 'watcher', 'manager'],
    default: 'watcher'
  }
}, {
  timestamps: true
});

// Avoid duplicate participants per ticket
ticketParticipantSchema.index({ ticketId: 1, userId: 1 }, { unique: true });

export default mongoose.model('ticket_participants', ticketParticipantSchema);
