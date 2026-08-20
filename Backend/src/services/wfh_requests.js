// services/wfh_requests.js
export default function wfh_requests() {
  return {
    beforeCreate: async (ctx) => {
      const { body, userId } = ctx;
      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid start or end date.");
      }
      if (end < start) {
        throw new Error("End date must be on or after start date.");
      }
      // Auto-populate departmentId from the employee record
      if (!body.departmentId && body.employeeId) {
        try {
          const { default: Employee } = await import('../models/Employee.js');
          const emp = await Employee.findById(body.employeeId).select('professionalInfo.department').lean();
          if (emp?.professionalInfo?.department) {
            body.departmentId = emp.professionalInfo.department;
          }
        } catch (e) { /* non-fatal — departmentId is optional */ }
      }
      return body;
    },

    // AFTER CREATE ➝ Initialize dynamic approval workflow
    afterCreate: async (ctx) => {
      const { modelName, docId, userId } = ctx;
      const { default: WFHRequest } = await import('../models/WFHRequest.js');
      const wfhDoc = await WFHRequest.findById(docId);
      if (!wfhDoc) return;

      const approvalEngine = (await import('../utils/approval/approvalEngine.js')).default;
      await approvalEngine.initializeWorkflow('wfh_requests', wfhDoc);
    },

    // BEFORE UPDATE ➝ Store old status
    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;
      if (!docId) return;
      const { default: WFHRequest } = await import('../models/WFHRequest.js');
      const oldWfh = await WFHRequest.findById(docId).lean();
      body._oldStatus = oldWfh.status;
    },

    // AFTER UPDATE ➝ Advance workflow
    afterUpdate: async (ctx) => {
      const { modelName, userId, docId, body } = ctx;
      if (!docId) return;

      const { default: WFHRequest } = await import('../models/WFHRequest.js');
      const wfhDoc = await WFHRequest.findById(docId);

      const prevStatus = body._oldStatus;
      const newStatus = wfhDoc.status;

      if (prevStatus === 'Pending' && (newStatus === 'Approved' || newStatus === 'Rejected')) {
        const approvalEngine = (await import('../utils/approval/approvalEngine.js')).default;
        await approvalEngine.advanceWorkflow(
          wfhDoc,
          userId,
          newStatus,
          body.approverComment || body.managerComments || ''
        );
        // Note: No attendance injection happens here. AttendanceCron will pick up this Approved intent record.
      }
    }
  };
}

