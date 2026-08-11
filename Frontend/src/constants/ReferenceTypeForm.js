export const referenceTypeFormFields = [
  { name: "name", label: "Reference Type Name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  {
    name: "Status", label: "Status", type: "select", options: [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" }
    ], defaultValue: "Active"
  }
];

export const reference_typesubmitButton = {
  text: "Save Reference Type",
  color: "blue",
};