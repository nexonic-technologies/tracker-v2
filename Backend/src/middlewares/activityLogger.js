import activityService from '../services/activityService.js';

export const activityLogger = (action) => async (req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    // After successful response, log activity
    if (res.statusCode < 400 && req.task) {
      activityService.logActivity(
        req.task._id,
        req.task.projectId,
        action,
        {
          oldValue: req.task.toObject ? req.task.toObject() : req.task,
          newValue: data
        },
        req.user?._id || req.body?.userId
      ).catch(console.error);
    }

    return originalJson.call(this, data);
  };

  next();
};
