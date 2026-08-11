// services/assets_payments.js
// Service hooks for the assets_payments collection.
// Loaded automatically by servicesCache.js.

import models from '../models/Collection.js';


export default function () {
  return {
    /**
     * beforeCreate
     */
    beforeCreate: async (ctx) => {
      const { body } = ctx;
      const data = body;
      if (!data.status) {
        data.status = 'Success';
      }
      return data;
    },

    /**
     * afterCreate
     */
    afterCreate: async (ctx) => {
      const { docId } = ctx;
      // 1. Fetch payment
      const payment = await models.assets_payments.findById(docId).lean();
      if (!payment || payment.status !== 'Success') return;

      // 2. Fetch the corresponding invoice
      const invoice = await models.assets_invoices.findById(payment.invoiceId);
      if (!invoice) return;

      // 3. Sum all successful payments for this invoice
      const paymentsForInvoice = await models.assets_payments.find({
        invoiceId: invoice._id,
        status: 'Success'
      }).lean();

      const totalPaidForInvoice = paymentsForInvoice.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

      // 4. Update invoice status
      let newInvoiceStatus = 'Pending';
      if (totalPaidForInvoice >= invoice.totalAmount) {
        newInvoiceStatus = 'Paid';
      } else if (totalPaidForInvoice > 0) {
        newInvoiceStatus = 'Approved'; // Partially paid
      }

      invoice.status = newInvoiceStatus;
      await invoice.save();

      // 5. Fetch the corresponding purchase order
      const purchase = await models.assets_purchases.findById(invoice.purchaseId);
      if (!purchase) return;

      // 6. Recalculate total paid across all invoices for this PO
      const siblingInvoices = await models.assets_invoices.find({
        purchaseId: purchase._id
      }).lean();

      const siblingInvoiceIds = siblingInvoices.map(inv => inv._id);

      const allPoPayments = await models.assets_payments.find({
        invoiceId: { $in: siblingInvoiceIds },
        status: 'Success'
      }).lean();

      const totalPaidForPo = allPoPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

      // 7. Update PO values
      purchase.paidAmount = totalPaidForPo;
      if (totalPaidForPo >= purchase.totalAmount) {
        purchase.paymentStatus = 'Paid';
      } else if (totalPaidForPo > 0) {
        purchase.paymentStatus = 'Partially Paid';
      } else {
        purchase.paymentStatus = 'Unpaid';
      }

      await purchase.save();
      console.log(`[AssetPayment Hook] Updated PO ${purchase.poNumber} paidAmount to ${totalPaidForPo}, status to ${purchase.paymentStatus}`);
    }
  };
}

