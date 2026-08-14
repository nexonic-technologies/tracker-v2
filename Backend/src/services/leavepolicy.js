// src/services/leavepolicy.js
// Service hooks for LeavePolicy management.
// Enforces policy immutability on active/expired versions.

export default function leavepolicyService() {
  return {
    async beforeCreate(ctx) {
      const { body, userId } = ctx;
      if (userId) {
        body.createdBy = userId;
      }
      return body;
    },

    async beforeUpdate(ctx) {
      const { body, existingDoc } = ctx;
      const oldStatus = existingDoc?.status || 'Active';
      if (oldStatus === 'Active' || oldStatus === 'Expired') {
        const immutableFields = ['leaves', 'applicableDepartments', 'applicableDesignations', 'effectiveFrom', 'effectiveTo'];
        const violates = immutableFields.some(field => field in body);
        if (violates) {
          throw new Error("⛔ Active or Expired policies are immutable. To make changes, please create a new policy version with a future effective date.");
        }
      }
      return body;
    }
  };
}
