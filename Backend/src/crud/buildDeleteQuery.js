// src/crud/buildDeleteQuery.js
import { getModel } from "../utils/appRegistry.js";
import { getAllServices } from "../utils/servicesCache.js";
import { getPolicy } from "../utils/cache.js";
import { pathToFileURL } from "url";
import runRegistry from "../utils/policy/registryExecutor.js";
import {saveAuditLog } from "../utils/auditLogger.js"
import { cachedImport } from "../utils/importCache.js";

export default async function buildDeleteQuery(ctx) {
  let {
    modelName,
    docId,
    filter = {},
    policy,
    user
  } = ctx;

  const role = user?.role;
  const userId = user?.id;

  const Model = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel(modelName) : getModel(modelName);
  if (!Model) throw new Error(`Invalid model: ${modelName}`);

  /** -----------------------------------------------
   * 1) DELETE PERMISSION CHECK
   * ----------------------------------------------- */
  if (!policy?.permissions?.delete) {
    throw new Error(`⛔ Role "${role}" has no DELETE permission on "${modelName}"`);
  }

  /** -----------------------------------------------
   * 2) Registry (must ALSO allow delete — rule #3)
   * ----------------------------------------------- */
  const registryOutput = await runRegistry({
    role,
    userId,
    modelName,
    action: "delete",
    policy,
    existingFilter: filter   // registry merges security + query filter internally
  });

  // registry returns already-merged filter — use it directly
  if (registryOutput?.filter) filter = registryOutput.filter;

  /** -----------------------------------------------
   * 3) Lifecycle service loading
   * ----------------------------------------------- */
  const serviceCache = getAllServices();
  const modelService = serviceCache?.[modelName];
  let serviceInstance = null;

  if (modelService) {
    const fileUrl = pathToFileURL(modelService).href;
    const serviceModule = await cachedImport(fileUrl);
    serviceInstance = serviceModule.default?.();
  }

  const beforeDelete = serviceInstance?.beforeDelete;
  const afterDelete  = serviceInstance?.afterDelete;

  /** -----------------------------------------------
   * 4) BEFORE DELETE lifecycle hook
   * ----------------------------------------------- */
  if (typeof beforeDelete === "function") {
    await beforeDelete(ctx);
  }

  const beforeDoc = await Model.findById(docId).lean();

  /** -----------------------------------------------
   * 5) DELETE OPERATION (SOFT OR HARD)
   * ----------------------------------------------- */
  const hasSoftDeleteField = 
    Model.schema.path('isDeleted') || 
    Model.schema.path('isActive') || 
    Model.schema.path('deleted');

  let deletedDoc;

  if (hasSoftDeleteField) {
    let updateQuery = {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: userId
    };

    if (Model.schema.path('isDeleted')) {
      updateQuery.isDeleted = true;
    }

    if (Model.schema.path('isActive')) {
      updateQuery.isActive = false;
    }

    if (docId) {
      deletedDoc = await Model.findByIdAndUpdate(
        docId,
        { $set: updateQuery },
        { new: true }
      );
    } else {
      deletedDoc = await Model.findOneAndUpdate(
        filter,
        { $set: updateQuery },
        { new: true }
      );
    }
  } else {
    if (docId) {
      deletedDoc = await Model.findByIdAndDelete(docId);
    } else {
      deletedDoc = await Model.findOneAndDelete(filter);
    }
  }

  if (!deletedDoc) throw new Error(`${modelName} not found for delete`);

  /** -----------------------------------------------
   * 6) AFTER DELETE lifecycle hook
   * ----------------------------------------------- */
  if (typeof afterDelete === "function") {
    ctx.deletedDoc = deletedDoc;
    ctx.docId = deletedDoc._id;
    await afterDelete(ctx);
  }

  await saveAuditLog({
    action: "delete",
    modelName,
    userId,
    role,
    docId: deletedDoc._id,
    beforeDoc,
    afterDoc: deletedDoc,
    ip: null
  });

  return deletedDoc;
}
