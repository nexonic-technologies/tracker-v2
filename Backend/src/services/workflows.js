export default function workflowsService() {
  return {
    async beforeCreate(ctx) {
      const { body, userId } = ctx;
      if (userId) {
        body.createdBy = userId;
      }
      return body;
    }
  };
}
