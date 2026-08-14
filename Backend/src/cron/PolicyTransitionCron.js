import cron from "node-cron";
import models from "../models/Collection.js";
import { resolveEmployeeLeavePolicy } from "../services/business/leavePolicyResolver.js";
import { syncEmployeeLeaveStatus } from "../services/business/leaveBalanceService.js";

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
              await syncEmployeeLeaveStatus(employee, models, today);
            }
          }
        }
      } catch (error) {
        console.error("❌ [Cron] Policy transition execution failed:", error);
      }
    }
  }
];
