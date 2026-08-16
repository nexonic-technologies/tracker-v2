import models from '../models/Collection.js';

import { emitTicketEvent } from '../utils/notification/ticketSocketEmitter.js';
import fcmService from '../utils/notification/fcmService.js';
import mongoose from 'mongoose';

/**
 * Service hook class for 'ticket_comments' collection.
 */
export default function ticketCommentsService() {
  return {
    // ---------------- Before Create ----------------
    beforeCreate: async (ctx) => {
      const { role, userId, body } = ctx;
      console.log('[TicketComments] beforeCreate body:', body);
      // 1. Enforce creator fields
      body.commentedBy = new mongoose.Types.ObjectId(userId);

      const isAgent = role.toString() === 'agent' || role.toString() === '6a25cbc1cd36294f5e578696';
      body.commenterModel = isAgent ? 'agents' : 'employees';

      if (isAgent) {
        // External client agents can only make public comments
        body.isPublic = true;
      } else {
        // Default to public comment if not explicitly specified
        if (body.isPublic === undefined) {
          body.isPublic = true;
        }
      }

      // 2. Validate ticket exists and is accessible
      const ticket = await models.tickets.findById(body.ticketId).lean();
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Enforce client isolation for agents
      if (isAgent) {
        // Find agent and check client ID
        const agent = await models.agents.findById(userId).select('client').lean();
        if (!agent || !ticket.clientId || ticket.clientId.toString() !== agent.client.toString()) {
          throw new Error('⛔ Access Denied: You do not have permission to comment on this ticket.');
        }
      }

      return body;
    },

    // ---------------- After Create ----------------
    afterCreate: async (ctx) => {
      const { role, userId, modelName, docId } = ctx;
      try {
        // 1. Fetch created comment with populated creator details
        const comment = await models.ticket_comments.findById(docId).lean();
        if (!comment) return;

        // 2. Register the commenter as a watcher/participant on this ticket if not already added
        await models.ticket_participants.findOneAndUpdate(
          { ticketId: comment.ticketId, userId: comment.commentedBy },
          {
            $setOnInsert: {
              userModel: comment.commenterModel,
              role: 'watcher'
            }
          },
          { upsert: true, new: true }
        );

        // 3. Mark the comment as read by the author themselves
        await models.ticket_comment_reads.findOneAndUpdate(
          { commentId: comment._id, userId: comment.commentedBy },
          {
            $setOnInsert: {
              userModel: comment.commenterModel,
              readAt: new Date()
            }
          },
          { upsert: true, new: true }
        );

        // 4. Update ticket timestamp on comment
        const ticket = await models.tickets.findById(comment.ticketId);
        if (ticket) {
          ticket.updatedAt = new Date();
          await ticket.save();
        }

        // 5. Create activity log for the comment addition
        await models.ticket_activity_logs.create({
          ticketId: comment.ticketId,
          action: 'comment_added',
          performedBy: userId,
          performedByModel: comment.commenterModel,
          details: { commentId: comment._id, isPublic: comment.isPublic }
        });

        // 6. Fetch sender's name to include in socket and push payloads
        let commenterName = 'Someone';
        if (comment.commenterModel === 'employees') {
          const emp = await models.employees.findById(userId).select('basicInfo.firstName basicInfo.lastName').lean();
          if (emp) commenterName = `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim();
        } else {
          const ag = await models.agents.findById(userId).select('name').lean();
          if (ag) commenterName = ag.name;
        }

        // 7. Emit comment addition via socket
        const socketPayload = {
          comment: {
            ...comment,
            commenterName
          }
        };
        await emitTicketEvent(comment.ticketId, 'comment_added', socketPayload);

        // 8. Dispatch Push / Email notifications to other participants
        const participants = await models.ticket_participants.find({ ticketId: comment.ticketId }).lean();
        let receiverIds = participants.map(p => p.userId.toString());

        // Do not notify the author
        receiverIds = receiverIds.filter(id => id !== userId.toString());

        if (receiverIds.length > 0) {
          // If comment is internal (isPublic = false), only notify internal employees
          if (!comment.isPublic) {
            const employeeParticipants = participants.filter(p => p.userModel === 'employees');
            receiverIds = employeeParticipants.map(p => p.userId.toString()).filter(id => id !== userId.toString());
          }

          if (receiverIds.length > 0) {
            const notificationTitle = `New comment on Ticket ${ticket?.ticketId || ''}`;
            const notificationMessage = `${commenterName}: ${comment.message}`;

            await fcmService.dispatchTicketNotification({
              type: 'ticket',
              title: notificationTitle,
              message: notificationMessage,
              sender: userId,
              meta: { model: 'tickets', modelId: comment.ticketId },
              receiversArray: receiverIds
            });
          }
        }
      } catch (error) {
        console.error('[ticket_comments service] error in afterCreate hook:', error);
      }
    },

    // ---------------- After Read ----------------
    afterRead: async (ctx) => {
      const { data, user, policy } = ctx;
      if (!data) return data;

      const EDIT_WINDOW_MINUTES = 15;
      const EDIT_WINDOW_MS = EDIT_WINDOW_MINUTES * 60 * 1000;
      const currentUserId = (user?.id || user?._id)?.toString();
      const isSuperAdmin = user?.isSuperAdmin === true || policy?.isSuperAdmin === true;

      const enrichComment = (item) => {
        if (!item || typeof item !== 'object') return item;
        const comment = item.toObject ? item.toObject() : { ...item };

        const authorId = comment.commentedBy?._id?.toString() || comment.commentedBy?.toString();
        const isAuthor = Boolean(currentUserId && authorId && currentUserId === authorId);

        const createdAt = comment.createdAt ? new Date(comment.createdAt).getTime() : Date.now();
        const ageMs = Date.now() - createdAt;
        const withinGracePeriod = ageMs <= EDIT_WINDOW_MS;
        const remainingMs = Math.max(0, EDIT_WINDOW_MS - ageMs);

        comment.canEdit = Boolean(isSuperAdmin || (isAuthor && withinGracePeriod));
        comment.canDelete = Boolean(isSuperAdmin || (isAuthor && withinGracePeriod));
        comment.isAuthor = isAuthor;
        comment.remainingEditTimeSeconds = isAuthor && !isSuperAdmin ? Math.round(remainingMs / 1000) : null;
        comment.editWindowMinutes = EDIT_WINDOW_MINUTES;

        return comment;
      };

      if (Array.isArray(data)) {
        return data.map(enrichComment);
      }
      return enrichComment(data);
    },

    // ---------------- Before Update ----------------
    beforeUpdate: async (ctx) => {
      const { user, docId, body, existingDoc, policy } = ctx;
      const CommentModel = ctx.tenantContext?.getModel
        ? ctx.tenantContext.getModel('ticket_comments')
        : (await import('../models/Collection.js')).default.ticket_comments;

      const doc = existingDoc || (await CommentModel.findById(docId).lean());
      if (!doc) throw new Error('Comment not found');

      const isAuthor = doc.commentedBy?.toString() === user?.id?.toString();
      const isSuperAdmin = user?.isSuperAdmin === true || policy?.isSuperAdmin === true;

      // Only the author or platform super admin can update a comment
      if (!isAuthor && !isSuperAdmin) {
        throw new Error('⛔ Access Denied: You can only edit your own comments.');
      }

      // Domain Invariant: Authors may only edit comments within a 15-minute grace window from creation
      if (isAuthor && !isSuperAdmin && doc.createdAt) {
        const ageMinutes = (Date.now() - new Date(doc.createdAt).getTime()) / (1000 * 60);
        if (ageMinutes > 15) {
          throw new Error('⛔ Comments can only be edited within 15 minutes of posting.');
        }
      }

      // Restrict modification to message / attachments only
      const updatedBody = {
        message: body.message || doc.message,
        attachments: body.attachments || doc.attachments,
        edited: true,
        editedAt: new Date()
      };

      return updatedBody;
    },

    // ---------------- After Update ----------------
    afterUpdate: async (ctx) => {
      const { docId } = ctx;
      try {
        const { default: models } = await import('../models/Collection.js');
        const CommentModel = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('ticket_comments') : models.ticket_comments;
        const TicketModel = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('tickets') : models.tickets;

        const comment = await CommentModel.findById(docId).lean();
        if (comment && comment.ticketId) {
          await TicketModel.findByIdAndUpdate(comment.ticketId, { updatedAt: new Date() });
        }
      } catch (error) {
        console.error('[ticket_comments service] error in afterUpdate hook:', error);
      }
    },

    // ---------------- Before Delete ----------------
    beforeDelete: async (ctx) => {
      const { user, docId, existingDoc, policy } = ctx;
      const CommentModel = ctx.tenantContext?.getModel
        ? ctx.tenantContext.getModel('ticket_comments')
        : (await import('../models/Collection.js')).default.ticket_comments;

      const doc = existingDoc || (await CommentModel.findById(docId).lean());
      if (!doc) throw new Error('Comment not found');

      const isAuthor = doc.commentedBy?.toString() === user?.id?.toString();
      const isSuperAdmin = user?.isSuperAdmin === true || policy?.isSuperAdmin === true;

      // Domain Invariant: Authors may only delete comments within 15 minutes of posting.
      // Super admins or users with policy-authorized moderation bypass the time window.
      if (isAuthor && !isSuperAdmin && doc.createdAt) {
        const ageMinutes = (Date.now() - new Date(doc.createdAt).getTime()) / (1000 * 60);
        if (ageMinutes > 15) {
          throw new Error('⛔ Comments can only be deleted within 15 minutes of posting. Please contact an administrator.');
        }
      }
    },

    // ---------------- After Delete ----------------
    afterDelete: async (ctx) => {
      const { doc } = ctx;
      try {
        const { default: models } = await import('../models/Collection.js');
        const TicketModel = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('tickets') : models.tickets;

        if (doc && doc.ticketId) {
          await TicketModel.findByIdAndUpdate(doc.ticketId, { updatedAt: new Date() });
        }
      } catch (error) {
        console.error('[ticket_comments service] error in afterDelete hook:', error);
      }
    }
  };
}
