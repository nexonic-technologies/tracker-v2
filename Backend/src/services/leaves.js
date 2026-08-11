import models from "../models/Collection.js";

const Leave = models.leaves;
const Employee = models.employees;
const Attendance = models.attendances;

export default function leaves() {
  return {
    // BEFORE CREATE ➝ Validations (balance, overlaps) + auto-initialize bucket
    beforeCreate: async (ctx) => {
      const { body, user } = ctx;
      const role = user?.role;
      const userId = user?.id;
      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid start or end date.");
      }
      if (end < start) {
        throw new Error("End date must be on or after start date.");
      }

      const empId = body.employeeId || userId;

      // Check for overlapping leaves (Active or Pending)
      const existingOverlap = await Leave.findOne({
        employeeId: empId,
        status: { $in: ['Pending', 'Approved'] },
        metaStatus: 'active',
        $or: [
          { startDate: { $gte: body.startDate, $lte: body.endDate } },
          { endDate: { $gte: body.startDate, $lte: body.endDate } },
          { startDate: { $lte: body.startDate }, endDate: { $gte: body.endDate } }
        ]
      });

      if (existingOverlap) {
        throw new Error("Overlapping leave request already exists for this date range.");
      }

      // Calculate totalDays
      const totalDays = Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
      body.totalDays = totalDays;

      // Resolve employee and check balance
      const employee = await Employee.findById(empId);
      if (!employee) throw new Error("Employee profile not found.");

      let bucket = employee.leaveStatus.find(
        (i) => i.leaveType.toString() === body.leaveTypeId.toString()
      );

      if (!bucket) {
        // Auto-initialize bucket from Department's Leave Policy
        const deptId = body.departmentId || employee.professionalInfo?.department;
        if (deptId) {
          const { default: models } = await import('../models/Collection.js');
          const dept = await models.departments.findById(deptId)
            .populate('leavePolicy')
            .lean();
          const policy = dept?.leavePolicy;
          if (policy && Array.isArray(policy.leaves)) {
            const policyLeaf = policy.leaves.find(l => l.leaveType.toString() === body.leaveTypeId.toString());
            if (policyLeaf) {
              const newBucket = {
                leaveType: body.leaveTypeId,
                usedThisMonth: 0,
                usedThisYear: 0,
                carriedForward: 0,
                available: policyLeaf.maxDaysPerYear || 0
              };
              employee.leaveStatus.push(newBucket);
              ctx.pendingLeaveBucket = { empId, newBucket };
              
              // Refetch bucket reference from in-memory array
              bucket = newBucket;
            }
          }
        }
      }

      if (!bucket) {
        throw new Error("Insufficient Leave Balance. Leave type is not configured under your policy.");
      }

      if (bucket.available < totalDays) {
        throw new Error(`Insufficient Leave Balance. Required: ${totalDays} days, Available: ${bucket.available} days.`);
      }

      return body;
    },

    // AFTER CREATE ➝ Triggered once leave request is newly submitted
    afterCreate: async (ctx) => {
      const { docId } = ctx;
      if (ctx.pendingLeaveBucket) {
        const { empId, newBucket } = ctx.pendingLeaveBucket;
        await Employee.updateOne(
          { _id: empId, 'leaveStatus.leaveType': { $ne: newBucket.leaveType } },
          { $push: { leaveStatus: newBucket } }
        );
      }

      const leaveDoc = await Leave.findById(docId);
      if (!leaveDoc) return;

      // Initialize dynamic approval workflow
      const approvalEngine = (await import('../utils/approval/approvalEngine.js')).default;
      await approvalEngine.initializeWorkflow('leaves', leaveDoc);
    },

    // BEFORE UPDATE ➝ Store old status to compare after update
    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;
      if (!docId) return body;

      // Fetch previous leave document BEFORE the update happens
      const oldLeave = await Leave.findById(docId).lean();
      if (!oldLeave) {
        throw new Error("Leave record not found.");
      }

      // Store old status (Pending ➔ Approved etc.)
      body._oldStatus = oldLeave.status;

      // Validate managerComments/remarks when approving/rejecting
      if (body.status && body.status !== oldLeave.status && ['Approved', 'Rejected'].includes(body.status)) {
        const comment = body.managerComments || body.approverComment;
        if (!comment || typeof comment !== 'string' || comment.trim().length < 5) {
          throw new Error("Manager comments/remarks are required and must be at least 5 characters long when approving or rejecting a leave request.");
        }
      }

      return body;
    },

    // AFTER UPDATE ➝ Advance workflow and trigger side effects on final approval/rejection
    afterUpdate: async (ctx) => {
      const { docId, body, user } = ctx;
      const userId = user?.id;
      if (!docId) return;

      const leaveDoc = await Leave.findById(docId);
      const prevStatus = body._oldStatus;
      const newStatus = leaveDoc.status;

      // Check if status is progressing (from Pending to Approved/Rejected)
      if (prevStatus === 'Pending' && (newStatus === 'Approved' || newStatus === 'Rejected')) {
        const approvalEngine = (await import('../utils/approval/approvalEngine.js')).default;
        const result = await approvalEngine.advanceWorkflow(
          leaveDoc, 
          userId, 
          newStatus, 
          body.approverComment || body.managerComments || ''
        );

        // Deduct balance and create attendance only when approved at final step
        if (result.finalized && result.status === 'Approved') {
          const employee = await Employee.findById(leaveDoc.employeeId);
          const bucket = employee.leaveStatus.find(
            (i) => i.leaveType.toString() === leaveDoc.leaveTypeId.toString()
          );

          // Calculate no. of leave days
          const start = new Date(leaveDoc.startDate);
          const end = new Date(leaveDoc.endDate);
          const oneDay = 24 * 60 * 60 * 1000;
          const totalDays = Math.round((end - start) / oneDay) + 1;

          if (bucket) {
            bucket.usedThisMonth += totalDays;
            bucket.usedThisYear += totalDays;
            bucket.available = Math.max(bucket.available - totalDays, 0); // never negative
          }
          await employee.save();

          // Write to LeaveTransaction Audit Ledger
          const { default: LeaveTransaction } = await import('../models/LeaveTransaction.js');
          await LeaveTransaction.create({
            employeeId: leaveDoc.employeeId,
            leaveTypeId: leaveDoc.leaveTypeId,
            type: 'LEAVE_DEBIT',
            sourceId: leaveDoc._id,
            sourceModel: 'leaves',
            quantity: -totalDays, // Negative for debit
            description: `Leave consumed for ${totalDays} days`
          });

          // Add attendance for ALL leave days
          const attendance = [];
          let current = new Date(start);
          while (current <= end) {
            attendance.push({
              employee: leaveDoc.employeeId,
              employeeName: leaveDoc.employeeName,
              date: new Date(current),
              status: "Leave",
              leaveType: leaveDoc.leaveType || leaveDoc.leaveTypeId,
              managerId: userId,
            });
            current.setDate(current.getDate() + 1);
          }
          await Attendance.insertMany(attendance);
        }
      } 
      
      // CASE: Approved ➔ Rejected (ROLLBACK FLOW)
      else if (prevStatus === "Approved" && newStatus === "Rejected") {
        const employee = await Employee.findById(leaveDoc.employeeId);
        const bucket = employee.leaveStatus.find(
          (i) => i.leaveType.toString() === leaveDoc.leaveTypeId.toString()
        );

        // Calculate leave days for rollback
        const start = new Date(leaveDoc.startDate);
        const end = new Date(leaveDoc.endDate);
        const oneDay = 24 * 60 * 60 * 1000;
        const totalDays = Math.round((end - start) / oneDay) + 1;

        if (bucket) {
          // Reverse deductions
          bucket.usedThisMonth = Math.max(bucket.usedThisMonth - totalDays, 0);
          bucket.usedThisYear = Math.max(bucket.usedThisYear - totalDays, 0);
          bucket.available += totalDays; // restore leave balance
        }
        await employee.save();

        // Write to LeaveTransaction Audit Ledger
        const { default: LeaveTransaction } = await import('../models/LeaveTransaction.js');
        await LeaveTransaction.create({
          employeeId: leaveDoc.employeeId,
          leaveTypeId: leaveDoc.leaveTypeId,
          type: 'LEAVE_CREDIT_REVERSAL',
          sourceId: leaveDoc._id,
          sourceModel: 'leaves',
          quantity: totalDays, // Positive for restoration
          description: `Leave request rejected, restored ${totalDays} days`
        });

        // Delete attendance records for that leave period
        await Attendance.deleteMany({
          employee: leaveDoc.employeeId,
          date: { $gte: leaveDoc.startDate, $lte: leaveDoc.endDate },
          status: "Leave",
        });
      }
    }
  };
}
