import cron from "node-cron";
import models from "../models/Collection.js";


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

export const jobs = [
  {
    name: "PolicyTransitionCron",
    defaultExpression: "5 0 * * *",
    run: async () => {
      try {
        const today = new Date();
        // Find all Scheduled policies that should go active today
        const scheduledPolicies = await models.leavepolicy.find({
          status: "Scheduled",
          effectiveFrom: { $lte: today }
        });

        if (scheduledPolicies.length === 0) return;

        for (const policy of scheduledPolicies) {
          const policyId = policy._id;

          // 1. Find and expire overlapping active policies
          const conflicts = await models.leavepolicy.find({
            _id: { $ne: policyId },
            status: "Active",
            $or: [
              {
                applicableDepartments: { $in: policy.applicableDepartments || [] },
                applicableDesignations: { $in: policy.applicableDesignations || [] }
              }
            ]
          });

          for (const conflict of conflicts) {
            conflict.status = "Expired";
            conflict.isActive = false;
            conflict.effectiveTo = today;
            await conflict.save();
          }

          // 2. Set new policy to Active
          policy.status = "Active";
          policy.isActive = true;
          await policy.save();

          // 3. Propagate to eligible employees
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
            const activePolicy = await resolveEmployeeLeavePolicy(employee.professionalInfo, models, today);
            if (activePolicy && activePolicy._id.toString() === policyId.toString()) {
              const merged = mergeLeaveBalances(employee.leaveStatus || [], activePolicy);
              employee.leaveStatus = merged;
              await employee.save();
            }
          }
        }
      } catch (error) {
        console.error("❌ [Cron] Policy transition execution failed:", error);
      }
    }
  }
];
