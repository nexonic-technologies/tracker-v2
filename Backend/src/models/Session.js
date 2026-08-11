// models/Session.js
import mongoose, { Schema } from "mongoose";

const sessionsSchema = new Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: "userModel",
    required: true,
    index: true
  },
  userModel: {
    type: String,
    enum: ["employees", "agents"],
    required: true,
    default: "employees"
  },
  generatedToken: {
    token: { type: String },
    secret: { type: String },
    expiry: { type: String, default: "1h" }
  },
  refreshToken: {
    token: { type: String },
    secret: { type: String },
    jti: { type: String, index: true },
    expiry: { type: String, default: "7d" }
  },
  platform: { 
    type: String, 
    enum: ["web", "mobile"], 
    required: true,
    index: true
  },
  deviceUUID: {
    type: String,
    required: true,
    index: true
  },
  status: { 
    type: String, 
    enum: ["Active", "DeActive", "PendingApproval"],
    default: "Active",
    index: true
  },
  authMethod: {
    type: String,
    enum: ["password", "google", "microsoft", "totp"],
    default: "password",
    index: true
  },
  fcmToken: {
    type: String,
    default: null
  },
  deviceInfo: {
    name: { type: String },
    os: { type: String },
    userAgent: { type: String },
    ipAddress: { type: String, index: true }
  },
  lastUsedAt: { 
    type: Date, 
    default: Date.now
  }
}, { 
  timestamps: true
});

// Compound indexes for session management
sessionsSchema.index({ userId: 1, status: 1, platform: 1 });
sessionsSchema.index({ deviceUUID: 1, status: 1 });
sessionsSchema.index({ userId: 1, platform: 1, lastUsedAt: -1 });
sessionsSchema.index({ status: 1, lastUsedAt: -1 }); // Cleanup queries
sessionsSchema.index({ fcmToken: 1 }, { sparse: true }); // Push notification queries

// TTL index for non-mobile sessions only, based on lastUsedAt (meaning they expire 90 days after last use)
sessionsSchema.index(
  { lastUsedAt: 1 },
  { 
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { platform: "web" }
  }
);

export default mongoose.model("sessions", sessionsSchema);
