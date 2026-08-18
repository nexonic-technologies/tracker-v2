import { buildSimpleModule } from "../buildSimpleModule";

export const serviceProvidersConfig = buildSimpleModule({
  folder: "Service-Providers",
  model: "serviceproviders",
  title: "Service Providers",
  singularName: "Service Provider",
  fields: [
    { name: "name", label: "Company Name", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "contactPerson", label: "Contact Person", type: "text" },
    { name: "email", label: "Email", type: "text" },
    { name: "phone", label: "Phone", type: "text" },
    { name: "gstIN", label: "GSTIN", type: "text" },
    { name: "panNumber", label: "PAN Number", type: "text" },
    {
      name: "Status",
      label: "Status",
      type: "select",
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" }
      ],
      defaultValue: "Active"
    },
    {
      name: "services",
      label: "Offered Modules / Project Types",
      type: "AutoComplete",
      isMulti: true,
      source: "/populate/read/project_types"
    }
  ],
  submitButton: { label: "Save Provider" }
});
