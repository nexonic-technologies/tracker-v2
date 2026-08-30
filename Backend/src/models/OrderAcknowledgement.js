import mongoose from 'mongoose';

const OrderModuleSchema = new mongoose.Schema({
  projectTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'project_types', required: true },
  serviceProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'serviceproviders' },
  agreedValue: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true }
});

const order_acknowledgementsSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'quotations', required: true, index: true },
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'opportunities', index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients', required: true, index: true },

  modules: [OrderModuleSchema],

  totalOrderValue: { type: Number, required: true, min: 0 },

  clientApproval: {
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'agents' },
    approvedAt: { type: Date },
    remarks: { type: String },
    signatureRef: { type: String }
  },

  internalApproval: {
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
    approvedAt: { type: Date },
    remarks: { type: String }
  },

  status: {
    type: String,
    enum: [
      'Pending Internal Approval', 'Pending Client Approval',
      'Client Approved', 'Active', 'Completed', 'Cancelled'
    ],
    default: 'Pending Internal Approval',
    index: true
  },
  metaStatus: {
    type: String,
    default: 'active',
    index: true
  },

  // Sales tracking — who managed and completed this order
  salesPerson: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', index: true },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', index: true },
  completedAt: { type: Date },

  startDate: { type: Date },
  expectedEndDate: { type: Date }
}, { timestamps: true });

order_acknowledgementsSchema.index({ clientId: 1, status: 1 });

export default mongoose.model('order_acknowledgements', order_acknowledgementsSchema);
