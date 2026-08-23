import { getModel } from '../../utils/appRegistry.js';

export const notificationTools = [
  {
    name: 'notifications.getDigest',
    description: 'Fetch active workspace notifications for cognitive briefing and workflow execution',
    risk: 'low',
    requiresConfirmation: false,
    async handler(args, ctx) {
      const employeeId = ctx.employeeId || args.employeeId || ctx.user?.employeeId || ctx.user?.id;
      if (!employeeId) {
        return {
          unreadCount: 0,
          notifications: [],
        };
      }

      // Dynamically resolve tenant models (Zero hardcoded connection bypass)
      const ReceptionistModel = (ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('notification_receptionists') : null) || getModel('notification_receptionists');

      // Fetch unread reception records for this employee from active tenant DB
      let receptionists = await ReceptionistModel.find({
        receiver: employeeId,
        isRead: false,
        isDeleted: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate({
          path: 'notificationId',
          populate: { path: 'sender', select: 'basicInfo email' },
        })
        .lean();

      const unreadCount = receptionists.length;

      // If zero unread, fetch recent notifications so the cognitive engine has operational context
      if (receptionists.length === 0) {
        receptionists = await ReceptionistModel.find({
          receiver: employeeId,
          isDeleted: { $ne: true },
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate({
            path: 'notificationId',
            populate: { path: 'sender', select: 'basicInfo email' },
          })
          .lean();
      }

      // Pure declarative extraction directly from raw database models (Zero Heuristic Categorization)
      const notifications = [];
      for (const rec of receptionists) {
        const notif = rec.notificationId;
        if (!notif) continue;

        const senderName = notif.sender?.basicInfo
          ? `${notif.sender.basicInfo.firstName || ''} ${notif.sender.basicInfo.lastName || ''}`.trim()
          : 'System';

        notifications.push({
          receptionId: rec._id,
          notificationId: notif._id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          senderName,
          createdAt: notif.createdAt,
          isRead: !!rec.isRead,
          path: notif.path || (notif.meta?.model && notif.meta?.modelId ? `/${notif.meta.model}/${notif.meta.modelId}` : null),
        });
      }

      return {
        unreadCount,
        totalFetched: notifications.length,
        notifications,
      };
    },
  },

  {
    name: 'notifications.batchApprove',
    description: 'Execute one-click approval for pending regularizations or leaves directly from digest',
    risk: 'medium',
    requiresConfirmation: true,
    async handler(args, ctx) {
      const { type, entityId, receptionId } = args;

      if (!entityId && !receptionId) {
        return { error: 'Entity ID or Reception ID required' };
      }

      const RegularizationModel = (ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('regularizations') : null) || getModel('regularizations');
      const LeaveModel = (ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('leaves') : null) || getModel('leaves');
      const ReceptionistModel = (ctx.tenantContext?.getModel ? ctx.tenantContext.getModel('notification_receptionists') : null) || getModel('notification_receptionists');

      let updatedDoc = null;
      if (type === 'regularization') {
        updatedDoc = await RegularizationModel.findByIdAndUpdate(
          entityId,
          { status: 'Approved', approvedBy: ctx.employeeId || ctx.user?.id, approvedAt: new Date() },
          { new: true }
        );
      } else if (type === 'leave') {
        updatedDoc = await LeaveModel.findByIdAndUpdate(
          entityId,
          { status: 'Approved', approvedBy: ctx.employeeId || ctx.user?.id, approvedAt: new Date() },
          { new: true }
        );
      }

      if (receptionId) {
        await ReceptionistModel.findByIdAndUpdate(receptionId, { isRead: true, isClicked: true });
      }

      return {
        success: true,
        type,
        status: 'Approved',
        updatedId: updatedDoc?._id || entityId,
      };
    },
  },
];

export default notificationTools;
