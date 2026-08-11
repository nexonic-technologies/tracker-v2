// src/utils/sanitizePopulated.js

/**
 * Keep only allowed fields for populated results.
 * Works on nested objects and arrays (deep prune).
 *
 * @param {Array<Object>} results - list of populated documents
 * @param {Array<string>} allowedFields - dot-notation field paths allowed for populateRef
 * @param {String} modelName - for debugging/logs (not used to restrict)
 */
export default function sanitizePopulated({ results, allowedFields, modelName }) {
  if (!Array.isArray(results) || !Array.isArray(allowedFields) || allowedFields.length === 0 || allowedFields.includes("*")) {
    return results;
  }

  return results.map(doc => {
    const sanitizedDoc = {};

    for (const fieldPath of allowedFields) {
      const value = readNested(doc, fieldPath);
      if (value !== undefined) {
        writeNested(sanitizedDoc, fieldPath, value);
      }
    }

    return sanitizedDoc;
  });
}

/** ------------------------------------------------------------
 * Read nested: from "a.b.c" → object.a.b.c (safe)
 * ------------------------------------------------------------ */
function readNested(obj, path) {
  const parts = path.split(".");
  let current = obj;
  for (const key of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[key];
  }
  return current;
}

/** ------------------------------------------------------------
 * Write nested: into "a.b.c" → creates intermediate levels
 * ------------------------------------------------------------ */
function writeNested(obj, path, value) {
  const parts = path.split(".");
  let current = obj;
  parts.forEach((key, index) => {
    if (index === parts.length - 1) {
      current[key] = value;
      return;
    }
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  });
}
