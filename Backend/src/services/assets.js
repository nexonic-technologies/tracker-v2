// services/assets.js
// Service hooks for the assets collection.
// Loaded automatically by servicesCache.js — filename must match collection key in Collection.js.

import models from '../models/Collection.js';

import { writeLedgerEntry } from './business/assetDomainHelper.js';

// ── Status transition rules ────────────────────────────────────────────────────
//
// Only ALLOWED transitions are listed. Any transition not in this map is forbidden.
// Phase 2 will add:   Available → Allocated  (AssetAllocation afterCreate hook)
//                     Allocated → Available  (AssetAllocation return hook)
//                     Allocated → Under Repair / Lost  (AssetIncident hook)
//
const ALLOWED_TRANSITIONS = {
  'Available': ['Under Repair', 'Reserved', 'Disposed', 'Lost'],
  'Reserved': ['Available', 'Allocated', 'Disposed'],
  'Under Repair': ['Available', 'Disposed'],
  'Allocated': ['Available', 'Under Repair', 'Lost'],      // Managed by Return/Incident hooks
  'Lost': ['Disposed'],
  'Disposed': [],      // Terminal — no transitions out
};

// ── Auto-generate AST-ID ───────────────────────────────────────────────────────

async function generateAssetId() {
  const count = await models.assets.countDocuments();
  return `AST-${String(count + 1).padStart(6, '0')}`;
}

export default function () {
  return {

    /**
     * beforeCreate
     * ─────────────
     * 1. Auto-generate assetId (strip any frontend-supplied value).
     * 2. Validate categoryId exists and is active.
     * 3. Guard duplicate serialNumber.
     * 4. Enforce default status = Available.
     * 5. Enforce default metaStatus = active.
     * 6. Enforce default condition = Good (unless explicitly provided).
     */
    beforeCreate: async (ctx) => {
      const { body } = ctx;
      const data = body;

      // 1. Auto-generate assetId — always override, never trust frontend
      data.assetId = await generateAssetId();

      // 2. Validate category
      if (!data.categoryId) {
        throw new Error('categoryId is required.');
      }
      const category = await models.assets_categories.findOne({
        _id: data.categoryId,
        isActive: true
      }).lean();
      if (!category) {
        throw new Error('Invalid or inactive asset category. Please select a valid category.');
      }

      // 3. Serial number uniqueness guard (only if provided)
      if (data.serialNumber && data.serialNumber.trim() !== '') {
        data.serialNumber = data.serialNumber.trim();
        const duplicate = await models.assets.findOne({
          serialNumber: data.serialNumber
        }).lean();
        if (duplicate) {
          throw new Error(`Serial number "${data.serialNumber}" is already registered (Asset ID: ${duplicate.assetId}).`);
        }
      } else {
        // Normalise empty string → null so the sparse unique index works correctly
        data.serialNumber = null;
      }

      // 4. Enforce status
      data.status = 'Available';

      // 5. Enforce metaStatus
      data.metaStatus = 'active';

      // 6. Default condition to 'Good' if not provided
      const VALID_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];
      if (!data.condition || !VALID_CONDITIONS.includes(data.condition)) {
        data.condition = 'Good';
      }

      return data;
    },

    /**
     * beforeUpdate
     * ─────────────
     * 1. Strip immutable fields.
     * 2. Enforce status transition rules.
     * 3. If condition is being updated, record conditionLastAssessedAt.
     */
    beforeUpdate: async (ctx) => {
      const { body, docId, userId } = ctx;
      const data = body;

      // 1. Strip immutable fields — silently, no error
      delete data.assetId;
      delete data.createdBy;

      // 2. Status transition guard
      if (data.status !== undefined) {
        const current = await models.assets.findById(docId)
          .select('status assetId')
          .lean();

        if (!current) {
          throw new Error('Asset not found.');
        }

        const allowed = ALLOWED_TRANSITIONS[current.status] || [];

        if (current.status === data.status) {
          // No-op transition — allowed (idempotent update)
          delete data.status;
        } else if (!allowed.includes(data.status)) {
          throw new Error(
            `Invalid status transition: "${current.status}" → "${data.status}" is not allowed for ${current.assetId}.`
          );
        }
      }

      // 3. Auto-stamp condition assessment if condition is changing
      const VALID_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];
      if (data.condition !== undefined) {
        if (!VALID_CONDITIONS.includes(data.condition)) {
          throw new Error(`Invalid condition value: "${data.condition}". Must be one of: ${VALID_CONDITIONS.join(', ')}.`);
        }
        data.conditionLastAssessedAt = new Date();
        if (userId) {
          data.conditionLastAssessedBy = userId;
        }
      }

      return data;
    },

    afterUpdate: async (ctx) => {
      const { docId, data, beforeDoc, userId } = ctx;
      const statusChanged = data.status && data.status !== beforeDoc.status;
      if (!statusChanged) return;

      if (data.status === 'Disposed') {
        await writeLedgerEntry({
          assetId: docId,
          transactionType: 'OUT',
          triggerType: 'Write_Off_Disposal',
          previousState: beforeDoc.status,
          newState: 'Disposed',
          quantity: 1,
          performedBy: userId,
          referenceModel: null,
          referenceId: null
        });
      }
    }
  };
}

