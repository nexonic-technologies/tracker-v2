// models/Agent.js
import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';

const AgentSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String },
  client: { type: Schema.Types.ObjectId, ref: 'clients', required: true },
  phone: { type: String, required: true, trim: true },
  department: { type: Schema.Types.ObjectId, ref: 'departments' },
  role: { type: String, default: 'agent' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  inviteToken: { type: String, unique: true, sparse: true },
  inviteExpires: { type: Date },
  isInvited: { type: Boolean, default: false },
  hasSetPassword: { type: Boolean, default: false }, 
  level: { type: Number, default: 1 }
}, { timestamps: true });

// Hash password before saving
AgentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
AgentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes

AgentSchema.index({ client: 1 });

export default model('agents', AgentSchema);