import { clientSubmitButton } from "../../../constants/ClientForm";
import { CLIENT_FORM_TABS, clientFormFields } from "../../../constants/clientFormTabs";
import { createModuleConfig } from "../createModuleConfig";

export function buildClientPayload(formData) {
  if (!formData) return formData;
  return {
    name: formData.name,
    ownerName: formData.ownerName,
    businessType: formData.businessType,
    email: formData.email,
    phone: formData.phone,
    source: formData.source,
    gstIN: formData.gstIN,
    leadStatus: formData.leadStatus,
    referenceType: formData.referenceType,
    leadType: formData.leadType,
    accountManager: formData.accountManager,
    projectManager: formData.projectManager,
    Status: formData.Status,
    address: {
      street: formData.address?.street,
      city: formData.address?.city,
      state: formData.address?.state,
      zip: formData.address?.zip,
      country: formData.address?.country,
    },
    project_types: formData.project_types || [],
    proposedProducts: formData.proposedProducts || [],
    contactInfo: Array.isArray(formData.contactInfo)
      ? formData.contactInfo
      : formData.contactInfo
        ? [formData.contactInfo]
        : [],
  };
}

export const clientsConfig = createModuleConfig({
  folder: "Clients",
  model: "clients",
  title: "Clients",
  subtitle: "Client and lead management",
  singularName: "Client",
  fields: clientFormFields,
  submitButton: clientSubmitButton,
  tabs: CLIENT_FORM_TABS,
  transformSubmit: buildClientPayload,
  list: {
    customColumns: ["agents"],
    hiddenColumns: ["_id", "clientData"],
  },
});
