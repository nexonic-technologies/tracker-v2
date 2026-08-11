export default function contacts() {
  return {
    async beforeCreate(ctx) {
      const { body, userId } = ctx;
      // Default assignedTo to the creator if not specified
      if (!body.assignedTo) {
        body.assignedTo = userId;
      }
      // If status is Contacted/Converted and contactedBy is not set, set it
      if (body.status !== 'New' && !body.contactedBy) {
        body.contactedBy = userId;
        body.contactedAt = new Date();
      }
    },

    async beforeUpdate(ctx) {
      const { body, docId, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');
      const contact = await models.contacts.findById(docId);
      if (!contact) return;

      // Track who made contact if status moves from New to Contacted/Converted
      if (body.status && body.status !== 'New' && contact.status === 'New') {
        if (!body.contactedBy) body.contactedBy = userId;
        if (!body.contactedAt) body.contactedAt = new Date();
      }

      // Handle conversion logic
      if (body.status === 'Converted' && contact.status !== 'Converted') {
        // If not already linked to a client, check or prepare creation
        if (!body.convertedClientId && !contact.convertedClientId) {
          const clientName = body.companyName || contact.companyName || `${body.firstName || contact.firstName} ${body.lastName || contact.lastName || ''} Inc.`;
          
          // Check if client name is unique
          let existingClient = await models.clients.findOne({ name: clientName });
          if (existingClient) {
            body.convertedClientId = existingClient._id;
          } else {
            // Store payload for post-commit afterUpdate execution
            ctx.createClientPayload = {
              name: clientName,
              ownerName: `${body.firstName || contact.firstName} ${body.lastName || contact.lastName || ''}`.trim(),
              email: body.email || contact.email,
              phone: body.phone || contact.phone,
              contactInfo: [{
                name: `${body.firstName || contact.firstName} ${body.lastName || contact.lastName || ''}`.trim(),
                email: body.email || contact.email,
                phone: body.phone || contact.phone,
                designation: body.designation || contact.designation || 'Primary Contact'
              }],
              leadStatus: 'New',
              Status: 'Inactive'
            };
          }
        }
      }
    },

    async afterUpdate(ctx) {
      if (ctx.createClientPayload) {
        const { default: models } = await import('../models/Collection.js');
        const newClient = await models.clients.create(ctx.createClientPayload);
        await models.contacts.updateOne({ _id: ctx.docId }, { $set: { convertedClientId: newClient._id } });
      }
    }
  };
}
