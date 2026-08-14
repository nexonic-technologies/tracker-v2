/**
 * scheduleETARecalculation.js
 *
 * Single entry point for all ETA updates.
 * Upgraded to use the leaves/attendance-aware Availability Resolver Stack,
 * log persisted operational_events, calculate confidence metrics, and prevent notification spam.
 */

/**
 * Fire-and-forget ETA batch recalculation for one employee.
 * @param {string|ObjectId} employeeId
 */
export async function scheduleETARecalculation(employeeId) {
  setImmediate(async () => {
    try {
      const { getTenantModel } = await import('../../tenant/tenantContext.js');
      const models = new Proxy({}, {
        get(_, prop) {
          const M = getTenantModel(String(prop));
          if (!M) throw new Error(`[ScheduleETARecalculation] Model "${String(prop)}" not found on active tenant context`);
          return M;
        }
      });
      const { resolveEmployeeAvailabilityRange } = await import('../../utils/availability/availabilityResolver.js');
      const { computeDeliveryTime } = await import('../../utils/productionTimeCalculator.js');

      // 1. Load configuration defaults from Settings
      const settings = await models.general_settings.findOne().lean();
      const multiplier = settings?.taskETA?.multiplier ?? 3;
      const etaEnabled = settings?.taskETA?.enabled ?? true;
      const projectionDays = settings?.taskETA?.projectionDays ?? 90; // Configurable projection window
      if (!etaEnabled) return;

      // 2. Load employee queue (ordered)
      const queueDoc = await models.employee_task_queues
        .findOne({ employeeId })
        .lean();

      if (!queueDoc?.queue?.length) return;

      const sortedQueue = [...queueDoc.queue].sort((a, b) => a.order - b.order);

      // 3. Resolve Availability Range (90 days projection)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + projectionDays);
      const availability = await resolveEmployeeAvailabilityRange(employeeId, startDate, endDate);

      // 4. Walk queue — calculate ETAs, severity, and delay classification
      let queueAheadHours = 0;
      const ticketUpdates = [];
      let delayCount = 0;
      let worstSeverity = 'INFO';
      let latestETA = null;
      let rootCauseReason = 'EMPLOYEE_ABSENCE';

      // Check today's availability to determine root cause
      const todayStatus = availability.find(d => {
        const dDate = new Date(d.date);
        const now = new Date();
        return dDate.getFullYear() === now.getFullYear() &&
          dDate.getMonth() === now.getMonth() &&
          dDate.getDate() === now.getDate();
      });

      if (todayStatus && !todayStatus.isWorkingDay) {
        rootCauseReason = todayStatus.reason === 'APPROVED_LEAVE' ? 'PLANNED_LEAVE' : 'EMPLOYEE_ABSENCE';
      }

      for (const item of sortedQueue) {
        const estimatedH = item.estimatedHours || 2;

        const task = await models.tasks
          .findById(item.taskId)
          .select('linkedTicketId sprintId title dueDate')
          .lean();

        if (task?.linkedTicketId) {
          const ticket = await models.tickets
            .findById(task.linkedTicketId)
            .select('dueDate')
            .lean();

          let eta;
          let confidenceLevel = 'HIGH';
          let confidenceScore = 0.95;

          if (task.sprintId) {
            const sprint = await models.sprints
              .findById(task.sprintId)
              .select('endDate')
              .lean();
            eta = sprint?.endDate || null;
          } else {
            // Adhoc queue projection
            const anchor = new Date();
            anchor.setHours(9, 0, 0, 0); // stable visual anchor

            const totalHours = queueAheadHours + estimatedH * multiplier;
            const result = computeDeliveryTime(anchor, totalHours, availability);
            eta = result.deliveryDate;

            // Determine Prediction Confidence
            const walkDays = availability.slice(0, result.workingDaysUsed || 1);
            const absentDays = walkDays.filter(d => !d.isWorkingDay && d.reason !== 'WEEKLY_OFF');
            const halfDays = walkDays.filter(d => d.reason.includes('HALF_DAY'));

            if (absentDays.length > 0) {
              confidenceLevel = 'LOW';
              confidenceScore = 0.45;
            } else if (halfDays.length > 0 || walkDays.some(d => d.reason === 'HOLIDAY')) {
              confidenceLevel = 'MEDIUM';
              confidenceScore = 0.75;
            }
          }

          if (eta) {
            // Check SLA Breaches against target due date
            const targetDue = task.dueDate || ticket?.dueDate || null;
            let severity = 'INFO';
            let isDelayed = false;

            if (targetDue && new Date(eta) > new Date(targetDue)) {
              isDelayed = true;
              const delayDiff = new Date(eta) - new Date(targetDue);
              const delayDays = delayDiff / (1000 * 60 * 60 * 24);

              if (delayDays > 3) {
                severity = 'CRITICAL';
              } else {
                severity = 'WARNING';
              }
            }

            if (isDelayed) {
              delayCount++;
              if (severity === 'CRITICAL') worstSeverity = 'CRITICAL';
              else if (severity === 'WARNING' && worstSeverity !== 'CRITICAL') worstSeverity = 'WARNING';
            }

            ticketUpdates.push({
              ticketId: task.linkedTicketId,
              etaEstimatedDelivery: eta,
              confidenceLevel,
              confidenceScore,
              delayReason: isDelayed ? 'CAPACITY_DELAY' : null,
              rootCause: isDelayed ? rootCauseReason : null
            });

            if (!latestETA || new Date(eta) > new Date(latestETA)) {
              latestETA = eta;
            }
          }
        }

        queueAheadHours += estimatedH;
      }

      if (!ticketUpdates.length) return;

      // 5. Batch update all tickets
      const now = new Date();
      const bulkOps = ticketUpdates.map(u => ({
        updateOne: {
          filter: { _id: u.ticketId },
          update: {
            $set: {
              etaEstimatedDelivery: u.etaEstimatedDelivery,
              etaComputedAt: now,
              delayReason: u.delayReason,
              rootCause: u.rootCause,
              confidenceLevel: u.confidenceLevel,
              confidenceScore: u.confidenceScore
            }
          }
        }
      }));

      await models.tickets.bulkWrite(bulkOps, { ordered: false });

      // 6. Generate CONSOLIDATED SLA Alert (prevents notification spam)
      if (delayCount > 0) {
        const employee = await models.employees
          .findById(employeeId)
          .select('basicInfo.firstName basicInfo.lastName professionalInfo.reportingManager professionalInfo.teamLead')
          .lean();

        if (employee) {
          const empName = `${employee.basicInfo?.firstName || ''} ${employee.basicInfo?.lastName || ''}`.trim();

          // Log consolidated OperationalEvent
          const event = await models.operational_events.create({
            type: 'SLA_DELAY',
            employeeId,
            severity: worstSeverity,
            delayReason: 'CAPACITY_DELAY',
            rootCause: rootCauseReason,
            occurredAt: new Date(),
            metadata: {
              affectedTasks: delayCount,
              latestETA
            }
          });

          // Notify Manager and Team Lead
          const managerId = employee.professionalInfo?.reportingManager;
          const leadId = employee.professionalInfo?.teamLead;
          const targets = [managerId, leadId].filter(Boolean);

          if (targets.length) {
            const message = `${empName} is absent/on leave today. ${delayCount} assigned task(s) are delayed. Highest impact ETA: ${new Date(latestETA).toLocaleDateString()}.`;

            // Create notification record
            for (const targetId of targets) {
              const notif = await models.notifications.create({
                type: 'leave',
                title: `SLA Alert: ${worstSeverity} Delivery Delay`,
                message,
                meta: {
                  model: 'operational_events',
                  modelId: event._id,
                  senderDetails: { name: 'System' }
                }
              });

              // Add recipient mapping
              await models.NotificationReceptionist.create({
                notificationId: notif._id,
                receiver: targetId,
                isRead: false
              });
            }
          }
        }
      }

      console.log(
        `[ETA] Recalculated ${ticketUpdates.length} ticket(s) for employee ${employeeId}. Delayed: ${delayCount}`
      );
    } catch (err) {
      console.error('[ETA] scheduleETARecalculation error:', err.message);
    }
  });
}
