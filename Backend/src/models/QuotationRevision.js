import mongoose from 'mongoose';

const quotation_revisionsSchema = new mongoose.Schema({
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'quotations', required: true, index: true },
  revisionNumber: { type: Number, required: true },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  changeReason: { type: String, trim: true }
}, { timestamps: true });

quotation_revisionsSchema.index({ quotationId: 1, revisionNumber: 1 });

export default mongoose.model('quotation_revisions', quotation_revisionsSchema);
