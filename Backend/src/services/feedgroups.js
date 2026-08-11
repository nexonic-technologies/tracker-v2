import mongoose from 'mongoose';

export default function feed_groupsService() {
  /**
   * Normalize the members array from plain IDs to { employee: ObjectId } subdocuments.
   */
  const _normalizeMembers = (members) => {
    if (!Array.isArray(members)) return [];
    return members.map(m => {
      if (m && typeof m === 'object' && m.employee) {
        return { employee: new mongoose.Types.ObjectId(m.employee.toString()) };
      }
      try {
        return { employee: new mongoose.Types.ObjectId(m.toString()) };
      } catch {
        return null;
      }
    }).filter(Boolean);
  };

  return {
    async beforeCreate(ctx) {
      const { body } = ctx;
      if (body.members) {
        body.members = _normalizeMembers(body.members);
      }
    },

    async beforeUpdate(ctx) {
      const { body } = ctx;
      if (body.members) {
        body.members = _normalizeMembers(body.members);
      }
    },

    async beforeRead({ filter, userId }) {
      const userObjectId = new mongoose.Types.ObjectId(userId.toString());

      const visibilityFilter = {
        $or: [
          { 'members.employee': userObjectId },
          { createdBy: userObjectId }
        ]
      };

      if (!filter.$and) {
        filter.$and = [];
      }
      filter.$and.push(visibilityFilter);
    }
  };
}
