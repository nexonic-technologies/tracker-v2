export const wfhFormFields = (userData) => [
  { name: "employeeId", hidden: true, value: userData._id },
  
  { label: "From Date", name: "startDate", type: "date", required: true, orderKey: 0 },
  { label: "To Date", name: "endDate", type: "date", required: true, orderKey: 1 },
  
  {
    label: "Reason",
    name: "reason",
    type: "textarea",
    required: true,
    orderKey: 2,
  },
];

export const wfhSubmitButton = {
  text: "Submit WFH Request",
  color: "blue",
};
