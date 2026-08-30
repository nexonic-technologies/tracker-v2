export default function invoices() {
  return {
    async beforeCreate(ctx) {
      const { body, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      if (!body.clientId) {
        throw new Error('Client Account ID (clientId) is required to issue an Invoice');
      }

      // 1. Generate Invoice Number if not provided (INV-YYYYMM-0001)
      if (!body.invoiceNumber) {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prefix = `INV-${yearMonth}-`;

        const lastInvoice = await models.invoices
          .findOne({ invoiceNumber: { $regex: `^${prefix}` } })
          .sort({ invoiceNumber: -1 })
          .lean();

        let seq = 1;
        if (lastInvoice && lastInvoice.invoiceNumber) {
          const parts = lastInvoice.invoiceNumber.split('-');
          const lastSeq = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(lastSeq)) seq = lastSeq + 1;
        }
        body.invoiceNumber = `${prefix}${String(seq).padStart(4, '0')}`;
      }

      // 2. Default Due Date (30 days from issue)
      if (!body.dueDate) {
        const issue = body.issueDate ? new Date(body.issueDate) : new Date();
        body.dueDate = new Date(issue.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      // 3. Server-Authoritative Totals Computation
      const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
      let subtotal = 0;
      let totalTax = 0;

      lineItems.forEach(item => {
        const qty = Number(item.quantity) || 1;
        const rate = Number(item.unitPrice) || 0;
        const taxRate = Number(item.taxRate) || 0;
        const disc = Number(item.discount) || 0;

        const base = qty * rate;
        const afterDisc = base - ((base * disc) / 100);
        const tax = (afterDisc * taxRate) / 100;
        const lineTotal = afterDisc + tax;

        item.amount = Math.round(lineTotal * 100) / 100;
        subtotal += afterDisc;
        totalTax += tax;
      });

      body.subtotal = Math.round(subtotal * 100) / 100;
      body.taxAmount = Math.round(totalTax * 100) / 100;
      body.discountAmount = Number(body.discountAmount) || 0;
      body.totalAmount = Math.round((subtotal + totalTax - body.discountAmount) * 100) / 100;
      body.paidAmount = Number(body.paidAmount) || 0;
      body.balanceDue = Math.max(0, Math.round((body.totalAmount - body.paidAmount) * 100) / 100);

      if (userId) body.createdBy = userId;
      return body;
    },

    async beforeUpdate(ctx) {
      const { body, data: invoice, docId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      let currentInvoice = invoice;
      if (!currentInvoice && docId) {
        currentInvoice = await models.invoices.findById(docId).lean();
      }

      if (!currentInvoice) return;

      // Recompute balanceDue if paidAmount or totalAmount changes
      const total = body.totalAmount !== undefined ? Number(body.totalAmount) : currentInvoice.totalAmount;
      const paid = body.paidAmount !== undefined ? Number(body.paidAmount) : currentInvoice.paidAmount;
      const balance = Math.max(0, Math.round((total - paid) * 100) / 100);

      body.balanceDue = balance;

      // Auto-reconcile status based on payment balance
      if (balance === 0 && paid > 0 && body.status !== 'Cancelled') {
        body.status = 'Paid';
      } else if (paid > 0 && balance > 0 && body.status !== 'Cancelled') {
        body.status = 'Partially Paid';
      }
    },

    async afterCreate(ctx) {
      const { data: invoice, body } = ctx;
      const status = invoice?.status || body?.status;

      // When an invoice is issued, automatically post an AR Credit entry to Client Ledger
      if (status === 'Issued' || status === 'Partially Paid' || status === 'Paid') {
        try {
          const { default: models } = await import('../models/Collection.js');
          const clientId = invoice.clientId;
          const amount = invoice.totalAmount;

          // Compute running balance
          const lastEntry = await models.clients_ledgers
            .findOne({ clientId })
            .sort({ date: -1, createdAt: -1 })
            .lean();

          const prevBalance = lastEntry?.runningBalance || 0;
          const newBalance = prevBalance + amount; // Credit increases accounts receivable

          await models.clients_ledgers.create({
            clientId,
            date: invoice.issueDate || new Date(),
            type: 'Credit',
            amount,
            runningBalance: newBalance,
            referenceModel: 'invoices',
            referenceId: invoice._id,
            description: `Tax Invoice Issued: ${invoice.invoiceNumber}`,
            narration: `Billed to client against contract / quotation.`
          });
        } catch (err) {
          console.error('[Invoices Service] Error posting automated AR Ledger Credit entry:', err.message);
        }
      }
    },

    async afterUpdate(ctx) {
      const { body, data: invoice, beforeDoc } = ctx;
      const prevStatus = beforeDoc?.status || invoice?.status;
      const nextStatus = body.status;

      // If status transitioned from Draft to Issued, post the AR Credit entry
      if (prevStatus === 'Draft' && (nextStatus === 'Issued' || nextStatus === 'Partially Paid' || nextStatus === 'Paid')) {
        try {
          const { default: models } = await import('../models/Collection.js');
          const clientId = invoice.clientId;
          const amount = invoice.totalAmount;

          const lastEntry = await models.clients_ledgers
            .findOne({ clientId })
            .sort({ date: -1, createdAt: -1 })
            .lean();

          const prevBalance = lastEntry?.runningBalance || 0;
          const newBalance = prevBalance + amount;

          await models.clients_ledgers.create({
            clientId,
            date: invoice.issueDate || new Date(),
            type: 'Credit',
            amount,
            runningBalance: newBalance,
            referenceModel: 'invoices',
            referenceId: invoice._id,
            description: `Tax Invoice Issued: ${invoice.invoiceNumber}`,
            narration: `Billed to client against contract / quotation.`
          });
        } catch (err) {
          console.error('[Invoices Service] Error posting automated AR Ledger Credit entry:', err.message);
        }
      }
    }
  };
}
