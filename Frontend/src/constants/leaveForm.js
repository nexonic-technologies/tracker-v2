export const leaveFormFields = (userData) => [
  { name: "employeeId", hidden: true, value: userData._id },
  { name: "departmentId", hidden: true, value: userData.professionalInfo?.department },

  {
    label: "Leave Type",
    name: "leaveType",
    type: "AutoComplete",
    source: `/populate/read/employees/${userData._id}`,
    dynamicOptions: {
      params: {
        aggregate: true,
        stages: [
          { $unwind: "$leaveStatus" },
          {
            $lookup: {
              from: "leave_types",
              localField: "leaveStatus.leaveType",
              foreignField: "_id",
              as: "leaveTypeInfo",
            },
          },
          { $unwind: "$leaveTypeInfo" },
          {
            $project: {
              _id: "$leaveTypeInfo._id",
              leaveTypeId: "$leaveTypeInfo._id",
              name: "$leaveTypeInfo.name",
              departmentId: "$professionalInfo.department",
            },
          },
        ],
      },
    },
    required: true,
    orderKey: 3,
  },

  { label: "From Date", name: "startDate", type: "date", required: true, orderKey: 0 },
  { label: "To Date", name: "endDate", type: "date", required: true, orderKey: 1 },

  // read-only UI field (not submitted)
  { label: "Available Days", name: "availableDays", type: "label", external: true, orderKey: 3 },

  { name: "totalDays", hidden: true },

  {
    label: "Reason",
    name: "reason",
    type: "textarea",
    required: true,
    orderKey: 4,
  },
];

export const leaveSubmitButton = {
  text: "Submit Leave Request",
  color: "blue",
};
