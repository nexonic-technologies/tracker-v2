// services/regularizations.js
import { sendNotification } from '../utils/notificationService.js';

export default function regularizations() {
  return {
    // ---------------- Before Create ----------------
    beforeCreate: async (ctx) => {
      const { body, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      // Get employee details
      const employee = await models.employees.findById(userId)
        .populate('professionalInfo.reportingManager')
        .populate('professionalInfo.department');

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Set employee details
      body.employeeId = userId;
      body.employeeName = `${employee.basicInfo.firstName} ${employee.basicInfo.lastName}`;
      body.departmentId = employee.professionalInfo.department?._id;
      body.managerId = employee.professionalInfo.reportingManager?._id;
      body.createdBy = userId;

      // Validate attendance record exists
      const attendance = await models.attendances.findById(body.attendanceId);
      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      // Check if regularization already exists for this attendance
      const existingRegularization = await models.regularizations.findOne({
        attendanceId: body.attendanceId
      });
      if (existingRegularization) {
        throw new Error('Regularization request already exists for this attendance record');
      }

      // Set original times from attendance
      body.originalCheckIn = attendance.checkIn;
      body.originalCheckOut = attendance.checkOut;
    },

    // ---------------- After Create ----------------
    afterCreate: async (ctx) => {
      const { docId, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      const regularization = await models.regularizations.findById(docId);
      if (!regularization) return;

      // Initialize sequential workflow
      const approvalEngine = (await import('../utils/approval/approvalEngine.js')).default;
      await approvalEngine.initializeWorkflow('regularizations', regularization);
    },

    // ---------------- Before Update ----------------
    beforeUpdate: async (ctx) => {
      const { body, docId, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');
      const old = await models.regularizations.findById(docId).lean();
      body._oldStatus = old?.status;
      body.updatedBy = userId;
    },

    // ---------------- After Update ----------------
    afterUpdate: async (ctx) => {
      const { docId, body, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      const regularization = await models.regularizations.findById(docId);
      if (!regularization) return;

      const prevStatus = body._oldStatus || 'Pending';
      const newStatus = regularization.status;

      // Intercept and route approvals through workflow engine
      if (prevStatus === 'Pending' && (newStatus === 'Approved' || newStatus === 'Rejected')) {
        const approvalEngine = (await import('../utils/approval/approvalEngine.js')).default;
        const result = await approvalEngine.advanceWorkflow(
          regularization, 
          userId, 
          newStatus, 
          body.approverComment || body.managerComments || ''
        );

        // Apply attendance adjustment only on final step approval
        if (result.finalized && result.status === 'Approved') {
          await models.attendances.findByIdAndUpdate(regularization.attendanceId, {
            checkIn: regularization.requestedCheckIn,
            checkOut: regularization.requestedCheckOut,
            status: 'Present'
          });
        }
      }
    }
  };
}
