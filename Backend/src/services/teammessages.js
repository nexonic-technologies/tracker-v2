import models from '../models/Collection.js';

import { io } from '../index.js';
import NotificationDispatcher from '../utils/notification/NotificationDispatcher.js';

class team_messagesService {
  beforeCreate(ctx) {
    const { body, user } = ctx;
    if (!body) return;

    // 1. Fallback sender to authenticated user if missing or empty string
    if (!body.sender || (typeof body.sender === 'string' && body.sender.trim() === '')) {
      body.sender = user?.id;
    }

    // 2. Ensure conversationId is correctly formatted and deterministic
    if (body.sender && body.recipient) {
      const sId = body.sender.toString();
      const rId = body.recipient.toString();
      const ids = [sId, rId].sort();
      body.conversationId = `${ids[0]}_${ids[1]}`;
    }

    return body;
  }

  async afterCreate(ctx) {
    try {
      const docId = ctx.docId;
      if (!docId) return;

      const messageId = Array.isArray(docId) ? docId[0] : docId;

      const populatedMsg = await models.team_messages
        .findById(messageId)
        .populate('sender', 'basicInfo.firstName basicInfo.lastName basicInfo.profileImage name')
        .populate('recipient', 'basicInfo.firstName basicInfo.lastName basicInfo.profileImage name')
        .lean();

      if (!populatedMsg) return;

      const senderId = (populatedMsg.sender?._id || populatedMsg.sender)?.toString();
      const recipientId = (populatedMsg.recipient?._id || populatedMsg.recipient)?.toString();

      if (!recipientId) return;

      // 1. Emit real-time chat_message to recipient's socket room
      if (io) {
        io.to(recipientId).emit('chat_message', populatedMsg);
      }

      // 2. Dispatch notification & FCM push notification to recipient
      const senderFirstName = populatedMsg.sender?.basicInfo?.firstName || populatedMsg.sender?.name || 'Colleague';
      const senderLastName = populatedMsg.sender?.basicInfo?.lastName || '';
      const senderName = `${senderFirstName} ${senderLastName}`.trim();

      const notifMessage = (populatedMsg.message || '').length > 80
        ? `${populatedMsg.message.substring(0, 80)}...`
        : populatedMsg.message;

      await NotificationDispatcher.dispatch({
        recipients: [recipientId],
        sender: senderId,
        title: `New message from ${senderName}`,
        message: notifMessage,
        type: 'system',
        meta: {
          model: 'team_messages',
          conversationId: populatedMsg.conversationId,
          senderId,
        },
        path: `/teams?chat=${senderId}`,
      });
    } catch (err) {
      console.error('[team_messages service] afterCreate error:', err);
    }
  }
}

export default function () {
  return new team_messagesService();
}
