import bcrypt from 'bcryptjs';
import { getTenantStore } from '../tenant/tenantContext.js';

async function resolveEmployeeLeavePolicy(professionalInfo, models, evalDate = new Date()) {
  if (!professionalInfo) return null;

  // 1. Employee Override
  if (professionalInfo.leavePolicyOverride) {
    const policy = await models.leavepolicy.findById(professionalInfo.leavePolicyOverride)
      .populate('leaves.leaveType')
      .lean();
    if (policy) return policy;
  }

  // 2. Department + Designation Combo Policy
  if (professionalInfo.department && professionalInfo.designation) {
    const comboPolicy = await models.leavepolicy.findOne({
      applicableDepartments: professionalInfo.department,
      applicableDesignations: professionalInfo.designation,
      status: 'Active',
      effectiveFrom: { $lte: evalDate },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $gte: evalDate } }
      ]
    })
      .populate('leaves.leaveType')
      .lean();
    if (comboPolicy) return comboPolicy;
  }

  // 3. Department Policy
  if (professionalInfo.department) {
    const deptPolicy = await models.leavepolicy.findOne({
      applicableDepartments: professionalInfo.department,
      applicableDesignations: { $size: 0 },
      status: 'Active',
      effectiveFrom: { $lte: evalDate },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $gte: evalDate } }
      ]
    })
      .populate('leaves.leaveType')
      .lean();
    if (deptPolicy) return deptPolicy;

    const dept = await models.departments.findById(professionalInfo.department)
      .populate({
        path: 'leavePolicy',
        populate: { path: 'leaves.leaveType' }
      })
      .lean();
    if (dept?.leavePolicy) return dept.leavePolicy;
  }

  // 4. Designation Policy
  if (professionalInfo.designation) {
    const desigPolicy = await models.leavepolicy.findOne({
      applicableDesignations: professionalInfo.designation,
      applicableDepartments: { $size: 0 },
      status: 'Active',
      effectiveFrom: { $lte: evalDate },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $gte: evalDate } }
      ]
    })
      .populate('leaves.leaveType')
      .lean();
    if (desigPolicy) return desigPolicy;

    const desig = await models.designations.findById(professionalInfo.designation)
      .populate({
        path: 'leavePolicy',
        populate: { path: 'leaves.leaveType' }
      })
      .lean();
    if (desig?.leavePolicy) return desig.leavePolicy;
  }

  return null;
}

function mergeLeaveBalances(oldLeaveStatus = [], newPolicy) {
  if (!newPolicy || !Array.isArray(newPolicy.leaves)) return oldLeaveStatus;

  const merged = [];

  for (const policyLeaf of newPolicy.leaves) {
    const leaveTypeId = policyLeaf.leaveType?._id || policyLeaf.leaveType;
    if (!leaveTypeId) continue;

    const existingBucket = oldLeaveStatus.find(
      b => b.leaveType && b.leaveType.toString() === leaveTypeId.toString()
    );

    const maxDays = policyLeaf.maxDaysPerYear || 0;

    if (existingBucket) {
      const usedThisYear = existingBucket.usedThisYear || 0;
      const newAvailable = Math.max(maxDays - usedThisYear, 0);

      merged.push({
        leaveType: leaveTypeId,
        usedThisMonth: existingBucket.usedThisMonth || 0,
        usedThisYear: usedThisYear,
        carriedForward: existingBucket.carriedForward || 0,
        available: newAvailable
      });
    } else {
      merged.push({
        leaveType: leaveTypeId,
        usedThisMonth: 0,
        usedThisYear: 0,
        carriedForward: 0,
        available: maxDays
      });
    }
  }

  for (const oldBucket of oldLeaveStatus) {
    if (!oldBucket.leaveType) continue;
    const inNewPolicy = newPolicy.leaves.some(
      l => (l.leaveType?._id || l.leaveType).toString() === oldBucket.leaveType.toString()
    );
    if (!inNewPolicy) {
      merged.push(oldBucket);
    }
  }

  return merged;
}

export default function employeesService() {
  return {
    /**
     * beforeCreate: Hash the password inside authInfo before saving a new employee.
     * Also initialize Leave Status Buckets based on Resolved Leave Policy (Override > Dept > Desig).
     */
    async beforeCreate(ctx) {
      const { body } = ctx;

      // ── Max Users Capacity Limit Guard ──
      try {
        const store = getTenantStore();
        const maxUsers = store?.tenant?.settings?.maxUsers;
        if (maxUsers && typeof maxUsers === 'number' && maxUsers > 0) {
          const models = store.models || ctx.models;
          if (models && models.employees) {
            const currentActiveCount = await models.employees.countDocuments({
              status: { $in: ['Active', 'OnLeave', 'Probation'] }
            });
            if (currentActiveCount >= maxUsers) {
              const err = new Error(`[MaxUsersExceeded] Cannot create employee. Maximum user limit of ${maxUsers} active user(s) reached for this tenant subscription.`);
              err.statusCode = 400;
              throw err;
            }
          }
        }
      } catch (err) {
        if (err.statusCode === 400 || err.message.includes('[MaxUsersExceeded]')) {
          throw err;
        }
      }

      if (body?.authInfo?.password) {
        const salt = await bcrypt.genSalt(12);
        body.authInfo.password = await bcrypt.hash(body.authInfo.password, salt);
      }

      try {
        const { default: models } = await import('../models/Collection.js');
        const policy = await resolveEmployeeLeavePolicy(body?.professionalInfo, models);

        if (policy && Array.isArray(policy.leaves)) {
          body.leaveStatus = policy.leaves.map(policyLeaf => ({
            leaveType: policyLeaf.leaveType?._id || policyLeaf.leaveType,
            usedThisMonth: 0,
            usedThisYear: 0,
            carriedForward: 0,
            available: policyLeaf.maxDaysPerYear || 0
          }));
        }
      } catch (error) {
        console.error("[EmployeeService] Failed to initialize leave balance from policy:", error.message);
      }

      return body;
    },

    /**
     * beforeUpdate: Guard salaryDetails mutations, check optimistic concurrency __v,
     * hash password, check asset allocations on termination, and merge leave balances.
     */
    async beforeUpdate(ctx) {
      const { body, docId, existingDoc } = ctx;

      // 1. Guard against direct mutation of legacy salaryDetails
      if (body?.salaryDetails && Object.keys(body.salaryDetails).length > 0) {
        throw new Error('Direct mutation of Employee.salaryDetails is prohibited. Please use salaryRevisionService or update via SalaryStructure model.');
      }

      // 2. Optimistic Concurrency Control Check (__v)
      if (body?.__v !== undefined && existingDoc?.__v !== undefined && body.__v !== existingDoc.__v) {
        const err = new Error(`[ConcurrencyConflict] Document has been updated by another user (expected version ${existingDoc.__v}, received ${body.__v}). Please refresh.`);
        err.statusCode = 409;
        throw err;
      }

      if (body?.authInfo?.password) {
        const salt = await bcrypt.genSalt(12);
        body.authInfo.password = await bcrypt.hash(body.authInfo.password, salt);
      }

      if (body?.status && (body.status === 'Inactive' || body.status === 'Terminated')) {
        const { default: models } = await import('../models/Collection.js');
        const activeAllocCount = await models.assets_allocations.countDocuments({
          employeeId: docId,
          status: 'Active'
        });
        if (activeAllocCount > 0) {
          throw new Error(`Cannot update employee status to "${body.status}" because they still hold ${activeAllocCount} active asset allocation(s). Please process return or transfer before exit clearance.`);
        }
      }

      try {
        const existingProf = existingDoc?.professionalInfo || {};
        const updatedProf = body?.professionalInfo || {};

        const oldDept = existingProf.department?.toString() || null;
        const oldDesig = existingProf.designation?.toString() || null;
        const oldOverride = existingProf.leavePolicyOverride?.toString() || null;

        const hasDeptUpdate = 'department' in updatedProf;
        const hasDesigUpdate = 'designation' in updatedProf;
        const hasOverrideUpdate = 'leavePolicyOverride' in updatedProf;

        const newDept = hasDeptUpdate ? (updatedProf.department?.toString() || null) : oldDept;
        const newDesig = hasDesigUpdate ? (updatedProf.designation?.toString() || null) : oldDesig;
        const newOverride = hasOverrideUpdate ? (updatedProf.leavePolicyOverride?.toString() || null) : oldOverride;

        const policyChanged = (newDept !== oldDept) || (newDesig !== oldDesig) || (newOverride !== oldOverride);

        if (policyChanged) {
          const { default: models } = await import('../models/Collection.js');
          const mergedProf = {
            department: newDept,
            designation: newDesig,
            leavePolicyOverride: newOverride
          };
          const newPolicy = await resolveEmployeeLeavePolicy(mergedProf, models);
          const oldLeaveStatus = existingDoc?.leaveStatus || [];
          body.leaveStatus = mergeLeaveBalances(oldLeaveStatus, newPolicy);
        }
      } catch (error) {
        console.error("[EmployeeService] Failed to merge leave status on update:", error.message);
      }

      return body;
    },

    /**
     * afterUpdate: Log EmployeeLifecycleHistory on designation, department, manager, or status changes.
     */
    async afterUpdate(ctx) {
      const { docId, body, existingDoc, user } = ctx;
      if (!docId || !existingDoc) return;

      try {
        const { default: lifecycleHistoryService } = await import('./lifecycleHistoryService.js');
        const oldProf = existingDoc.professionalInfo || {};
        const newProf = body?.professionalInfo || {};

        // Designation Change / Promotion
        if (newProf.designation && newProf.designation.toString() !== oldProf.designation?.toString()) {
          await lifecycleHistoryService.logEvent({
            employeeId: docId,
            changeType: 'DesignationChange',
            previousValue: oldProf.designation,
            newValue: newProf.designation,
            changedBy: user?.id,
            reason: body.changeReason || 'Designation updated'
          });
        }

        // Department Change / Transfer
        if (newProf.department && newProf.department.toString() !== oldProf.department?.toString()) {
          await lifecycleHistoryService.logEvent({
            employeeId: docId,
            changeType: 'DepartmentChange',
            previousValue: oldProf.department,
            newValue: newProf.department,
            changedBy: user?.id,
            reason: body.changeReason || 'Department transfer'
          });
        }

        // Manager Change
        if (newProf.reportingManager && newProf.reportingManager.toString() !== oldProf.reportingManager?.toString()) {
          await lifecycleHistoryService.logEvent({
            employeeId: docId,
            changeType: 'ManagerChange',
            previousValue: oldProf.reportingManager,
            newValue: newProf.reportingManager,
            changedBy: user?.id,
            reason: body.changeReason || 'Reporting manager changed'
          });
        }

        // Status Change
        if (body.status && body.status !== existingDoc.status) {
          await lifecycleHistoryService.logEvent({
            employeeId: docId,
            changeType: 'StatusChange',
            previousValue: existingDoc.status,
            newValue: body.status,
            changedBy: user?.id,
            reason: body.changeReason || 'Employee status changed'
          });
        }
      } catch (err) {
        console.warn('[EmployeeService.afterUpdate] Lifecycle history logging failed:', err.message);
      }
    }
  };
}

