export const agentFormFields = [
  {
    label: "Agent Name",
    name: "name",
    type: "text",
    required: true,
    orderKey: 0,
  },
  {
    label: "Email",
    name: "email",
    type: "email",
    required: true,
    orderKey: 1,
  },
  {
    label: "Client",
    name: "client",
    type: "AutoComplete",
    source: "/populate/read/clients",
    required: true,
    orderKey: 2,
  },
  {
    label: "Phone Number",
    name: "phone",
    type: "text",
    orderKey: 3,
  },
  {
    label: "Department",
    name: "department",
    type: "AutoComplete",
    source: "/populate/read/departments",
    orderKey: 4,
  },
];

export const agentSubmitButton = {
  text: "Create Agent",
  color: "blue",
};