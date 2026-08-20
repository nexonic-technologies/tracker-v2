/**
 * job_openings.js — Service hooks for job openings.
 * Handles status lifecycle and auto-publish timestamp.
 */
export default function job_openings() {
  return {
    async beforeCreate(ctx) {
      const { body, userId } = ctx;
      body.createdBy = userId;
      body.status = body.status || 'Draft';
      return body;
    },

    async beforeUpdate(ctx) {
      const { body, docId } = ctx;
      if (!docId) return body;

      if (body.status === 'Published') {
        body.publishedAt = body.publishedAt || new Date();
      }
      if (body.status === 'Closed' || body.status === 'Filled') {
        body.closedAt = body.closedAt || new Date();
      }
      return body;
    }
  };
}
