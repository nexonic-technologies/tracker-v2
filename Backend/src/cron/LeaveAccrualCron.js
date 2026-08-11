import models from "../models/Collection.js";
const LeaveTransaction = models.leave_transactions;


export const jobs = [
  {
    name: "LeaveAccrualCron",
    defaultExpression: "0 0 1 * *",
    run: async () => {
      try {
        // console.log("🕐 [Cron] Starting monthly leave accrual processing...");
        const employees = await models.employees.find({ status: "Active" });

        for (const employee of employees) {
          const deptId = employee.professionalInfo?.department;
          if (!deptId) continue;

          const dept = await models.departments.findById(deptId).populate({
            path: "leavePolicy",
            populate: { path: "leaves.leaveType" }
          }).lean();

          const policy = dept?.leavePolicy;
          if (!policy || !Array.isArray(policy.leaves)) continue;

          let modified = false;

          for (const policyLeaf of policy.leaves) {
            const leaveTypeId = policyLeaf.leaveType?._id || policyLeaf.leaveType;
            if (!leaveTypeId) continue;

            let bucket = employee.leaveStatus.find(
              b => b.leaveType.toString() === leaveTypeId.toString()
            );

            const accrualAmount = policyLeaf.maxDaysPerMonth || 0;
            const cap = policyLeaf.maxDaysPerYear || 12;

            if (bucket) {
              // Increment balance, clamp at annual limit
              const newAvailable = Math.min(bucket.available + accrualAmount, cap);
              if (bucket.available !== newAvailable) {
                const actualAccrued = newAvailable - bucket.available;
                bucket.available = newAvailable;
                modified = true;

                await LeaveTransaction.create({
                  employeeId: employee._id,
                  leaveTypeId: leaveTypeId,
                  type: 'MONTHLY_CREDIT',
                  sourceModel: 'cron',
                  quantity: actualAccrued,
                  description: `Monthly leave accrual credit`
                });
              }
              // Reset monthly usage tracking
              bucket.usedThisMonth = 0;
            } else {
              // Initialize bucket
              employee.leaveStatus.push({
                leaveType: leaveTypeId,
                usedThisMonth: 0,
                usedThisYear: 0,
                carriedForward: 0,
                available: accrualAmount
              });
              modified = true;

              await LeaveTransaction.create({
                employeeId: employee._id,
                leaveTypeId: leaveTypeId,
                type: 'MONTHLY_CREDIT',
                sourceModel: 'cron',
                quantity: accrualAmount,
                description: `Initial leave bucket creation`
              });
            }
          }

          if (modified) {
            await employee.save();
          }
        }
        // console.log("✅ [Cron] Monthly leave accrual completed.");
      } catch (error) {
        console.error("❌ [Cron] Monthly leave accrual failed:", error);
      }
    }
  },
  {
    name: "LeaveRolloverCron",
    defaultExpression: "0 0 1 1 *",
    run: async () => {
      try {
        // console.log("🕐 [Cron] Starting yearly leave rollover and carry forward processing...");
        const employees = await models.employees.find({ status: "Active" });

        for (const employee of employees) {
          const deptId = employee.professionalInfo?.department;
          if (!deptId) continue;

          const dept = await models.departments.findById(deptId).populate({
            path: "leavePolicy",
            populate: { path: "leaves.leaveType" }
          }).lean();

          const policy = dept?.leavePolicy;
          if (!policy || !Array.isArray(policy.leaves)) continue;

          let modified = false;

          for (const policyLeaf of policy.leaves) {
            const leaveTypeId = policyLeaf.leaveType?._id || policyLeaf.leaveType;
            if (!leaveTypeId) continue;

            let bucket = employee.leaveStatus.find(
              b => b.leaveType.toString() === leaveTypeId.toString()
            );

            if (bucket) {
              const unused = bucket.available;
              let carryAmount = 0;

              if (policyLeaf.carryForward && unused > 0) {
                // Carry forward unused leaves, clamped by policy annual allocation limit
                carryAmount = Math.min(unused, policyLeaf.maxDaysPerYear);
              }

              bucket.carriedForward = carryAmount;
              bucket.usedThisYear = 0;
              bucket.usedThisMonth = 0;
              // Refresh balance with carry forward + initial policy quota allocation
              const newQuota = policyLeaf.maxDaysPerYear || 0;
              bucket.available = carryAmount + newQuota;
              modified = true;

              await LeaveTransaction.create({
                employeeId: employee._id,
                leaveTypeId: leaveTypeId,
                type: 'YEARLY_ROLLOVER',
                sourceModel: 'cron',
                quantity: newQuota, // We document the new quota addition
                description: `Yearly rollover. Carried forward: ${carryAmount}, Quota: ${newQuota}`
              });
            }
          }

          if (modified) {
            await employee.save();
          }
        }
        // console.log("✅ [Cron] Yearly leave rollover completed.");
      } catch (error) {
        console.error("❌ [Cron] Yearly leave rollover failed:", error);
      }
    }
  }
];
