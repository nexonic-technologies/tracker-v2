/**
 * projectLifecycle.test.js
 * End-to-end verification script for the Project Lifecycle.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tracker';

export async function runProjectLifecycle() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Register models
  console.log('📦 Registering Mongoose models...');
  await import('../../models/Collection.js');

  const { setCache } = await import('../../utils/cache.js');
  await setCache();
  console.log('✅ Policy cache initialized');

  const { buildQuery } = await import('../../utils/policy/policyEngine.js');

  const Client = mongoose.model('clients');
  const ProjectType = mongoose.model('project_types');
  const Milestone = mongoose.model('milestones');
  const TaskType = mongoose.model('task_types');
  const Task = mongoose.model('tasks');
  const time_tracker_session = mongoose.model('time_tracker_session');
  const Employee = mongoose.model('employees');
  const Role = mongoose.model('roles');

  const uniqueSuffix = Date.now();
  const clientName = `Client E2E ${uniqueSuffix}`;
  const projectName = `Project E2E ${uniqueSuffix}`;
  const milestoneName = `Milestone E2E ${uniqueSuffix}`;
  const taskTypeName = `TaskType E2E ${uniqueSuffix}`;

  let createdDocs = {
    clientId: null,
    projectId: null,
    milestoneId: null,
    taskTypeId: null,
    taskId: null,
    sessionId: null
  };

  const cleanup = async () => {
    console.log('\n🧹 Cleaning up project E2E test data...');
    try {
      if (createdDocs.sessionId) await time_tracker_session.deleteMany({ _id: createdDocs.sessionId });
      if (createdDocs.taskId) {
        await Task.deleteMany({ _id: createdDocs.taskId });
        const { default: CommentsThread } = await import('../../models/comments_threads.js');
        await CommentsThread.deleteMany({ taskId: createdDocs.taskId });
      }
      if (createdDocs.taskTypeId) await TaskType.deleteMany({ _id: createdDocs.taskTypeId });
      if (createdDocs.milestoneId) await Milestone.deleteMany({ _id: createdDocs.milestoneId });
      if (createdDocs.projectId) await ProjectType.deleteMany({ _id: createdDocs.projectId });
      if (createdDocs.clientId) await Client.deleteMany({ _id: createdDocs.clientId });
      console.log('🧹 Cleanup completed.');
    } catch (e) {
      console.error('⚠️ Cleanup error:', e.message);
    }
  };

  try {
    // Resolve role & admin actor
    let superAdminRole = await Role.findOne({ capabilities: 'view:reports', isActive: true }).lean();
    if (!superAdminRole) {
      superAdminRole = await Role.findOne({ name: /super admin|superadmin|admin/i, isActive: true }).lean();
    }
    if (!superAdminRole) {
      throw new Error('No appropriate Admin or Super Admin role found.');
    }

    const adminEmp = await Employee.findOne({ status: 'Active' }).lean();
    if (!adminEmp) {
      throw new Error('No active employee found.');
    }
    console.log(`👤 Actor employee: ${adminEmp.basicInfo.firstName} (${adminEmp._id})`);

    // --- STEP 1: CREATE CLIENT ---
    console.log('\n--- STEP 1: Creating Client ---');
    const client = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'clients',
      body: {
        name: clientName,
        email: `client_${uniqueSuffix}@e2e.com`,
        phone: '9888777666',
        Status: 'Active',
        leadStatus: 'Closed Won'
      }
    });
    createdDocs.clientId = client._id;
    console.log(`✅ Client created: ${client.name} (${client._id})`);

    // --- STEP 2: CREATE PROJECT (project_types) ---
    console.log('\n--- STEP 2: Creating Project ---');
    const project = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'project_types',
      body: {
        name: projectName,
        description: 'E2E project container',
        isActive: true,
        complexity: 'Medium',
        estimatedHours: 100
      }
    });
    createdDocs.projectId = project._id;
    console.log(`✅ Project created: ${project.name} (${project._id})`);

    // Link project to client
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'clients',
      docId: client._id.toString(),
      body: {
        project_types: [project._id.toString()]
      }
    });
    console.log('✅ Project linked to Client.');

    // --- STEP 3: CREATE MILESTONE ---
    console.log('\n--- STEP 3: Creating Milestone ---');
    const milestone = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'milestones',
      body: {
        name: milestoneName,
        description: 'First milestone of E2E',
        Status: 'Active'
      }
    });
    createdDocs.milestoneId = milestone._id;
    console.log(`✅ Milestone created: ${milestone.name} (${milestone._id})`);

    // Link milestone to client's milestones array
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'clients',
      docId: client._id.toString(),
      body: {
        milestones: [{
          milestoneId: milestone._id.toString(),
          status: 'Pending',
          assignedTo: adminEmp._id.toString(),
          dueDate: new Date(Date.now() + 1000 * 3600 * 24 * 7)
        }]
      }
    });
    console.log('✅ Milestone added to Client milestones list.');

    // --- STEP 4: CREATE TASK ---
    console.log('\n--- STEP 4: Creating Task under Project/Milestone ---');

    let taskType = await TaskType.findOne({ name: 'Development', isActive: true });
    if (!taskType) {
      taskType = await TaskType.create({
        name: taskTypeName,
        category: 'Development',
        isActive: true
      });
      createdDocs.taskTypeId = taskType._id;
    }

    const task = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'tasks',
      body: {
        clientId: client._id.toString(),
        projectTypeId: project._id.toString(),
        taskTypeId: taskType._id.toString(),
        createdBy: adminEmp._id.toString(),
        assignedTo: [adminEmp._id.toString()],
        milestoneId: milestone._id.toString(),
        milestoneStatus: 'Pending',
        title: 'E2E Milestone Verification Task',
        userStory: 'Must verify E2E project integration',
        status: 'Backlogs',
        estimatedHours: 8
      }
    });
    createdDocs.taskId = task._id;
    console.log(`✅ Task created: "${task.title}" (status: "${task.status}")`);

    // --- STEP 5: LOG HOURS (TIME ENTRY) ---
    console.log('\n--- STEP 5: Logging Hours via Time Tracker ---');

    // Create active session
    const startTime = new Date(Date.now() - 1000 * 3600 * 3); // 3 hours ago
    const session = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'time_tracker_sessions',
      body: {
        taskId: task._id.toString(),
        projectId: project._id.toString(),
        userId: adminEmp._id.toString(),
        startTime: startTime,
        status: 'active'
      }
    });
    createdDocs.sessionId = session._id;
    console.log(`✅ Time Tracker session started (active, startTime: ${startTime.toISOString()})`);

    // Complete session with logged hours
    const endTime = new Date();
    const duration = 10800; // 3 hours in seconds
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'time_tracker_sessions',
      docId: session._id.toString(),
      body: {
        endTime: endTime,
        duration: duration,
        status: 'completed',
        notes: 'Completed task implementation'
      }
    });
    console.log('✅ Time Tracker session completed (logged 3 hours).');

    // Verify time entry recorded.
    // NOTE: The time_tracker_sessions service auto-calculates duration from (now - startTime)
    // and ignores any 'duration' field in the update body. The stored value will be
    // >= 10800 (3h) due to real elapsed time during test execution. Use a lower-bound check.
    const sessionCheck = await time_tracker_session.findById(session._id).lean();
    const expectedMinDuration = 10790; // 3h minus 10s tolerance for test execution time
    if (!sessionCheck || sessionCheck.status !== 'completed' || sessionCheck.duration < expectedMinDuration) {
      throw new Error(`Expected completed session with duration >= ${expectedMinDuration}s, found status: ${sessionCheck?.status}, duration: ${sessionCheck?.duration}`);
    }
    console.log(`✅ Verified: Time entry logged and marked as completed (duration: ${sessionCheck.duration}s).`);

    // --- STEP 6: TASK COMPLETION & MILESTONE SYNC ---
    console.log('\n--- STEP 6: Completing Task and Syncing Milestone ---');
    await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'update',
      modelName: 'tasks',
      docId: task._id.toString(),
      body: {
        status: 'Completed',
        milestoneStatus: 'Completed'
      }
    });
    console.log('✅ Task status updated to "Completed".');

    // Verify client's milestone status updated to Completed
    const clientCheck = await Client.findById(client._id).lean();
    const clientMilestone = clientCheck.milestones.find(m => m.milestoneId.toString() === milestone._id.toString());
    console.log(`   Client Milestone status: "${clientMilestone?.status}"`);
    if (!clientMilestone || clientMilestone.status !== 'Completed') {
      throw new Error(`Expected client milestone status to be "Completed", found: ${clientMilestone?.status}`);
    }
    console.log('✅ Verified: Client milestone status automatically synced to "Completed".');

    // Cleanup
    await cleanup();
    console.log('🎉 Project Lifecycle: PASS');
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.error('❌ Project Lifecycle failed:', err);
    await cleanup();
    await mongoose.disconnect();
    throw err;
  }
}

// Support running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runProjectLifecycle()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
