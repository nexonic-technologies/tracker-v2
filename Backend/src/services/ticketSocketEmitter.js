import { io } from "../index.js";
import models from "../models/Collection.js";

/**
 * Broadcast ticket-related event to all participants of a ticket.
 * Checks commenter visibility policies (e.g. strips internal comments for agents).
 * 
 * @param {string} ticketId - The ID of the ticket
 * @param {string} eventName - Event name (e.g. ticket_created, ticket_updated, comment_added, comment_read, status_changed)
 * @param {object} payload - Event payload
 */
export const emitTicketEvent = async (ticketId, eventName, payload) => {
  try {
    if (!io) {
      console.warn("[ticketSocketEmitter] Socket.io server (io) not initialized");
      return;
    }

    // 1. Retrieve all registered participants for the ticket
    const participants = await models.ticket_participants.find({ ticketId }).lean();
    if (!participants || participants.length === 0) return;

    // 2. Emit to each participant's room individually to respect tenant isolation and visibility
    participants.forEach(p => {
      const roomName = p.userId.toString();

      // Enforce internal vs public comment visibility
      if (eventName === 'comment_added' && payload?.comment) {
        const isPublic = payload.comment.isPublic;
        if (!isPublic && p.userModel === 'agents') {
          return; // Skip emitting internal comments/notes to client agents
        }
      }

      io.to(roomName).emit(eventName, {
        ticketId,
        ...payload
      });
    });
  } catch (error) {
    console.error(`[ticketSocketEmitter] Error emitting ${eventName}:`, error);
  }
};

export default {
  emitTicketEvent
};
