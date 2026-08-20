/**
 * employee_task_queue_requests Service
 * Coordinates request creation, dynamic workflow approvals, and queue updates.
 */
export default function employee_task_queue_requests() {
  return {
    beforeCreate: async (ctx) => {
      const { body } = ctx;
      if (!body.employeeId) {
        throw new Error("employeeId is required for task queue requests.");
      }

      // Auto-populate departmentId from employee record
      const { default: models } = await import("../models/Collection.js");
      const emp = await models.employees.findById(body.employeeId)
        .select("professionalInfo.department")
        .lean();
      if (emp?.professionalInfo?.department) {
        body.departmentId = emp.professionalInfo.department;
      }
    },

    afterCreate: async (ctx) => {
      const { docId } = ctx;
      const { default: models } = await import("../models/Collection.js");
      const doc = await models.employee_task_queue_requests.findById(docId);
      if (!doc) return;

      const approvalEngine = (await import("../utils/approval/approvalEngine.js")).default;
      await approvalEngine.initializeWorkflow("employee_task_queue_requests", doc);
    },

    beforeUpdate: async (ctx) => {
      const { docId, body } = ctx;
      if (!docId) return;
      const { default: models } = await import("../models/Collection.js");
      const oldDoc = await models.employee_task_queue_requests.findById(docId).lean();
      if (oldDoc) {
        body._oldStatus = oldDoc.status;
      }
    },

    afterUpdate: async (ctx) => {
      const { docId, body, userId } = ctx;
      if (!docId) return;

      const { default: models } = await import("../models/Collection.js");
      const doc = await models.employee_task_queue_requests.findById(docId);
      if (!doc) return;

      const prevStatus = body._oldStatus;
      const newStatus = doc.status;

      if (prevStatus === "Pending" && (newStatus === "Approved" || newStatus === "Rejected")) {
        const approvalEngine = (await import("../utils/approval/approvalEngine.js")).default;
        const result = await approvalEngine.advanceWorkflow(
          doc,
          userId,
          newStatus,
          body.approverComment || body.managerComments || ""
        );

        // If the workflow is completely approved/finalized, update the target EmployeeTaskQueue
        if (result?.finalized && result?.status === "Approved") {
          const session = await models.employee_task_queues.startSession();
          try {
            await session.withTransaction(async () => {
              await models.employee_task_queues.findOneAndUpdate(
                { employeeId: doc.employeeId },
                {
                  $set: {
                    queue: doc.requestedQueue.map(item => ({
                      taskId: item.taskId,
                      order: item.order,
                      taskName: item.taskName,
                      clientName: item.clientName,
                      estimatedHours: item.estimatedHours,
                      priorityLevel: item.priorityLevel
                    }))
                  }
                },
                { upsert: true, session }
              );
            });
            console.log(`[QueueRequestService] Successfully committed task queue update for employee: ${doc.employeeId}`);

            // Queue changed — recalculate ETAs for all linked tickets (non-blocking)
            const { scheduleETARecalculation } = await import('./business/etaEngine.js');
            scheduleETARecalculation(doc.employeeId.toString());
          } catch (err) {
            console.error("[QueueRequestService] Commit transaction failed:", err);
          } finally {
            await session.endSession();
          }
        }
      }
    }
  };
}
