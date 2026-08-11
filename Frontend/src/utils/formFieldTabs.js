/** Minimum fields before recommending tabbed layout */
export const TAB_FIELD_THRESHOLD = 8;

/**
 * @param {Array} fields - FormRenderer field defs
 * @param {Array<{ id: string, label: string, fieldPrefixes?: string[], fieldNames?: string[] }>} tabs
 */
export function splitFieldsIntoTabs(fields, tabs) {
  if (!tabs?.length) return { default: fields };

  const result = Object.fromEntries(tabs.map((t) => [t.id, []]));
  const fallbackId = tabs[0].id;

  for (const field of fields) {
    const name = field.name || "";
    const tab =
      tabs.find(
        (t) =>
          t.fieldNames?.includes(name) ||
          t.fieldPrefixes?.some((p) => name === p || name.startsWith(`${p}.`))
      ) || null;
    (result[tab?.id || fallbackId] ?? result[fallbackId]).push(field);
  }

  return result;
}

export function shouldUseTabs(fields, tabs) {
  if (tabs?.length > 1) return true;
  return (fields?.length || 0) >= TAB_FIELD_THRESHOLD;
}
