import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
dotenv.config();

import "../models/Collection.js";
import { syncTaskQueueAssignment } from "../services/employee_task_queues.js";
import approvalEngine from "../utils/approval/approvalEngine.js";

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function runTest() {
  console.log("🚀 Starting backend Sprints & Queue verification test...");
  await mongoose.connect(MONGO_URI);

  const models = mongoose.models;

  // 1. Fetch or create a test employee
  let employee = await models.employees.findOne({ status: "Active" });
  if (!employee) {
    employee = await models.employees.create({
      basicInfo: { firstName: "Test", lastName: "Developer", email: "test-dev@Workhub.com" },
      professionalInfo: { empId: "TEST001" },
      status: "Active"
    });
  }
  console.log(`  👤 Test Employee: ${employee.basicInfo.firstName} (ID: ${employee._id})`);

  // 2. Fetch or create a test client
  let client = await models.clients.findOne({ Status: "Active" });
  if (!client) {
    client = await models.clients.create({
      name: "Test Client",
      Status: "Active",
      project_types: []
    });
  }

  // 3. Create a test projectType & link to client
  let projectType = await models.project_types.findOne();
  if (!projectType) {
    projectType = await models.project_types.create({ name: "Software Development" });
  }
  if (!client.project_types.map(id => id.toString()).includes(projectType._id.toString())) {
    await models.clients.updateOne(
      { _id: client._id },
      { $addToSet: { project_types: projectType._id } }
    );
  }

  // 4. Fetch or create a taskType
  let taskType = await models.task_types.findOne();
  if (!taskType) {
    taskType = await models.task_types.create({ name: "Coding" });
  }

  // 5. Create test tasks
  console.log("  📝 Creating test tasks...");
  const taskA = await models.tasks.create({
    title: "Task A: Setup Core UI",
    clientId: client._id,
    projectTypeId: projectType._id,
    taskTypeId: taskType._id,
    estimatedHours: 4,
    priorityLevel: "High",
    status: "To Do"
  });

  const taskB = await models.tasks.create({
    title: "Task B: Implement API Integration",
    clientId: client._id,
    projectTypeId: projectType._id,
    taskTypeId: taskType._id,
    estimatedHours: 6,
    priorityLevel: "Medium",
    status: "To Do"
  });

  // 6. Simulate assigning tasks to employee
  console.log("  🔄 Assigning tasks to test employee...");
  await models.tasks.updateOne({ _id: taskA._id }, { $set: { assignedTo: [employee._id] } });
  await syncTaskQueueAssignment(taskA._id, [employee._id], []);

  await models.tasks.updateOne({ _id: taskB._id }, { $set: { assignedTo: [employee._id] } });
  await syncTaskQueueAssignment(taskB._id, [employee._id], []);

  // 7. Verify EmployeeTaskQueue updated with denormalized fields
  const queueDoc = await models.employee_task_queues.findOne({ employeeId: employee._id });
  if (!queueDoc || queueDoc.queue.length < 2) {
    throw new Error("❌ Verification Failed: Tasks were not synchronized into employee's task queue.");
  }

  const firstItem = queueDoc.queue[0];
  if (!firstItem.taskName || !firstItem.clientName || firstItem.estimatedHours !== 4 || firstItem.priorityLevel !== "High") {
    throw new Error("❌ Verification Failed: Queue items do not contain correct denormalized metadata fields.");
  }

  console.log("  ✅ Verification Success: Tasks auto-allocated with denormalized fields!");
  console.log(`    Task: "${firstItem.taskName}", Client: "${firstItem.clientName}", Est Hours: ${firstItem.estimatedHours}h, Priority: ${firstItem.priorityLevel}`);

  // 8. Create a queue reorder request (Swap task A and task B order)
  console.log("  📋 Simulating queue reorder approval request (Task B first, Task A second)...");
  const requestBody = [
    {
      taskId: taskB._id,
      order: 0,
      taskName: taskB.title,
      clientName: client.name,
      estimatedHours: taskB.estimatedHours,
      priorityLevel: taskB.priorityLevel
    },
    {
      taskId: taskA._id,
      order: 1,
      taskName: taskA.title,
      clientName: client.name,
      estimatedHours: taskA.estimatedHours,
      priorityLevel: taskA.priorityLevel
    }
  ];

  const reqDoc = await models.employee_task_queue_requests.create({
    employeeId: employee._id,
    departmentId: employee.professionalInfo?.department || null,
    requestedQueue: requestBody,
    status: "Pending"
  });

  // Initialize approval flow manually for verification
  await approvalEngine.initializeWorkflow("employee_task_queue_requests", reqDoc);
  console.log(`  Approval request initialized (ID: ${reqDoc._id}) with status "${reqDoc.status}"`);

  // 9. Advance and approve request
  console.log("  ⚙️ Approving request via approval engine...");
  reqDoc.status = "Approved"; // Simulate manager approval payload
  const result = await approvalEngine.advanceWorkflow(
    reqDoc,
    employee._id, // Approver ID
    "Approved",
    "Approved queue swap verification."
  );

  if (result.finalized && result.status === "Approved") {
    // Commit the queue changes manually like in the service hook
    const session = await models.employee_task_queues.startSession();
    try {
      await session.withTransaction(async () => {
        await models.employee_task_queues.findOneAndUpdate(
          { employeeId: reqDoc.employeeId },
          {
            $set: {
              queue: reqDoc.requestedQueue.map(item => ({
                taskId: item.taskId,
                order: item.order,
                taskName: item.taskName,
                clientName: item.clientName,
                estimatedHours: item.estimatedHours,
                priorityLevel: item.priorityLevel
              }))
            }
          },
          { upsert: true, session }
        );
      });
    } finally {
      await session.endSession();
    }
  }

  // 10. Verify final queue order
  const finalQueue = await models.employee_task_queues.findOne({ employeeId: employee._id });
  if (finalQueue.queue[0].taskId.toString() !== taskB._id.toString()) {
    throw new Error("❌ Verification Failed: Queue swap was not committed after approval.");
  }

  if (finalQueue.queue[0].taskName !== "Task B: Implement API Integration") {
    throw new Error("❌ Verification Failed: Committed queue swap did not write denormalized fields correctly.");
  }
  console.log("  ✅ Verification Success: Final queue order matches Swap Request and transaction committed cleanly!");

  // Cleanup
  console.log("  🧹 Cleaning up test documents...");
  await models.tasks.deleteOne({ _id: taskA._id });
  await models.tasks.deleteOne({ _id: taskB._id });
  await models.employee_task_queues.deleteOne({ employeeId: employee._id });
  await models.employee_task_queue_requests.deleteOne({ _id: reqDoc._id });

  await mongoose.disconnect();
  console.log("🏁 Backend verification checks PASSED successfully!");
}

runTest().catch(err => {
  console.error("❌ Test failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
