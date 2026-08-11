import mongoose from 'mongoose';

const ticketAssignmentSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'tickets',
    required: true,
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees', // Can only assign to internal employees
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'assignedByModel',
    required: true
  },
  assignedByModel: {
    type: String,
    enum: ['employees', 'agents'],
    required: true
  }
}, {
  timestamps: true
});

ticketAssignmentSchema.index({ ticketId: 1, createdAt: -1 });

export default mongoose.model('ticket_assignments', ticketAssignmentSchema);
