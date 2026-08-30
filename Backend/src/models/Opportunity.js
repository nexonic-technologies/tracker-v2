import mongoose from 'mongoose';

const opportunitySchema = new mongoose.Schema({
  accountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'clients', 
    required: true, 
    index: true 
  },
  contactId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'contacts', 
    index: true 
  },
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  ownerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'employees', 
    required: true, 
    index: true 
  },
  stage: {
    type: String,
    enum: ['New', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'],
    default: 'New',
    index: true
  },
  expectedValue: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  probability: { 
    type: Number, 
    default: 10, 
    min: 0, 
    max: 100 
  },
  expectedCloseDate: { 
    type: Date, 
    index: true 
  },
  actualCloseDate: { 
    type: Date 
  },
  quotationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'quotations', 
    default: null 
  },
  contractId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'order_acknowledgements', 
    default: null 
  },
  projectTypeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'project_types', 
    default: null 
  },
  products: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'products' 
  }],
  lostReason: { 
    type: String, 
    trim: true 
  },
  competitor: { 
    type: String, 
    trim: true 
  },
  notes: { 
    type: String, 
    trim: true 
  },
  tags: [{ 
    type: String, 
    trim: true 
  }],
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

// Compound indexes for pipeline querying & revenue forecasting
opportunitySchema.index({ accountId: 1, stage: 1 });
opportunitySchema.index({ ownerId: 1, stage: 1 });
opportunitySchema.index({ stage: 1, expectedCloseDate: 1 });
opportunitySchema.index({ stage: 1, expectedValue: -1 });

export default mongoose.models.opportunities || mongoose.model('opportunities', opportunitySchema);
