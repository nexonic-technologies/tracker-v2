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

export const jobCategoryFormFields = [
  { name: "name", label: "Category Name", type: "text", required: true, width: "half" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "icon", label: "Icon (emoji)", type: "text", width: "half", placeholder: "💻" },
  { name: "color", label: "Color", type: "color", width: "half", default: "#3B82F6" },
  { name: "order", label: "Display Order", type: "number", width: "half", default: 0 },
  {
    name: "isBillable",
    label: "Billable by Default",
    type: "select",
    options: [
      { name: "Yes (Billable)", _id: true },
      { name: "No (Non-billable)", _id: false },
    ],
    default: true,
    width: "half",
  },
  statusField,
];

export const jobCategorySubmit = { text: "Save Job Category", color: "blue" };

export const job_categoriesConfig = buildSimpleModule({
  folder: "Job-Categories",
  model: "job_categories",
  title: "Job Categories",
  singularName: "Job Category",
  fields: jobCategoryFormFields,
  submitButton: jobCategorySubmit,
  list: {
    hiddenColumns: ["metaStatus"],
  },
});
