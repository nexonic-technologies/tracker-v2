// models/DailyActivity.js
import { Schema, model } from "mongoose";

const DailyActivitySchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "clients" }, // optional link
    projectType: { type: Schema.Types.ObjectId, ref: "project_types" }, // optional link
    user: { type: Schema.Types.ObjectId, ref: "employees" },
    date: { type: Date, default: Date.now },
    taskType: { type: Schema.Types.ObjectId, ref: "task_types" }, // optional link
    activity: { type: String, trim: true }, // description of activity
    assignedTo: { type: Schema.Types.ObjectId, ref: "employees" }, // optional link
    status: { type: String, default: "Pending" }, // driven by status_configs
    metaStatus: { type: String, default: 'active', index: true },
  },
  { timestamps: true }
);

// Indexes for optimal filtering
DailyActivitySchema.index({ user: 1, date: 1 });
DailyActivitySchema.index({ assignedTo: 1, status: 1 });
DailyActivitySchema.index({ client: 1, date: 1 });
DailyActivitySchema.index({ user: 1, status: 1 });
DailyActivitySchema.index({ date: 1, status: 1 });

export default model("daily_activities", DailyActivitySchema);
