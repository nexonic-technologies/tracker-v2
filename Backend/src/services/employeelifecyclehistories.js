/**
 * employee_life_cycle_histories.js — Service hooks for EmployeeLifecycleHistory model.
 */
export default function employee_life_cycle_histories() {
  return {
    async beforeCreate(ctx) {
      const { body, user } = ctx;
      body.changedBy = body.changedBy || user?.id;
      body.effectiveDate = body.effectiveDate || new Date();
      return body;
    }
  };
}
