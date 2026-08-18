import { hr_policiesFormFields, hr_policiesSubmit } from "@constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const hrPoliciesConfig = buildSimpleModule({
  folder: "HR-Policies",
  model: "hrpolicies",
  title: "HR Policies",
  singularName: "HR Policy",
  fields: hr_policiesFormFields,
  submitButton: hr_policiesSubmit,
  list: { hiddenColumns: ["content"] },
});
