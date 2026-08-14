import models from '../models/Collection.js';

const ActivityLog = models.activity_logs;


class ActivityService {
  async logActivity(taskId, projectId, action, details, performedBy) {
    try {
      const log = await ActivityLog.create({
        taskId,
        projectId,
        action,
        details,
        performedBy,
        timestamp: new Date()
      });

      // Broadcast to connected users via WebSocket (to be integrated in Phase 1B)
      // if (global.io) {
      //   global.io.to(`task_${taskId}`).emit('activity:logged', log);
      // }

      return log;
    } catch (error) {
      console.error('[ActivityService] Failed to log activity:', error);
      throw error;
    }
  }

  async getTaskTimeline(taskId, options = {}) {
    const { limit = 50, skip = 0, action } = options;

    const query = { taskId };
    if (action) query.action = action;

    return ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'basicInfo.firstName basicInfo.lastName basicInfo.profileImage')
      .lean();
  }

  async searchByMention(taskId, userId) {
    return ActivityLog.find({
      taskId,
      'details.mentionedUsers': userId
    }).sort({ timestamp: -1 });
  }
}

export default new ActivityService();
