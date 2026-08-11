import mongoose from "mongoose";

/**
 * Sprints Service
 * Lifecycle hooks and business logic for Sprint management.
 */
export default function sprints() {
  return {
    beforeCreate: async (ctx) => {
      const { body, user } = ctx;
      if (user) {
        body.createdBy = user.id;
      }
    },

    afterCreate: async (ctx) => {
      const { docId } = ctx;
      if (!docId) return;

      const { default: models } = await import("../models/Collection.js");

      // Fetch the newly created sprint to check if tasks were pre-populated
      const sprint = await models.sprints.findById(docId).lean();
      if (!sprint || !sprint.tasks || sprint.tasks.length === 0) return;

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await models.tasks.updateMany(
            { _id: { $in: sprint.tasks } },
            {
              $set: { sprintId: docId },
              $addToSet: { sprintHistory: docId }
            },
            { session }
          );
        });
      } catch (err) {
        console.error("[SprintService] afterCreate sync transaction failed:", err);
      } finally {
        await session.endSession();
      }
    },

    beforeUpdate: async (ctx) => {
      const { docId, body } = ctx;
      if (!docId) return;
      const { default: models } = await import("../models/Collection.js");
      const oldSprint = await models.sprints.findById(docId).lean();
      if (oldSprint) {
        body._oldTasks = oldSprint.tasks || [];
        body._oldStatus = oldSprint.status;
      }
    },

    afterUpdate: async (ctx) => {
      const { data: updatedSprint, body } = ctx;
      const { default: models } = await import("../models/Collection.js");
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const oldTasks = body._oldTasks || [];
          const newTasks = updatedSprint.tasks || [];

          const oldSet = new Set(oldTasks.map(id => id.toString()));
          const newSet = new Set(newTasks.map(id => id.toString()));

          const addedTasks = newTasks.filter(id => !oldSet.has(id.toString()));
          const removedTasks = oldTasks.filter(id => !newSet.has(id.toString()));

          // 1. Sync sprint IDs for task changes
          if (addedTasks.length > 0) {
            await models.tasks.updateMany(
              { _id: { $in: addedTasks } },
              {
                $set: { sprintId: updatedSprint._id },
                $addToSet: { sprintHistory: updatedSprint._id }
              },
              { session }
            );
          }

          if (removedTasks.length > 0) {
            await models.tasks.updateMany(
              { _id: { $in: removedTasks }, sprintId: updatedSprint._id },
              { $set: { sprintId: null } },
              { session }
            );
          }

          // 2. Check if sprint status changed to "Completed"
          const prevStatus = body._oldStatus;
          if (updatedSprint.status === "Completed" && prevStatus !== "Completed") {
            const tasks = await models.tasks.find({
              _id: { $in: updatedSprint.tasks || [] }
            }).session(session).lean();

            const incompleteTaskIds = tasks
              .filter(t => !["Completed", "Approved"].includes(t.status))
              .map(t => t._id);

            if (incompleteTaskIds.length > 0) {
              // Find the next upcoming/active sprint for the same client/project
              const nextSprint = await models.sprints.findOne({
                status: "Upcoming",
                clientId: updatedSprint.clientId,
                _id: { $ne: updatedSprint._id }
              }).sort({ startDate: 1 }).session(session);

              if (nextSprint) {
                // Add to next sprint tasks array
                await models.sprints.updateOne(
                  { _id: nextSprint._id },
                  { $addToSet: { tasks: { $each: incompleteTaskIds } } },
                  { session }
                );

                // Update sprint reference in tasks to point to next sprint, append to history
                await models.tasks.updateMany(
                  { _id: { $in: incompleteTaskIds } },
                  {
                    $set: { sprintId: nextSprint._id },
                    $addToSet: { sprintHistory: nextSprint._id }
                  },
                  { session }
                );
                console.log(`[SprintService] Carried forward ${incompleteTaskIds.length} incomplete tasks to sprint: ${nextSprint.name}`);
              } else {
                // No next sprint, reset sprintId to null (tasks go back to backlog), but keep in sprintHistory
                await models.tasks.updateMany(
                  { _id: { $in: incompleteTaskIds } },
                  { $set: { sprintId: null } },
                  { session }
                );
                console.log(`[SprintService] No upcoming sprint. Incomplete tasks returned to backlog.`);
              }
            }
          }
        });
      } catch (err) {
        console.error("[SprintService] Update transaction failed:", err);
      } finally {
        await session.endSession();
      }
    }
  };
}
