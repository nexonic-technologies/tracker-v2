import ticketTaskSync from './business/ticketTaskSync.js';
import asyncNotificationService from '../utils/notification/asyncNotificationService.js';
import { normalizeObjectIdArray } from '../utils/normalizeObjectId.js';

/**
 * Resolve ticket status from task status using DB status_mapping only.
 * Returns null if no active mapping is configured — sync is skipped.
 */
async function resolveTicketStatus(taskStatus) {
  if (!taskStatus) return null;
  try {
    const { default: models } = await import('../models/Collection.js');
    const mapping = await models.status_mappings.findOne({
      sourceModel: 'tasks',
      targetModel: 'tickets',
      isActive: true,
    }).lean();
    if (mapping?.mappings?.length) {
      const entry = mapping.mappings.find(m => m.sourceStatus === taskStatus);
      if (entry?.targetStatus) return entry.targetStatus;
    }
  } catch (err) {
    console.error('[TicketSync] resolveTicketStatus error:', err.message);
  }

  // Fallback status mapping
  const fallbackMapping = {
    'Backlogs': 'Open',
    'To Do': 'Open',
    'In Progress': 'In Progress',
    'In Review': 'In Progress',
    'Approved': 'Resolved',
    'Rejected': 'In Progress',
    'Completed': 'Resolved',
    'Closed': 'Closed',
  };
  return fallbackMapping[taskStatus] || null;
}

/**
 * Sync all tickets linked to taskId via linkedTaskId field.
 */
async function syncLinkedTickets(taskId, taskStatus, userId) {
  const ticketStatus = await resolveTicketStatus(taskStatus);
  if (!ticketStatus) return;

  const { default: models } = await import('../models/Collection.js');
  const { buildQuery } = await import('../utils/policy/policyEngine.js');

  // Look up Super Admin role dynamically
  const allRoles = await models.roles.find({}).lean();
  console.log('[DEBUG-SYNC] Available roles in DB:', allRoles.map(r => `"${r.name}" (${r._id})`));
  let adminRole = await models.roles.findOne({ name: { $regex: /^(super\s*admin|admin|superadmin)$/i } }).lean();
  if (!adminRole) {
    adminRole = await models.roles.findOne({ name: /admin/i }).lean();
  }
  const roleId = adminRole ? adminRole._id.toString() : 'Super Admin';
  console.log('[DEBUG-SYNC] Resolved admin roleId:', roleId);

  const tickets = await models.tickets.find({ linkedTaskId: taskId });

  for (const ticket of tickets) {
    if (ticketStatus === ticket.status) continue;
    await buildQuery({
      role: roleId,
      userId: userId || '000000000000000000000000',
      action: 'update',
      modelName: 'tickets',
      docId: ticket._id,
      body: {
        status: ticketStatus,
        ...(ticketStatus === 'Resolved' && { resolvedAt: new Date() }),
        ...(ticketStatus === 'Closed' && { closedAt: new Date() }),
      }
    });
    console.log(`[TicketSync] Ticket ${ticket._id}: ${ticket.status} → ${ticketStatus}`);
  }
}

const syncMilestoneStatus = async (clientId, milestoneId, status) => {
  if (!milestoneId) return;
  try {
    const { default: models } = await import('../models/Collection.js');
    await models.clients.updateOne(
      { _id: clientId, 'milestones.milestoneId': milestoneId },
      { $set: { 'milestones.$.status': status } }
    );
    await models.tickets.updateMany(
      { clientId, milestoneId },
      { milestoneStatus: status }
    );
  } catch (error) {
    console.error('Error syncing milestone status:', error);
  }
};

// ─── Service factory (REQUIRED pattern for servicesCache loader) ─────────────
export default function tasks() {
  return {

    // ── BEFORE CREATE ──────────────────────────────────────────────────────
    beforeCreate: async (ctx) => {
      const { body, user } = ctx;
      const userId = user?.id;
      const { default: models } = await import('../models/Collection.js');

      // Normalize ObjectId array fields to prevent string splitting / CastError
      body.assignedTo = normalizeObjectIdArray(body.assignedTo);
      body.followers = normalizeObjectIdArray([...(body.followers ? (Array.isArray(body.followers) ? body.followers : [body.followers]) : []), userId]);
      body.blockedBy = normalizeObjectIdArray(body.blockedBy);
      body.blocking = normalizeObjectIdArray(body.blocking);

      if (typeof body.checklist === 'string') {
        try { body.checklist = JSON.parse(body.checklist); } catch (e) { }
      }

      if (body.attachments && Array.isArray(body.attachments)) {
        body.attachments = body.attachments.map(att => typeof att === 'object' && att.path ? att.path : att);
      }

      // Check client active status & projectType validation
      if (body.clientId) {
        const client = await models.clients.findById(body.clientId);
        if (!client || client.Status !== 'Active') {
          throw new Error(`Cannot create tasks for this client. The client must be Active (current status: "${client ? client.Status : 'Not Found'}").`);
        }

        if (body.projectTypeId) {
          const approvedTypes = client.project_types.map(id => id.toString());
          if (!approvedTypes.includes(body.projectTypeId.toString())) {
            throw new Error(`This project type/service is not approved for client "${client.name}". Please purchase this module first.`);
          }
        }
      }

      try {
        const config = await models.status_configss.findOne({ modelName: 'tasks' }).lean();
        if (config) {
          if (!body.status && config.workflowStatuses?.length) {
            const defWorkflow = config.workflowStatuses.find(s => s.isDefault);
            if (defWorkflow) body.status = defWorkflow.key;
          }
          if (!body.metaStatus && config.metaStatuses?.length) {
            const defMeta = config.metaStatuses.find(s => s.isDefault);
            if (defMeta) body.metaStatus = defMeta.key;
          }
        }
      } catch (err) {
        console.error('[TaskService] beforeCreate config error:', err.message);
      }
    },

    // ── AFTER CREATE ───────────────────────────────────────────────────────
    afterCreate: async (ctx) => {
      const { docId, user } = ctx;
      const userId = user?.id;
      try {
        const { default: models } = await import('../models/Collection.js');

        const taskDoc = await models.tasks.findById(docId)
          .populate('createdBy', 'basicInfo.firstName basicInfo.lastName')
          .populate('assignedTo', 'basicInfo.firstName basicInfo.lastName');

        if (!taskDoc) return;

        const creatorName = `${taskDoc.createdBy?.basicInfo?.firstName || ''} ${taskDoc.createdBy?.basicInfo?.lastName || ''}`.trim() || 'User';

        // Create comment thread
        const thread = await models.comments_threads.create({
          taskId: taskDoc._id.toString(),
          comments: [{ commentedBy: userId, message: `Task created by ${creatorName}` }],
        });
        taskDoc.commentsThread = thread._id;
        await taskDoc.save();

        // Notify assignees
        for (const assignee of taskDoc.assignedTo || []) {
          if (assignee._id.toString() === userId.toString()) continue;
          await asyncNotificationService.queuePushNotification(
            assignee._id,
            'Task Assignment',
            `New task assigned: ${taskDoc.title}`,
            { taskId: docId, type: 'task_assignment' }
          );
        }

        // Sync assignment queue
        const { syncTaskQueueAssignment } = await import("./employee_task_queues.js");
        await syncTaskQueueAssignment(taskDoc._id, taskDoc.assignedTo || []);
      } catch (error) {
        console.error('Task afterCreate error:', error);
      }
    },

    // ── BEFORE UPDATE ──────────────────────────────────────────────────────
    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;

      if (body.assignedTo !== undefined) body.assignedTo = normalizeObjectIdArray(body.assignedTo);
      if (body.followers !== undefined) body.followers = normalizeObjectIdArray(body.followers);
      if (body.blockedBy !== undefined) body.blockedBy = normalizeObjectIdArray(body.blockedBy);
      if (body.blocking !== undefined) body.blocking = normalizeObjectIdArray(body.blocking);

      if (typeof body.checklist === 'string') {
        try { body.checklist = JSON.parse(body.checklist); } catch (e) { }
      }

      if (body.attachments && Array.isArray(body.attachments)) {
        body.attachments = body.attachments.map(att => typeof att === 'object' && att.path ? att.path : att);
      }
      if (!body.status) return;

      const { default: models } = await import('../models/Collection.js');
      const currentTask = await models.tasks.findById(docId).select('status stageHistory createdAt blockedBy').lean();

      if (!currentTask || currentTask.status === body.status) return;

      // 1. Dependency Validation
      if (!['Backlogs', 'To Do', 'Rejected'].includes(body.status)) {
        if (currentTask.blockedBy && currentTask.blockedBy.length > 0) {
          const blockingTasks = await models.tasks.find({
            _id: { $in: currentTask.blockedBy },
            status: { $nin: ['Completed', 'Approved', 'Rejected'] }
          }).select('title').lean();

          if (blockingTasks.length > 0) {
            const blockingTitles = blockingTasks.map(t => t.title).join(', ');
            throw new Error(`Cannot update status to ${body.status}. This task is blocked by: ${blockingTitles}`);
          }
        }
      }

      // 2. Stage duration tracking
      const now = new Date();
      let newStageHistory = currentTask.stageHistory ? [...currentTask.stageHistory] : [];

      // Calculate duration for the previous stage
      if (newStageHistory.length > 0) {
        const lastStage = newStageHistory[newStageHistory.length - 1];
        if (lastStage.stage === currentTask.status) {
          lastStage.duration = Math.max(0, Math.floor((now.getTime() - new Date(lastStage.enteredAt).getTime()) / 1000));
        }
      } else {
        // Seed initial stage if it doesn't exist
        const enteredAt = currentTask.createdAt || now;
        newStageHistory.push({
          stage: currentTask.status,
          enteredAt,
          duration: Math.max(0, Math.floor((now.getTime() - new Date(enteredAt).getTime()) / 1000))
        });
      }

      // Push new stage
      newStageHistory.push({
        stage: body.status,
        enteredAt: now,
        duration: 0
      });

      body.stageHistory = newStageHistory;
    },

    // ── AFTER UPDATE ───────────────────────────────────────────────────────
    afterUpdate: async (ctx) => {
      const { docId, data: taskData, body: updateData, beforeDoc, user } = ctx;
      const role = user?.role;
      const userId = user?.id;
      try {
        const { default: models } = await import('../models/Collection.js');

        // 1. Sync ticket status via linkedTaskId (reverse-lookup on tickets)
        if (updateData.status) {
          await syncLinkedTickets(taskData._id, updateData.status, userId);
        }

        // 2. Sync ticket status via linkedTicketId on the task itself
        if (updateData.status && taskData.linkedTicketId) {
          const ticketStatus = await resolveTicketStatus(updateData.status);
          if (ticketStatus) {
            const existing = await models.tickets.findById(taskData.linkedTicketId).lean();
            if (existing && existing.status !== ticketStatus) {
              const { buildQuery } = await import('../utils/policy/policyEngine.js');
              let adminRole = await models.roles.findOne({ name: { $regex: /^(super\s*admin|admin|superadmin)$/i } }).lean();
              if (!adminRole) {
                adminRole = await models.roles.findOne({ name: /admin/i }).lean();
              }
              const roleId = adminRole ? adminRole._id.toString() : 'Super Admin';
              await buildQuery({
                role: roleId,
                userId: userId || '000000000000000000000000',
                action: 'update',
                modelName: 'tickets',
                docId: taskData.linkedTicketId,
                body: {
                  status: ticketStatus,
                  ...(ticketStatus === 'Resolved' && { resolvedAt: new Date() }),
                  ...(ticketStatus === 'Closed' && { closedAt: new Date() }),
                }
              });
              console.log(`[TicketSync] Ticket ${taskData.linkedTicketId}: ${existing.status} → ${ticketStatus}`);
            }
          }
        }

        // 3. Sync assignment to linked ticket
        if (updateData.assignedTo && taskData.linkedTicketId) {
          await ticketTaskSync.syncTaskAssignmentToTicket(taskData._id, updateData.assignedTo, userId);
        }

        // Sync task queue assignment
        if (updateData.assignedTo) {
          const { syncTaskQueueAssignment } = await import("./employee_task_queues.js");
          await syncTaskQueueAssignment(taskData._id, updateData.assignedTo, beforeDoc?.assignedTo || []);

          // Fire ETA recalculation for newly assigned devs (non-blocking)
          if (taskData.linkedTicketId) {
            const oldAssigned = (beforeDoc?.assignedTo || []).map(String);
            const newAssigned = (updateData.assignedTo || []).map(String);
            const addedDevs = newAssigned.filter(id => !oldAssigned.includes(id));
            if (addedDevs.length) {
              const { scheduleETARecalculation } = await import('./business/etaEngine.js');
              for (const devId of addedDevs) scheduleETARecalculation(devId);
            }
          }
        }

        // 4. Sync milestone status & Auto-Achieve
        if (updateData.status === 'Completed' && taskData.milestoneId && taskData.clientId) {
          try {
            // Check if all tasks for this milestone are completed
            const siblingTasks = await models.tasks.find({
              clientId: taskData.clientId,
              milestoneId: taskData.milestoneId,
              _id: { $ne: taskData._id }
            }).select('status').lean();

            const allCompleted = siblingTasks.every(t => t.status === 'Completed' || t.status === 'Approved');

            if (allCompleted) {
              await models.clients.updateOne(
                { _id: taskData.clientId, 'milestones.milestoneId': taskData.milestoneId },
                {
                  $set: {
                    'milestones.$.status': 'Achieved',
                    'milestones.$.completedDate': new Date()
                  }
                }
              );

              // Log Audit
              const { saveAuditLog } = await import('../utils/auditLogger.js');
              await saveAuditLog({
                action: 'achieve_milestone',
                modelName: 'clients',
                userId: userId || 'system',
                docId: taskData.clientId,
                metadata: {
                  event: 'MILESTONE_AUTO_ACHIEVED',
                  milestoneId: taskData.milestoneId,
                  triggerTaskId: taskData._id
                }
              });

              console.log(`[Task Service] Milestone ${taskData.milestoneId} for client ${taskData.clientId} AUTO-ACHIEVED.`);
            }
          } catch (err) {
            console.error('[Task Service] Milestone auto-achieve error:', err.message);
          }
        } else if (updateData.milestoneStatus && taskData.milestoneId) {
          await syncMilestoneStatus(taskData.clientId, taskData.milestoneId, updateData.milestoneStatus);
        }

        // 4b. Auto-archive & queue removal on Completed
        if (updateData.status === 'Completed' && beforeDoc?.status !== 'Completed') {
          try {
            // Mark task as archived so it disappears from active views
            await models.tasks.updateOne(
              { _id: taskData._id },
              { $set: { metaStatus: 'archived' } }
            );

            // Remove from all assignees' queues
            const assignees = (taskData.assignedTo || []).map(id => id.toString());
            if (assignees.length > 0) {
              await models.employee_task_queues.updateMany(
                { employeeId: { $in: assignees } },
                { $pull: { queue: { taskId: taskData._id } } }
              );
            }

            console.log(`[Task Service] Task ${taskData._id} auto-archived and removed from queues.`);
          } catch (err) {
            console.error('[Task Service] Auto-archive error:', err.message);
          }
        }

        // 5. Notifications
        const taskDoc = await models.tasks.findById(taskData._id)
          .populate('assignedTo', 'basicInfo.firstName basicInfo.lastName')
          .populate('followers', 'basicInfo.firstName basicInfo.lastName');

        if (!taskDoc) return;

        const updater = await models.employees.findById(userId).select('basicInfo.firstName basicInfo.lastName');
        const updaterName = `${updater?.basicInfo?.firstName || ''} ${updater?.basicInfo?.lastName || ''}`.trim() || 'User';

        // Comment notification
        if (updateData._isComment) {
          const commentText = updateData._commentText || '';
          const mentioned = (updateData._mentionedUserIds || []).map(String);
          await models.comments_threads.updateOne(
            { _id: taskDoc.commentsThread },
            { $push: { comments: { commentedBy: userId, message: commentText, mentions: mentioned } } }
          );
          const notifyUsers = new Set([
            ...(taskDoc.assignedTo || []).map(u => u._id.toString()),
            ...(taskDoc.followers || []).map(u => u._id.toString()),
            ...mentioned,
          ]);
          for (const receiverId of notifyUsers) {
            if (receiverId === userId.toString()) continue;
            await asyncNotificationService.queuePushNotification(
              receiverId, 'Task Comment',
              `${updaterName} commented: ${commentText.substring(0, 50)}...`,
              { taskId: taskData._id, type: 'task_comment', mentions: mentioned }
            );
          }
          return;
        }

        // Status change notification
        if (beforeDoc?.status && beforeDoc.status !== taskDoc.status) {
          const notifyUsers = new Set([
            ...(taskDoc.assignedTo || []).map(u => u._id.toString()),
            ...(taskDoc.followers || []).map(u => u._id.toString()),
          ]);
          for (const receiverId of notifyUsers) {
            if (receiverId === userId.toString()) continue;
            await asyncNotificationService.queuePushNotification(
              receiverId, 'Task Status Update',
              `${updaterName} changed task status to ${taskDoc.status}`,
              { taskId: taskData._id, type: 'task_status' }
            );
          }
        }

        // New assignee notification + auto-follow
        const oldAssigned = (beforeDoc?.assignedTo || []).map(String);
        const newAssigned = (taskDoc.assignedTo || []).map(u => u._id.toString());
        const addedAssignees = newAssigned.filter(id => !oldAssigned.includes(id));

        for (const receiverId of addedAssignees) {
          if (receiverId === userId.toString()) continue;
          await asyncNotificationService.queuePushNotification(
            receiverId, 'New Task Assignment',
            `${updaterName} assigned you to task: ${taskDoc.title}`,
            { taskId: taskData._id, type: 'task_assignment' }
          );
        }
        if (addedAssignees.length) {
          const followersSet = new Set((taskDoc.followers || []).map(u => u._id.toString()));
          const newFollowers = addedAssignees.filter(id => !followersSet.has(id));
          if (newFollowers.length) {
            await models.tasks.findByIdAndUpdate(taskData._id, {
              $addToSet: { followers: { $each: newFollowers } },
            });
          }
        }

      } catch (error) {
        console.error('Task afterUpdate error:', error);
      }
    },
  };
}