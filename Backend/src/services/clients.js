export default function clients() {
  return {
    async beforeUpdate(ctx) {
      const { body, data: client, role, docId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      // Ensure we have the client document
      let clientDoc = client;
      if (!clientDoc && docId) {
        clientDoc = await models.clients.findById(docId).lean();
      }

      // 1. Validate lead status transition (existing rule)
      if (body.leadStatus && clientDoc && body.leadStatus !== clientDoc.leadStatus) {
        const allowed = VALID_TRANSITIONS[clientDoc.leadStatus] || [];
        if (!allowed.includes(body.leadStatus)) {
          throw new Error(`Invalid lead status transition: ${clientDoc.leadStatus} -> ${body.leadStatus}`);
        }
      }

      // 2. Prevent manual leadStatus update to 'Closed Won' (must be via OA approval)
      if (body.leadStatus === 'Closed Won' && clientDoc && clientDoc.leadStatus !== 'Closed Won') {
        const approvedOA = await models.orderacknowledgments.findOne({
          clientId: clientDoc._id,
          status: 'Approved'
        }).lean();

        if (!approvedOA) {
          throw new Error('Cannot set leadStatus to "Closed Won" manually. Please approve an Order Acknowledgment for this client first.');
        }
      }

      // 3. Prevent manual activation if OA is pending
      if (body.Status === 'Active' && clientDoc && clientDoc.Status !== 'Active') {
        const approvedOA = await models.orderacknowledgments.findOne({
          clientId: clientDoc._id,
          status: 'Approved'
        }).lean();

        if (!approvedOA) {
          throw new Error('Client activation is gated by Order Acknowledgment approval. Please approve the OA first.');
        }
      }

      // 4. Block deactivation if client has open tickets or tasks (incoming rule)
      if (body.Status === 'Inactive' && clientDoc && clientDoc.Status === 'Active') {
        const [openTasks, openTickets] = await Promise.all([
          models.tasks.countDocuments({ clientId: clientDoc._id, status: { $ne: 'Completed' } }),
          models.tickets.countDocuments({ clientId: clientDoc._id, status: { $ne: 'Closed' } })
        ]);

        if (openTasks > 0 || openTickets > 0) {
          throw new Error(`Cannot deactivate client "${clientDoc.name || clientDoc._id}" because they have ${openTasks} open task(s) and ${openTickets} open ticket(s). Resolve those first.`);
        }
      }
    },

    async afterUpdate(ctx) {
      const { body, data: client, beforeDoc, userId } = ctx;
      // Log leadStatus changes in CRMActivity log
      const prevStatus = beforeDoc?.leadStatus || client.leadStatus;
      const nextStatus = body.leadStatus;

      if (nextStatus && prevStatus !== nextStatus) {
        try {
          const { default: CRMActivity } = await import('../models/CRMActivity.js');
          await CRMActivity.create({
            clientId: client._id,
            type: 'System',
            content: `Lead status updated from "${prevStatus}" to "${nextStatus}"`,
            performedBy: userId || null
          });
        } catch (err) {
          console.error('[Clients Service] Error logging leadStatus change:', err.message);
        }
      }
    }
  }
}

