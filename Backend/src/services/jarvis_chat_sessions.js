/**
 * Service hook for jarvis_chat_sessions entity.
 * Governed strictly by the Populate Pipeline architecture.
 */
export default function jarvisChatSessionsService() {
  return {
    beforeRead: async (ctx) => {
      const { user, filter = {} } = ctx;
      if (user?.id && !user.isSuperAdmin) {
        // Enforce self-scoping to user's chat sessions
        filter.userId = user.id;
      }
      if (!filter.metaStatus) {
        filter.metaStatus = 'active';
      }
      ctx.filter = filter;
      return ctx;
    },

    beforeCreate: async (ctx) => {
      const { body, user, tenantContext } = ctx;
      if (!body.userId && user?.id) {
        body.userId = user.id;
      }
      if (!body.employeeId && user?.employeeId) {
        body.employeeId = user.employeeId;
      }
      if (!body.tenantSlug) {
        body.tenantSlug = tenantContext?.slug || user?.tenantSlug || 'admin';
      }
      if (!body.title) {
        body.title = 'New Conversation';
      }
      if (!body.discourseState) {
        body.discourseState = {
          focalEntities: [],
          lastPredicate: null,
          turnCount: 0,
        };
      }
      return body;
    },

    beforeUpdate: async (ctx) => {
      const { body } = ctx;
      body.updatedAt = new Date();
      return body;
    },

    beforeDelete: async (ctx) => {
      // Soft-delete session by default
      const { docId, user } = ctx;
      const { getGlobalModels } = await import('../models/global/index.js');
      const { JarvisChatSession } = getGlobalModels();
      if (JarvisChatSession && docId) {
        await JarvisChatSession.findByIdAndUpdate(docId, {
          $set: { metaStatus: 'deleted', updatedAt: new Date() },
        });
      }
      return ctx;
    },
  };
}
