import mongoose from 'mongoose';

const JarvisMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    offlineResolved: {
      type: Boolean,
      default: false,
    },
    intent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    actionPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const JarvisChatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserLogin',
      index: true,
    },
    employeeId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: 'New Chat Session',
    },
    messages: [JarvisMessageSchema],
    discourseState: {
      focalEntities: [
        {
          id: Number,
          canonical: String,
          type: String,
          lastMentionedAt: { type: Date, default: Date.now },
        },
      ],
      lastPredicate: {
        type: String,
        default: null,
      },
      turnCount: {
        type: Number,
        default: 0,
      },
    },
    metaStatus: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'jarvis_chat_sessions',
  }
);

// Indexes for high-performance multi-tenant listing
JarvisChatSessionSchema.index({ user: 1, metaStatus: 1, updatedAt: -1 });
JarvisChatSessionSchema.index({ employeeId: 1, metaStatus: 1, updatedAt: -1 });

export const JarvisChatSession = mongoose.model('JarvisChatSession', JarvisChatSessionSchema);
export default JarvisChatSession;
