// src/utils/sanitizeUpdate.js
//
// Sanitizes update body BEFORE writing to DB.
// Strategy: Same engine as sanitizeWrite, but for update action.
// Danger prevented: updating sensitive fields injected by client.
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

  // 1) Remove forbidden fields
  for (const key of Object.keys(clone)) {
    if (forbidden.some(deny => matchNested(key, deny))) {
      delete clone[key];
      continue;
    }
  }

  // 2) Apply allow list if no wildcard
  if (!allowed.includes("*")) {
    for (const key of Object.keys(clone)) {
      if (!allowed.some(allow => matchNested(key, allow))) {
        delete clone[key];
      }
    }
  }

  // 3) Normalize empty strings to null (prevents Mongoose BSON CastError on optional ObjectIds/Dates)
  return cleanEmptyStrings(clone);
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


/** ------------------------------------------------------------
 * Dot-notation matcher (nested support)
 *
 * field: "authInfo.email"
 * rule : "authInfo"          -> block / allow both
 * rule : "authInfo.email"    -> exact match
 * ------------------------------------------------------------ */
function matchNested(field, rule) {
  if (field === rule) return true;
  if (field.startsWith(rule + ".")) return true;
  if (rule.startsWith(field + ".")) return true;
  return false;
}
