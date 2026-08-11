export const compOffFormFields = (userData) => [
  { name: "employeeId", hidden: true, value: userData._id },
  
  { label: "Worked Date", name: "workedDate", type: "date", required: true, orderKey: 0 },
  { label: "Hours Worked", name: "hoursWorked", type: "number", required: true, orderKey: 1 },
  
  {
    label: "Reason / Project Details",
    name: "reason",
    type: "textarea",
    required: true,
    orderKey: 2,
  },
];

export const compOffSubmitButton = {
  text: "Submit Comp-Off Request",
  color: "blue",
};
