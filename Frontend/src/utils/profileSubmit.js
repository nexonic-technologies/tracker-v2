/** Build multipart FormData for employee PATCH from dirty-field patch object. */

const SKIP_ROOTS = new Set([
  "_id",
  "id",
  "createdAt",
  "updatedAt",
  "__v",
  "authInfo",
  "professionalInfo",
  "leaveStatus",
  "salaryDetails",
  "status",
  "isActive",
  "professionalDocuments",
]);

const SKIP_EXACT = new Set([
  "personalDocuments.documentFiles",
  "personalDocuments.esi",
  "personalDocuments.pf",
]);

function shouldSkipKey(key) {
  const root = key.split(".")[0];
  if (SKIP_ROOTS.has(root)) return true;
  if (SKIP_EXACT.has(key)) return true;
  return [...SKIP_EXACT].some((s) => key.startsWith(`${s}.`));
}

export function flatObject(obj, prefix = "") {
  if (!obj || typeof obj !== "object") return {};
  return Object.keys(obj).reduce((acc, key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof File)
    ) {
      Object.assign(acc, flatObject(value, path));
    } else {
      acc[path] = value;
    }
    return acc;
  }, {});
}

export function buildEmployeeUpdateFormData(patch) {
  const fd = new FormData();
  const flat = flatObject(patch);

  Object.entries(flat).forEach(([key, value]) => {
    if (shouldSkipKey(key) || value == null) return;

    if (key === "basicInfo.profileImage" && value instanceof File) {
      fd.append("file", value);
      return;
    }

    fd.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
  });

  return fd;
}
