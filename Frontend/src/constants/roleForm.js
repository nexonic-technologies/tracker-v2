export const roleFormFields = [
  { name: "name", label: "Role Name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  {
    name: "isActive",
    label: "Status",
    type: "select",
    options: [
      { name: "Active", value: true },
      { name: "Inactive", value: false },
    ],
    default: true,
  },
];

export const roleSubmitButton = { text: "Save Role", color: "blue" };
