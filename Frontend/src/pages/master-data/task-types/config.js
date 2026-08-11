import { taskTypeFormFields, task_typesubmit } from "../../../constants/masterDataForms";
import { buildSimpleModule } from "../buildSimpleModule";

export const task_typesConfig = buildSimpleModule({
  folder: "Task-Types",
  model: "task_types",
  title: "Task Types",
  singularName: "Task Type",
  fields: taskTypeFormFields,
  submitButton: task_typesubmit,
});
