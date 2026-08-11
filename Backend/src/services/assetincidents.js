// services/assets_incidents.js
// Service hooks for the assets_incidents collection.
// Loaded automatically by servicesCache.js — filename must match collection key in Collection.js.

import models from '../models/Collection.js';


const ALLOWED_TRANSITIONS = {
  'Reported': ['Under Investigation', 'Approved', 'Rejected'],
  'Under Investigation': ['Approved', 'Rejected'],
  'Approved': ['Closed'],
  'Rejected': ['Closed'],
  'Closed': [],
};

export default function () {
  return {
    /**
     * beforeCreate
     * ─────────────
     * 1. Validate employee and asset.
     * 2. Set defaults (status = 'Reported', metaStatus = 'active').
     * 3. Auto-populate employee/allocation/department if not provided.
     * 4. Enforce createdBy.
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

      // Auto-populate if asset is allocated
      if (asset.status === 'Allocated') {
        if (!data.employeeId && asset.currentAllocatedTo) {
          data.employeeId = asset.currentAllocatedTo;
        }
        if (!data.allocationId && asset.currentAllocationId) {
          data.allocationId = asset.currentAllocationId;
        }
      }

      // Fallback employee verification
      if (!data.employeeId) {
        throw new Error('employeeId is required.');
      }
      const employee = await models.employees.findById(data.employeeId).lean();
      if (!employee) {
        throw new Error('Employee not found.');
      }

      // Auto-set department
      if (!data.departmentId && employee.professionalInfo?.department) {
        data.departmentId = employee.professionalInfo.department;
      }

      // Enforce status and date defaults
      data.status = 'Reported';
      data.metaStatus = 'active';
      if (!data.incidentDate) {
        data.incidentDate = new Date();
      }

      return data;
    },

    /**
     * afterCreate
     * ────────────
     * 1. Initialize approval workflow.
     * 2. Update asset status to 'Under Repair' or 'Lost'.
     */
    afterCreate: async (ctx) => {
      const { docId } = ctx;
      const doc = await models.assets_incidents.findById(docId);
      if (!doc) return;

      // 1. Initialize approval workflow
      const approvalEngine = (await import('../utils/approval/approvalEngine.js')).default;
      await approvalEngine.initializeWorkflow('assets_incidents', doc);

      // 2. Re-fetch or update asset status based on incident type
      let nextAssetStatus = 'Under Repair';
      if (['Theft', 'Loss'].includes(doc.incidentType)) {
        nextAssetStatus = 'Lost';
      }
      await models.assets.findByIdAndUpdate(doc.assetId, { status: nextAssetStatus });
    },

    /**
     * beforeUpdate
     * ─────────────
     * 1. Enforce status transition rules.
     * 2. Cache old status for afterUpdate hooks.
     */
    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;
      const data = body;
      if (!docId) return data;

      const current = await models.assets_incidents.findById(docId).select('status').lean();
      if (!current) {
        throw new Error('Asset incident record not found.');
      }

      if (data.status !== undefined) {
        const allowed = ALLOWED_TRANSITIONS[current.status] || [];
        if (current.status === data.status) {
          delete data.status;
        } else if (!allowed.includes(data.status)) {
          throw new Error(`Invalid status transition: "${current.status}" → "${data.status}" is not allowed.`);
        }
      }

      // Cache previous status inside body
      data._oldStatus = current.status;
      return data;
    },

    /**
     * afterUpdate
     * ────────────
     * 1. Advance approval workflow if status changes.
     * 2. If approved at final step, set recoveryApproved = true.
     */
    afterUpdate: async (ctx) => {
      const { docId, data, beforeDoc, userId } = ctx;
      if (!docId) return;

      const doc = await models.assets_incidents.findById(docId);
      if (!doc) return;

      const prevStatus = beforeDoc.status;
      const newStatus = doc.status;

      if ((prevStatus === 'Reported' || prevStatus === 'Under Investigation') &&
        (newStatus === 'Approved' || newStatus === 'Rejected')) {

        const approvalEngine = (await import('../utils/approval/approvalEngine.js')).default;
        const result = await approvalEngine.advanceWorkflow(
          doc,
          userId,
          newStatus,
          data.approverComment || data.managerComments || data.notes || ''
        );

        if (result.finalized && result.status === 'Approved') {
          doc.recoveryApproved = true;
          await doc.save();
        }
      }
    }
  };
}

