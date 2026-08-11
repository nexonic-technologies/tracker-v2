// models/DashboardSchema.js
// Stores role-based dynamic dashboard layout schemas for the Dashboard Engine (§2.11, §2.13).
import mongoose from "mongoose";

const DashboardSchemaModel = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      default: "Role Dashboard Layout",
    },
    version: {
      type: Number,
      default: 1,
    },
    layout: {
      type: {
        type: String,
        default: "grid",
      },
      columns: {
        type: Number,
        default: 12,
      },
      gap: {
        type: Number,
        default: 16,
      },
    },
    widgets: {
      type: Array,
      default: [],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employees",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("dashboard_schemas", DashboardSchemaModel);
