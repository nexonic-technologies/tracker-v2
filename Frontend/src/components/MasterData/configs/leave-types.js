import { leaveTypeFormFields, leave_typesubmit } from "@constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const leave_typesConfig = buildSimpleModule({
  folder: "Leave-Types",
  model: "leave_types",
  title: "Leave Types",
  singularName: "Leave Type",
  fields: leaveTypeFormFields,
  submitButton: leave_typesubmit,
});
