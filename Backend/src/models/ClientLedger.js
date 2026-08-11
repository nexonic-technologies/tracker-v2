import mongoose from 'mongoose';

const clients_ledgersSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients', required: true, index: true },
  date: { type: Date, required: true, default: Date.now },

  type: {
    type: String,
    enum: ['Credit', 'Debit'],
    required: true
  },

  amount: { type: Number, required: true, min: 0 },
  runningBalance: { type: Number, required: true },

  referenceModel: {
    type: String,
    enum: ['order_acknowledgements', 'payment_journals'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel',
    required: true
  },

  description: { type: String, trim: true },
  narration: { type: String, trim: true },

  entryBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' }
}, { timestamps: true });

clients_ledgersSchema.index({ clientId: 1, date: -1 });
clients_ledgersSchema.index({ referenceModel: 1, referenceId: 1 });

export default mongoose.model('clients_ledgers', clients_ledgersSchema);
