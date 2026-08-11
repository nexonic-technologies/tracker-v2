/**
 * ganttRoutes.js
 *
 * Custom routes for:
 *   GET  /api/employees/:id/gantt-queue   — queue-projected Gantt data + utilizationPercent
 *   POST /api/tickets/:id/recalculate-eta — manual ETA trigger (202 Accepted)
 *
 * These are custom because they perform joins + time projections that the
 * populate engine cannot express as a single model read.
 */
import express from 'express';
import { authMiddleware } from '../Controller/AuthController.js';

const router = express.Router();

// ── GET /api/employees/:id/gantt-queue ────────────────────────────────────────
router.get('/employees/:id/gantt-queue', authMiddleware, async (req, res) => {
  try {
    const { default: models } = await import('../models/Collection.js');
    const { resolveEmployeeAvailabilityRange } = await import('../utils/availability/availabilityResolver.js');
    const { computeDeliveryTime } = await import('../utils/productionTimeCalculator.js');

    const employeeId = req.params.id;

    // 1. Load ETA multiplier
    const settings = await models.general_settings.findOne().lean();
    const multiplier = settings?.taskETA?.multiplier ?? 3;

    // 2. Load employee queue
    const queueDoc = await models.employee_task_queues
      .findOne({ employeeId })
      .lean();

    const sortedQueue = queueDoc?.queue
      ? [...queueDoc.queue].sort((a, b) => a.order - b.order)
      : [];

    // 3. Load availability range schedule (30-day projection window)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30);
    const availability = await resolveEmployeeAvailabilityRange(employeeId, startDate, endDate);

    // 4. Stable anchor: today at 09:00 (keeps Gantt bars stable)
    const anchor = new Date();
    anchor.setHours(9, 0, 0, 0);

    // 5. Walk queue — project each task onto the timeline
    let queueAheadHours = 0;
    const entries = [];

    for (const item of sortedQueue) {
      const estimatedH = item.estimatedHours || 2;

      // Fetch task details
      const task = await models.tasks
        .findById(item.taskId)
        .select('title status priorityLevel estimatedHours linkedTicketId sprintId stageHistory')
        .lean();

      if (!task) continue;

      const isActive = task.status === 'In Progress';

      // Projected start
      const projectedStartResult = computeDeliveryTime(anchor, queueAheadHours, availability);
      const projectedStart = projectedStartResult.deliveryDate;

      // Projected end
      const projectedEndResult = computeDeliveryTime(anchor, queueAheadHours + estimatedH * multiplier, availability);
      const projectedEnd = projectedEndResult.deliveryDate;

      entries.push({
        _id: item.taskId,
        order: item.order,
        taskId: item.taskId,
        title: task.title || item.taskName || 'Untitled',
        status: task.status,
        priorityLevel: task.priorityLevel || item.priorityLevel || 'Low',
        estimatedHours: estimatedH,
        isActive,
        projectedStart,
        projectedEnd,
        linkedTicketId: task.linkedTicketId || null
      });

      queueAheadHours += estimatedH;
    }

    // 6. Utilization %
    const standardDay = settings?.attendance?.workingHours ?? 8;
    const totalQueueHours = sortedQueue.reduce((sum, i) => sum + (i.estimatedHours || 2), 0);
    const projectionDays = Math.max(1, Math.ceil(totalQueueHours / standardDay));
    const utilizationPercent = Math.round((totalQueueHours / (projectionDays * standardDay)) * 100);

    res.json({
      success: true,
      data: {
        employeeId,
        computedAt: new Date(),
        queueDocId: queueDoc?._id || null,
        rawQueue: queueDoc?.queue || [],
        utilizationPercent,
        totalQueueHours,
        projectionDays,
        entries
      }
    });
  } catch (err) {
    console.error('[ganttRoutes] gantt-queue error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/tickets/:id/recalculate-eta ─────────────────────────────────────
router.post('/tickets/:id/recalculate-eta', authMiddleware, async (req, res) => {
  try {
    const { default: models } = await import('../models/Collection.js');
    const { scheduleETARecalculation } = await import('../utils/scheduleETARecalculation.js');

    const ticket = await models.tickets
      .findById(req.params.id)
      .select('assignedTo')
      .lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (!ticket.assignedTo?.length) {
      return res.status(400).json({ success: false, message: 'Ticket has no assigned developer' });
    }

    // Fire-and-forget recalculation
    for (const devId of ticket.assignedTo) {
      scheduleETARecalculation(devId.toString());
    }

    res.status(202).json({
      success: true,
      message: 'ETA recalculation scheduled',
      assignedTo: ticket.assignedTo
    });
  } catch (err) {
    console.error('[ganttRoutes] recalculate-eta error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/tasks/:id/reassign-suggestions ────────────────────────────────────
router.get('/tasks/:id/reassign-suggestions', authMiddleware, async (req, res) => {
  try {
    const { default: models } = await import('../models/Collection.js');
    const taskId = req.params.id;

    const task = await models.tasks.findById(taskId).lean();
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const currentAssigneeId = task.assignedTo?.[0];
    let deptId = null;
    let roleId = null;

    if (currentAssigneeId) {
      const currentEmployee = await models.employees.findById(currentAssigneeId).lean();
      deptId = currentEmployee?.professionalInfo?.department;
      roleId = currentEmployee?.professionalInfo?.role;
    }

    // Find other candidate developers
    const query = { status: { $ne: 'Inactive' } };
    if (currentAssigneeId) {
      query._id = { $ne: currentAssigneeId };
    }

    const candidates = await models.employees
      .find(query)
      .select('basicInfo.firstName basicInfo.lastName professionalInfo.department professionalInfo.role')
      .lean();

    const scored = [];
    for (const cand of candidates) {
      let score = 100;

      // 1. Role/Dept Matching (40% Weight)
      const matchesDept = deptId && cand.professionalInfo?.department?.toString() === deptId.toString();
      const matchesRole = roleId && cand.professionalInfo?.role?.toString() === roleId.toString();

      if (matchesDept) score += 30;
      if (matchesRole) score += 10;

      // 2. Load Check (40% Weight)
      const queueDoc = await models.employee_task_queues
        .findOne({ employeeId: cand._id })
        .lean();

      const queueHours = (queueDoc?.queue || []).reduce((sum, item) => sum + (item.estimatedHours || 2), 0);

      // Deduct points based on queued hours (40 hours capacity benchmark)
      score -= queueHours * 2;

      scored.push({
        employeeId: cand._id,
        name: `${cand.basicInfo?.firstName || ''} ${cand.basicInfo?.lastName || ''}`.trim(),
        matchesDept: !!matchesDept,
        matchesRole: !!matchesRole,
        queueHours,
        score: Math.max(0, score)
      });
    }

    // Sort by highest score first
    scored.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: scored.slice(0, 5) // return top 5
    });
  } catch (err) {
    console.error('[ganttRoutes] reassign-suggestions error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
