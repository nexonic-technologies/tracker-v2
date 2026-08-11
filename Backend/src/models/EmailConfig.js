import mongoose from "mongoose";

const email_configSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: true,
    required: true
  },
  service: {
    type: String,
    enum: ['gmail', 'outlook', 'yahoo', 'custom'],
    required: true,
    default: 'gmail'
  },
  host: {
    type: String,
    required: true,
    trim: true
  },
  port: {
    type: Number,
    required: true,
    default: 587
  },
  secure: {
    type: Boolean,
    default: false
  },
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  fromName: {
    type: String,
    required: true,
    trim: true
  },
  fromEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  }
}, {
  timestamps: true,
  collection: 'email_configs'
});

// Ensure only one email config exists
email_configSchema.pre('save', async function (next) {
  if (this.isNew) {
    await this.constructor.deleteMany({});
  }
  next();
});

export default mongoose.model("email_config", email_configSchema);