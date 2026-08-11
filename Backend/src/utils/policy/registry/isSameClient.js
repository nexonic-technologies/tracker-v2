import mongoose from 'mongoose';

/**
 * Registry: isSameClient
 * Checks if the record belongs to the same client organization as the agent.
 */
export default async function isSameClient(user, record, context = {}) {
  if (!user) return false;

  let clientId = user.client;

  // Look up agent client from database if not present in user session context
  if (!clientId && user.id) {
    try {
      const Agent = mongoose.model('agents');
      const agent = await Agent.findById(user.id).select('client').lean();
      if (agent && agent.client) {
        clientId = agent.client;
      }
    } catch (err) {
      console.error('Error looking up agent client in registry:', err);
    }
  }

  if (!clientId) return false;

  const modelName = context.modelName;

  // If checking a specific record (single document validation)
  if (record && Object.keys(record).length > 0) {
    if (modelName === 'tickets') {
      const recordClientId = record.clientId || record.client;
      return recordClientId && recordClientId.toString() === clientId.toString();
    }
    
    if (modelName === 'ticket_comments') {
      try {
        // External agents cannot view internal employee-only comments
        if (record.isPublic === false) return false;
        
        const Ticket = mongoose.model('Ticket');
        const ticket = await Ticket.findById(record.ticketId).select('clientId').lean();
        return ticket && ticket.clientId && ticket.clientId.toString() === clientId.toString();
      } catch {
        return false;
      }
    }
    
    if (modelName === 'ticket_attachments') {
      try {
        const Ticket = mongoose.model('Ticket');
        const ticket = await Ticket.findById(record.ticketId).select('clientId').lean();
        return ticket && ticket.clientId && ticket.clientId.toString() === clientId.toString();
      } catch {
        return false;
      }
    }
    
    const recordClientId = record.clientId || record.client;
    if (recordClientId) {
      return recordClientId.toString() === clientId.toString();
    }
    return false;
  }

  // If generating a query filter for lists
  if (modelName === 'tickets') {
    return {
      filter: { clientId: clientId }
    };
  }

  if (modelName === 'ticket_comments') {
    try {
      const Ticket = mongoose.model('Ticket');
      const tickets = await Ticket.find({ clientId: clientId }).select('_id').lean();
      const ticketIds = tickets.map(t => t._id);
      return {
        filter: { 
          ticketId: { $in: ticketIds },
          isPublic: true // Client agents can only query public comments
        }
      };
    } catch {
      return {
        filter: { ticketId: null }
      };
    }
  }

  if (modelName === 'ticket_attachments') {
    try {
      const Ticket = mongoose.model('Ticket');
      const tickets = await Ticket.find({ clientId: clientId }).select('_id').lean();
      const ticketIds = tickets.map(t => t._id);
      return {
        filter: { ticketId: { $in: ticketIds } }
      };
    } catch {
      return {
        filter: { ticketId: null }
      };
    }
  }

  return {
    filter: { clientId: clientId }
  };
}
