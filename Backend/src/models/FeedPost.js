import { Schema, model } from 'mongoose';

const ReactionSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'employees', required: true },
  reactionType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const ViewedBySchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'employees', required: true },
  viewedAt: { type: Date, default: Date.now }
}, { _id: false });

const feed_postsSchema = new Schema({
  author: { type: Schema.Types.ObjectId, refPath: 'authorModel', required: true, index: true },
  authorModel: { type: String, enum: ['employees', 'agents'], default: 'employees' },
  postType: { type: String, enum: ['Update', 'Announcement', 'Question', 'General', 'Poll'], default: 'General', index: true },
  subject: { type: String }, // Subject/Title
  content: { type: String, required: true }, // Rich text enabled from frontend
  attachments: [{ type: String }],
  group: { type: Schema.Types.ObjectId, ref: 'feed_groups', index: true },
  channel: { type: Schema.Types.ObjectId, ref: 'feed_channels', index: true },
  channels: [{ type: Schema.Types.ObjectId, ref: 'feed_channels', index: true }],
  isBroadcast: { type: Boolean, default: false, index: true },
  pollOptions: [{
    optionText: { type: String, required: true },
    votes: [{ type: Schema.Types.ObjectId, refPath: 'voterModel' }]
  }],
  voterModel: { type: String, enum: ['employees', 'agents'], default: 'employees' },
  mentions: [{ type: Schema.Types.ObjectId, ref: 'employees' }],
  reactions: [ReactionSchema],
  commentsCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  viewedBy: [ViewedBySchema],
  pinnedBy: [{ type: Schema.Types.ObjectId, ref: 'employees' }],
  bookmarkedBy: [{ type: Schema.Types.ObjectId, ref: 'employees' }],
  followers: [{ type: Schema.Types.ObjectId, ref: 'employees' }],
  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  expiryDate: { type: Date },
  isDraft: { type: Boolean, default: false, index: true }
}, { timestamps: true });

// Optimizing queries for sorting and filtering
feed_postsSchema.index({ createdAt: -1 });

export default model('feed_posts', feed_postsSchema);
