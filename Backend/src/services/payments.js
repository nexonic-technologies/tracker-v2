import models from '../models/Collection.js';


const payments = {
  async beforeCreate(ctx) {
      const { body } = ctx;
    // Basic validation
    if (!body.amount || body.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }
  },

  async afterUpdate(ctx) {
      const { body, data: payment } = ctx;
    // Logic after payment is confirmed
    if (body.status === 'Confirmed') {
      const { saveAuditLog } = await import('../utils/auditLogger.js');
      await saveAuditLog({
        action: 'confirm_payment',
        modelName: 'payments',
        userId: body.updatedBy || 'system',
        docId: payment._id,
        metadata: { 
          event: 'PAYMENT_CONFIRMED', 
          clientId: payment.clientId,
          amount: payment.amount,
          referenceNo: payment.referenceNo
        }
      });
      console.log(`[Payment Service] Payment of ₹${payment.amount} confirmed for client ${payment.clientId}.`);
    }
  }
};

export default () => payments;
