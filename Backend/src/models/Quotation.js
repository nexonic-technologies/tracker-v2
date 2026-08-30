import mongoose from 'mongoose';

const QuotationLineItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'products' },
  projectTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'project_types' },
  serviceProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'serviceproviders' },
  description: { type: String, trim: true },
  quantity: { type: Number, default: 1, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  taxRate: { type: Number, default: 18, min: 0 },
  lineTotal: { type: Number, default: 0 }
});

const ApprovalEntrySchema = new mongoose.Schema({
  action: { type: String, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, refPath: 'approvalHistory.byModel' },
  byModel: { type: String, enum: ['employees', 'agents'] },
  at: { type: Date, default: Date.now },
  remarks: { type: String }
});

const QuotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, unique: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients', required: true, index: true },
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'opportunities', index: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'contacts' },

  lineItems: [QuotationLineItemSchema],

  subtotal: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  validUntil: { type: Date },
  notes: { type: String },
  termsAndConditions: { type: String },

  preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', index: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },

  status: {
    type: String,
    enum: [
      'Draft', 'Sent', 'Under Review', 'Revision Requested',
      'Internally Approved', 'Client Approved', 'Client Rejected',
      'Expired', 'Converted to Order'
    ],
    default: 'Draft',
    index: true
  },
  metaStatus: {
    type: String,
    default: 'active',
    index: true
  },

  revisionNumber: { type: Number, default: 1 },
  parentQuotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'quotations' },

  approvalHistory: [ApprovalEntrySchema]
}, { timestamps: true });

QuotationSchema.index({ clientId: 1, status: 1 });
QuotationSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('quotations', QuotationSchema);

