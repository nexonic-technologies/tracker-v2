export const designationFormFields = [
  { name: "title", label: "Designation Name", type: "text", required: true },
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
  {
    name: "leavePolicy",
    label: "Leave Policy",
    type: "AutoComplete",
    source: "/populate/read/leave_policies",
    labelField: "name",
    fieldName: "_id"
  },
  {
    name: "attendancePolicy",
    label: "Attendance Policy",
    type: "AutoComplete",
    source: "/populate/read/attendance_policies",
    labelField: "name",
    fieldName: "_id"
  },
  { name: "description", label: "Description", type: "textarea", gridClass: "col-span-2" }
];

export const designationSubmitButton = {
  text: "Save Designation",
  color: "blue",
};