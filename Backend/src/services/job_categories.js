/**
 * job_categories Service
 * Business rules for job category lifecycle management.
 */
export default function job_categories() {
  return {
    beforeCreate: async (ctx) => {
      const { body } = ctx;
      // Normalize name
      if (body.name) {
        body.name = body.name.trim();
      }
    },

    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;
      // If deactivating, check no active job types reference this category
      if (body.isActive === false || body.metaStatus === 'inactive') {
        const { default: models } = await import('../models/Collection.js');
        const activejob_types = await models.job_types.countDocuments({
          categoryId: docId,
          isActive: true
        });
        if (activejob_types > 0) {
          throw new Error(
            `Cannot deactivate: ${activejob_types} active job type(s) are using this category. Deactivate them first.`
          );
        }
      }
    }
  };
}
