export const leaveFormFields = (userData, leaveTypeOptions = null) => [
  { name: "employeeId", hidden: true, value: userData?._id },
  { name: "departmentId", hidden: true, value: userData?.professionalInfo?.department?._id || userData?.professionalInfo?.department },

  {
    label: "Leave Type",
    name: "leaveType",
    type: "AutoComplete",
    ...(Array.isArray(leaveTypeOptions) && leaveTypeOptions.length > 0
      ? { options: leaveTypeOptions }
      : { source: "/populate/read/leave_types" }),
    labelField: "name",
    fieldName: "_id",
    placeholder: "Select leave type...",
    required: true,
    orderKey: 0,
  },

  { label: "From Date", name: "startDate", type: "date", required: true, orderKey: 1 },
  { label: "To Date", name: "endDate", type: "date", required: true, orderKey: 2 },

  // read-only UI field (calculated dynamically)
  { label: "Available Balance", name: "availableDays", type: "label", external: true, orderKey: 3 },

  { name: "totalDays", hidden: true },

  {
    label: "Reason",
    name: "reason",
    type: "textarea",
    placeholder: "Explain the reason for your leave request...",
    required: true,
    orderKey: 4,
  },
];

export const leaveSubmitButton = {
  text: "Submit Leave Request",
  color: "blue",
};
