import models from "../models/Collection.js";

const AuditLog = models.audit_logs;

/**
 * @param {Object} params
 * {
 *   action: "update" | "delete",
 *   modelName,
 *   userId,
 *   role,
 *   docId,
 *   beforeDoc,
 *   afterDoc,
 *   ip,
 *   metadata
 * }
 */
export async function saveAuditLog({
  action,
  modelName,
  userId,
  role,
  docId,
  beforeDoc = {},
  afterDoc = {},
  ip = null,
  metadata = {}
}) {
  try {
    // Convert to plain objects to avoid circular references
    const before = toPlainObject(beforeDoc);
    const after = toPlainObject(afterDoc);

    return await AuditLog.create({
      model: modelName,
      docId: docId || null,
      action,
      userId: userId || null,
      role: role || 'system',
      ip,
      before,
      after,
      metadata
    });
  } catch (err) {
    console.error(`[AuditLogger] Failed to save audit log for ${modelName}:`, err.message);
  }
}

/** Convert Mongoose document to plain object */
function toPlainObject(doc) {
  if (!doc) return {};
  if (typeof doc.toObject === 'function') {
    return doc.toObject();
  }
  if (typeof doc.toJSON === 'function') {
    return doc.toJSON();
  }
  return doc;
}
