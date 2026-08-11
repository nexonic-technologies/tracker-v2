const TaskForm = [
  {
    label: "Client",
    name: "clientName",
    type: "AutoComplete",
    source: "/populate/read/clients",
    placeholder: "Select Client",
    required: true,
  },
  {
    label: "Project Type",
    name: "projectType",
    type: "AutoComplete",
    source: "/populate/read/clients/:clientId?fields=project_types",
    placeholder: "Select Project Type",
    dependsOn: "clientName",
    required: true,
  },
  {
    label: "Task Type",
    name: "taskType",
    type: "AutoComplete",
    source: "/populate/read/task_types",
    placeholder: "Select Task Type",
    required: true,
  },
  {
    label: "Title",
    name: "title",
    type: "text",
    placeholder: "Enter task title",
    required: true,
  },
  {
    label: "Reference URL",
    name: "referenceUrl",
    type: "text",
    placeholder: "Any reference link / ticket",
  },
  {
    label: "User Story",
    name: "userStory",
    type: "textarea",
    placeholder: "As a user, I want to ...",
  },
  {
    label: "Observation",
    name: "observation",
    type: "textarea",
  },
  {
    label: "Impacts",
    name: "impacts",
    type: "textarea",
  },
  {
    label: "Acceptance Criteria",
    name: "acceptanceCreteria",
    type: "textarea",
  },
  {
    label: "Start Date",
    name: "startDate",
    type: "date",
  },
  {
    label: "End Date",
    name: "endDate",
    type: "date",
  },
  {
    label: "Priority Level",
    name: "priorityLevel",
    type: "select",
    options: [
      { label: "Low", value: "Low" },
      { label: "Medium", value: "Medium" },
      { label: "High", value: "High" },
      { label: "Weekly Priority", value: "Weekly Priority" },
    ],
    defaultValue: "Low",
  },
  {
    label: "Tags",
    name: "tags",
    type: "text",
    placeholder: "Comma separated tags (ui, api, bug...)",
  },
];

export default TaskForm;
