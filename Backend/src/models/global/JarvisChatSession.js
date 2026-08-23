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

export const JarvisChatSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      index: true,
    },
    tenantSlug: {
      type: String,
      default: 'admin',
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: 'New Chat Session',
    },
    messages: [JarvisMessageSchema],
    discourseState: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        focalEntities: [],
        lastPredicate: null,
        turnCount: 0,
      }),
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
    minimize: false,
  }
);

JarvisChatSessionSchema.index({ userId: 1, metaStatus: 1, updatedAt: -1 });
JarvisChatSessionSchema.index({ tenantSlug: 1, userId: 1, metaStatus: 1 });
JarvisChatSessionSchema.index({ sessionId: 1 });

export default JarvisChatSessionSchema;
