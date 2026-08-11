// models/notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "employees"
    // Optional because system notifications might not have a human sender
  },
  type: {
    type: String,
    enum: ['post', 'mention', 'reaction', 'comment', 'ticket', 'task', 'leave', 'system', 'asset'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  meta: {
    model: { type: String, index: true },
    modelId: { type: mongoose.Schema.Types.ObjectId, index: true },
    senderDetails: { type: mongoose.Schema.Types.Mixed }
  },
  path: { type: String },
}, { 
  timestamps: true,
  expireAfterSeconds: 90 * 24 * 60 * 60 // Auto-delete after 90 days
});

// Compound indexes for notification queries
notificationSchema.index({ sender: 1, createdAt: -1 }); // Sent notifications
notificationSchema.index({ "meta.model": 1, "meta.modelId": 1 }); // Related entity notifications
notificationSchema.index({ createdAt: -1 }); // Recent notifications

export default mongoose.model("notifications", notificationSchema);
