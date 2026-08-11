import mongoose from 'mongoose';

const ticketCommentReadSchema = new mongoose.Schema({
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ticket_comments',
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
  readAt: {
    type: Date,
    default: Date.now
  }
});

// Composite index to check if a specific user has read a specific comment
ticketCommentReadSchema.index({ commentId: 1, userId: 1 }, { unique: true });

export default mongoose.model('ticket_comment_reads', ticketCommentReadSchema);
