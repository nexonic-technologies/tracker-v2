import mongoose from 'mongoose';

export const JarvisMemorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['PATTERN_PROCEDURE', 'REASONING_PROCEDURE', 'COMPOSITE_PROCEDURE', 'RELATIONSHIP', 'FACT', 'PREFERENCE', 'RULE'],
      required: true,
      index: true,
    },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    tags: [{ type: String, index: true }],
    confidence: { type: Number, default: 0.8 },
    status: { type: String, enum: ['active', 'deprecated', 'learned'], default: 'active' },
    hitCount: { type: Number, default: 0 },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

JarvisMemorySchema.index({ type: 1, status: 1 });

export default JarvisMemorySchema;
