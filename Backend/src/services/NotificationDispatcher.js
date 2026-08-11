// src/services/NotificationDispatcher.js
// Centralized, unified notification dispatcher for real-time Socket.io, DB, and FCM queue delivery.

import models from '../models/Collection.js';
import fcmService from './fcmService.js';

import { io } from '../index.js';

class NotificationDispatcher {
  /**
   * Dispatch a unified notification across DB, Socket.io, and FCM queue.
   *
   * @param {Object} params
   * @param {Array<string>|string} params.recipients - Target user ID(s)
   * @param {string} [params.sender] - Dispatcher/Actor user ID
   * @param {string} params.title - Notification title
   * @param {string} params.message - Notification body
   * @param {string} [params.type] - Notification type
   * @param {Object} [params.meta] - Associated metadata (e.g. model, modelId)
   * @param {string} [params.path] - Redirect route path for frontend action
   */
  async dispatch({ recipients, sender, title, message, type = 'system', meta = {}, path = '' }) {
    try {
      if (!recipients) return;
      const receiversArray = Array.isArray(recipients) ? recipients : [recipients];

      // 1. Normalize and deduplicate recipient list
      let receiverIds = [...new Set(receiversArray.filter(Boolean).map(id => id.toString()))];

      // 2. Prevent sending notification to oneself
      if (sender) {
        receiverIds = receiverIds.filter(id => id !== sender.toString());
      }

      if (receiverIds.length === 0) return;

      // 3. Map custom/legacy types to allowed schema enums
      const TYPE_MAPPING = {
        'attendance_request': 'system',
        'regularization_request': 'system',
        'regularizations_request': 'system',
        'regularizations_status': 'system',
        'task_comment': 'comment',
        'task_mention': 'mention',
        'leave_request': 'leave',
        'leave_response': 'leave',
        'leaves_request': 'leave',
        'leaves_status': 'leave',
        'assets_allocations_request': 'system',
        'assets_allocations_status': 'system',
        'assets_incidents_request': 'system',
        'assets_incidents_status': 'system',
      };

      const ALLOWED_TYPES = ['post', 'mention', 'reaction', 'comment', 'ticket', 'task', 'leave', 'system'];
      let resolvedType = TYPE_MAPPING[type] || type;
      if (!ALLOWED_TYPES.includes(resolvedType)) resolvedType = 'system';

      // 4. Create master notification content document
      const contentDoc = await models.notifications.create({
        type: resolvedType,
        title,
        message,
        sender: sender || undefined,
        meta,
        path
      });

      // 5. Create recipient records (NotificationReceptionist) for delivery tracking
      const receptionistPayloads = receiverIds.map(uid => ({
        notificationId: contentDoc._id,
        receiver: uid,
        fcmStatus: 'pending',
      }));
      const receptionistDocs = await models.NotificationReceptionist.insertMany(receptionistPayloads);

      // 6. Deliver via real-time WebSockets if the client is connected
      try {
        if (io) {
          for (const uid of receiverIds) {
            const socketsInRoom = await io.in(uid).fetchSockets();
            if (socketsInRoom.length > 0) {
              io.to(uid).emit('notification', {
                id: contentDoc._id,
                message,
                createdAt: contentDoc.createdAt,
                sender: sender ? sender.toString() : undefined
              });
            }
          }
        }
      } catch (socketErr) {
        console.warn('[NotificationDispatcher] Socket.io delivery skipped:', socketErr.message);
      }

      // 7. Retrieve FCM tokens and enqueue push notifications via the fcmQueue
      try {
        const sessions = await models.session.find({
          userId: { $in: receiverIds },
          status: 'Active',
          fcmToken: { $ne: null },
        }).select('userId fcmToken').lean();

        const tokens = sessions.map(s => s.fcmToken).filter(Boolean);
        if (tokens.length > 0) {
          fcmService.enqueueMulticast(contentDoc, receptionistDocs, tokens);
        }
      } catch (fcmErr) {
        console.warn('[NotificationDispatcher] FCM queue scheduling skipped:', fcmErr.message);
      }

      return contentDoc;

    } catch (error) {
      console.error('[NotificationDispatcher] Dispatch failed:', error.message);
    }
  }
}

export default new NotificationDispatcher();
