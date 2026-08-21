import { pauseActiveTimerOnCheckout } from '../time_tracker_sessions.js';

/**
 * Handle business rules when an employee checks out.
 * 1. Finds all active tasks assigned to the employee and puts them on Hold.
 * 2. Auto-pauses any active job session (via timetrackersessions service).
 * 
 * @param {string} employeeId - The ID of the employee checking out
 * @param {string} systemUserId - Optional ID of the user triggering this
 * @param {object} ctx - Request context for tenant isolation
 */
export async function handleEmployeeCheckout(employeeId, systemUserId = null, ctx = {}) {
  if (!employeeId) return;

  try {
    const TaskModel = ctx?.tenantContext?.getModel
      ? ctx.tenantContext.getModel('tasks')
      : (await import('../../models/Task.js')).default;

    const StatusConfigModel = ctx?.tenantContext?.getModel
      ? ctx.tenantContext.getModel('status_configs')
      : null;

    let activeStatuses = ['In Progress', 'In progress', 'Working', 'doing', 'processing'];
    let holdStatus = 'Hold';

    if (StatusConfigModel) {
      try {
        const activeConfigs = await StatusConfigModel.find({ isTerminal: false }).lean();
        if (activeConfigs && activeConfigs.length > 0) {
          activeStatuses = activeConfigs.map(c => c.statusKey || c.name);
        }
      } catch (_) {}
    }

    // 1. Retrieve all tasks where the employee is assigned AND the task is in an active state
    const activeTasks = await TaskModel.find({
      assignedTo: employeeId,
      status: { $in: activeStatuses }
    });

    if (activeTasks && activeTasks.length > 0) {
      const now = new Date();

      for (const task of activeTasks) {
        const oldStatus = task.status;
        task.status = holdStatus;

        if (task.stageHistory && task.stageHistory.length > 0) {
          const lastStage = task.stageHistory[task.stageHistory.length - 1];
          if (lastStage && lastStage.stage === oldStatus) {
            lastStage.duration = Math.max(0, Math.floor((now.getTime() - new Date(lastStage.enteredAt).getTime()) / 1000));
          }
        }

        if (!task.stageHistory) task.stageHistory = [];
        task.stageHistory.push({
          stage: holdStatus,
          enteredAt: now,
          duration: 0
        });

        await task.save();
      }

      console.log(`[attendanceCheckoutHelper] Put ${activeTasks.length} tasks on Hold for employee ${employeeId} during checkout.`);
    }

    // 2. Auto-pause any active job session
    try {
      await pauseActiveTimerOnCheckout(employeeId);
    } catch (timerErr) {
      console.warn('[attendanceCheckoutHelper] Could not auto-pause timer on checkout:', timerErr.message);
    }

  } catch (error) {
    console.error('[attendanceCheckoutHelper] Error handling employee checkout:', error.message);
  }
}

export const taskStatusService = { handleEmployeeCheckout };
