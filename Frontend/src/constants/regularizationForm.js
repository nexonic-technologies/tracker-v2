export const regularizationFormFields = [
  {
    label: "Corrected Check-In Time",
    name: "requestedCheckIn",
    type: "time",
    required: true,
    gridClass: "col-span-1",
  },
  {
    label: "Corrected Check-Out Time",
    name: "requestedCheckOut",
    type: "time",
    required: true,
    gridClass: "col-span-1",
  },
  {
    label: "Reason for Adjustment",
    name: "reason",
    type: "textarea",
    placeholder: "Explain the reason (e.g. client meeting, biometric glitch, forgot to punch)...",
    required: true,
    rows: 3,
    gridClass: "col-span-2",
  },
];

export const regularizationSubmitButton = {
  text: "Submit Regularization",
  color: "green",
};
