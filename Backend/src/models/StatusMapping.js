import mongoose from 'mongoose';

/**
 * status_mapping — defines how statuses of one model map to statuses of another.
 * When sourceModel record is updated, the engine applies mappings to linked targetModel records.
 */
const status_mappingSchema = new mongoose.Schema({
  sourceModel: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  targetModel: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  // Field on the sourceModel document that holds the target document's _id
  linkField: {
    type: String,
    default: 'linkedTicketId', // e.g. tasks.linkedTicketId
  },
  // Field on the targetModel document that holds the source document's _id (reverse lookup)
  reverseLinkField: {
    type: String,
    default: 'linkedTaskId',  // e.g. tickets.linkedTaskId
  },
  mappings: [{
    sourceStatus: { type: String, required: true },
    targetStatus: { type: String, required: true },
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, { timestamps: true });

status_mappingSchema.index({ sourceModel: 1, targetModel: 1 }, { unique: true });

export default mongoose.model('status_mapping', status_mappingSchema);
