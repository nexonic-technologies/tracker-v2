export const productFormFields = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "price", label: "Price", type: "number", required: true },
    { name: "Status", label: "Status", type: "select", options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" }
      ], defaultValue: "Active" }
  ];
  
  export const productSubmitButton = { text: "Save Product", color: "blue" };
  