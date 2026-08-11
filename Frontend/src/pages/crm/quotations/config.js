import { quotationFormFields, quotationSubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../../master-data/buildSimpleModule";

export const quotationsConfig = buildSimpleModule({
  folder: "CRM/Quotations",
  basePath: "/CRM/Quotations",
  model: "quotations",
  title: "Quotations",
  singularName: "Quotation",
  fields: quotationFormFields,
  submitButton: quotationSubmit,
});
