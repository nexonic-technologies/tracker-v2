import mongoose from "mongoose";

const agent_tokensSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true, index: true },
  clientId: { type: String, required: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true },
  level: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true, index: true },
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  currentSessionToken: { type: String, index: true },
  sessionExpiresAt: { type: Date },
  lastLoginAt: { type: Date }
}, { timestamps: true });

export default mongoose.model("agent_tokens", agent_tokensSchema);
