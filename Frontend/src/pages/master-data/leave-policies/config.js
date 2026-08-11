import { leavePolicyFormFields, leavePolicySubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const leave_policiesConfig = buildSimpleModule({
  folder: "Leave-Policies",
  model: "leavepolicy",
  title: "Leave Policies",
  singularName: "Leave Policy",
  fields: leavePolicyFormFields,
  submitButton: leavePolicySubmit,
});
