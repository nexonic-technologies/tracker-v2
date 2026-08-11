import mongoose from "mongoose";
import models from '../models/Collection.js';


/**
 * Sync employee task queues when task assignees change.
 * Wrapped in a transaction to prevent race conditions and queue corruption.
 */
export async function syncTaskQueueAssignment(taskId, newAssignees = [], oldAssignees = []) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const newSet = new Set((newAssignees || []).map(id => id.toString()));
      const oldSet = new Set((oldAssignees || []).map(id => id.toString()));

      const added = [...newSet].filter(id => !oldSet.has(id));
      const removed = [...oldSet].filter(id => !newSet.has(id));

      // 1. Remove from unassigned employees' queues
      for (const empId of removed) {
        await models.employee_task_queues.updateOne(
          { employeeId: empId },
          { $pull: { queue: { taskId } } },
          { session }
        );
        const queueDoc = await models.employee_task_queues.findOne({ employeeId: empId }).session(session);
        if (queueDoc) {
          queueDoc.queue.sort((a, b) => a.order - b.order);
          queueDoc.queue.forEach((item, idx) => {
            item.order = idx;
          });
          await queueDoc.save({ session });
        }
      }

      // 2. Add to newly assigned employees' queues (with denormalized fields)
      if (added.length > 0) {
        const taskDoc = await models.tasks.findById(taskId)
          .populate("clientId", "name")
          .session(session)
          .lean();

        if (taskDoc) {
          const taskName = taskDoc.title;
          const clientName = taskDoc.clientId?.name || "";
          const estimatedHours = taskDoc.estimatedHours || 2;
          const priorityLevel = taskDoc.priorityLevel || "Low";

          for (const empId of added) {
            let queueDoc = await models.employee_task_queues.findOne({ employeeId: empId }).session(session);
            if (!queueDoc) {
              const created = await models.employee_task_queues.create([{
                employeeId: empId,
                queue: []
              }], { session });
              queueDoc = created[0];
            }
            const exists = queueDoc.queue.some(item => item.taskId.toString() === taskId.toString());
            if (!exists) {
              const nextOrder = queueDoc.queue.length;
              queueDoc.queue.push({
                taskId,
                order: nextOrder,
                taskName,
                clientName,
                estimatedHours,
                priorityLevel
              });
              await queueDoc.save({ session });
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("[employee_task_queueservice] Sync assignment error:", error);
  } finally {
    await session.endSession();
  }
}

/**
 * employee_task_queues Service Factory
 */
export default function employee_task_queues() {
  return {
    beforeCreate: async (ctx) => {
      const { body } = ctx;
      if (body.queue) {
        // Enforce uniqueness of taskId and sequential order
        const taskIds = new Set();
        body.queue.forEach((item) => {
          if (!item.taskId) throw new Error("taskId is required for queue items.");
          const tid = item.taskId.toString();
          if (taskIds.has(tid)) {
            throw new Error(`Duplicate taskId ${item.taskId} in queue is not allowed.`);
          }
          taskIds.add(tid);
        });
        body.queue.sort((a, b) => a.order - b.order);
        body.queue.forEach((item, idx) => {
          item.order = idx;
        });
      }
    },

    beforeUpdate: async (ctx) => {
      const { body } = ctx;
      if (body.queue) {
        const taskIds = new Set();
        body.queue.forEach((item) => {
          if (!item.taskId) throw new Error("taskId is required for queue items.");
          const tid = item.taskId.toString();
          if (taskIds.has(tid)) {
            throw new Error(`Duplicate taskId ${item.taskId} in queue is not allowed.`);
          }
          taskIds.add(tid);
        });
        body.queue.sort((a, b) => a.order - b.order);
        body.queue.forEach((item, idx) => {
          item.order = idx;
        });
      }
    },

    afterUpdate: async (ctx) => {
      const { result } = ctx;
      if (result && result.employeeId) {
        try {
          const { scheduleETARecalculation } = await import("../utils/scheduleETARecalculation.js");
          await scheduleETARecalculation(result.employeeId);
        } catch (err) {
          console.error("[employee_task_queueservice] afterUpdate error:", err.message);
        }
      }
    }
  };
}
