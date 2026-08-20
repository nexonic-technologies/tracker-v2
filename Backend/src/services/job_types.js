/**
 * job_types Service
 * Business rules for job type lifecycle management.
 * 
 * Key behaviors:
 *   - Validates categoryId exists and is active on create
 *   - Inherits isBillable from category if not explicitly set
 *   - Prevents deactivation if active sessions reference this job type
 */
export default function job_types() {
  return {
    beforeCreate: async (ctx) => {
      const { body } = ctx;
      const { default: models } = await import('../models/Collection.js');

      // Validate categoryId exists and is active
      if (body.categoryId) {
        const category = await models.job_categories.findById(body.categoryId).lean();
        if (!category) {
          throw new Error('Invalid job category: category not found.');
        }
        if (!category.isActive) {
          throw new Error('Cannot create job type under an inactive category.');
        }

        // Inherit billability from category if not explicitly set
        if (body.isBillable === undefined || body.isBillable === null) {
          body.isBillable = category.isBillable;
        }
      }

      // Normalize name
      if (body.name) {
        body.name = body.name.trim();
      }
    },

    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      // If changing category, validate new category
      if (body.categoryId) {
        const category = await models.job_categories.findById(body.categoryId).lean();
        if (!category || !category.isActive) {
          throw new Error('Invalid or inactive job category.');
        }
      }

      // If deactivating, check no active sessions reference this job type
      if (body.isActive === false || body.metaStatus === 'inactive') {
        const activeSessions = await models.time_tracker_sessions.countDocuments({
          jobTypeId: docId,
          status: 'active'
        });
        if (activeSessions > 0) {
          throw new Error(
            `Cannot deactivate: ${activeSessions} active session(s) are using this job type. Stop them first.`
          );
        }
      }
    }
  };
}
