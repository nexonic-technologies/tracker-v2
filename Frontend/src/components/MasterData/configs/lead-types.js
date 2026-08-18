import { leadTypeFormFields, lead_typesubmitButton } from "@constants/LeadTypeForm";
import { buildSimpleModule } from "../buildSimpleModule";

export const lead_typesConfig = buildSimpleModule({
  folder: "Lead-Types",
  model: "lead_types",
  title: "Lead Types",
  singularName: "Lead Type",
  fields: leadTypeFormFields,
  submitButton: lead_typesubmitButton,
});
