// src/crud/buildCreateQuery.js
import { getModel } from "../utils/appRegistry.js";
import { getAllServices } from "../utils/servicesCache.js";
import { getPolicy } from "../utils/cache.js";
import { pathToFileURL } from "url";
import sanitizeWrite from "../utils/sanitizeWrite.js";
import runRegistry from "../utils/policy/registryExecutor.js";
import { saveAuditLog } from "../utils/auditLogger.js";
import { cachedImport } from "../utils/importCache.js";

export default async function buildCreateQuery(ctx) {
  let {
    modelName,
    body,
    policy,
    user
  } = ctx;

  const role = user?.role;
  const userId = user?.id;

  const Model = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel(modelName) : getModel(modelName);
  if (!Model) throw new Error(`Model "${modelName}" not found`);

  /** -----------------------------------------------
   * 1) CREATE PERMISSION CHECK
   * ----------------------------------------------- */
  if (!policy?.permissions?.create) {
    throw new Error(`⛔ Role "${role}" has no CREATE permission on "${modelName}"`);
  }

  /** -----------------------------------------------
   * 2) Sanitize Write Body (remove forbidden fields)
   * ----------------------------------------------- */
  body = sanitizeWrite({ body, policy, action: "create" }); // applies allowAccess + forbiddenAccess
  ctx.body = body;

  /** -----------------------------------------------
   * 3) Registry rules (ABAC: isSelf, custom)
   * ----------------------------------------------- */
  const registryOutput = await runRegistry({
    role,
    userId,
    modelName,
    action: "create",
    policy
  });

  // registry override
  if (registryOutput?.body) {
    body = registryOutput.body;
    ctx.body = body;
  }

  /** -----------------------------------------------
   * 4) Service Logic (Lifecycle Hooks)
   * ----------------------------------------------- */
  const serviceCache = getAllServices();
  const modelService = serviceCache?.[modelName];
  let serviceInstance = null;

  if (modelService) {
    const fileUrl = pathToFileURL(modelService).href;
    const serviceModule = await cachedImport(fileUrl);
    serviceInstance = serviceModule.default?.();
  }

  const beforeCreate = serviceInstance?.beforeCreate;
  const afterCreate  = serviceInstance?.afterCreate;

  // beforeCreate may mutate and return new body
  if (typeof beforeCreate === "function") {
    const result = await beforeCreate(ctx);
    if (result && typeof result === "object") {
      body = result;
      ctx.body = result;
    }
  }

  /** -----------------------------------------------
   * 5) Create Record (Bulk or Single)
   * ----------------------------------------------- */
  let createdDocument;
  try {
    if (Array.isArray(body)) {
      createdDocument = await Model.insertMany(body);
    } else {
      const doc = new Model(body);
      createdDocument = await doc.save();
    }
  } catch (err) {
    if (err.code === 11000 && err.keyValue) {
      const existingDoc = await Model.findOne(err.keyValue).lean();
      if (existingDoc) {
        return existingDoc;
      }
    }
    throw err;
  }

  /** -----------------------------------------------
   * 6) afterCreate Lifecycle Hook
   * ----------------------------------------------- */
  if (typeof afterCreate === "function") {
    ctx.docId = Array.isArray(createdDocument)
      ? createdDocument.map(doc => doc._id.toString())
      : createdDocument._id.toString();
    await afterCreate(ctx);
  }

  // Safe background domain event emission
  try {
    const { default: domainEventService } = await cachedImport("../utils/domainEventService.js");
    const docsToEmit = Array.isArray(createdDocument) ? createdDocument : [createdDocument];
    for (const doc of docsToEmit) {
      if (doc && doc._id) {
        domainEventService.emit("create", {
          eventId: `create_${modelName}_${doc._id}_${Date.now()}`,
          modelName,
          modelId: doc._id,
          actorId: userId
        });
      }
    }
  } catch (err) {
    console.error(`[DomainEvent] Failed to emit create event for ${modelName}:`, err.message);
  }

  // Auto pipeline audit logging
  try {
    const docIdForAudit = Array.isArray(createdDocument)
      ? createdDocument[0]?._id
      : createdDocument?._id;
    await saveAuditLog({
      action: "create",
      modelName,
      userId,
      role,
      docId: docIdForAudit,
      beforeDoc: null,
      afterDoc: Array.isArray(createdDocument) ? createdDocument[0] : createdDocument
    });
  } catch (_) {}

  return createdDocument;
}
