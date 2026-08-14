import { getTenantModel } from '../../tenant/tenantContext.js';


export const createMilestoneTask = async (clientId, milestoneId, userId) => {
  try {
    const clients = getTenantModel('Client');
    const milestones = getTenantModel('Milestone');
    const employees = getTenantModel('Employee');
    const tasks = getTenantModel('Task');

    const client = await clients.findById(clientId).populate('milestones.milestoneId');
    const milestone = await milestones.findById(milestoneId);

    if (!client || !milestone) {
      throw new Error('Client or milestone not found');
    }

    const superAdmin = await employees.findOne({
      'professionalInfo.isActive': true
    }).sort({ createdAt: 1 });

    if (!superAdmin) {
      throw new Error('Super Admin not found');
    }

    const task = await tasks.create({
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
    const clients = getTenantModel('Client');
    const tasks = getTenantModel('Task');
    const tickets = getTenantModel('Ticket');

    const client = await clients.findById(clientId);

    const milestoneIndex = client.milestones.findIndex(
      m => m.milestoneId.toString() === milestoneId.toString()
    );

    if (milestoneIndex === -1) {
      client.milestones.push({
        milestoneId,
        status: updateData.status || 'Pending',
        assignedTo: updateData.assignedTo,
        dueDate: updateData.dueDate,
        notes: updateData.notes
      });

      await createMilestoneTask(clientId, milestoneId, userId);
    } else {
      Object.assign(client.milestones[milestoneIndex], updateData);

      if (updateData.completedDate) {
        client.milestones[milestoneIndex].completedDate = updateData.completedDate;
      }
    }

    await client.save();

    await tasks.updateMany(
      { clientId, milestoneId },
      { milestoneStatus: updateData.status }
    );

    await tickets.updateMany(
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
  const task_types = getTenantModel('TaskType');
  const taskType = await task_types.findOne({ name: 'General' });
  return taskType?._id || null;
};

export const syncMilestoneToTasksAndTickets = async (clientId, milestoneId, status) => {
  try {
    if (milestoneId) {
      const tasks = getTenantModel('Task');
      const tickets = getTenantModel('Ticket');
      await Promise.all([
        tasks.updateMany(
          { clientId, milestoneId },
          { milestoneStatus: status }
        ),
        tickets.updateMany(
          { clientId, milestoneId },
          { milestoneStatus: status }
        )
      ]);
    }
  } catch (error) {
    console.error('Error syncing milestone status:', error);
  }
};

export const isMilestoneBased = (item) => {
  return item.milestoneId != null;
};

export const getTasksByType = async (clientId, isMilestone = null) => {
  const tasks = getTenantModel('Task');
  const filter = { clientId };

  if (isMilestone === true) {
    filter.milestoneId = { $exists: true, $ne: null };
  } else if (isMilestone === false) {
    filter.milestoneId = { $exists: false };
  }

  return await tasks.find(filter);
};

export const getTicketsByType = async (clientId, isMilestone = null) => {
  const tickets = getTenantModel('Ticket');
  const filter = { clientId };

  if (isMilestone === true) {
    filter.milestoneId = { $exists: true, $ne: null };
  } else if (isMilestone === false) {
    filter.milestoneId = { $exists: false };
  }

  return await tickets.find(filter);
};