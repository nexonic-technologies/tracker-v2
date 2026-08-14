import models from '../../models/Collection.js';
import mongoose from 'mongoose';

const Task = models.tasks;


class TaskAnalyticsService {
  /**
   * Get basic task counts by status for a specific project/client or user
   */
  async getStatusDistribution(query = {}) {
    const pipeline = [
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ];
    return await Task.aggregate(pipeline);
  }

  /**
   * Calculate average time spent in each stage for a specific set of tasks
   */
  async getAverageStageDuration(query = {}) {
    const pipeline = [
      { $match: query },
      { $unwind: "$stageHistory" },
      { 
        $group: { 
          _id: "$stageHistory.stage", 
          avgDurationSeconds: { $avg: "$stageHistory.duration" },
          totalTasks: { $sum: 1 }
        } 
      },
      {
        $project: {
          stage: "$_id",
          avgDurationHours: { $divide: ["$avgDurationSeconds", 3600] },
          totalTasks: 1,
          _id: 0
        }
      }
    ];
    return await Task.aggregate(pipeline);
  }

  /**
   * Get productivity analytics for a specific employee
   */
  async getEmployeeProductivity(employeeId, startDate, endDate) {
    const matchQuery = { 
      assignedTo: new mongoose.Types.ObjectId(employeeId) 
    };
    
    if (startDate && endDate) {
      matchQuery.updatedAt = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    const pipeline = [
      { $match: matchQuery },
      { 
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: { 
            $sum: { 
              $cond: [{ $in: ["$status", ["Completed", "done", "resolved"]] }, 1, 0] 
            } 
          },
          totalEstimatedHours: { $sum: "$estimatedHours" },
          totalActualHours: { $sum: "$actualHours" }
        }
      }
    ];
    
    const results = await Task.aggregate(pipeline);
    return results[0] || { totalTasks: 0, completedTasks: 0, totalEstimatedHours: 0, totalActualHours: 0 };
  }
}

export const taskAnalyticsService = new TaskAnalyticsService();
