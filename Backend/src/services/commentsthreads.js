import models from "../models/Collection.js";

const Task = models.tasks;
const Employee = models.employees;
import { sendNotification } from "../utils/notificationService.js";
import { generateNotification } from "../middlewares/notificationMessagePrasher.js";

export default function comments_threadsService() {
  return {
    async afterUpdate(ctx) {
      const { role, userId, docId, data, body } = ctx;
      try {
        // Check if comments were added
        if (body.$push?.comments) {
          const comment = body.$push.comments;
          const task = await Task.findById(data.taskId)
            .populate('assignedTo', 'basicInfo.firstName basicInfo.lastName')
            .populate('createdBy', 'basicInfo.firstName basicInfo.lastName')
            .populate('followers', 'basicInfo.firstName basicInfo.lastName');

          if (!task) return data;

          const commenter = await Employee.findById(userId).select('basicInfo.firstName basicInfo.lastName');
          const commenterName = `${commenter?.basicInfo?.firstName || ''} ${commenter?.basicInfo?.lastName || ''}`.trim();

          // Notify task participants
          const recipients = new Set();
          task.assignedTo?.forEach(user => recipients.add(user._id.toString()));
          if (task.createdBy) recipients.add(task.createdBy._id.toString());
          task.followers?.forEach(user => recipients.add(user._id.toString()));
          recipients.delete(userId.toString());

          // Send comment notifications
          for (const receiverId of recipients) {
            const message = generateNotification(
              commenterName,
              { type: "comment", comment: comment.message },
              "tasks"
            );

            await sendNotification({
              recipient: receiverId,
              sender: userId,
              type: 'task_comment',
              title: 'Task Comment',
              message,
              relatedModel: 'tasks',
              relatedId: data.taskId,
            });
          }

          // Handle mentions separately
          if (comment.mentions?.length > 0) {
            for (const mentionedUserId of comment.mentions) {
              if (mentionedUserId.toString() === userId.toString()) continue;

              const message = generateNotification(
                commenterName,
                { type: "comment", isMention: true },
                "tasks"
              );

              await sendNotification({
                recipient: mentionedUserId,
                sender: userId,
                type: 'task_mention',
                title: 'Task Mention',
                message,
                relatedModel: 'tasks',
                relatedId: data.taskId,
              });
            }
          }
        }

        return data;
      } catch (error) {
        console.error('Error in comments_threads afterUpdate:', error);
        return data;
      }
    }
  };
}