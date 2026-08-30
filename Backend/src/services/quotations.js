export default function quotations() {
  /**
   * Check if quotations period is closed
   */
  async function checkQuotationPeriodLock(date, action) {
    try {
      const { default: models } = await import('../models/Collection.js');
      if (!models.period_closures) return;

      const targetDate = new Date(date);
      const closure = await models.period_closures.findOne({
        startDate: { $lte: targetDate },
        endDate: { $gte: targetDate },
        status: { $in: ['Closed', 'In Progress'] },
        'modules.quotations.closed': true
      }).lean();

      if (closure) {
        throw new Error(
          `Period ${closure.periodLabel} is closed for quotations. ` +
          `Quotations module was locked on ${closure.modules.quotations.closedAt ? new Date(closure.modules.quotations.closedAt).toLocaleDateString() : 'unknown'}. ` +
          `To ${action} quotations for this period, request a period reopen from Finance.`
        );
      }
    } catch (err) {
      if (err.message?.includes('Period') && err.message?.includes('closed')) throw err;
    }
  }

  // Helper: calculate totals for either `items` (legacy) or `lineItems` (CRM shape)
  const calculateTotals = (body) => {
    if (body.lineItems && Array.isArray(body.lineItems)) {
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;
      let grandTotal = 0;

      body.lineItems.forEach(item => {
        const qty = item.quantity || 1;
        const price = item.unitPrice || 0;
        const discPercent = item.discount || 0;
        const taxRate = item.taxRate || 18;

        const baseAmount = qty * price;
        const discAmount = baseAmount * (discPercent / 100);
        const amountAfterDiscount = baseAmount - discAmount;
        const taxAmount = amountAfterDiscount * (taxRate / 100);
        const total = amountAfterDiscount + taxAmount;

        item.lineTotal = Number(total.toFixed(2));

        subtotal += baseAmount;
        totalDiscount += discAmount;
        totalTax += taxAmount;
        grandTotal += total;
      });

      body.subtotal = Number(subtotal.toFixed(2));
      body.totalDiscount = Number(totalDiscount.toFixed(2));
      body.totalTax = Number(totalTax.toFixed(2));
      body.grandTotal = Number(grandTotal.toFixed(2));
    }

    // Backwards-compatible: support `items` shape used by older code
    if (body.items && Array.isArray(body.items)) {
      let subtotal = 0;
      body.items = body.items.map(item => {
        const qty = item.quantity || 0;
        const price = item.unitPrice || 0;
        const discount = item.discount || 0;
        const tax = item.tax || 0;
        const lineTotal = (qty * price) - discount + tax;
        item.total = Number(lineTotal.toFixed(2));
        subtotal += lineTotal;
        return item;
      });
      body.subtotal = Number(subtotal.toFixed(2));
      body.totalAmount = Number((subtotal - (body.discountAmount || 0) + (body.taxAmount || 0)).toFixed(2));
    }
  };

  return {
    async beforeCreate(ctx) {
      const { body, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      // ── Period Lock Check ─────────────────────────────────────────────────
      await checkQuotationPeriodLock(new Date(), 'create');

      // Auto-generate quotation number if not provided (date-based format kept for predictability)
      if (!body.quotationNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        const lastQuotation = await models.quotations
          .findOne({ quotationNumber: new RegExp(`^QT-${year}${month}-`) })
          .sort({ quotationNumber: -1 })
          .lean();

        let sequence = 1;
        if (lastQuotation && lastQuotation.quotationNumber) {
          const match = lastQuotation.quotationNumber.match(/QT-\d{6}-(\d{4})$/);
          if (match) sequence = parseInt(match[1], 10) + 1;
        }
        body.quotationNumber = `QT-${year}${month}-${String(sequence).padStart(4, '0')}`;
      }

      // CRM branch behaviour: set preparedBy and default validity
      if (userId) body.preparedBy = userId;
      if (!body.validUntil) {
        const validityDate = new Date();
        validityDate.setDate(validityDate.getDate() + 30);
        body.validUntil = validityDate;
      }

      // Calculate totals for whichever shape is present
      calculateTotals(body);

      return body;
    },

    async beforeUpdate(ctx) {
      const { body, docId, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');
      const quote = await models.quotations.findById(docId);
      if (!quote) return body;

      // ── Period Lock Check ─────────────────────────────────────────────────
      await checkQuotationPeriodLock(quote.createdAt, 'update');

      // Immutability lock check (CRM behaviour)
      const lockedStatuses = ['Client Approved', 'Converted to Order'];
      if (lockedStatuses.includes(quote.status)) {
        const allowedKeys = ['status', 'approvalHistory', 'metaStatus'];
        const bodyKeys = Object.keys(body);
        const hasViolations = bodyKeys.some(key => !allowedKeys.includes(key));
        if (hasViolations) {
          throw new Error(`Quotation is locked because its status is "${quote.status}". Structural modifications are blocked.`);
        }
      }

      // Approval history tracking when status changes (CRM behaviour)
      if (body.status && body.status !== quote.status) {
        if (!body.approvalHistory) body.approvalHistory = [...(quote.approvalHistory || [])];
        body.approvalHistory.push({
          action: body.status,
          by: userId,
          byModel: 'employees',
          at: new Date(),
          remarks: body.statusRemarks || `Status updated to ${body.status}`
        });
      }

      // If lineItems/items are modified, recalculate totals
      if (body.lineItems || body.items) {
        calculateTotals(body);
      }

      // Revision save when moving to Revision Requested
      if (body.status === 'Revision Requested' && quote.status !== 'Revision Requested') {
        ctx.createRevisionPayload = {
          quotationId: quote._id,
          revisionNumber: quote.revisionNumber,
          snapshot: quote.toObject(),
          changedBy: userId,
          changeReason: body.statusRemarks || 'Revision Requested'
        };
        body.revisionNumber = (quote.revisionNumber || 1) + 1;
      }

      return body;
    },

    async afterUpdate(ctx) {
      const { body, data: quotation } = ctx;

      // 1. Revision save when moving to Revision Requested
      if (ctx.createRevisionPayload) {
        try {
          const { default: models } = await import('../models/Collection.js');
          await models.quotation_revisions.create(ctx.createRevisionPayload);
        } catch (err) {
          console.error('[quotations service] Error saving quotation revision:', err.message);
        }
      }

      // 2. If quotation is accepted/converted, activate the client (backwards-compatible logic)
      if (body.status === 'Accepted' || body.status === 'Client Approved' || body.status === 'Converted to Order') {
        try {
          const clientId = quotation.clientId;
          if (clientId) {
            const { default: models } = await import('../models/Collection.js');

            await models.clients.findByIdAndUpdate(clientId, {
              Status: 'Active',
              leadStatus: 'Closed Won'
            });

            const activeproject_types = await models.project_types.find({ isActive: true }).select('_id').lean();
            const projectTypeIds = activeproject_types.map(pt => pt._id);

            await models.clients.findByIdAndUpdate(clientId, {
              $addToSet: { project_types: { $each: projectTypeIds } }
            });
          }
        } catch (err) {
          console.error('[quotations service] Error during client activation:', err.message);
        }
      }
    },

    async beforeDelete(ctx) {
      // Intentionally left blank - keep extensibility point
    },

    async afterRead({ role, data }) {
      // Preserve existing behaviour; leave as pass-through for now
      return data;
    },

    /**
     * C-02: Quotation Conversion Ledger Report
     */
    async beforeReport(ctx) {
      const { default: reportService } = await import('./business/reportService.js');
      const startDate = ctx.query?.startDate || ctx.body?.startDate || null;
      const endDate = ctx.query?.endDate || ctx.body?.endDate || null;

      const data = await reportService.getQuotationConversionLedgerReport(startDate, endDate);
      return { data };
    }
  };
}
