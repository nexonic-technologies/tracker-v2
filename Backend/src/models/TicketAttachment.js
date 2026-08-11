import mongoose from 'mongoose';

const ticketAttachmentSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'tickets',
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true // Size in bytes
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'uploadedByModel',
    required: true
  },
  uploadedByModel: {
    type: String,
    enum: ['employees', 'agents'],
    required: true
  }
}, {
  timestamps: true
});



export default mongoose.model('ticket_attachments', ticketAttachmentSchema);
