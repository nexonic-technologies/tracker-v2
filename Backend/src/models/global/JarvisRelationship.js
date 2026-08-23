import mongoose from 'mongoose';

export const JarvisRelationshipSchema = new mongoose.Schema(
  {
    from: { type: Number, required: true, index: true },
    relation: { type: String, required: true, index: true },
    to: { type: Number, required: true, index: true },
    confidence: { type: Number, default: 1.0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

JarvisRelationshipSchema.index({ from: 1, relation: 1, to: 1 }, { unique: true });

export default JarvisRelationshipSchema;
