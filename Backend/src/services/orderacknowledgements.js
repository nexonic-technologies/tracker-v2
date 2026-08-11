export default function order_acknowledgements() {
  return {
    async beforeCreate(ctx) {
      const { body, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      // Auto-generate orderNumber
      const count = await models.order_acknowledgements.countDocuments();
      body.orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;
      body.salesPerson = userId;

      // Populate modules and totals from linked quotation
      if (body.quotationId) {
        const quotation = await models.quotations.findById(body.quotationId);
        if (!quotation) {
          throw new Error('Linked quotation not found');
        }

        // Populate modules if not already provided
        if (!body.modules || body.modules.length === 0) {
          body.modules = quotation.lineItems
            .filter(item => item.projectTypeId)
            .map(item => ({
              projectTypeId: item.projectTypeId,
              serviceProviderId: item.serviceProviderId,
              agreedValue: item.lineTotal,
              description: item.description
            }));
        }

        if (!body.totalOrderValue) {
          body.totalOrderValue = quotation.grandTotal;
        }
      }
    },

    async beforeUpdate(ctx) {
      const { body, docId, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');
      const order = await models.order_acknowledgements.findById(docId);
      if (!order) return;

      // Block structural updates if client approved or cancelled
      if (['Client Approved', 'Active', 'Completed'].includes(order.status)) {
        const allowedKeys = ['status', 'clientApproval', 'internalApproval', 'completedBy', 'completedAt', 'metaStatus'];
        const bodyKeys = Object.keys(body);
        const hasViolations = bodyKeys.some(key => !allowedKeys.includes(key));
        if (hasViolations) {
          throw new Error(`Order ${order.orderNumber} is locked because its status is "${order.status}". Structural edits are blocked.`);
        }
      }

      // Check transition to Client Approved or Active
      const isApprovedTransition = (body.status === 'Client Approved' || body.status === 'Active') &&
        (order.status !== 'Client Approved' && order.status !== 'Active');

      if (isApprovedTransition) {
        // Stamp who completed/approved
        body.completedBy = userId;
        body.completedAt = new Date();
      }
    },

    async afterUpdate(ctx) {
      const { docId, body, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');
      const order = await models.order_acknowledgements.findById(docId);
      if (!order) return;

      // Check if status is transitioning to Client Approved or Active
      const isActive = order.status === 'Client Approved' || order.status === 'Active';

      if (isActive) {
        // 1. Activate client
        const client = await models.clients.findById(order.clientId);
        if (client) {
          client.Status = 'Active';

          // 2. Push approved project_types/modules to client
          const currentproject_types = client.project_types.map(id => id.toString());
          order.modules.forEach(mod => {
            if (mod.projectTypeId && !currentproject_types.includes(mod.projectTypeId.toString())) {
              client.project_types.push(mod.projectTypeId);
            }
          });

          await client.save();
        }

        // 3. Check and create Client Ledger entry (Credit = amount owed by client)
        const existingLedger = await models.clients_ledgers.findOne({
          referenceModel: 'order_acknowledgements',
          referenceId: order._id
        });

        if (!existingLedger) {
          // Trigger runningBalance and record creation via helper or direct create
          await models.clients_ledgers.create({
            clientId: order.clientId,
            type: 'Credit',
            amount: order.totalOrderValue,
            referenceModel: 'order_acknowledgements',
            referenceId: order._id,
            description: `Order approved: ${order.orderNumber}`,
            narration: `Line modules: ${order.modules.map(m => m.description || 'Module').join(', ')}`,
            entryBy: userId
          });
        }

        // 4. Update parent quotation to Converted to Order
        if (order.quotationId) {
          await models.quotations.updateOne(
            { _id: order.quotationId },
            { $set: { status: 'Converted to Order' } }
          );
        }
      }
    }
  };
}
