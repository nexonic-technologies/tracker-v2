import { workflowFormFields, workflowSubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const workflowsConfig = buildSimpleModule({
  folder: "Workflows",
  model: "workflows",
  title: "Workflows",
  singularName: "Workflow",
  fields: workflowFormFields,
  submitButton: workflowSubmit,
});
