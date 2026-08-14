import AgentInviteService from '../utils/mail/AgentInviteService.js';

export default function agentService() {
  return {
    async beforeCreate(ctx) {
      // Authorization for agents creation is handled strictly by access_policies on the 'agents' model.
    },

    // After create hook - automatically send invite for new agents
    async afterCreate(ctx) {
      const { role, userId, data } = ctx;
      try {
        if (data && data._id) {
          // Send invite automatically when agent is created
          await AgentInviteService.sendInvite(data._id);
          // console.log(`Invitation sent to agent: ${data.email}`);
        }
      } catch (error) {
        console.error('Failed to send invite after agent creation:', error);
        // Don't throw error - agent creation should succeed even if invite fails
      }
      return data;
    },

    // Custom action for manual invite sending
    async beforeUpdate(ctx) {
      const { role, userId, docId, body } = ctx;
      // Check if this is a manual invite trigger
      if (body && body.sendInvite === true) {
        try {
          await AgentInviteService.sendInvite(docId);
          // Remove the sendInvite flag from body so it doesn't get saved
          delete body.sendInvite;
          return { body };
        } catch (error) {
          throw new Error(`Failed to send invitation: ${error.message}`);
        }
      }
      return { body };
    }
  };
}