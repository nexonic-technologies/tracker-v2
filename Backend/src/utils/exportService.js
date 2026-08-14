import models from '../models/Collection.js';


/**
 * Escapes a string for CSV formatting
 */
const escapeCSV = (str) => {
  if (str === null || str === undefined) return "";
  const s = String(str).replace(/"/g, '""'); // Escape quotes
  // If string contains comma, newline or double quote, wrap it in quotes
  if (s.includes(",") || s.includes("\n") || s.includes("\"")) {
    return `"${s}"`;
  }
  return s;
};

/**
 * Generates a CSV export of Tasks based on a query filter.
 */
export const generateTaskCSV = async (filter = {}) => {
  const collection = models.tasks;

  // Fetch tasks with populated references using aggregation
  const pipeline = [
    { $match: filter },
    // Lookup client
    {
      $lookup: {
        from: "clients",
        localField: "clientId",
        foreignField: "_id",
        as: "clientDoc"
      }
    },
    // Lookup creator
    {
      $lookup: {
        from: "employees",
        localField: "createdBy",
        foreignField: "_id",
        as: "creatorDoc"
      }
    },
    // Lookup category
    {
      $lookup: {
        from: "project_types",
        localField: "projectTypeId",
        foreignField: "_id",
        as: "categoryDoc"
      }
    }
  ];

  const tasks = await collection.aggregate(pipeline).toArray();

  // CSV Headers
  const headers = [
    "Task ID",
    "Title",
    "Status",
    "Priority",
    "Client",
    "Category",
    "Created By",
    "Created At",
    "Start Date",
    "End Date"
  ];

  // CSV Rows
  const rows = tasks.map(task => {
    const client = task.clientDoc?.[0]?.name || "-";
    const creator = task.creatorDoc?.[0]?.basicInfo?.firstName
      ? `${task.creatorDoc[0].basicInfo.firstName} ${task.creatorDoc[0].basicInfo.lastName || ""}`.trim()
      : "System";
    const category = task.categoryDoc?.[0]?.name || "-";

    return [
      task._id.toString(),
      task.title,
      task.status || "Unknown",
      task.priorityLevel || "None",
      client,
      category,
      creator,
      task.createdAt ? new Date(task.createdAt).toISOString().split("T")[0] : "",
      task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "",
      task.endDate ? new Date(task.endDate).toISOString().split("T")[0] : ""
    ].map(escapeCSV).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
};
