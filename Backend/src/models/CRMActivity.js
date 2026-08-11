import mongoose from 'mongoose';

const CRMActivitySchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients', required: true, index: true },
  type: {
    type: String,
    enum: ['Call', 'Meeting', 'Email', 'Note', 'Task', 'System', 'Other'],
    required: true,
    default: 'Note'
  },
  content: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', index: true },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Map, of: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

CRMActivitySchema.index({ clientId: 1, timestamp: -1 });

export default mongoose.model('crm_activities', CRMActivitySchema);
