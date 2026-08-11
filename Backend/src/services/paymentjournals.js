export default function payment_journals() {
  const syncToLedger = async (payment, userId) => {
    if (payment.status !== 'Verified') return;

    const { default: models } = await import('../models/Collection.js');

    const existingLedger = await models.clients_ledgers.findOne({
      referenceModel: 'payment_journals',
      referenceId: payment._id
    });

    if (!existingLedger) {
      await models.clients_ledgers.create({
        clientId: payment.clientId,
        type: 'Debit',
        amount: payment.amount,
        referenceModel: 'payment_journals',
        referenceId: payment._id,
        description: `Payment received: ${payment.receiptNumber}`,
        narration: `Mode: ${payment.paymentMode}. Ref: ${payment.referenceNumber || 'N/A'}.`,
        entryBy: userId || payment.receivedBy
      });
    }
  };

  return {
    async beforeCreate(ctx) {
      const { body, user } = ctx;
      const userId = user?.id;
      const { default: models } = await import('../models/Collection.js');

      // Auto-generate receiptNumber
      const count = await models.payment_journals.countDocuments();
      body.receiptNumber = `RCP-${String(count + 1).padStart(6, '0')}`;
      body.receivedBy = userId;
    },

    async afterCreate(ctx) {
      const { docId, user } = ctx;
      const userId = user?.id;
      const { default: models } = await import('../models/Collection.js');
      const payment = await models.payment_journals.findById(docId);
      if (payment) {
        await syncToLedger(payment, userId);
      }
    },

    async beforeUpdate(ctx) {
      const { body, docId } = ctx;
      const { default: models } = await import('../models/Collection.js');
      const payment = await models.payment_journals.findById(docId);
      if (!payment) return;

      // Immutability lock check
      if (payment.status === 'Verified') {
        const allowedKeys = ['status', 'metaStatus'];
        const bodyKeys = Object.keys(body);
        const hasViolations = bodyKeys.some(key => !allowedKeys.includes(key));
        if (hasViolations) {
          throw new Error(`Payment receipt ${payment.receiptNumber} is verified and locked. Edits are blocked.`);
        }
      }
    },

    async afterUpdate(ctx) {
      const { docId, user } = ctx;
      const userId = user?.id;
      const { default: models } = await import('../models/Collection.js');
      const payment = await models.payment_journals.findById(docId);
      if (payment) {
        await syncToLedger(payment, userId);
      }
    }
  };
}
