import models from '../models/Collection.js';

import mongoose from 'mongoose';

/**
 * Service hook class for 'ticket_attachments' collection.
 */
export default function ticketAttachmentsService() {
  return {
    // ---------------- Before Create ----------------
    beforeCreate: async (ctx) => {
      const { role, userId, body } = ctx;
      // If the populateHelper set body.attachments from req.files.attachments:
      if (body.attachments && body.attachments.length > 0) {
        const fileData = body.attachments[0]; // Take the first uploaded file
        body.filename = fileData.filename;
        body.originalName = fileData.originalName;
        body.path = fileData.path;
        body.mimetype = fileData.mimetype;
        body.size = fileData.size;
        delete body.attachments;
      }

      body.uploadedBy = new mongoose.Types.ObjectId(userId);
      const isAgent = role.toString() === 'agent' || role.toString() === '6a25cbc1cd36294f5e578696';
      body.uploadedByModel = isAgent ? 'agents' : 'employees';

      return body;
    },

    // ---------------- After Create ----------------
    afterCreate: async (ctx) => {
      const { role, userId, docId } = ctx;
      try {
        const attachment = await models.ticket_attachments.findById(docId).lean();
        if (attachment && attachment.ticketId) {
          // Touch parent ticket to update its updatedAt
          await models.tickets.findByIdAndUpdate(attachment.ticketId, { updatedAt: new Date() });

          // Log activity for attachment addition
          await models.ticket_activity_logs.create({
            ticketId: attachment.ticketId,
            action: 'attachment_added',
            performedBy: userId,
            performedByModel: attachment.uploadedByModel,
            details: { attachmentId: attachment._id, filename: attachment.originalName }
          });
        }
      } catch (error) {
        console.error('[ticket_attachments service] error in afterCreate:', error);
      }
    }
  };
}

