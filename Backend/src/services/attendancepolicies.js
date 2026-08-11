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
      const { body } = ctx;
      if (body.shiftConfig && body.shiftConfig.defaultShiftId === "") {
        body.shiftConfig.defaultShiftId = null;
      }
      if (body.effectiveTo === "") {
        body.effectiveTo = null;
      }
      return body;
    }
  };
}

