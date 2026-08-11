// src/models/NotificationRule.js
import mongoose from 'mongoose';

const NotificationRuleSchema = new mongoose.Schema({
  company: { type: String, default: "Work Hub ERP" },
  name: { type: String, required: true },
  modelName: { type: String, required: true, index: true }, // e.g. "tasks", "tickets"
  trigger: {
    type: String,
    enum: ['create', 'update', 'delete', 'approve', 'reject', 'transition', 'custom'],
    required: true,
    index: true
  },
  enabled: { type: Boolean, default: true, index: true },
  priority: { type: Number, default: 0, index: true }, // higher numbers run first
  stopProcessing: { type: Boolean, default: false }, // stop subsequent matching rules

  // Grouped boolean logic support
  conditionGroups: {
    operator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    conditions: [{
      field: { type: String, required: true }, // e.g. "status", "assignedTo"
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'changed', 'exists', 'contains', 'in', 'gt', 'gte', 'lt', 'lte', 'regex'],
        required: true
      },
      value: { type: mongoose.Schema.Types.Mixed }
    }]
  },

  recipients: {
    fields: [{ type: String }],          // e.g. ["assignedTo", "createdBy"]
    roles: [{ type: String }],           // e.g. ["Manager", "HR"]
    customResolvers: [{ type: String }], // e.g. ["feed_posts.groupMembers"]
    queries: [{
      model: { type: String, default: "employees" },
      filter: { type: mongoose.Schema.Types.Mixed } // Safe query config, e.g. { department: "{{new.departmentId}}", roleName: "Manager" }
    }]
  },

  template: {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'system' },
    path: { type: String },
    icon: { type: String },
    priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
    category: { type: String }
  },

  version: { type: Number, default: 1 },
  publishedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' }
}, { timestamps: true });

export default mongoose.model('notificationrules', NotificationRuleSchema);
