import mongoose from 'mongoose';

/**
 * status_configs — defines the available statuses for a given model.
 * Used by the Status Master UI to manage status labels and colors.
 */
const status_configsSchema = new mongoose.Schema({
  modelName: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  label: {
    type: String,
    required: true, // human-readable name e.g. "Task Statuses"
  },
  metaStatuses: [{
    key: { type: String, required: true },   // active, inactive, draft, archive, deleted
    label: { type: String, required: true },   // display label
    color: { type: String, default: '#6B7280' }, // hex color
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
  }],
  workflowStatuses: [{
    key: { type: String, required: true },   // internal key matching model enum
    label: { type: String, required: true },   // display label
    color: { type: String, default: '#6B7280' }, // hex color
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    isTerminal: { type: Boolean, default: false },  // true = end of this workflow cycle
    isSequential: { type: Boolean, default: true },   // true = delivery pipeline stage, false = independent stage (Meeting, Training)
  }],
}, { timestamps: true });

export default mongoose.model('status_configs', status_configsSchema);
