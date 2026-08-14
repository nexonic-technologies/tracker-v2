// services/regularizations.js
import { sendNotification } from '../utils/notificationService.js';

export default function regularizations() {
  return {
    // ---------------- Before Create ----------------
    beforeCreate: async (ctx) => {
      const { body, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      const empId = body.employeeId || userId;

      // Get employee details
      const employee = await models.employees.findById(empId)
        .populate('professionalInfo.reportingManager')
        .populate('professionalInfo.department');

      if (!employee) {
        throw new Error('Employee record not found');
      }

      // Validate attendance record exists
      if (!body.attendanceId) {
        throw new Error('Attendance reference ID is required');
      }

      const attendance = await models.attendances.findById(body.attendanceId);
      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      // Check if regularization already exists for this attendance
      const existingRegularization = await models.regularizations.findOne({
        attendanceId: body.attendanceId,
        status: { $in: ['Pending', 'Approved'] }
      });
      if (existingRegularization) {
        throw new Error('A regularization request is already pending or approved for this attendance record');
      }

      // Set and sanitize employee context
      body.employeeId = empId;
      body.employeeName = `${employee.basicInfo?.firstName || ''} ${employee.basicInfo?.lastName || ''}`.trim();
      body.departmentId = employee.professionalInfo?.department?._id || employee.professionalInfo?.department;
      body.managerId = employee.professionalInfo?.reportingManager?._id || employee.professionalInfo?.reportingManager;
      body.createdBy = userId || empId;

      // Set base request date
      const reqDate = body.requestDate ? new Date(body.requestDate) : (attendance.date ? new Date(attendance.date) : new Date());
      body.requestDate = isNaN(reqDate.getTime()) ? new Date() : reqDate;

      const datePrefix = body.requestDate.toISOString().split('T')[0];

      // Sanitizer for time strings ("HH:mm") vs Date objects
      const parseTimeToDate = (input, fallbackTimeStr) => {
        if (!input) input = fallbackTimeStr;
        if (input instanceof Date && !isNaN(input.getTime())) return input;
        if (typeof input === 'string') {
          const trimmed = input.trim();
          if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
            const [hh, mm] = trimmed.split(':');
            const d = new Date(`${datePrefix}T00:00:00.000Z`);
            d.setUTCHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
            return d;
          }
          const parsed = new Date(input);
          if (!isNaN(parsed.getTime())) return parsed;
        }
        return new Date(`${datePrefix}T${fallbackTimeStr}:00.000Z`);
      };

      body.requestedCheckIn = parseTimeToDate(body.requestedCheckIn, '09:00');
      body.requestedCheckOut = parseTimeToDate(body.requestedCheckOut, '18:00');

      // Set original times from attendance
      body.originalCheckIn = attendance.checkIn || null;
      body.originalCheckOut = attendance.checkOut || null;

      // Reason sanitization
      if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 5) {
        throw new Error('Please provide a valid reason with at least 5 characters');
      }
      body.reason = body.reason.trim();
      body.status = 'Pending';
      body.metaStatus = 'active';

      return body;
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
      if (old) {
        body._oldStatus = old.status;
      }
      body.updatedBy = userId;
      return body;
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
