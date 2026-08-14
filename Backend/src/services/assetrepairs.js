// services/assets_repairs.js
// Service hooks for the assets_repairs collection.
// Loaded automatically by servicesCache.js — filename must match collection key in Collection.js.

import models from '../models/Collection.js';

import { writeLedgerEntry } from './business/assetDomainHelper.js';

const ALLOWED_TRANSITIONS = {
  'Sent for Repair': ['In Repair', 'Repaired', 'Beyond Repair'],
  'In Repair': ['Repaired', 'Beyond Repair'],
  'Repaired': [], // Terminal
  'Beyond Repair': [], // Terminal
};

export default function () {
  return {
    /**
     * beforeCreate
     * ─────────────
     * 1. Validate asset exists.
     * 2. Force status = 'Sent for Repair' and metaStatus = 'active'.
     * 3. Set createdBy = userId.
     */
    beforeCreate: async (ctx) => {
      const { role, userId, body } = ctx;
      const data = body;

      if (userId) {
        data.createdBy = userId;
      }

      // Validate asset
      if (!data.assetId) {
        throw new Error('assetId is required.');
      }
      const asset = await models.assets.findById(data.assetId).lean();
      if (!asset) {
        throw new Error('Referenced asset not found.');
      }

      // Ensure defaults
      data.status = 'Sent for Repair';
      data.metaStatus = 'active';

      return data;
    },

    /**
     * afterCreate
     * ────────────
     * Ensure asset status is set to 'Under Repair'
     */
    afterCreate: async (ctx) => {
      const { docId, userId } = ctx;
      const repair = await models.assets_repairs.findById(docId).lean();
      if (!repair) return;

      const beforeAsset = await models.assets.findById(repair.assetId).select('status').lean();

      // Update asset status to 'Under Repair' if it isn't already
      await models.assets.findByIdAndUpdate(repair.assetId, {
        status: 'Under Repair'
      });

      // Write OUT to stock ledger
      await writeLedgerEntry({
        assetId: repair.assetId,
        transactionType: 'OUT',
        triggerType: 'Send_To_Repair',
        previousState: beforeAsset ? beforeAsset.status : 'Available',
        newState: 'Under Repair',
        quantity: 1,
        performedBy: userId || repair.createdBy,
        referenceModel: 'assets_repairs',
        referenceId: docId
      });
    },

    /**
     * beforeUpdate
     * ─────────────
     * Enforce status transitions
     */
    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;
      const data = body;
      if (!docId) return data;

      const current = await models.assets_repairs.findById(docId).select('status').lean();
      if (!current) {
        throw new Error('Asset repair record not found.');
      }

      if (data.status !== undefined) {
        const allowed = ALLOWED_TRANSITIONS[current.status] || [];
        if (current.status === data.status) {
          delete data.status;
        } else if (!allowed.includes(data.status)) {
          throw new Error(`Invalid status transition: "${current.status}" → "${data.status}" is not allowed.`);
        }
      }

      return data;
    },

    /**
     * afterUpdate
     * ────────────
     * Update asset register status & condition when repair is finalized
     */
    afterUpdate: async (ctx) => {
      const { docId, data, beforeDoc, userId } = ctx;
      const statusChanged = data.status && data.status !== beforeDoc.status;
      if (!statusChanged) return;

      const repair = await models.assets_repairs.findById(docId).lean();
      if (!repair) return;

      if (repair.status === 'Repaired') {
        const assetUpdate = {
          status: 'Available',
          condition: repair.repairCondition || 'Good',
          conditionLastAssessedAt: new Date(),
          currentAllocatedTo: null,
          currentAllocationId: null
        };
        if (userId) {
          assetUpdate.conditionLastAssessedBy = userId;
        }
        await models.assets.findByIdAndUpdate(repair.assetId, assetUpdate);

        // Write IN to stock ledger
        await writeLedgerEntry({
          assetId: repair.assetId,
          transactionType: 'IN',
          triggerType: 'Repair_Return',
          previousState: 'Under Repair',
          newState: 'Available',
          quantity: 1,
          performedBy: userId,
          referenceModel: 'assets_repairs',
          referenceId: docId
        });
      } else if (repair.status === 'Beyond Repair') {
        await models.assets.findByIdAndUpdate(repair.assetId, {
          status: 'Disposed',
          condition: 'Damaged',
          conditionLastAssessedAt: new Date(),
          currentAllocatedTo: null,
          currentAllocationId: null
        });

        // Write OUT to stock ledger
        await writeLedgerEntry({
          assetId: repair.assetId,
          transactionType: 'OUT',
          triggerType: 'Write_Off_Disposal',
          previousState: 'Under Repair',
          newState: 'Disposed',
          quantity: 1,
          performedBy: userId,
          referenceModel: 'assets_repairs',
          referenceId: docId
        });
      }
    }
  };
}

