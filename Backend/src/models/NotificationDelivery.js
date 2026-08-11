// src/models/NotificationDelivery.js
import mongoose from 'mongoose';

const NotificationDeliverySchema = new mongoose.Schema({
  notificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'notifications', required: true, index: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', required: true, index: true },
  provider: { type: String, enum: ['socket', 'fcm', 'expo', 'email', 'sms', 'whatsapp'], required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', index: true },
  sentAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date },
  error: { type: String }
}, { timestamps: true });

export default mongoose.model('notification_deliveries', NotificationDeliverySchema);
