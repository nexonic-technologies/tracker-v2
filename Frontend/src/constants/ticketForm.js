export const TICKET_FORM_TABS = [
  {
    id: "client",
    label: "Client",
    fieldNames: ["clientName"],
    type: "AutoComplete",
    source: "/populate/read/clients",
    placeholder: "Select Client",
    required: true,
    multiple: false,
    gridClass: "col-span-2",
  },
  {
    id: "details",
    label: "Details",
    fieldNames: [
      "title",
      "userStory",
      "product",
      "type",
      "priority",
      "dueDate",
      "assignedTo",
    ],
  },
  {
    id: "spec",
    label: "Specification",
    fieldNames: ["impactAnalysis", "url", "acceptanceCriteria", "description"],
  },
];

export const clientFormFields = [
  {
    id: "client",
    name: "clientName",
    label: "Client",
    type: "AutoComplete",
    source: "/populate/read/clients",
    placeholder: "Select Client",
    required: true,
    multiple: false,
    gridClass: "col-span-2",
  },
  {
    id: "product",
    name: "product",
    label: "Product",
    type: "AutoComplete",
    source: "/populate/read/products",
    placeholder: "Select Product",
    required: true,
    multiple: false,
  },
];

export const ticketFormFields = [
  {
    name: "title",
    label: "Title",
    type: "text",
    placeholder: "Brief description of the issue",
    gridClass: "col-span-2",
  },
  {
    name: "userStory",
    label: "User Story (Description)",
    type: "textarea",
    placeholder: "User story that will be visible to external clients...",
    rows: 4,
    gridClass: "col-span-2",
  },
  { name: "type", label: "Type", type: "AutoComplete", source: "/populate/read/task_types", placeholder: "Ticket type" },
  {
    name: "priority",
    label: "Priority",
    type: "AutoComplete",
    source: "",
    options: [
      { _id: "Low", name: "Low" },
      { _id: "Medium", name: "Medium" },
      { _id: "High", name: "High" },
      { _id: "Critical", name: "Critical" },
    ],
  },
  { name: "dueDate", label: "Due Date", type: "date" },
  {
    name: "assignedTo",
    label: "Assignees",
    type: "AutoComplete",
    multiple: true,
    source: "/populate/read/employees",
  },
  {
    name: "impactAnalysis",
    label: "Impact Analysis",
    type: "textarea",
    placeholder: "Impact analysis of the issue...",
    rows: 3,
    gridClass: "col-span-2",
  },
  {
    name: "url",
    label: "URL",
    type: "url",
    placeholder: "Related URL",
    gridClass: "col-span-2",
  },
  {
    name: "acceptanceCriteria",
    label: "Acceptance Criteria",
    type: "textarea",
    placeholder: "Acceptance criteria for completion...",
    rows: 3,
    gridClass: "col-span-2",
  },
  {
    name: "description",
    label: "Internal Description",
    type: "textarea",
    placeholder: "Internal notes (not visible to external clients)...",
    rows: 3,
    gridClass: "col-span-2",
  },
];

export const ticketSubmitButton = { text: "Save Ticket", color: "blue" };
