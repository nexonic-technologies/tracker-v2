import { buildSimpleModule } from "../buildSimpleModule";

const statusField = {
  name: "isActive",
  label: "Active",
  type: "select",
  options: [
    { name: "Active", _id: true },
    { name: "Inactive", _id: false },
  ],
  default: true,
};

export const jobTypeFormFields = [
  { name: "name", label: "Job Type Name", type: "text", required: true, width: "half" },
  {
    name: "categoryId",
    label: "Job Category",
    type: "AutoComplete",
    source: "/populate/read/job_categories",
    labelField: "name",
    fieldName: "name",
    valueField: "_id",
    required: true,
    width: "half",
  },
  { name: "description", label: "Description", type: "textarea" },
  { name: "icon", label: "Icon (emoji)", type: "text", width: "half", placeholder: "🐞" },
  { name: "color", label: "Color", type: "color", width: "half", default: "#6B7280" },

  // Cost & Billing
  { name: "defaultHourlyRate", label: "Default Hourly Rate (₹)", type: "number", width: "half", default: 0 },
  {
    name: "isBillable",
    label: "Billable",
    type: "select",
    options: [
      { name: "Yes (Billable)", _id: true },
      { name: "No (Non-billable)", _id: false },
    ],
    default: true,
    width: "half",
  },

  // Productivity
  {
    name: "expectedProductivity",
    label: "Expected Productivity",
    type: "select",
    options: [
      { name: "Low", _id: "Low" },
      { name: "Medium", _id: "Medium" },
      { name: "High", _id: "High" },
      { name: "Very High", _id: "Very High" },
    ],
    default: "Medium",
    width: "half",
  },
  { name: "expectedOutputUnit", label: "Output Unit (e.g., bugs fixed, story points)", type: "text", width: "half" },

  // Auto-Derivation
  { name: "defaultDeliveryStage", label: "Auto-Set Delivery Stage", type: "text", width: "half", placeholder: "Development, QAT, Review, etc." },
  { name: "autoSetTaskStatus", label: "Auto-Set Task Status", type: "text", width: "half", placeholder: "In Progress, In Review, etc." },

  { name: "order", label: "Display Order", type: "number", width: "half", default: 0 },
  statusField,
];

export const job_typesubmit = { text: "Save Job Type", color: "blue" };

export const job_typesConfig = buildSimpleModule({
  folder: "Job-Types",
  model: "job_types",
  title: "Job Types",
  singularName: "Job Type",
  fields: jobTypeFormFields,
  submitButton: job_typesubmit,
  list: {
    hiddenColumns: ["metaStatus", "allowedDesignations", "requiredSkillLevel"],
  },
});
