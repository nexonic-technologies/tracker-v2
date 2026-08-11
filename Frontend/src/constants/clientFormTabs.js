import { clientFormFields } from "./ClientForm";

export const CLIENT_FORM_TABS = [
  {
    id: "general",
    label: "General",
    fieldNames: [
      "name",
      "ownerName",
      "businessType",
      "email",
      "phone",
      "source",
      "gstIN",
      "leadStatus",
      "referenceType",
      "leadType",
      "accountManager",
      "projectManager",
    ],
  },
  { id: "address", label: "Address", fieldNames: ["address"] },
  { id: "projects", label: "Projects", fieldNames: ["project_types", "proposedProducts"] },
  { id: "contacts", label: "Contacts", fieldNames: ["contactInfo"] },
  { id: "status", label: "Status", fieldNames: ["Status"] },
];

export { clientFormFields };
