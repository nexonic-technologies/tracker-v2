export const milestoneFormFields = [
  { name: "name", label: "Milestone Name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "Status", label: "Status", type: "select", options: [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" }
  ], defaultValue: "Active" }
];

export const milestoneSubmitButton = {
  text: "Save Milestone",
  color: "blue",
};