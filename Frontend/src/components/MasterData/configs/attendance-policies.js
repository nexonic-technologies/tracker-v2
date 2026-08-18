import { attendancePolicyFormFields, attendancePolicySubmit } from "@constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const attendance_policiesConfig = buildSimpleModule({
  folder: "Attendance-Policies",
  model: "attendance_policies",
  title: "Attendance Policies",
  singularName: "Attendance Policy",
  fields: attendancePolicyFormFields,
  submitButton: attendancePolicySubmit,
});
