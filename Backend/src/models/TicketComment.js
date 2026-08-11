import mongoose from 'mongoose';

const ticketCommentSchema = new mongoose.Schema({
  ticketId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'tickets', 
    required: true,
    index: true 
  },
  commentedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'commenterModel', 
    required: true 
  },
  commenterModel: { 
    type: String, 
    enum: ['employees', 'agents'], 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  isPublic: { 
    type: Boolean, 
    default: true // true = public client-facing, false = internal notes
  },
  edited: { 
    type: Boolean, 
    default: false 
  },
  editedAt: { 
    type: Date 
  },
  attachments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ticket_attachments' 
  }]
}, {
  timestamps: true
});

// Index for sorting comments sequentially by ticket
ticketCommentSchema.index({ ticketId: 1, createdAt: 1 });

export default mongoose.model('ticket_comments', ticketCommentSchema);
