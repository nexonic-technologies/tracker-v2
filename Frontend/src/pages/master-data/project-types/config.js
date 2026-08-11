import { projectTypeFormFields, project_typesubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const project_typesConfig = buildSimpleModule({
  folder: "Project-Types",
  model: "project_types",
  title: "Project Types",
  singularName: "Project Type",
  fields: projectTypeFormFields,
  submitButton: project_typesubmit,
});
