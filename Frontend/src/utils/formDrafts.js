const PREFIX = "workhub:form-draft:";

export function formDraftKey(model, id = "new") {
  return `${PREFIX}${model}:${id}`;
}

export function saveFormDraft(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ data, savedAt: new Date().toISOString() })
    );
  } catch (e) {
    console.warn("Could not save form draft", e);
  }
}

export function loadFormDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearFormDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function listFormDrafts(model) {
  const prefix = `${PREFIX}${model}:`;
  const drafts = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix)) {
      const loaded = loadFormDraft(k);
      if (loaded) drafts.push({ key: k, ...loaded });
    }
  }
  return drafts;
}
