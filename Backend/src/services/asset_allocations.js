// services/assets_allocations.js
// Service hooks for the assets_allocations collection.
// Loaded automatically by servicesCache.js — filename must match collection key in Collection.js.

import models from '../models/Collection.js';

import approvalEngine from '../utils/approval/approvalEngine.js';
import { writeLedgerEntry } from './business/assetDomainHelper.js';

// ── Status transition rules ────────────────────────────────────────────────────
const ALLOWED_TRANSITIONS = {
  'Pending Approval': ['Active', 'Rejected'],
  'Active': ['Returned', 'Transferred'],
  'Returned': [],  // Terminal
  'Transferred': [],  // Terminal
  'Rejected': [],  // Terminal
};

export default function () {
  return {

    /**
     * beforeCreate
     * ─────────────
     * 1. Validate employee exists and is active.
     * 2. Validate asset exists and is Available.
     * 3. Check for any duplicate active requests on the same asset.
     * 4. If allocationType is 'Transfer', validate transferFromEmployee (current owner) and transferToEmployee.
     * 5. Force status = 'Pending Approval' and metaStatus = 'active'.
     * 6. Set createdBy = userId.
     */
    beforeCreate: async (ctx) => {
      const { role, userId, body } = ctx;
      const data = body;

      // 1. Enforce createdBy
      if (userId) {
        data.createdBy = userId;
      }

      // 3. Validate employee
      if (!data.employeeId) {
        throw new Error('employeeId is required.');
      }
      const employee = await models.employees.findOne({
        _id: data.employeeId,
        status: 'Active'
      }).lean();
      if (!employee) {
        throw new Error('Target employee is not found or inactive.');
      }

      // 4. Validate asset
      if (!data.assetId) {
        throw new Error('assetId is required.');
      }
      const asset = await models.assets.findById(data.assetId).lean();
      if (!asset) {
        throw new Error('Referenced asset not found.');
      }

      // 5. Force default status and metaStatus
      data.status = 'Pending Approval';
      data.metaStatus = 'active';

      // 6. Duplicate request guard
      const activeOrPending = await models.assets_allocations.findOne({
        assetId: data.assetId,
        status: { $in: ['Active', 'Pending Approval'] },
        metaStatus: 'active'
      }).lean();

      if (activeOrPending) {
        // Exception: If we are requesting a transfer, there MUST be an Active allocation
        if (data.allocationType === 'Transfer') {
          if (activeOrPending.status !== 'Active') {
            throw new Error(`Cannot request transfer: asset has a pending allocation request already (ID: ${activeOrPending._id}).`);
          }
        } else {
          throw new Error(`Asset is already allocated or has a pending request (Allocation ID: ${activeOrPending._id}).`);
        }
      } else {
        // If there's NO active/pending allocation, but we're trying to do a transfer, block.
        if (data.allocationType === 'Transfer') {
          throw new Error('Cannot request transfer: asset is not currently allocated to anyone.');
        }
      }

      // 7. Transfer validations
      if (data.allocationType === 'Transfer') {
        if (!data.transferFromEmployee) {
          throw new Error('transferFromEmployee is required for asset transfer requests.');
        }
        if (!data.transferToEmployee) {
          throw new Error('transferToEmployee is required for asset transfer requests.');
        }
        if (data.transferToEmployee.toString() !== data.employeeId.toString()) {
          throw new Error('transferToEmployee must match employeeId for the new allocation.');
        }
        if (data.transferFromEmployee.toString() === data.transferToEmployee.toString()) {
          throw new Error('Cannot transfer an asset to the same employee.');
        }

        // Verify the asset is indeed currently allocated to transferFromEmployee
        if (asset.currentAllocatedTo?.toString() !== data.transferFromEmployee.toString()) {
          throw new Error('Asset is not currently allocated to the specified transferFromEmployee.');
        }
      } else {
        // For non-transfers, asset MUST be Available
        if (asset.status !== 'Available') {
          throw new Error(`Asset is currently "${asset.status}" and cannot be allocated. Status must be "Available".`);
        }
      }

      return data;
    },

    /**
     * afterCreate
     * ────────────
     * 1. Initialize the approval workflow.
     * 2. Update asset status to 'Reserved' (to prevent duplicate requests while approval is pending).
     */
    afterCreate: async (ctx) => {
      const { docId } = ctx;
      const doc = await models.assets_allocations.findById(docId);
      if (!doc) return;

      // 1. Initialize approval workflow
      await approvalEngine.initializeWorkflow('assets_allocations', doc);

      // 2. Reserve the asset
      await models.assets.findByIdAndUpdate(doc.assetId, { status: 'Reserved' });
    },

    /**
     * beforeUpdate
     * ─────────────
     * 1. Enforce status transition rules.
     * 2. Handle return fields requirement.
     */
    beforeUpdate: async (ctx) => {
      const { role, userId, body, docId } = ctx;
      const data = body;

      if (data.status !== undefined) {
        const current = await models.assets_allocations.findById(docId)
          .select('status')
          .lean();

        if (!current) {
          throw new Error('Asset allocation record not found.');
        }

        const allowed = ALLOWED_TRANSITIONS[current.status] || [];

        if (current.status === data.status) {
          // Idempotent update
          delete data.status;
        } else if (!allowed.includes(data.status)) {
          throw new Error(
            `Invalid status transition: "${current.status}" → "${data.status}" is not allowed.`
          );
        }

        // Return rules enforcement
        if (data.status === 'Returned') {
          data.actualReturn = new Date();
          const VALID_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Lost'];
          if (!data.returnedCondition || !VALID_CONDITIONS.includes(data.returnedCondition)) {
            throw new Error(`returnedCondition is required and must be one of: ${VALID_CONDITIONS.join(', ')}.`);
          }
        }

        // Auditing & Approval status tracking
        if (data.status === 'Active') {
          data.approvedBy = userId;
          data.approvedAt = new Date();
        } else if (data.status === 'Rejected') {
          data.rejectedBy = userId;
          data.rejectedAt = new Date();
        }
      }

      return data;
    },

    /**
     * afterUpdate
     * ────────────
     * 1. If status changes to 'Active' (Approved):
     *    - Update asset to 'Allocated' and set currentAllocatedTo / currentAllocationId.
     *    - If allocationType is 'Transfer', find the previous active allocation and mark it as 'Transferred'.
     * 2. If status changes to 'Rejected':
     *    - Revert asset status back to 'Available'.
     * 3. If status changes to 'Returned':
     *    - Based on returnedCondition, update asset status ('Available', 'Under Repair', 'Lost') and condition state.
     */

    afterUpdate: async (ctx) => {
      const { docId, data, beforeDoc, userId } = ctx;
      const statusChanged = data.status && data.status !== beforeDoc.status;
      if (!statusChanged) return;

      const allocation = await models.assets_allocations.findById(docId).lean();
      if (!allocation) return;

      // ── 1. Approved (Pending Approval -> Active) ──────────────────────────────────
      if (allocation.status === 'Active') {
        // If it is a transfer, close the previous allocation
        if (allocation.allocationType === 'Transfer') {
          const prevAllocation = await models.assets_allocations.findOne({
            assetId: allocation.assetId,
            employeeId: allocation.transferFromEmployee,
            status: 'Active',
            metaStatus: 'active',
            _id: { $ne: docId }
          });

          if (prevAllocation) {
            prevAllocation.status = 'Transferred';
            prevAllocation.actualReturn = new Date();
            await prevAllocation.save();
          }

          // Log the release from previous employee as IN
          await writeLedgerEntry({
            assetId: allocation.assetId,
            transactionType: 'IN',
            triggerType: 'Employee_Return',
            previousState: 'Allocated',
            newState: 'Available',
            quantity: 1,
            performedBy: userId || allocation.createdBy,
            referenceModel: 'assets_allocations',
            referenceId: prevAllocation ? prevAllocation._id : docId
          });
        }

        // Update the asset register to Allocated
        await models.assets.findByIdAndUpdate(allocation.assetId, {
          status: 'Allocated',
          currentAllocatedTo: allocation.employeeId,
          currentAllocationId: docId
        });

        // Log the checkout as OUT
        await writeLedgerEntry({
          assetId: allocation.assetId,
          transactionType: 'OUT',
          triggerType: 'Employee_Allocation',
          previousState: 'Available',
          newState: 'Allocated',
          quantity: 1,
          performedBy: userId || allocation.createdBy,
          referenceModel: 'assets_allocations',
          referenceId: docId
        });
      }

      // ── 2. Rejected (Pending Approval -> Rejected) ──────────────────────────────
      if (allocation.status === 'Rejected') {
        // Revert asset status to Available
        await models.assets.findByIdAndUpdate(allocation.assetId, {
          status: 'Available'
        });
      }

      // ── 3. Returned (Active -> Returned) ──────────────────────────────────────────
      if (allocation.status === 'Returned') {
        const returnedCondition = allocation.returnedCondition;
        let nextAssetStatus = 'Available';
        let isConditionAssessmentNeeded = true;

        if (['Excellent', 'Good', 'Fair'].includes(returnedCondition)) {
          nextAssetStatus = 'Available';
        } else if (['Poor', 'Damaged'].includes(returnedCondition)) {
          nextAssetStatus = 'Under Repair';
        } else if (returnedCondition === 'Lost') {
          nextAssetStatus = 'Lost';
          isConditionAssessmentNeeded = false;
        }

        const assetUpdate = {
          status: nextAssetStatus,
          currentAllocatedTo: null,
          currentAllocationId: null
        };

        if (isConditionAssessmentNeeded) {
          assetUpdate.condition = returnedCondition;
          assetUpdate.conditionLastAssessedAt = new Date();
          if (userId) {
            assetUpdate.conditionLastAssessedBy = userId;
          }
        }

        await models.assets.findByIdAndUpdate(allocation.assetId, assetUpdate);

        // Log return as IN
        await writeLedgerEntry({
          assetId: allocation.assetId,
          transactionType: 'IN',
          triggerType: 'Employee_Return',
          previousState: 'Allocated',
          newState: nextAssetStatus === 'Lost' ? 'Disposed' : nextAssetStatus,
          quantity: 1,
          performedBy: userId,
          referenceModel: 'assets_allocations',
          referenceId: docId
        });
      }
    }

  };
}

