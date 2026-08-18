// src/crud/buildUpdateQuery.js
import { getModel } from "../utils/appRegistry.js";
import { getService } from "../utils/servicesCache.js";
import { pathToFileURL } from "url";
import sanitizeUpdate from "../utils/sanitizeUpdate.js";
import runRegistry from "../utils/policy/registryExecutor.js";
import { saveAuditLog } from "../utils/auditLogger.js";
import { cachedImport } from "../utils/importCache.js";

export default async function buildUpdateQuery(ctx) {
  let {
    modelName,
    docId,
    filter = {},
    body,
    policy,
    user
  } = ctx;

  const role = user?.role;
  const userId = user?.id;

  const Model = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel(modelName) : getModel(modelName);
  if (!Model) throw new Error(`Invalid model: ${modelName}`);

  /** -----------------------------------------------
   * 1) UPDATE PERMISSION CHECK
   * ----------------------------------------------- */
  if (!policy?.permissions?.update) {
    throw new Error(`⛔ Role "${role}" has no UPDATE permission on "${modelName}"`);
  }

  /** -----------------------------------------------
   * 2) CLEAN BODY (no unauthorized fields)
   * ----------------------------------------------- */
  body = sanitizeUpdate({ body, policy });
  ctx.body = body;

  /** -----------------------------------------------
   * 4) Registry (ABAC — isSelf, custom logic)
   * ----------------------------------------------- */
  const registryOutput = await runRegistry({
    role,
    userId,
    modelName,
    action: "update",
    policy,
    existingFilter: filter   // registry merges security + query filter internally
  });

  if (registryOutput?.body) body = registryOutput.body;
  // registry returns already-merged filter — use it directly
  if (registryOutput?.filter) filter = registryOutput.filter;

  /** -----------------------------------------------
   * 5) Lifecycle injection — BEFORE UPDATE
   * ----------------------------------------------- */
  const modelService = getService(modelName);
  let serviceInstance = null;

  if (modelService) {
    const fileUrl = pathToFileURL(modelService).href;
    const serviceModule = await cachedImport(fileUrl);
    serviceInstance = serviceModule.default?.();
  }

  const beforeUpdate = serviceInstance?.beforeUpdate;
  const afterUpdate = serviceInstance?.afterUpdate;

  const targetFilter = docId
    ? { _id: docId, ...(filter || {}) }
    : (filter || {});

  if (typeof beforeUpdate === "function") {
    const existingDoc = await Model.findOne(targetFilter).lean();
    ctx.existingDoc = existingDoc;
    const result = await beforeUpdate(ctx);
    if (result && typeof result === "object") {
      body = result;
      ctx.body = result;
    }
  }

  // BEFORE writing: keep snapshot for audit
  const beforeDoc = await Model.findOne(targetFilter).lean();


  /** -----------------------------------------------
   * 6) EXECUTE UPDATE — PARTIAL UPDATE (PATCH) SAFE
   * ----------------------------------------------- */
  let updatedDoc;
  const updateBody = flattenObject(body);

  if (Object.keys(updateBody).length === 0) {
    console.log(`[buildUpdateQuery] No fields modified for ${modelName}. Returning existing document.`);
    const cleanDoc = beforeDoc;
    if (typeof afterUpdate === "function") {
      ctx.data = cleanDoc;
      ctx.beforeDoc = beforeDoc;
      ctx.docId = beforeDoc?._id;
      await afterUpdate(ctx);
    }
    await saveAuditLog({
      action: "update",
      modelName,
      userId,
      role,
      docId: beforeDoc?._id,
      beforeDoc,
      afterDoc: cleanDoc,
    });
    return cleanDoc;
  }

  updatedDoc = await Model.findOneAndUpdate(targetFilter, { $set: updateBody }, {
    new: true,
    runValidators: true
  });

  if (!updatedDoc) throw new Error(`${modelName} not found`);

  // Convert before passing to afterUpdate + audit
  const cleanDoc = updatedDoc.toObject();


  /** -----------------------------------------------
   * 7) Lifecycle — AFTER UPDATE
   * ----------------------------------------------- */
  if (typeof afterUpdate === "function") {
    ctx.data = cleanDoc;
    ctx.beforeDoc = beforeDoc;
    ctx.docId = updatedDoc._id;
    await afterUpdate(ctx);
  }

  // Safe background domain event emission
  try {
    const { default: domainEventService } = await cachedImport("../utils/domainEventService.js");

    // Extract a minimal diff snapshot of fields that changed
    const beforeSnapshot = {};
    if (beforeDoc && cleanDoc) {
      for (const key in body) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          if (JSON.stringify(beforeDoc[key]) !== JSON.stringify(cleanDoc[key])) {
            beforeSnapshot[key] = beforeDoc[key];
          }
        }
      }
    }

    domainEventService.emit("update", {
      eventId: `update_${modelName}_${updatedDoc._id}_${Date.now()}`,
      modelName,
      modelId: updatedDoc._id,
      actorId: userId,
      beforeSnapshot
    });
  } catch (err) {
    console.error(`[DomainEvent] Failed to emit update event for ${modelName}:`, err.message);
  }

  await saveAuditLog({
    action: "update",
    modelName,
    userId,
    role,
    docId: updatedDoc._id,
    beforeDoc,
    afterDoc: cleanDoc,
  });

  return cleanDoc;
}

function isPlainObject(val) {
  if (!val || typeof val !== 'object') return false;
  if (Array.isArray(val) || val instanceof Date) return false;
  if (val.constructor?.name === 'ObjectID' || val.constructor?.name === 'ObjectId' || val._bsontype === 'ObjectID') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

function flattenObject(obj, prefix = '') {
  const flattened = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (isPlainObject(val)) {
        Object.assign(flattened, flattenObject(val, newKey));
      } else {
        flattened[newKey] = val;
      }
    }
  }
  return flattened;
}
