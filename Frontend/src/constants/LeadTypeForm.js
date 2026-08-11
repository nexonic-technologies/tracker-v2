export const leadTypeFormFields = [
  { name: "name", label: "Lead Type Name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  {
    name: "Status", label: "Status", type: "select", options: [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" }
    ], defaultValue: "Active"
  }
];

export const lead_typesubmitButton = {
  text: "Save Lead Type",
  color: "blue",
};