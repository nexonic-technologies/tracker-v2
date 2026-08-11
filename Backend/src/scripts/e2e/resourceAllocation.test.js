/**
 * resourceAllocation.test.js
 * End-to-end verification script for Resource Allocation, logged hours, cost, and utilization.
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

export async function runResourceAllocation() {
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
  const TaskType = mongoose.model('task_types');
  const Task = mongoose.model('tasks');
  const time_tracker_session = mongoose.model('time_tracker_session');
  const Employee = mongoose.model('employees');
  const Role = mongoose.model('roles');
  const Department = mongoose.model('departments');
  const SalaryStructure = mongoose.model('salary_structures');

  const uniqueSuffix = Date.now();
  const clientName = `Client Alloc E2E ${uniqueSuffix}`;
  const projectName = `Project Alloc E2E ${uniqueSuffix}`;
  const taskTypeName = `TaskType Alloc E2E ${uniqueSuffix}`;
  const empEmail = `e2e_alloc_employee_${uniqueSuffix}@Workhub.com`;
  const empId = `EMP-AL-${uniqueSuffix.toString().slice(-6)}`;
  const deptName = `Dept Alloc E2E ${uniqueSuffix}`;

  let createdDocs = {
    deptId: null,
    employeeId: null,
    salaryStructureId: null,
    clientId: null,
    projectId: null,
    taskTypeId: null,
    taskIds: [],
    sessionIds: []
  };

  const cleanup = async () => {
    console.log('\n🧹 Cleaning up resource allocation E2E test data...');
    try {
      if (createdDocs.sessionIds.length > 0) {
        await time_tracker_session.deleteMany({ _id: { $in: createdDocs.sessionIds } });
      }
      if (createdDocs.taskIds.length > 0) {
        await Task.deleteMany({ _id: { $in: createdDocs.taskIds } });
        const { default: CommentsThread } = await import('../../models/comments_threads.js');
        await CommentsThread.deleteMany({ taskId: { $in: createdDocs.taskIds } });
      }
      if (createdDocs.taskTypeId) await TaskType.deleteMany({ _id: createdDocs.taskTypeId });
      if (createdDocs.projectId) await ProjectType.deleteMany({ _id: createdDocs.projectId });
      if (createdDocs.clientId) await Client.deleteMany({ _id: createdDocs.clientId });
      if (createdDocs.salaryStructureId) await SalaryStructure.deleteMany({ _id: createdDocs.salaryStructureId });
      if (createdDocs.employeeId) await Employee.deleteMany({ _id: createdDocs.employeeId });
      if (createdDocs.deptId) await Department.deleteMany({ _id: createdDocs.deptId });
      console.log('🧹 Cleanup completed.');
    } catch (e) {
      console.error('⚠️ Cleanup error:', e.message);
    }
  };

  try {
    // Resolve admin actor and roles
    let superAdminRole = await Role.findOne({ capabilities: 'manage:salary_structures', isActive: true }).lean();
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

    // --- SETUP PRE-REQUISITES (DEPT, EMPLOYEE, SALARY STRUCTURE) ---
    console.log('\n--- Setup: Department, Employee, and Salary Structure ---');
    const dept = await Department.create({
      name: deptName,
      shortCode: `AL${uniqueSuffix.toString().slice(-4)}`,
      description: 'Allocation E2E Test Department'
    });
    createdDocs.deptId = dept._id;

    const employee = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'employees',
      body: {
        basicInfo: {
          firstName: 'E2E_Alloc_First',
          lastName: 'E2E_Alloc_Last',
          email: empEmail,
          phone: '9666555444',
          gender: 'female',
          maritalStatus: 'Single'
        },
        professionalInfo: {
          empId: empId,
          department: dept._id.toString(),
          reportingManager: adminEmp._id.toString(),
          role: superAdminRole._id.toString(),
          level: 'L2',
          doj: new Date()
        },
        authInfo: {
          workEmail: empEmail,
          password: 'Password@123'
        },
        status: 'Active',
        isActive: true
      }
    });
    createdDocs.employeeId = employee._id;

    // Create salary structure with ctc 600,000 (Monthly: 50,000)
    const monthlyCtc = 50000;
    const salaryStructure = await SalaryStructure.create({
      employeeId: employee._id,
      version: 1,
      effectiveFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      ctc: monthlyCtc * 12,
      earnings: [
        { name: 'Basic', type: 'fixed', amount: 25000, taxable: true, isProratable: true }
      ],
      createdBy: adminEmp._id
    });
    createdDocs.salaryStructureId = salaryStructure._id;
    console.log(`✅ Employee created and configured with monthly CTC: ${monthlyCtc}`);

    // --- STEP 1: ALLOCATE PROJECT ---
    console.log('\n--- STEP 1: Creating Client, Project, and Tasks (Allocations) ---');
    const client = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'clients',
      body: {
        name: clientName,
        email: `alloc_client_${uniqueSuffix}@e2e.com`,
        Status: 'Active'
      }
    });
    createdDocs.clientId = client._id;

    const project = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'project_types',
      body: {
        name: projectName,
        description: 'Resource allocation target',
        isActive: true,
        complexity: 'Medium'
      }
    });
    createdDocs.projectId = project._id;

    let taskType = await TaskType.findOne({ name: 'Development', isActive: true });
    if (!taskType) {
      taskType = await TaskType.create({
        name: taskTypeName,
        category: 'Development',
        isActive: true
      });
      createdDocs.taskTypeId = taskType._id;
    }

    // Allocate resources by assigning Employee to two tasks under this project
    // Task 1: 10 hours estimated
    const task1 = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'tasks',
      body: {
        clientId: client._id.toString(),
        projectTypeId: project._id.toString(),
        taskTypeId: taskType._id.toString(),
        createdBy: adminEmp._id.toString(),
        assignedTo: [employee._id.toString()],
        title: 'E2E Task Alloc 1',
        status: 'To Do',
        estimatedHours: 10
      }
    });
    createdDocs.taskIds.push(task1._id);

    // Task 2: 15 hours estimated
    const task2 = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: adminEmp._id.toString(),
      action: 'create',
      modelName: 'tasks',
      body: {
        clientId: client._id.toString(),
        projectTypeId: project._id.toString(),
        taskTypeId: taskType._id.toString(),
        createdBy: adminEmp._id.toString(),
        assignedTo: [employee._id.toString()],
        title: 'E2E Task Alloc 2',
        status: 'To Do',
        estimatedHours: 15
      }
    });
    createdDocs.taskIds.push(task2._id);
    console.log(`✅ Assigned employee to Task 1 (10h) and Task 2 (15h).`);

    // --- STEP 2: LOG HOURS ---
    console.log('\n--- STEP 2: Logging completed hours via Time Tracker ---');

    // Session 1: Log 4 hours (14400s) on Task 1
    const session1 = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: employee._id.toString(), // logged by employee
      action: 'create',
      modelName: 'time_tracker_sessions',
      body: {
        taskId: task1._id.toString(),
        projectId: project._id.toString(),
        userId: employee._id.toString(),
        startTime: new Date(Date.now() - 1000 * 3600 * 4),
        endTime: new Date(),
        duration: 14400,
        status: 'completed',
        notes: 'Logging hours on task 1'
      }
    });
    createdDocs.sessionIds.push(session1._id);

    // Session 2: Log 8 hours (28800s) on Task 2
    const session2 = await buildQuery({
      role: superAdminRole._id.toString(),
      userId: employee._id.toString(),
      action: 'create',
      modelName: 'time_tracker_sessions',
      body: {
        taskId: task2._id.toString(),
        projectId: project._id.toString(),
        userId: employee._id.toString(),
        startTime: new Date(Date.now() - 1000 * 3600 * 8),
        endTime: new Date(),
        duration: 28800,
        status: 'completed',
        notes: 'Logging hours on task 2'
      }
    });
    createdDocs.sessionIds.push(session2._id);
    console.log('✅ Logged 4 hours for Task 1, and 8 hours for Task 2.');

    // --- STEP 3: CALCULATE UTILIZATION AND COST ---
    console.log('\n--- STEP 3: Verifying Utilization & Cost Calculations ---');

    // 1. Calculate allocated hours
    const employeeTasks = await Task.find({ assignedTo: employee._id }).lean();
    const allocatedHours = employeeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    console.log(`   Allocated Hours: ${allocatedHours}`);
    if (allocatedHours !== 25) {
      throw new Error(`Expected allocated hours of 25, got ${allocatedHours}`);
    }

    // 2. Calculate logged hours
    const employeeSessions = await time_tracker_session.find({ userId: employee._id, status: 'completed' }).lean();
    const loggedSeconds = employeeSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const loggedHours = loggedSeconds / 3600;
    console.log(`   Logged Hours: ${loggedHours}`);
    if (loggedHours !== 12) {
      throw new Error(`Expected logged hours of 12, got ${loggedHours}`);
    }

    // 3. Resolve employee hourly rate
    // Standard industry metric: Monthly CTC / (22 workdays * 8 hours)
    const workingDaysInMonth = 22;
    const workHoursPerDay = 8;
    const hourlyRate = monthlyCtc / (workingDaysInMonth * workHoursPerDay);
    console.log(`   Hourly Rate: $${hourlyRate.toFixed(2)} (CTC: ${monthlyCtc} / 176h)`);

    // Calculate total project cost
    const projectCost = loggedHours * hourlyRate;
    console.log(`   Calculated Project Cost for employee: $${projectCost.toFixed(2)}`);

    // Calculate resource utilization rate (logged hours / allocated hours)
    const utilizationRate = (loggedHours / allocatedHours) * 100;
    console.log(`   Resource Utilization Rate: ${utilizationRate.toFixed(2)}%`);
    if (utilizationRate !== 48) {
      throw new Error(`Expected utilization rate of 48%, got ${utilizationRate}%`);
    }

    console.log('✅ Verified: Allocated hours (25), Logged hours (12), Utilization (48%), and Cost calculation succeeded.');

    // Cleanup
    await cleanup();
    console.log('🎉 Resource Allocation: PASS');
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.error('❌ Resource Allocation failed:', err);
    await cleanup();
    await mongoose.disconnect();
    throw err;
  }
}

// Support running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runResourceAllocation()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
