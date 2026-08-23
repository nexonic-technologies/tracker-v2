import mongoose from 'mongoose';

export const JarvisTokenSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    canonical: { type: String, required: true, index: true },
    aliases: [{ type: String, index: true }],
    type: {
      type: String,
      enum: ['concept', 'action', 'entity', 'technical_term', 'modifier', 'procedure', 'unknown'],
      default: 'concept',
    },
    status: {
      type: String,
      enum: ['active', 'provisional', 'merged', 'deprecated'],
      default: 'active',
    },
    aliasOf: { type: Number, default: null },
    confidence: { type: Number, default: 1.0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

export default JarvisTokenSchema;
