import mongoose from 'mongoose';

export const JarvisTraceSchema = new mongoose.Schema(
  {
    traceId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    tenantSlug: { type: String, index: true },
    utterance: { type: String },
    response: { type: String },
    intent: { type: mongoose.Schema.Types.Mixed },
    executionPlan: { type: mongoose.Schema.Types.Mixed },
    toolResults: [{ type: mongoose.Schema.Types.Mixed }],
    trace: [{ type: mongoose.Schema.Types.Mixed }],
    verified: { type: Boolean, default: false },
    offlineResolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default JarvisTraceSchema;
