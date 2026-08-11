export const departmentFormFields = [
  { name: "name", label: "Department Name", type: "text", required: true },
  { name: "shortCode", label: "Short Code", type: "text", required: true },
  {
    name: "attendancePolicy",
    label: "Attendance Policy",
    type: "AutoComplete",
    source: "/populate/read/attendance_policies",
    labelField: "name",
    fieldName: "_id",
  },
  {
    name: "leavePolicy",
    label: "Leave Policy",
    type: "AutoComplete",
    source: "/populate/read/leave_policies",
    labelField: "name",
    fieldName: "_id",
  },
  {
    name: "designations",
    label: "Belonged Designations",
    type: "AutoComplete",
    multiple: true,
    source: "/populate/read/designations",
    labelField: "title",
    fieldName: "_id",
  },
  {
    name: "Status",
    label: "Status",
    type: "select",
    options: [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ],
    defaultValue: "Active",
  },
  { name: "description", label: "Description", type: "textarea", gridClass: "col-span-2" },
];

export const departmentSubmitButton = { text: "Save Department", color: "blue" };
