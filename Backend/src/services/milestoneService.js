import models from '../models/Collection.js';


export const createMilestoneTask = async (clientId, milestoneId, userId) => {
  try {
    const client = await models.clients.findById(clientId).populate('milestones.milestoneId');
    const milestone = await models.milestones.findById(milestoneId);

    if (!client || !milestone) {
      throw new Error('Client or milestone not found');
    }

    // Find Super Admin
    const superAdmin = await models.employees.findOne({
      role: 'Super Admin'
    }).sort({ createdAt: 1 });

    if (!superAdmin) {
      throw new Error('Super Admin not found');
    }

    // Create centralized task
    const task = await models.tasks.create({
      clientId,
      milestoneId,
      title: `${milestone.name} - ${client.name}`,
      userStory: `Complete milestone: ${milestone.name} for client ${client.name}`,
      assignedTo: [superAdmin._id],
      createdBy: userId,
      projectTypeId: client.project_types[0] || null,
      taskTypeId: await getDefaultTaskType(),
      status: 'To Do',
      milestoneStatus: 'Pending',
      priorityLevel: 'High'
    });

    return task;
  } catch (error) {
    console.error('Error creating milestone task:', error);
    throw error;
  }
};

export const updateClientMilestone = async (clientId, milestoneId, updateData, userId) => {
  try {
    const client = await models.clients.findById(clientId);

    const milestoneIndex = client.milestones.findIndex(
      m => m.milestoneId.toString() === milestoneId.toString()
    );

    if (milestoneIndex === -1) {
      // Add new milestone
      client.milestones.push({
        milestoneId,
        status: updateData.status || 'Pending',
        assignedTo: updateData.assignedTo,
        dueDate: updateData.dueDate,
        notes: updateData.notes
      });

      // Create centralized task for new milestone
      await createMilestoneTask(clientId, milestoneId, userId);
    } else {
      // Update existing milestone
      Object.assign(client.milestones[milestoneIndex], updateData);

      if (updateData.completedDate) {
        client.milestones[milestoneIndex].completedDate = updateData.completedDate;
      }
    }

    await client.save();

    // Update related tasks
    await models.tasks.updateMany(
      { clientId, milestoneId },
      { milestoneStatus: updateData.status }
    );

    // Update related tickets
    await models.tickets.updateMany(
      { clientId, milestoneId },
      { milestoneStatus: updateData.status }
    );

    return client;
  } catch (error) {
    console.error('Error updating client milestone:', error);
    throw error;
  }
};

const getDefaultTaskType = async () => {
  const taskType = await models.task_types.findOne({ name: 'General' });
  return taskType?._id || null;
};

export const syncMilestoneToTasksAndTickets = async (clientId, milestoneId, status) => {
  try {
    // Only sync if milestoneId is provided
    if (milestoneId) {
      await Promise.all([
        models.tasks.updateMany(
          { clientId, milestoneId },
          { milestoneStatus: status }
        ),
        models.tickets.updateMany(
          { clientId, milestoneId },
          { milestoneStatus: status }
        )
      ]);
    }
  } catch (error) {
    console.error('Error syncing milestone status:', error);
  }
};

// Helper function to check if task/ticket is milestone-based
export const isMilestoneBased = (item) => {
  return item.milestoneId != null;
};

// Get tasks/tickets by type (general or milestone-based)
export const getTasksByType = async (clientId, isMilestone = null) => {
  const filter = { clientId };

  if (isMilestone === true) {
    filter.milestoneId = { $exists: true, $ne: null };
  } else if (isMilestone === false) {
    filter.milestoneId = { $exists: false };
  }

  return await models.tasks.find(filter);
};

export const getTicketsByType = async (clientId, isMilestone = null) => {
  const filter = { clientId };

  if (isMilestone === true) {
    filter.milestoneId = { $exists: true, $ne: null };
  } else if (isMilestone === false) {
    filter.milestoneId = { $exists: false };
  }

  return await models.tickets.find(filter);
};