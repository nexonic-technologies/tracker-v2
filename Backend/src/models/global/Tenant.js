import mongoose from 'mongoose';

const TenantSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    dbName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    mongoUri: {
      type: String,
      trim: true,
      default: null,
    },
    ownerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Provisioning', 'Deleted', 'Inactive', 'Canceled', 'Cancelled'],
      default: 'Active',
      index: true,
    },
    plan: {
      type: String,
      default: 'Professional',
    },
    billingCycle: {
      type: String,
      enum: ['Monthly', 'Annual', 'Lifetime'],
      default: 'Monthly',
    },
    licenseExpiredAt: {
      type: Date,
      default: null,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'PastDue', 'Unpaid', 'Trial', 'Refunded'],
      default: 'Paid',
      index: true,
    },
    licenseStatus: {
      type: String,
      enum: ['Valid', 'Expired', 'GracePeriod', 'Suspended'],
      default: 'Valid',
      index: true,
    },
    enabledModules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
      },
    ],
    settings: {
      maxUsers: { type: Number, default: 50 },
      features: [{ type: String }],
    },
  },
  {
    timestamps: true,
  }
);

export default TenantSchema;
