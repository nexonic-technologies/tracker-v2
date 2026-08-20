// services/assets_purchases.js
import models from '../models/Collection.js';

import { handleGRNReceipt } from './business/assetDomainHelper.js';

const ALLOWED_TRANSITIONS = {
  'Draft': ['Pending Approval', 'Cancelled'],
  'Pending Approval': ['Approved', 'Cancelled'],
  'Approved': ['Received', 'Cancelled'],
  'Received': [], // Terminal state
  'Cancelled': [], // Terminal state
};

async function generatePoNumber() {
  const count = await models.assets_purchases.countDocuments();
  return `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

export default function () {
  return {
    /**
     * beforeCreate
     */
    beforeCreate: async (ctx) => {
      const { role, userId, body } = ctx;
      const data = body;

      if (!data.poNumber || data.poNumber.trim() === '') {
        data.poNumber = await generatePoNumber();
      } else {
        data.poNumber = data.poNumber.trim();
        const duplicate = await models.assets_purchases.findOne({ poNumber: data.poNumber }).lean();
        if (duplicate) {
          throw new Error(`PO Number "${data.poNumber}" is already registered.`);
        }
      }

      if (!data.status) {
        data.status = 'Draft';
      }

      if (!data.paymentStatus) {
        data.paymentStatus = 'Unpaid';
      }

      if (!data.paidAmount) {
        data.paidAmount = 0;
      }

      return data;
    },

    /**
     * afterCreate
     */
    afterCreate: async (ctx) => {
      const { role, userId, docId } = ctx;
      if (Array.isArray(docId)) {
        for (const id of docId) {
          const doc = await models.assets_purchases.findById(id);
          if (doc && doc.status === 'Received') {
            await handleGRNReceipt(doc, userId);
          }
        }
      } else {
        const doc = await models.assets_purchases.findById(docId);
        if (doc && doc.status === 'Received') {
          await handleGRNReceipt(doc, userId);
        }
      }
    },

    /**
     * beforeUpdate
     */
    beforeUpdate: async (ctx) => {
      const { role, userId, docId, body } = ctx;
      const data = body;
      if (!docId) return data;

      if (data.status !== undefined) {
        const current = await models.assets_purchases.findById(docId).select('status').lean();
        if (!current) {
          throw new Error('Asset purchase record not found.');
        }

        const allowed = ALLOWED_TRANSITIONS[current.status] || [];
        if (current.status === data.status) {
          delete data.status; // No-op
        } else if (!allowed.includes(data.status)) {
          throw new Error(`Invalid status transition: "${current.status}" → "${data.status}" is not allowed.`);
        }
      }

      return data;
    },

    /**
     * afterUpdate
     */
    afterUpdate: async (ctx) => {
      const { docId, data, beforeDoc, userId } = ctx;
      const statusChanged = data.status && data.status !== beforeDoc.status;
      if (!statusChanged) return;

      const purchase = await models.assets_purchases.findById(docId).lean();
      if (!purchase) return;

      if (purchase.status === 'Received') {
        await handleGRNReceipt(purchase, userId);
      }
    }
  };
}

