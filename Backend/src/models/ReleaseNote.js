// src/models/ReleaseNote.js
import { Schema, model } from 'mongoose';

const ReleaseNoteSchema = new Schema(
  {
    version: { type: String, required: true, index: true },
    releaseDate: { type: Date, default: Date.now },
    title: { type: String, required: true },
    tagline: { type: String, default: '' },
    type: { type: String, default: 'Feature & Maintenance Release' },
    isLatest: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    categories: {
      features: [{ type: String }],
      improvements: [{ type: String }],
      security: [{ type: String }],
      fixes: [{ type: String }],
    },
    seenBy: [
      {
        employeeId: { type: Schema.Types.ObjectId, ref: 'employees' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'employees' },
    metaStatus: { type: String, default: 'active', index: true },
  },
  { timestamps: true }
);

ReleaseNoteSchema.index({ version: 1 });
ReleaseNoteSchema.index({ isPublished: 1, isLatest: 1 });
ReleaseNoteSchema.index({ 'seenBy.employeeId': 1 });

export default model('release_notes', ReleaseNoteSchema);
