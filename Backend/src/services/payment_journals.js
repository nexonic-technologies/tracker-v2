export default function payment_journals() {
  const syncToLedger = async (payment, userId) => {
    if (payment.status !== 'Verified') return;

    const { default: models } = await import('../models/Collection.js');

    const existingLedger = await models.clients_ledgers.findOne({
      referenceModel: 'payment_journals',
      referenceId: payment._id
    });

    if (!existingLedger) {
      // Calculate running balance
      const lastEntry = await models.clients_ledgers
        .findOne({ clientId: payment.clientId })
        .sort({ date: -1, createdAt: -1 })
        .lean();

      const prevBalance = lastEntry?.runningBalance || 0;
      const newBalance = prevBalance - (payment.amount || 0); // Debit decreases client outstanding

      await models.clients_ledgers.create({
        clientId: payment.clientId,
        date: payment.paymentDate || new Date(),
        type: 'Debit',
        amount: payment.amount,
        runningBalance: newBalance,
        referenceModel: 'payment_journals',
        referenceId: payment._id,
        description: `Payment received: ${payment.receiptNumber}`,
        narration: `Mode: ${payment.paymentMode}. Ref: ${payment.referenceNumber || 'N/A'}.`,
        entryBy: userId || payment.receivedBy
      });

      // If linked to an invoice, reconcile payment
      if (payment.invoiceId || payment.orderId) {
        try {
          const invId = payment.invoiceId || payment.orderId;
          const invoice = await models.invoices.findById(invId);
          if (invoice) {
            const newPaid = (invoice.paidAmount || 0) + payment.amount;
            const newBal = Math.max(0, invoice.totalAmount - newPaid);
            const status = newBal === 0 ? 'Paid' : 'Partially Paid';
            await models.invoices.findByIdAndUpdate(invId, {
              paidAmount: newPaid,
              balanceDue: newBal,
              status
            });
          }
        } catch (invErr) {
          console.warn('[Payment Journals Service] Error reconciling invoice balance:', invErr.message);
        }
      }
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
