import mongoose from "mongoose";

export default function notificationsService() {
  return {
    /**
     * beforeRead: Seamlessly map legacy "recipient" queries to the new dual-collection architecture.
     * We query NotificationReceptionist first, then filter the main notifications collection by the matched IDs.
     */
    async beforeRead({ role, userId, filter, fields }) {
      if (filter && (filter.recipient || filter.receiver)) {
        const { default: models } = await import('../models/Collection.js');
        
        // Support either recipient or receiver
        const targetUser = filter.recipient || filter.receiver || userId;
        const targetUserId = new mongoose.Types.ObjectId(targetUser.toString());
        
        // Find all receptionists for this user to get their notification IDs
        const receptionists = await models.NotificationReceptionist.find({ 
          receiver: targetUserId,
          isDeleted: { $ne: true }
        })
          .select('notificationId')
          .sort({ createdAt: -1 })
          .limit(100) // Return up to 100 recent notifications
          .lean();
          
        const notifIds = receptionists.map(r => r.notificationId);
        
        // Create a new filter, preserving other criteria but rewriting for the mapped IDs
        const newFilter = { ...filter, _id: { $in: notifIds } };
        delete newFilter.recipient;
        delete newFilter.receiver;
        
        return { filter: newFilter };
      }
    },
    
    /**
     * afterRead: Merge the delivery state (isRead, isClicked) from NotificationReceptionist 
     * back into the Notification objects so the frontend receives a unified object.
     */
    async afterRead({ role, userId, docId, data }) {
      if (!data) return data;
      const { default: models } = await import('../models/Collection.js');
      
      const isArray = Array.isArray(data);
      const items = isArray ? data : [data];
      if (items.length === 0) return data;
      
      const notifIds = items.map(i => i._id);
      
      const receptionists = await models.NotificationReceptionist.find({ 
        notificationId: { $in: notifIds },
        receiver: userId 
      }).lean();
      
      const recMap = {};
      receptionists.forEach(r => recMap[r.notificationId.toString()] = r);
      
      const merged = items.map(item => {
         const r = recMap[item._id.toString()];
         if (r) {
            return {
              ...item,
              isRead: r.isRead,
              isClicked: r.isClicked,
              fcmStatus: r.fcmStatus,
              fcmErrorReason: r.fcmErrorReason,
              receptionistId: r._id,
              receivedAt: r.createdAt
            };
         }
         return item;
      });
      
      // Sort the merged array by receivedAt (since the $in query doesn't preserve order)
      if (isArray) {
        merged.sort((a, b) => {
          const tA = a.receivedAt ? new Date(a.receivedAt).getTime() : new Date(a.createdAt).getTime();
          const tB = b.receivedAt ? new Date(b.receivedAt).getTime() : new Date(b.createdAt).getTime();
          return tB - tA;
        });
      }
      
      return isArray ? merged : merged[0];
    },

    /**
     * beforeUpdate: Route updates of `isRead`, `isClicked`, and `isDeleted` to the Receptionist collection,
     * protecting the shared NotificationContent from being mutated.
     */
    async beforeUpdate(ctx) {
      const { body, docId, userId } = ctx;
      if (body.isRead !== undefined || body.isClicked !== undefined || body.isDeleted !== undefined) {
         const updateFields = {};
         if (body.isRead !== undefined) {
           updateFields.isRead = body.isRead;
           if (body.isRead) updateFields.readAt = new Date();
         }
         if (body.isClicked !== undefined) {
           updateFields.isClicked = body.isClicked;
           if (body.isClicked) updateFields.clickedAt = new Date();
         }
         if (body.isDeleted !== undefined) {
           updateFields.isDeleted = body.isDeleted;
         }

         ctx.receptionistUpdatePayload = { notificationId: docId, receiver: userId, updateFields };
         
         // Prevent these fields from being saved to the main notifications collection
         delete body.isRead;
         delete body.isClicked;
         delete body.isDeleted;
      }
    },

    async afterUpdate(ctx) {
      if (ctx.receptionistUpdatePayload) {
        const { default: models } = await import('../models/Collection.js');
        const { notificationId, receiver, updateFields } = ctx.receptionistUpdatePayload;
        await models.NotificationReceptionist.updateOne(
          { notificationId, receiver },
          { $set: updateFields }
        );
      }
    }
  };
}
