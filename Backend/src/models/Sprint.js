import mongoose from "mongoose";

const SprintSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  status: { type: String, enum: ["Upcoming", "Active", "Completed"], default: "Upcoming", index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "clients", index: true },
  projectTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "project_types", index: true },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "tasks" }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true }
}, { timestamps: true });

export default mongoose.model("sprints", SprintSchema);
