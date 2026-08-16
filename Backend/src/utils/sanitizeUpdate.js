// src/utils/sanitizeUpdate.js
//
// Sanitizes update body BEFORE writing to DB.
// Strategy: Exact-path recursive evaluation prevents unauthorized field injection.
//

export default function sanitizeUpdate({ body, policy, action = "update" }) {
  if (!body || typeof policy !== "object") return body;

  const forbidden = policy?.forbiddenAccess?.[action] || [];
  const allowed   = policy?.allowAccess?.[action] || [];

  // Array support: sanitize every item
  if (Array.isArray(body)) {
    return body.map(item => sanitizeSingle({ body: item, allowed, forbidden }));
  }

  return sanitizeSingle({ body, allowed, forbidden });
}

/** ------------------------------------------------------------
 * Sanitize one update object
 * ------------------------------------------------------------ */
function sanitizeSingle({ body, allowed, forbidden }) {
  const clone = JSON.parse(JSON.stringify(body || {})); // safe deep copy
  const sanitized = sanitizeRecursive(clone, allowed, forbidden);
  return cleanEmptyStrings(sanitized);
}

function sanitizeRecursive(obj, allowed, forbidden, prefix = "") {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    // 1) Explicitly forbidden check
    const isForbidden = forbidden.some(deny =>
      fullPath === deny || fullPath.startsWith(deny + ".") || deny === "*"
    );
    if (isForbidden) continue;

    // 2) Allowed check
    const isWildcard = allowed.includes("*");
    const isExactOrChildAllowed = isWildcard || allowed.some(allow =>
      fullPath === allow || fullPath.startsWith(allow + ".")
    );
    const hasAllowedDescendants = !isWildcard && allowed.some(allow =>
      allow.startsWith(fullPath + ".")
    );

    if (isExactOrChildAllowed) {
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        result[key] = sanitizeRecursive(value, allowed, forbidden, fullPath);
      } else {
        result[key] = value;
      }
    } else if (hasAllowedDescendants && value !== null && typeof value === "object" && !Array.isArray(value)) {
      const nested = sanitizeRecursive(value, allowed, forbidden, fullPath);
      if (nested && Object.keys(nested).length > 0) {
        result[key] = nested;
      }
    }
  }

  return result;
}

function cleanEmptyStrings(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanEmptyStrings(item));
  }
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === "") {
      obj[key] = null;
    } else if (val !== null && typeof val === "object") {
      cleanEmptyStrings(val);
    }
  }
  return obj;
}
