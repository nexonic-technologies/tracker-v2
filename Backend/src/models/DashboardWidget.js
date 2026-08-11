// models/DashboardWidget.js
// Stores which dashboard widget IDs are enabled for each role.
// One document per role — admins configure this via the Role Permissions page.
import mongoose from "mongoose";

const dashboard_widgetschema = new mongoose.Schema({
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "roles",
    required: true,
    unique: true,
    index: true,
  },
  /**
   * Array of widget IDs that this role is permitted to see on the dashboard.
   * IDs are defined in frontend/src/pages/Dashboard/config/dashboardConfig.js (WIDGET_REGISTRY).
   * Example: ["stat_total_employees", "quick_actions", "recent_tasks_table"]
   */
  widgets: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

export default mongoose.model("dashboard_widgets", dashboard_widgetschema);
