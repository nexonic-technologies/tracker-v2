/** Build standard master-data module config */
export function createModuleConfig({
  folder,
  model,
  title,
  subtitle,
  singularName,
  fields,
  submitButton,
  tabs = null,
  list = {},
  transformSubmit,
  loadRecord,
  basePath,
}) {
  return {
    model,
    title,
    subtitle,
    singularName,
    basePath: basePath || `/master-data/${folder.toLowerCase()}`,
    fields,
    submitButton,
    tabs,
    list,
    transformSubmit,
    loadRecord,
  };
}
