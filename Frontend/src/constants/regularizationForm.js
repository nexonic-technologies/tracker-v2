export const regularizationFormFields = [
  {
    label: "Request Date",
    name: "requestDate",
    type: "date",
    required: true,
  },
  {
    label: "Check-In Time",
    name: "requestedCheckIn",
    type: "datetime-local",
    required: true,
  },
  {
    label: "Check-Out Time",
    name: "requestedCheckOut",
    type: "datetime-local",
    required: true,
  },
  {
    label: "Reason",
    name: "reason",
    type: "textarea",
    placeholder: "Please provide reason for regularization...",
    required: true,
    rows: 4,
    gridClass: "col-span-2"
  },
];

export const regularizationSubmitButton = {
  text: "Submit Regularization",
  color: "green",
};
