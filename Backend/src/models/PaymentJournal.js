import mongoose from 'mongoose';

const payment_journalsSchema = new mongoose.Schema({
  receiptNumber: { type: String, unique: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients', required: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order_acknowledgements', index: true },

  amount: { type: Number, required: true, min: 0 },
  paymentDate: { type: Date, required: true },
  paymentMode: {
    type: String,
    enum: ['Bank Transfer', 'Cheque', 'UPI', 'Cash', 'Credit Card', 'Other'],
    default: 'Bank Transfer'
  },
  referenceNumber: { type: String, trim: true },
  bankName: { type: String, trim: true },

  notes: { type: String },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  }],

  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },

  status: {
    type: String,
    enum: ['Draft', 'Verified', 'Cancelled'],
    default: 'Draft',
    index: true
  },
  metaStatus: {
    type: String,
    default: 'active',
    index: true
  }
}, { timestamps: true });

payment_journalsSchema.index({ paymentDate: -1 });
payment_journalsSchema.index({ clientId: 1, status: 1 });

export default mongoose.model('payment_journals', payment_journalsSchema);
