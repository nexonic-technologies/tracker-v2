export const clientFormFields = [
  {
    label: "Client Name",
    name: "name",
    type: "text",
    required: true,
    orderKey: 0,
  },
  {
    label: "Owner Name",
    name: "ownerName",
    type: "text",
    orderKey: 1,
  },
  {
    label: "Business Type",
    name: "businessType",
    type: "text",
    orderKey: 2,
  },
  {
    label: "Email",
    name: "email",
    type: "email",
    orderKey: 3,
  },
  {
    label: "Phone",
    name: "phone",
    type: "text",
    orderKey: 4,
  },
  {
    label: "Source",
    name: "source",
    type: "text",
    orderKey: 5,
  },
  {
    label: "GST Number",
    name: "gstIN",
    type: "text",
    orderKey: 6,
  },
  {
    label: "Lead Status",
    name: "leadStatus",
    type: "select",
    options: [
      { value: "New", label: "New" },
      { value: "Qualified", label: "Qualified" },
      { value: "Proposal", label: "Proposal" },
      { value: "Negotiation", label: "Negotiation" },
      { value: "Closed Won", label: "Closed Won" },
      { value: "Closed Lost", label: "Closed Lost" }
    ],
    defaultValue: "New",
    orderKey: 7,
  },
  {
    label: "Reference Type",
    name: "referenceType",
    type: "AutoComplete",
    source: "/populate/read/reference_types",
    labelField: "name",
    fieldName: "name",
    valueField: "_id",
    orderKey: 8,
  },
  {
    label: "Lead Type",
    name: "leadType",
    type: "AutoComplete",
    source: "/populate/read/lead_types",
    labelField: "name",
    fieldName: "name",
    valueField: "_id",
    orderKey: 9,
  },
  {
    label: "Account Manager",
    name: "accountManager",
    type: "AutoComplete",
    source: "/populate/read/employees",
    labelField: "name",
    fieldName: "name",
    valueField: "_id",
    transform: (employees) => employees.map(emp => ({
      _id: emp._id,
      name: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || emp.basicInfo?.firstName || `Employee-${emp._id.slice(-4)}`
    })),
    orderKey: 9.5,
  },
  {
    label: "Project Manager",
    name: "projectManager",
    type: "AutoComplete",
    source: "/populate/read/employees",
    labelField: "name",
    fieldName: "name",
    valueField: "_id",
    transform: (employees) => employees.map(emp => ({
      _id: emp._id,
      name: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || emp.basicInfo?.firstName || `Employee-${emp._id.slice(-4)}`
    })),
    orderKey: 10,
  },
  {
    label: "Address",
    name: "address",
    type: "SubForm",
    subFormFields: [
      {
        label: "Street Address",
        name: "street",
        type: "text",
      },
      {
        label: "City",
        name: "city",
        type: "text",
      },
      {
        label: "State",
        name: "state",
        type: "text",
      },
      {
        label: "ZIP Code",
        name: "zip",
        type: "text",
      },
      {
        label: "Country",
        name: "country",
        type: "text",
      },
    ],
    gridClass: "col-span-2",
    orderKey: 11,
  },
  {
    label: "Project Types",
    name: "project_types",
    type: "AutoComplete",
    source: "/populate/read/project_types",
    labelField: "name",
    fieldName: "name",
    valueField: "_id",
    multiple: true,
    gridClass: "col-span-2",
    orderKey: 12,
  },
  {
    label: "Proposed Products",
    name: "proposedProducts",
    type: "AutoComplete",
    source: "/populate/read/products",
    labelField: "name",
    fieldName: "name",
    valueField: "_id",
    multiple: true,
    gridClass: "col-span-2",
    orderKey: 13,
  },
  {
    label: "Contact Information",
    name: "contactInfo",
    type: "SubForm",
    multiple: true,
    subFormFields: [
      {
        label: "Contact Name",
        name: "name",
        type: "text",
        required: true,
      },
      {
        label: "Email",
        name: "email",
        type: "email",
      },
      {
        label: "Phone Number",
        name: "phone",
        type: "text",
      },
      {
        label: "Designation",
        name: "designation",
        type: "text",
      },
    ],
    orderKey: 14,
  },
  {
    label: "Status",
    name: "Status",
    type: "select",
    options: [
      { value: "Inactive", label: "Inactive" },
      { value: "Active", label: "Active" }
    ],
    defaultValue: "Inactive",
    orderKey: 15,
    note: "Status remains Inactive until order completion and acknowledgement"
  }
];

export const clientSubmitButton = {
  text: "Save Client",
  color: "blue",
};