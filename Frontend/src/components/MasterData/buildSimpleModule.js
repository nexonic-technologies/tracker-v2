import { createModuleConfig } from "./createModuleConfig";

/** Standard list + form module config for simple master entities */
export function buildSimpleModule({
  folder,
  model,
  title,
  singularName,
  fields,
  submitButton,
  list = {},
}) {
  return createModuleConfig({
    folder,
    model,
    title,
    subtitle: `Manage ${title.toLowerCase()}`,
    singularName,
    fields,
    submitButton,
    list: {
      hiddenColumns: ["_id", "createdAt", "updatedAt", "__v", ...(list.hiddenColumns || [])],
      ...list,
    },
  });
}
