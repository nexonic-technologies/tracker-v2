// services/daily_activities.js
export default function dailyActivities() {
  return {
    beforeCreate: async (ctx) => {
      const { body, userId } = ctx;
      if (!body.user && userId) {
        body.user = userId;
      }
      if (!body.date) {
        body.date = new Date();
      }
      if (body.hours !== undefined) {
        body.hours = Number(body.hours) || 1;
      } else {
        body.hours = 1;
      }
      return body;
    },

    beforeUpdate: async (ctx) => {
      const { body } = ctx;
      if (body.hours !== undefined) {
        body.hours = Number(body.hours) || 1;
      }
      return body;
    }
  };
}
