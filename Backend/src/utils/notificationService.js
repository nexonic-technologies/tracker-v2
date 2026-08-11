import { io, activeConnections } from "../index.js";
import models from "../models/Collection.js";

const notification = models.notifications;
const session = models.sessions;
const NotificationReceptionist = models.notificationreceptionists;
import { sendPush } from "../utils/pushSender.js";

// Optimized notification service with memory management
export const sendNotification = async ({
  receiver,
  recipient,
  sender,
  message,
  type = "system",
  title = "Notification",
  meta,
  relatedModel,
  relatedId,
  path,
}) => {
  try {
    // ─── Centralized Dynamic Notification Bypass Check ───────────────────────
    try {
      const { getTenantModel } = await import('../tenant/tenantContext.js');
      const GeneralSettings = getTenantModel('GeneralSettings');
      const settings = GeneralSettings ? await GeneralSettings.findOne().lean() : null;
      if (settings?.notification?.useDynamicNotifications) {
        return; // Bypassed: dynamic rules evaluator is active
      }
    } catch (e) {
      console.warn('[NotificationService] Dynamic bypass check failed:', e.message);
    }

    const finalReceiver = receiver || recipient;
    if (!finalReceiver) {
      throw new Error("Receiver/Recipient is required to send notification");
    }

    // Map custom/legacy types to valid Schema enums:
    // Schema allows: ['post', 'mention', 'reaction', 'comment', 'ticket', 'task', 'leave', 'system']
    const TYPE_MAPPING = {
      'attendance_request': 'system',
      'regularization_request': 'system',
      'task_comment': 'comment',
      'task_mention': 'mention',
      'leave_request': 'leave',
      'leave_response': 'leave',
      'assets_allocations_request': 'asset',
      'assets_allocations_status': 'asset',
      'assets_incidents_request': 'asset',
      'assets_incidents_status': 'asset',
    };

    let resolvedType = TYPE_MAPPING[type] || type;
    const ALLOWED_TYPES = ['post', 'mention', 'reaction', 'comment', 'ticket', 'task', 'leave', 'system', 'asset'];
    if (!ALLOWED_TYPES.includes(resolvedType)) {
      resolvedType = 'system';
    }

    const finalMeta = meta || (relatedModel ? { model: relatedModel, modelId: relatedId } : undefined);

    // 1️⃣ Save notification in DB (source of truth)
    const newNotification = await notification.create({
      sender: sender || undefined,
      type: resolvedType,
      title: title || "New Notification",
      message,
      meta: finalMeta,
      path,
    });

    // 2️⃣ Create receptionist record so it displays in user's inbox
    const receptionist = await NotificationReceptionist.create({
      notificationId: newNotification._id,
      receiver: finalReceiver,
      isRead: false,
    });

    // 3️⃣ Optimized Socket.io delivery
    const receiverStr = finalReceiver.toString();
    const socketsInRoom = await io.in(receiverStr).fetchSockets();

    if (socketsInRoom.length > 0) {
      // Send to specific room with minimal payload
      io.to(receiverStr).emit("notification", {
        id: newNotification._id,
        message,
        createdAt: newNotification.createdAt,
        sender: sender ? sender.toString() : undefined
      });
    }

    // 4️⃣ Optimized push notification (only if user offline)
    if (socketsInRoom.length === 0) {
      // User is offline, send push notification
      const userSessions = await session.find({
        userId: finalReceiver,
        status: "Active",
        fcmToken: { $ne: null },
        lastUsedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Active in last 24h
      }).select('fcmToken').lean();

      // Batch push notifications
      const pushPromises = userSessions.map(sessionItem =>
        sendPush({
          pushToken: sessionItem.fcmToken,
          title: title || "New Notification",
          body: message,
          data: {
            path,
            model: finalMeta?.model,
            notificationId: newNotification._id.toString()
          },
        })
      );

      // Send all push notifications concurrently
      await Promise.allSettled(pushPromises);
    }

    return newNotification;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

// Optimized task notification with batching
export const notifyTaskUpdate = async (
  taskId,
  updatedBy,
  updateType,
  details
) => {
  try {
    const Task = (await import("../models/Tasks.js")).default;
    const task = await Task.findById(taskId)
      .select('assignedTo createdBy followers title')
      .populate('assignedTo', 'basicInfo.firstName basicInfo.lastName')
      .populate('createdBy', 'basicInfo.firstName basicInfo.lastName')
      .populate('followers', 'basicInfo.firstName basicInfo.lastName')
      .lean();

    if (!task) return;

    const recipients = new Set();

    // Collect all recipients
    task.assignedTo?.forEach((u) => recipients.add(u._id.toString()));
    if (task.createdBy) recipients.add(task.createdBy._id.toString());
    task.followers?.forEach((u) => recipients.add(u._id.toString()));

    // Remove the user who made the update
    recipients.delete(updatedBy.toString());

    if (recipients.size === 0) return;

    // Batch create notifications
    const notificationDocs = Array.from(recipients).map(receiverId => ({
      receiver: receiverId,
      sender: updatedBy,
      message: details,
      meta: {
        model: "tasks",
        modelId: taskId,
      },
      path: `/tasks/${taskId}`,
      read: false
    }));

    // Bulk insert notifications
    const createdNotifications = await notification.insertMany(notificationDocs);

    // Batch socket emissions
    const socketPromises = Array.from(recipients).map(async (receiverId) => {
      const socketsInRoom = await io.in(receiverId).fetchSockets();
      if (socketsInRoom.length > 0) {
        io.to(receiverId).emit("taskUpdate", {
          taskId,
          message: details,
          updatedBy,
          timestamp: Date.now()
        });
      }
    });

    await Promise.allSettled(socketPromises);

    return createdNotifications;
  } catch (error) {
    console.error("Error sending task notifications:", error);
    throw error;
  }
};
