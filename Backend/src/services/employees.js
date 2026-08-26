import bcrypt from 'bcryptjs';
import { getTenantStore } from '../tenant/tenantContext.js';
import { resolveEmployeeLeavePolicy } from './business/leavePolicyResolver.js';

export default function employeesService() {

  // Shared future-date validation guard
  const rejectFutureDates = (body) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const dateChecks = [
      { path: 'basicInfo.dob', label: 'Date of Birth' },
      { path: 'basicInfo.doa', label: 'Date of Anniversary' },
      { path: 'professionalInfo.doj', label: 'Date of Joining' },
      { path: 'professionalInfo.confirmDate', label: 'Confirmation Date' },
    ];
    for (const { path, label } of dateChecks) {
      const parts = path.split('.');
      let val = body;
      for (const p of parts) { val = val?.[p]; }
      if (val && new Date(val) > today) {
        const err = new Error(`${label} cannot be a future date`);
        err.statusCode = 400;
        throw err;
      }
    }
  };

  return {
    /**
     * beforeCreate: Hash the password inside authInfo before saving a new employee.
     * Also initialize Leave Status Buckets based on Resolved Leave Policy (Dept > Desig).
     */
    async beforeCreate(ctx) {
      const { body } = ctx;

      // ── Future Date Validation Guard ──
      rejectFutureDates(body);


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

      // ── Future Date Validation Guard ──
      rejectFutureDates(body);


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

        const hasDeptUpdate = 'department' in updatedProf;
        const hasDesigUpdate = 'designation' in updatedProf;

        const newDept = hasDeptUpdate ? (updatedProf.department?.toString() || null) : oldDept;
        const newDesig = hasDesigUpdate ? (updatedProf.designation?.toString() || null) : oldDesig;

        const policyChanged = (newDept !== oldDept) || (newDesig !== oldDesig);

        if (policyChanged) {
          const { default: models } = await import('../models/Collection.js');
          const mergedProf = {
            department: newDept,
            designation: newDesig
          };
          const newPolicy = await resolveEmployeeLeavePolicy(mergedProf, models);
          if (newPolicy && Array.isArray(newPolicy.leaves)) {
            const { getEmployeeLeaveBalance } = await import("./business/leaveBalanceService.js");
            const newLeaveStatus = [];
            for (const leaf of newPolicy.leaves) {
              const leafId = leaf.leaveType?._id || leaf.leaveType;
              if (!leafId) continue;
              const bal = await getEmployeeLeaveBalance(docId, leafId, models);
              newLeaveStatus.push({
                leaveType: leafId,
                usedThisMonth: bal.usedThisMonth,
                usedThisYear: bal.usedThisYear,
                carriedForward: bal.carriedForward,
                available: bal.available
              });
            }
            body.leaveStatus = newLeaveStatus;
          }
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
        const { default: lifecycleHistoryService } = await import('./business/lifecycleHistoryService.js');
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

      // Sync updated employee credentials & status to Global UserLogin DB
      try {
        const store = getTenantStore();
        const doc = ctx.data || ctx.updatedDoc || (existingDoc ? { ...existingDoc, ...body, _id: docId } : null);
        await syncEmployeeUserLogin(doc, store);
      } catch (err) {
        console.warn('[EmployeeService.afterUpdate] UserLogin sync failed:', err.message);
      }
    },

    /**
     * afterCreate: Sync newly created employee credentials & status to Global UserLogin DB.
     */
    async afterCreate(ctx) {
      try {
        const store = getTenantStore();
        const doc = ctx.result || ctx.createdDocument || ctx.data || ctx.body;
        await syncEmployeeUserLogin(doc, store);
      } catch (err) {
        console.warn('[EmployeeService.afterCreate] UserLogin sync failed:', err.message);
      }
    }
  };
}

/**
 * Sync employee record to Global UserLogin central auth DB.
 */
async function syncEmployeeUserLogin(employeeDoc, tenantStore) {
  if (!employeeDoc) return;
  const workEmail = employeeDoc.authInfo?.workEmail || employeeDoc.email;
  if (!workEmail) return;

  try {
    const { getGlobalModels } = await import('../models/global/index.js');
    const globalModels = getGlobalModels();
    if (!globalModels || !globalModels.UserLogin) return;

    const { UserLogin } = globalModels;
    const cleanEmail = workEmail.toLowerCase().trim();
    const tenantId = tenantStore?.tenantId || tenantStore?.tenant?.tenantId || 'admin';
    const dbName = tenantStore?.dbName || tenantStore?.tenant?.dbName || process.env.DEFAULT_TENANT_DB || 'tenant_admin';

    const empName = [employeeDoc.basicInfo?.firstName, employeeDoc.basicInfo?.lastName].filter(Boolean).join(' ') || cleanEmail.split('@')[0];

    // Dynamically resolve role name and isSuperAdmin flag
    let roleName = 'Employee';
    let isSuperAdmin = false;

    if (employeeDoc.professionalInfo?.role) {
      const rawRole = employeeDoc.professionalInfo.role;
      if (typeof rawRole === 'object' && rawRole !== null) {
        roleName = rawRole.name || rawRole.title || rawRole._id?.toString() || 'Employee';
        isSuperAdmin = !!rawRole.isSuperAdmin;
      } else if (typeof rawRole === 'string') {
        try {
          const { default: TenantConnectionManager } = await import('../tenant/TenantConnectionManager.js');
          const { default: models } = await import('../models/Collection.js');
          const { conn } = await TenantConnectionManager.getTenantConnection(dbName);
          const RoleModel = conn.models.roles || conn.model('roles', models.roles.schema);
          const mongoose = (await import('mongoose')).default;
          if (mongoose.Types.ObjectId.isValid(rawRole)) {
            const roleDoc = await RoleModel.findById(rawRole).lean();
            if (roleDoc) {
              roleName = roleDoc.name;
              isSuperAdmin = !!roleDoc.isSuperAdmin;
            } else {
              roleName = rawRole;
            }
          } else {
            roleName = rawRole;
          }
        } catch (_) {
          roleName = rawRole;
        }
      }
    }

    if (employeeDoc.isSuperAdmin) {
      isSuperAdmin = true;
    }

    const updateFields = {
      email: cleanEmail,
      tenantId,
      dbName,
      employeeId: employeeDoc._id,
      userType: 'employee',
      name: empName,
      role: roleName,
      status: (employeeDoc.status === 'Inactive' || employeeDoc.status === 'Terminated' || employeeDoc.isActive === false) ? 'Inactive' : 'Active',
      isSuperAdmin,
    };

    if (employeeDoc.authInfo?.password) {
      updateFields.password = employeeDoc.authInfo.password;
    }

    if (employeeDoc.authInfo?.googleEmail) {
      updateFields.googleEmail = employeeDoc.authInfo.googleEmail.toLowerCase();
    }
    if (employeeDoc.authInfo?.googleLoginEnabled !== undefined) {
      updateFields.googleLoginEnabled = employeeDoc.authInfo.googleLoginEnabled;
    }

    await UserLogin.findOneAndUpdate(
      { email: cleanEmail },
      { $set: updateFields },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('[EmployeeService] Failed to sync UserLogin in Global DB:', err.message);
  }
}

