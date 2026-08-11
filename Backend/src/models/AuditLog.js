// models/AuditLog.js
import mongoose from "mongoose";

const audit_logsSchema = new mongoose.Schema({
  model: { type: String, required: true, index: true },
  docId: { type: mongoose.Schema.Types.ObjectId, index: true },
  action: { type: String, enum: ["create", "update", "delete"], required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  role: { type: String, index: true },
  before: { type: Object },
  after: { type: Object },
  metadata: { type: Object }
}, {
  timestamps: true
});

// Compound indexes for audit queries
audit_logsSchema.index({ model: 1, docId: 1, createdAt: -1 });
audit_logsSchema.index({ userId: 1, action: 1, createdAt: -1 });
audit_logsSchema.index({ createdAt: -1 });

export default mongoose.model("audit_logs", audit_logsSchema);
