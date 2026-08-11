// Backend/src/utils/normalizeObjectId.js
import mongoose from 'mongoose';

/**
 * Normalizes input (single string, ObjectId, array of strings/ObjectIds, or stringified JSON)
 * into a clean, deduplicated array of valid ObjectId strings using native Mongoose validation.
 *
 * @param {any} val - Input to normalize
 * @returns {string[]} Array of valid 24-char ObjectId strings
 */
export function normalizeObjectIdArray(val) {
  if (!val) return [];

  let rawItems = [];
  if (Array.isArray(val)) {
    rawItems = val;
  } else if (typeof val === 'string') {
    const trimmed = val.trim();
    if (mongoose.Types.ObjectId.isValid(trimmed) && trimmed.length === 24) {
      return [trimmed];
    }
    try {
      const parsed = JSON.parse(trimmed);
      rawItems = Array.isArray(parsed) ? parsed : [trimmed];
    } catch (e) {
      rawItems = [trimmed];
    }
  } else if (typeof val === 'object' && val !== null) {
    rawItems = [val];
  }

  const validIds = [];
  rawItems.forEach(item => {
    if (!item) return;

    const idStr = (typeof item === 'object' && item._id)
      ? item._id.toString().trim()
      : item.toString().trim();

    if (mongoose.Types.ObjectId.isValid(idStr) && idStr.length === 24) {
      validIds.push(idStr);
    } else if (typeof item === 'string' && item.startsWith('[')) {
      try {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          parsed.forEach(sub => {
            if (!sub) return;
            const subStr = (typeof sub === 'object' && sub._id)
              ? sub._id.toString().trim()
              : sub.toString().trim();
            if (mongoose.Types.ObjectId.isValid(subStr) && subStr.length === 24) {
              validIds.push(subStr);
            }
          });
        }
      } catch (e) {}
    }
  });

  return Array.from(new Set(validIds));
}

/**
 * Validates and returns a single clean ObjectId string or null using native Mongoose validation.
 *
 * @param {any} val - Input ObjectId or string
 * @returns {string|null} Valid 24-char ObjectId string or null
 */
export function normalizeSingleObjectId(val) {
  if (!val) return null;
  const idStr = (typeof val === 'object' && val._id)
    ? val._id.toString().trim()
    : val.toString().trim();
  return (mongoose.Types.ObjectId.isValid(idStr) && idStr.length === 24) ? idStr : null;
}
