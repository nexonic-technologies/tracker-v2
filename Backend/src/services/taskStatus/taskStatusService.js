import models from '../../models/Collection.js';
const Task = models.tasks;

import { ACTIVE_TASK_STATUSES } from './taskStatusConstants.js';
import { taskStatusRules } from './taskStatusRules.js';
import { pauseActiveTimerOnCheckout } from '.TimeTrackerSessions.js';

// Optional: import activityService from '../activityService.js';
// To keep it simple and decoupled for now, we can update the stageHistory directly

class TaskStatusService {
  /**
   * Handle business rules when an employee checks out.
   * 1. Finds all active tasks assigned to the employee and puts them on Hold.
   * 2. Auto-pauses any active job session (via time_tracker_session service).
   * 
   * @param {string} employeeId - The ID of the employee checking out
   * @param {string} systemUserId - Optional ID of the user triggering this (usually same as employeeId or system)
   */
  async handleEmployeeCheckout(employeeId, systemUserId = null) {
    if (!employeeId) return;

    try {
      // 1. Retrieve all tasks where the employee is assigned AND the task is in an active state
      const activeTasks = await Task.find({
        assignedTo: employeeId,
        status: { $in: ACTIVE_TASK_STATUSES }
      });

      if (!activeTasks.length) {
        // Still need to check for active job sessions even if no active tasks
      } else {
        const holdStatus = taskStatusRules.getTargetHoldStatus();
        const now = new Date();

        // 2. Process each active task
        // We process individually to properly update the stageHistory and trigger any potential hooks
        // In the future, this could be optimized with a bulkWrite if stageHistory logic is externalized
        for (const task of activeTasks) {
          const oldStatus = task.status;
          task.status = holdStatus;

          // Update stageHistory: calculate duration for the previous stage
          if (task.stageHistory && task.stageHistory.length > 0) {
            const lastStage = task.stageHistory[task.stageHistory.length - 1];
            // If the last stage was the active stage, calculate its duration
            if (lastStage && lastStage.stage === oldStatus) {
              lastStage.duration = Math.max(0, Math.floor((now.getTime() - new Date(lastStage.enteredAt).getTime()) / 1000));
            }
          }

          // Push the new Hold stage
          if (!task.stageHistory) task.stageHistory = [];
          task.stageHistory.push({
            stage: holdStatus,
            enteredAt: now,
            duration: 0
          });

          await task.save();

          // Note: activityLogger middleware handles request-response logging. 
          // For background tasks like this, we could call activityService.logActivity directly here.
        }

        console.log(`[TaskStatusService] Put ${activeTasks.length} tasks on Hold for employee ${employeeId} during checkout.`);
      }

      // 3. Auto-pause any active job session
      // This triggers the TTS service hooks which handle cost snapshot preservation
      // and attendance sync. The session is paused (not completed) so the employee
      // can resume it when they check in next time.
      try {
        await pauseActiveTimerOnCheckout(employeeId);
      } catch (timerErr) {
        console.warn('[TaskStatusService] Could not auto-pause timer on checkout:', timerErr.message);
        // Don't block checkout if timer pause fails
      }

    } catch (error) {
      console.error('[TaskStatusService] Error handling employee checkout:', error);
      // We don't throw here to prevent blocking the attendance checkout process itself
    }
  }
}

export const taskStatusService = new TaskStatusService();

