import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true },
  title: { type: String, required: true, maxlength: 200 },
  userStory: { type: String }, // This will be visible to external clients
  description: { type: String }, // Internal description / notes
  projectTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'project_types' }, // Optional, to be selected by agent
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'products' },
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'task_types',
    required: true
  },
  impactAnalysis: { type: String },
  url: { type: String },
  acceptanceCriteria: { type: String },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients' },
  taskTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskType' },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    default: 'Open',
    index: true
  },
  metaStatus: {
    type: String,
    default: 'active',
    index: true
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel', required: true },
  createdByModel: { type: String, enum: ['employees', 'agents'], default: 'employees' },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'employees' }], // Multiple assignees
  accountManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees',
    get: function () {
      return this.clientId?.accountManager || this.assignedTo?.[0];
    }
  },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },

  // Task synchronization fields
  linkedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'tasks' },
  isConvertedToTask: { type: Boolean, default: false },
  convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },
  convertedAt: { type: Date },

  // Milestone fields (optional)
  milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'milestones', index: true },
  milestoneStatus: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'On Hold'],
    default: 'Pending',
    index: true
  },

  dueDate: { type: Date },
  startDate: { type: Date, default: Date.now },
  liveHours: { type: Number, default: 0 },
  resolvedAt: { type: Date },
  closedAt: { type: Date },
  resolution: { type: String },

  // ETA — auto-computed, read-only from frontend
  // Classification (planned vs adhoc) is derived at read time via linkedTaskId.sprintId, never stored
  etaEstimatedDelivery: { type: Date, index: true }, // shift-walk computed delivery date
  etaComputedAt: { type: Date }               // when ETA was last calculated
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate references for comments and attachments
ticketSchema.virtual('comments', {
  ref: 'ticket_comments',
  localField: '_id',
  foreignField: 'ticketId'
});

ticketSchema.virtual('attachments', {
  ref: 'ticket_attachments',
  localField: '_id',
  foreignField: 'ticketId'
});

// Auto-generate ticket ID
ticketSchema.pre('save', async function (next) {
  if (!this.ticketId) {
    const count = await this.constructor.countDocuments();
    this.ticketId = `TKT${String(count + 1).padStart(6, '0')}`;
  }

  next();
});

// Indexes

ticketSchema.index({ createdBy: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ projectTypeId: 1 });
ticketSchema.index({ clientId: 1 });
ticketSchema.index({ taskTypeId: 1 });
ticketSchema.index({ category: 1, priority: 1 });
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ linkedTaskId: 1 });
ticketSchema.index({ accountManager: 1 });
ticketSchema.index({ milestoneId: 1, milestoneStatus: 1 });

export default mongoose.model('Ticket', ticketSchema);