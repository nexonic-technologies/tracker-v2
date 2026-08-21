import mongoose, { Schema } from 'mongoose';

const AttachmentSchema = new Schema(
  {
    type: { type: String, enum: ['image', 'file', 'video', 'audio'], default: 'file' },
    name: { type: String, default: 'Attachment' },
    url: { type: String, default: '' },
    size: { type: Number },
    thumbnail: { type: String },
    duration: { type: Number }, // Duration in seconds for audio/voice notes
    filename: { type: String },
    path: { type: String },
    mimetype: { type: String },
    originalName: { type: String },
  },
  { _id: false }
);

const ReactionSchema = new Schema(
  {
    emoji: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'employees', required: true },
  },
  { timestamps: true }
);

const team_messageschema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'employees', required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'employees', required: true, index: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'voice', 'system'],
      default: 'text',
      index: true,
    },
    attachments: [AttachmentSchema],
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
      index: true,
    },
    sentAt: { type: Date, default: Date.now, index: true },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    reactions: [ReactionSchema],
    replyTo: { type: Schema.Types.ObjectId, ref: 'team_messages' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Indexes for fast history queries and unread counting
team_messageschema.index({ conversationId: 1, createdAt: -1 });
team_messageschema.index({ recipient: 1, status: 1 });
team_messageschema.index({ sender: 1, recipient: 1 });

const TeamMessage =
  mongoose.models.TeamMessage ||
  mongoose.model('team_messages', team_messageschema);

export default TeamMessage;
