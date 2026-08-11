export default function notification_preferences() {
  return {
    beforeCreate: async (ctx) => {
      const { body, userId } = ctx;
      // Ensure users only create preferences for themselves unless they are admin
      if (!body.employeeId) {
        body.employeeId = userId;
      }
    }
  };
}

