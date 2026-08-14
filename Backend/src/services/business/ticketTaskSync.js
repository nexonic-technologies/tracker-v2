import models from '../../models/Collection.js';


class TicketTaskSyncService {
  // Sync task status back to ticket
  async syncTaskStatusToTicket(taskId, newStatus, updatedBy) {
    try {
      const task = await models.tasks.findById(taskId);
      if (!task || !task.linkedTicketId) return;

      const status_mapping = {
        'Backlogs': 'Open',
        'To Do': 'Open',
        'In Progress': 'In Progress',
        'In Review': 'In Progress',
        'Approved': 'Resolved',
        'Rejected': 'In Progress',
        'Completed': 'Resolved',
        'Closed': 'Closed',
      };

      const ticketStatus = status_mapping[newStatus];
      if (!ticketStatus) return;

      const ticket = await models.tickets.findById(task.linkedTicketId);
      if (ticket && ticket.status !== ticketStatus) {
        // Trigger save to run validation/hooks
        ticket.status = ticketStatus;
        if (ticketStatus === 'Resolved') ticket.resolvedAt = new Date();
        if (ticketStatus === 'Closed') ticket.closedAt = new Date();
        await ticket.save();
      }
    } catch (error) {
      console.error('Error syncing task status to ticket:', error);
    }
  }

  // Sync task assignment back to ticket
  async syncTaskAssignmentToTicket(taskId, assignedTo, updatedBy) {
    try {
      const task = await models.tasks.findById(taskId);
      if (!task || !task.linkedTicketId) return;

      const assignees = Array.isArray(assignedTo) ? assignedTo.map(a => a._id || a) : [];

      await models.tickets.findByIdAndUpdate(task.linkedTicketId, {
        $set: { assignedTo: assignees }
      });

      // Create an internal comment logging the sync assignment
      await models.ticket_comments.create({
        ticketId: task.linkedTicketId,
        commentedBy: updatedBy,
        commenterModel: 'employees',
        message: 'Task assigned to developer (synced from development task)',
        isPublic: false
      });
    } catch (error) {
      console.error('Error syncing task assignment to ticket:', error);
    }
  }

  // Check synchronization status
  async getSyncStatus(ticketId, taskId) {
    try {
      const [ticket, task] = await Promise.all([
        models.tickets.findById(ticketId),
        models.tasks.findById(taskId)
      ]);

      const status_mapping = {
        'Backlogs': 'Open',
        'To Do': 'Open',
        'In Progress': 'In Progress',
        'In Review': 'In Progress',
        'Approved': 'Resolved',
        'Rejected': 'In Progress',
        'Completed': 'Resolved',
        'Closed': 'Closed',
      };

      const expectedTicketStatus = status_mapping[task?.status] || 'Open';

      return {
        isLinked: ticket?.linkedTaskId?.toString() === taskId && task?.linkedTicketId?.toString() === ticketId,
        ticketStatus: ticket?.status,
        taskStatus: task?.status,
        lastSync: Math.max(ticket?.updatedAt || 0, task?.updatedAt || 0),
        syncHealth: ticket?.status === expectedTicketStatus
      };
    } catch (error) {
      console.error('Error checking sync status:', error);
      return { isLinked: false, error: error.message };
    }
  }
}

export default new TicketTaskSyncService();