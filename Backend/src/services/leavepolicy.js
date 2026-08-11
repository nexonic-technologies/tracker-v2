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

export default function leavepolicyService() {
  return {
    async beforeCreate(ctx) {
      const { body, userId } = ctx;
      if (userId) {
        body.createdBy = userId;
      }
      return body;
    },
    async beforeUpdate(ctx) {
      const { body, existingDoc } = ctx;
      const oldStatus = existingDoc?.status || 'Active';
      if (oldStatus === 'Active' || oldStatus === 'Expired') {
        const immutableFields = ['leaves', 'applicableDepartments', 'applicableDesignations', 'effectiveFrom', 'effectiveTo'];
        const violates = immutableFields.some(field => field in body);
        if (violates) {
          throw new Error("⛔ Active or Expired policies are immutable. To make changes, please create a new policy version with a future effective date.");
        }
      }
      return body;
    },

    async afterUpdate(ctx) {
      const { docId } = ctx;
      const policyId = docId;

      try {
        const { default: models } = await import('../models/Collection.js');
        const policy = await models.leavepolicy.findById(policyId)
          .populate('leaves.leaveType')
          .lean();

        if (!policy) return;

        const depts = await models.departments.find({ leavePolicy: policyId }).select('_id');
        const desigs = await models.designations.find({ leavePolicy: policyId }).select('_id');

        const deptIds = depts.map(d => d._id);
        const desigIds = desigs.map(d => d._id);

        const appDepts = policy.applicableDepartments || [];
        const appDesigs = policy.applicableDesignations || [];

        const employees = await models.employees.find({
          $or: [
            { 'professionalInfo.leavePolicyOverride': policyId },
            { 'professionalInfo.department': { $in: deptIds } },
            { 'professionalInfo.designation': { $in: desigIds } },
            {
              'professionalInfo.department': { $in: appDepts },
              'professionalInfo.designation': { $in: appDesigs }
            }
          ]
        });

        for (const employee of employees) {
          const activePolicy = await resolveEmployeeLeavePolicy(employee.professionalInfo, models);
          if (activePolicy && activePolicy._id.toString() === policyId.toString()) {
            const merged = mergeLeaveBalances(employee.leaveStatus || [], activePolicy);
            employee.leaveStatus = merged;
            await employee.save();
          }
        }
      } catch (error) {
        console.error("[LeavePolicyService] Failed to propagate policy updates to employees:", error.message);
      }
    }
  };
}

