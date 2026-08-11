import mongoose from 'mongoose';

const ProvisioningStepSchema = new mongoose.Schema(
  {
    step: { type: Number, required: true },
    label: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    detail: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { _id: false }
);

const ProvisioningRunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: { type: String, default: null },
    tenantName: { type: String, required: true },
    slug: { type: String, required: true },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
      index: true,
    },
    currentStep: { type: Number, default: 0 },
    totalSteps: { type: Number, default: 9 },
    steps: [ProvisioningStepSchema],
    error: { type: String, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    createdBy: { type: String, default: null },
    enabledModuleKeys: [{ type: String }],
    verification: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
  }
);

export default ProvisioningRunSchema;
