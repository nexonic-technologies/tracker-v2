import mongoose from "mongoose";

const employee_task_queuesSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true, unique: true, index: true },
  queue: [{
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "tasks", required: true },
    order: { type: Number, required: true },
    taskName: { type: String, trim: true },
    clientName: { type: String, trim: true },
    estimatedHours: { type: Number },
    priorityLevel: { type: String }
  }]
}, { timestamps: true });

export default mongoose.model("employee_task_queues", employee_task_queuesSchema);
