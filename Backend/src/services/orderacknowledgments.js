import models from '../models/Collection.js';


const orderacknowledgments = {
  // Logic for Order Acknowledgment
  async beforeCreate(ctx) {
    const { body, role } = ctx;
    // Generate OA Number (OA-YYYY-MM-XXXX)
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await models.orderacknowledgments.countDocuments({
      oaNumber: new RegExp(`^OA-${year}-${month}-`)
    });
    body.oaNumber = `OA-${year}-${month}-${String(count + 1).padStart(4, '0')}`;

    // Default committedPrice to subtotal if not provided
    if (!body.committedPrice && body.subtotal) {
      body.committedPrice = body.subtotal + (body.taxTotal || 0);
    }
  },

  async afterUpdate(ctx) {
    const { body, data: oa } = ctx;
    // If OA is approved, trigger client activation and Closed Won status
    if (body.status === 'Approved') {
      try {
        const client = await models.clients.findById(oa.clientId);
        if (client) {
          // 1. Activate Client
          await models.clients.findByIdAndUpdate(oa.clientId, {
            Status: 'Active',
            leadStatus: 'Closed Won'
          });

          // 2. Unlock all project types
          const activeproject_types = await models.project_types.find({ isActive: true }).select('_id').lean();
          const projectTypeIds = activeproject_types.map(pt => pt._id);

          await models.clients.findByIdAndUpdate(oa.clientId, {
            $addToSet: { project_types: { $each: projectTypeIds } }
          });

          // 3. Log Audit
          const { saveAuditLog } = await import('../utils/auditLogger.js');
          await saveAuditLog({
            action: 'approve',
            modelName: 'orderacknowledgments',
            userId: body.updatedBy || 'system',
            docId: oa._id,
            metadata: {
              event: 'OA_APPROVED_CLIENT_ACTIVATED',
              clientId: oa.clientId,
              totalValue: oa.committedPrice
            }
          });

          console.log(`[OA Service] Approved OA ${oa.oaNumber}. Client ${client.name} is now ACTIVE and CLOSED WON.`);
        }
      } catch (err) {
        console.error('[OA Service] Error during client activation:', err.message);
      }
    }
  }
};

export default () => orderacknowledgments;
