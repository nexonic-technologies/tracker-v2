import models from "../models/Collection.js";

const Employee = models.employees;

export default function comp_off_requests() {
  return {
    beforeCreate: async (ctx) => {
      const { body } = ctx;
      const worked = new Date(body.workedDate);
      if (isNaN(worked.getTime())) {
        throw new Error("Invalid worked date.");
      }
      if (!body.hoursWorked || body.hoursWorked <= 0) {
        throw new Error("Hours worked must be greater than 0.");
      }

      // Default expiry to 90 days if not set
      if (!body.expiryDate) {
        const expiry = new Date(worked);
        expiry.setDate(expiry.getDate() + 90);
        body.expiryDate = expiry;
      }
      // Auto-populate departmentId from the employee record
      if (!body.departmentId && body.employeeId) {
        try {
          const emp = await Employee.findById(body.employeeId).select('professionalInfo.department').lean();
          if (emp?.professionalInfo?.department) {
            body.departmentId = emp.professionalInfo.department;
          }
        } catch (e) { /* non-fatal — departmentId is optional */ }
      }
      return body;
    },

    afterCreate: async (ctx) => {
      const { modelName, docId, userId } = ctx;
      const { default: CompOffRequest } = await import('../models/CompOffRequest.js');
      const doc = await CompOffRequest.findById(docId);
      if (!doc) return;

      const approvalEngine = (await import('../utils/approval/approvalEngine.js')).default;
      await approvalEngine.initializeWorkflow('comp_off_requests', doc);
    },

    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;
      if (!docId) return;
      const { default: CompOffRequest } = await import('../models/CompOffRequest.js');
      const oldDoc = await CompOffRequest.findById(docId).lean();
      body._oldStatus = oldDoc.status;
    },

    afterUpdate: async (ctx) => {
      const { modelName, userId, docId, body } = ctx;
      if (!docId) return;

      const { default: CompOffRequest } = await import('../models/CompOffRequest.js');
      const doc = await CompOffRequest.findById(docId);

      const prevStatus = body._oldStatus;
      const newStatus = doc.status;

      if (prevStatus === 'Pending' && (newStatus === 'Approved' || newStatus === 'Rejected')) {
        const approvalEngine = (await import('../utils/approval/approvalEngine.js')).default;
        const result = await approvalEngine.advanceWorkflow(
          doc,
          userId,
          newStatus,
          body.approverComment || body.managerComments || ''
        );

        if (result.finalized && result.status === 'Approved') {
          // Find "Comp Off" Leave Type
          const { default: models } = await import('../models/Collection.js');
          const compOffType = await models.leave_types.findOne({ name: { $regex: /comp.*off/i } }).lean();

          if (!compOffType) {
            throw new Error("Comp Off leave type is not configured in the system.");
          }

          const employee = await Employee.findById(doc.employeeId);
          if (!employee) return;

          let bucket = employee.leaveStatus.find(
            (i) => i.leaveType.toString() === compOffType._id.toString()
          );

          // Calculate earned days (e.g. >= 8 hours = 1 day, else 0.5)
          const earnedDays = doc.hoursWorked >= 8 ? 1 : 0.5;

          if (bucket) {
            bucket.available += earnedDays;
          } else {
            // Initialize bucket
            employee.leaveStatus.push({
              leaveType: compOffType._id,
              usedThisMonth: 0,
              usedThisYear: 0,
              carriedForward: 0,
              available: earnedDays
            });
          }

          await employee.save();

          // Write to LeaveTransaction Audit Ledger
          const { default: LeaveTransaction } = await import('../models/LeaveTransaction.js');
          await LeaveTransaction.create({
            employeeId: employee._id,
            leaveTypeId: compOffType._id,
            type: 'COMPOFF_CREDIT',
            sourceId: doc._id,
            sourceModel: 'comp_off_requests',
            quantity: earnedDays,
            description: `Comp-off earned for working on ${new Date(doc.workedDate).toDateString()}`,
            expiryDate: doc.expiryDate
          });
        }
      }
    }
  };
}

