import mongoose from 'mongoose';

const invoiceLineItemSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'products' 
  },
  description: { 
    type: String, 
    required: true, 
    trim: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1, 
    default: 1 
  },
  unitPrice: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  taxRate: { 
    type: Number, 
    default: 18, 
    min: 0 
  },
  discount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { 
    type: String, 
    unique: true, 
    required: true, 
    trim: true, 
    index: true 
  },
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'clients', 
    required: true, 
    index: true 
  },
  contractId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'order_acknowledgements', 
    index: true 
  },
  quotationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'quotations', 
    index: true 
  },
  opportunityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'opportunities', 
    index: true 
  },
  issueDate: { 
    type: Date, 
    required: true, 
    default: Date.now, 
    index: true 
  },
  dueDate: { 
    type: Date, 
    required: true, 
    index: true 
  },
  currency: { 
    type: String, 
    default: 'INR', 
    enum: ['INR', 'USD', 'EUR', 'GBP'] 
  },
  lineItems: { 
    type: [invoiceLineItemSchema], 
    default: [] 
  },
  subtotal: { 
    type: Number, 
    required: true, 
    min: 0, 
    default: 0 
  },
  taxAmount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  discountAmount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  totalAmount: { 
    type: Number, 
    required: true, 
    min: 0, 
    default: 0 
  },
  paidAmount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  balanceDue: { 
    type: Number, 
    required: true, 
    min: 0, 
    default: 0 
  },
  status: {
    type: String,
    enum: ['Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Draft',
    index: true
  },
  paymentMilestoneId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'milestones' 
  },
  gstin: { 
    type: String, 
    trim: true 
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: { type: String, default: 'India' }
  },
  notes: { 
    type: String, 
    trim: true 
  },
  terms: { 
    type: String, 
    trim: true 
  },
  metaStatus: { 
    type: String, 
    default: 'active', 
    index: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'employees' 
  }
}, { timestamps: true });

// Compound indexes for financial reconciliation & AR aging
invoiceSchema.index({ clientId: 1, status: 1 });
invoiceSchema.index({ contractId: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ issueDate: -1, status: 1 });

export default mongoose.models.invoices || mongoose.model('invoices', invoiceSchema);
