const ActivityEntryFrom = [
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
    source: "/populate/read/clients/:clientId?fields=project_types&populateFields=project_types",
    placeholder: "Select Project Type",
    dependsOn: "clientName",
    required: true,
  },
  {
    type: "multiGroup",
    name: "activities",
    label: "Activities",
    fields: [
      {
        type: "AutoComplete",
        name: "taskType",
        label: "Task Type",
        source: "/populate/read/task_types",
      },
      {
        type: "textarea",
        name: "activity",
        label: "Activity Description",
      },
    ],
  },
];

export default ActivityEntryFrom;
