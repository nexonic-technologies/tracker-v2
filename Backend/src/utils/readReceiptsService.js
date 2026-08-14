import models from '../models/Collection.js';

import { emitTicketEvent } from "./notification/ticketSocketEmitter.js";

/**
 * Marks all eligible comments in a ticket as read for a specific user.
 * 
 * @param {string} ticketId - Ticket ID
 * @param {string} userId - ID of the user reading the ticket
 * @param {string} userModel - Model type of the user ('employees' or 'agents')
 */
export const markCommentsAsRead = async (ticketId, userId, userModel) => {
  try {
    // 1. Build comment search filter: comments not written by the reader
    const commentFilter = {
      ticketId,
      commentedBy: { $ne: userId }
    };

    // External agents can only see and mark public comments as read
    if (userModel === 'agents') {
      commentFilter.isPublic = true;
    }

    const comments = await models.ticket_comments.find(commentFilter).select('_id').lean();
    if (!comments || comments.length === 0) return { success: true, count: 0 };

    const commentIds = comments.map(c => c._id);

    // 2. Perform bulk upsert to insert read receipt records
    const bulkOps = commentIds.map(commentId => ({
      updateOne: {
        filter: { commentId, userId },
        update: {
          $setOnInsert: {
            userModel,
            readAt: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await models.ticket_comment_reads.bulkWrite(bulkOps);

    // 3. Emit realtime update via socket so other participants' UI matches
    if (result.upsertedCount > 0) {
      await emitTicketEvent(ticketId, 'comment_read', {
        userId,
        userModel,
        readCommentIds: commentIds
      });
    }

    return { success: true, count: result.upsertedCount };
  } catch (error) {
    console.error('[readReceiptsService] Error marking comments as read:', error);
    throw error;
  }
};

/**
 * Calculates the number of unread comments in a ticket for a user.
 * 
 * @param {string} ticketId - Ticket ID
 * @param {string} userId - User ID
 * @param {string} userModel - Model type ('employees' or 'agents')
 * @returns {number} Unread count
 */
export const getUnreadCommentCount = async (ticketId, userId, userModel) => {
  try {
    // 1. Retrieve all comments the user did not write
    const commentFilter = {
      ticketId,
      commentedBy: { $ne: userId }
    };

    if (userModel === 'agents') {
      commentFilter.isPublic = true;
    }

    const comments = await models.ticket_comments.find(commentFilter).select('_id').lean();
    if (!comments || comments.length === 0) return 0;

    const commentIds = comments.map(c => c._id);

    // 2. Count read receipts already logged for this user
    const readReceiptsCount = await models.ticket_comment_reads.countDocuments({
      commentId: { $in: commentIds },
      userId
    });

    // 3. Unread = Total eligible comments - read comments
    const unreadCount = Math.max(0, commentIds.length - readReceiptsCount);
    return unreadCount;
  } catch (error) {
    console.error('[readReceiptsService] Error getting unread count:', error);
    return 0;
  }
};

/**
 * Calculates unread comment counts in bulk for a list of tickets to solve N+1 latency.
 */
export const getUnreadCommentCountsForTickets = async (ticketIds, userId, userModel) => {
  try {
    if (!ticketIds || ticketIds.length === 0) return {};

    const commentFilter = {
      ticketId: { $in: ticketIds },
      commentedBy: { $ne: userId }
    };

    if (userModel === 'agents') {
      commentFilter.isPublic = true;
    }

    const comments = await models.ticket_comments.find(commentFilter).select('_id ticketId').lean();
    if (!comments || comments.length === 0) return {};

    const commentIds = comments.map(c => c._id);

    const readReceipts = await models.ticket_comment_reads.find({
      commentId: { $in: commentIds },
      userId
    }).select('commentId').lean();

    const readCommentIdsSet = new Set(readReceipts.map(r => r.commentId.toString()));

    const unreadCounts = {};
    for (const ticketId of ticketIds) {
      unreadCounts[ticketId.toString()] = 0;
    }

    for (const comment of comments) {
      const cIdStr = comment._id.toString();
      const tIdStr = comment.ticketId.toString();
      if (!readCommentIdsSet.has(cIdStr)) {
        unreadCounts[tIdStr] = (unreadCounts[tIdStr] || 0) + 1;
      }
    }

    return unreadCounts;
  } catch (error) {
    console.error('[readReceiptsService] Error getting bulk unread counts:', error);
    return {};
  }
};

export default {
  markCommentsAsRead,
  getUnreadCommentCount,
  getUnreadCommentCountsForTickets
};
