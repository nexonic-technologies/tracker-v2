// services/attendance_policies.js
export default function attendance_policies() {
  return {
    beforeCreate: async (ctx) => {
      const { body } = ctx;
      if (!body.name) {
        throw new Error("Attendance Policy name is required.");
      }
      if (body.shiftConfig && body.shiftConfig.defaultShiftId === "") {
        body.shiftConfig.defaultShiftId = null;
      }
      if (body.effectiveTo === "") {
        body.effectiveTo = null;
      }
      return body;
    },
    beforeUpdate: async (ctx) => {
      const { body, id, tenantContext } = ctx;
      if (body.shiftConfig && body.shiftConfig.defaultShiftId === "") {
        body.shiftConfig.defaultShiftId = null;
      }
      if (body.effectiveTo === "") {
        body.effectiveTo = null;
      }

      // Immutable versioning support: if an Active policy is modified, create a new version
      if (id && tenantContext?.getModel) {
        try {
          const AttendancePolicy = tenantContext.getModel('attendance_policies');
          const existing = await AttendancePolicy.findById(id).lean();
          if (existing && existing.status === 'Active' && body.status !== 'Archived') {
            // Archive old policy effective until now
            await AttendancePolicy.findByIdAndUpdate(id, {
              status: 'Archived',
              effectiveTo: new Date()
            });

            // Prepare new version document
            const newVersion = (existing.version || 1) + 1;
            body.version = newVersion;
            body.status = 'Active';
            body.effectiveFrom = new Date();
            body.effectiveTo = null;
          }
        } catch (_) { }
      }

      return body;
    }
  };
}

