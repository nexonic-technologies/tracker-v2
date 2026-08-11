// src/crud/buildReadQuery.js
import { getModel } from "../utils/appRegistry.js";
import { getAllServices } from "../utils/servicesCache.js";
import { getPolicy, getRoleMeta } from "../utils/cache.js";
import { pathToFileURL } from "url";
import { buildMongoFilter } from "../utils/mongoFilterCompiler.js";
import queryOptimizer from "../utils/queryOptimizer.js";
import { cachedImport } from "../utils/importCache.js";

import runRegistry from "../utils/registryExecutor.js";
import sanitizeRead from "../utils/sanitizeRead.js";
import sanitizePopulated from "../utils/sanitizePopulated.js";
import safeAggregate from "../utils/safeAggregator.js";
import mongoose from "mongoose";

export default async function buildReadQuery(ctx) {
  let {
    modelName,
    docId,
    filter,
    fields,
    populateFields,
    policy,
    user
  } = ctx;

  const role = user?.role;
  const userId = user?.id;

  const Model = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel(modelName) : getModel(modelName);
  if (!Model) throw new Error(`Model "${modelName}" not found`);

  const cacheKey = queryOptimizer.getCacheKey(modelName, { docId, filter, role, userId }, { fields, populateFields });
  const cachedData = queryOptimizer.getCache(cacheKey);
  if (cachedData !== null) {
    return cachedData;
  }

  /** -----------------------------------------------
   * 1) CRUD READ PERMISSION
   * ----------------------------------------------- */
  if (!policy?.permissions?.read) {
    throw new Error(`Role "${role}" has no READ permission on model "${modelName}"`);
  }

  /** -----------------------------------------------
   * 2) Field sanitization (allowed + forbidden)
   * ----------------------------------------------- */
  if (fields) {
    fields = sanitizeRead({ fields, policy }); // returns an array like ["basicInfo.firstName"]
  }

  /** -----------------------------------------------
   * 3) Registry execution (populateRef, isSelf, custom)
   * ----------------------------------------------- */
  const registryOutput = await runRegistry({
    role,
    userId,
    modelName,
    action: "read",
    policy,
    existingFilter: filter   // registry merges security + query filter internally
  });

  // registry may add field restrictions
  fields = registryOutput?.fields ?? fields;
  // registry returns already-merged filter — use it directly
  if (registryOutput?.filter) filter = registryOutput.filter;


  /** -----------------------------------------------
   * 4) beforeRead hook (service)
   * ----------------------------------------------- */
  const serviceCache = getAllServices();
  const modelService = serviceCache?.[modelName];
  let serviceInstance = null;

  if (modelService) {
    const fileUrl = pathToFileURL(modelService).href;
    const serviceModule = await cachedImport(fileUrl);
    serviceInstance = serviceModule.default?.();

    if (typeof serviceInstance?.beforeRead === "function") {
      const hook = await serviceInstance.beforeRead(ctx);
      if (hook?.filter) {
        filter = hook.filter;
        ctx.filter = hook.filter;
      }
      if (hook?.fields) {
        fields = hook.fields;
        ctx.fields = hook.fields;
      }
    }
  }

  /** ============================================================
   *  🔥 5) AGGREGATE READ — With `$lookup` policy enforcement
   * ============================================================ */
  if (filter?.aggregate === true && Array.isArray(filter.stages)) {
    // Enforce permission for every $lookup
    for (const stage of filter.stages) {
      if (stage.$lookup?.from) {
        const targetModel = Object.keys(mongoose.models).find(
          m => mongoose.models[m].collection.collectionName === stage.$lookup.from
        );

        if (!targetModel) continue; // lookup alias, skip

        const targetPolicy = getPolicy(role, targetModel);
        if (!targetPolicy || !targetPolicy.permissions?.read) {
          throw new Error(
            `❌ Role "${role}" is NOT allowed to READ $lookup model "${targetModel}" inside aggregate`
          );
        }
      }
    }

    const matchStage = docId && docId.trim() && docId !== "" && mongoose.Types.ObjectId.isValid(docId)
      ? [{ $match: { _id: new mongoose.Types.ObjectId(docId) } }]
      : filter.matchStage
        ? [{ $match: filter.matchStage }]
        : [];

    const pipeline = [
      ...matchStage,
      ...filter.stages,
      ...(filter.project ? [{ $project: filter.project }] : [])
    ];

    let result = await safeAggregate(Model, pipeline);

    if (serviceInstance?.afterRead) {
      ctx.data = result;
      result = await serviceInstance.afterRead(ctx);
    }

    queryOptimizer.setCache(cacheKey, result);
    return result;
  }

  /** -----------------------------------------------
   * 6) STANDARD READ QUERY
   * ----------------------------------------------- */


  const mongoFilter = buildMongoFilter(filter) || {};

  // Auto-normalize role name in query filter to ObjectId if schema field expects ObjectId
  if (mongoFilter.role && typeof mongoFilter.role === 'string' && !/^[0-9a-fA-F]{24}$/.test(mongoFilter.role)) {
    const rolePath = Model.schema.path('role');
    if (rolePath && (rolePath.instance === 'ObjectID' || rolePath.instance === 'ObjectId' || rolePath.options?.ref === 'roles')) {
      const meta = getRoleMeta(mongoFilter.role);
      if (meta && meta.id) {
        mongoFilter.role = meta.id;
      }
    }
  }

  const hasIsActive = !!Model.schema.path('isActive');
  const hasIsDeleted = !!Model.schema.path('isDeleted');

  // When registry merges produce a $and filter, inject soft-delete guards at the top level
  // so MongoDB can still use compound indexes
  const isAndFilter = Array.isArray(mongoFilter.$and);

  if (hasIsDeleted) {
    const alreadyHasIsDeleted = isAndFilter
      ? mongoFilter.$and.some(f => f.isDeleted !== undefined)
      : mongoFilter.isDeleted !== undefined;
    if (!alreadyHasIsDeleted) {
      if (isAndFilter) {
        mongoFilter.$and.push({ isDeleted: { $ne: true } });
      } else {
        mongoFilter.isDeleted = { $ne: true };
      }
    }
  }

  if (hasIsActive) {
    const alreadyHasIsActive = isAndFilter
      ? mongoFilter.$and.some(f => f.isActive !== undefined)
      : mongoFilter.isActive !== undefined;
    if (!alreadyHasIsActive) {
      if (isAndFilter) {
        mongoFilter.$and.push({ isActive: { $ne: false } });
      } else {
        mongoFilter.isActive = { $ne: false };
      }
    }
  }

  let query = docId && docId.trim() && docId !== "" && mongoose.Types.ObjectId.isValid(docId)
    ? Model.findOne({ _id: new mongoose.Types.ObjectId(docId), ...mongoFilter })
    : Model.find(mongoFilter);

  if (fields && fields.length > 0) {
    query = query.select(fields.join(' '));
  }

  // 🛡️ UNIVERSAL POPULATE: Flat populate approach
  // Avoids "Path collision" errors caused by trying to .populate() nested subdocument
  // parents (e.g., professionalInfo) which are NOT refs.
  // Instead, each dot-notation path is populated directly (e.g., 'professionalInfo.designation').
  if (populateFields && typeof populateFields === 'object') {
    const populateOptions = [];

    for (const [fullPath, selectFields] of Object.entries(populateFields)) {
      if (!selectFields) continue;

      // Resolve the schema path to check if it's actually a ref
      let actualSchemaPath = null;
      let targetModelName = null;
      let isRef = false;

      if (Model) {
        actualSchemaPath = Model.schema.path(fullPath)
          || Model.schema.path(`${fullPath}.$`)
          || Model.schema.virtualpath?.(fullPath);

        if (actualSchemaPath) {
          targetModelName = actualSchemaPath.options?.ref
            || actualSchemaPath.caster?.options?.ref;
          const hasRefPath = !!(actualSchemaPath.options?.refPath
            || actualSchemaPath.caster?.options?.refPath);
          const isObjectId = actualSchemaPath.instance === 'ObjectID'
            || actualSchemaPath.instance === 'ObjectId';
          isRef = !!targetModelName || hasRefPath || isObjectId;
        } else {
          // Path not found in schema — could be a virtual or dynamic.
          // Only treat as ref if it's a single-segment path (top-level).
          // Multi-segment paths with missing schema entries are nested
          // subdocument parents (e.g., 'professionalInfo') — skip them.
          isRef = !fullPath.includes('.') || false;
        }
      }

      if (!isRef) continue; // skip non-ref paths (nested object parents)

      const option = { path: fullPath };
      let shouldPopulate = true;

      if (selectFields) {
        let finalSelect = String(selectFields).replace(/,/g, ' ');

        // Sanitize populate selection if targetModelName is known
        if (targetModelName && role) {
          const targetPolicy = getPolicy(role, targetModelName);
          if (targetPolicy) {
            if (!targetPolicy.permissions?.read) {
              shouldPopulate = false;
            } else {
              const safeSelect = sanitizeRead({ fields: finalSelect, policy: targetPolicy });
              if (safeSelect.length === 0) {
                shouldPopulate = false;
              } else {
                finalSelect = safeSelect.join(' ');
              }
            }
          }
        }
        if (shouldPopulate) {
          option.select = finalSelect;
        }
      }

      if (shouldPopulate) {
        populateOptions.push(option);
      }
    }

    if (populateOptions.length > 0) {
      query = query.populate(populateOptions);
    }
  }

  // ❗ populate first, then lean
  let result = await query.lean();

  if (docId && result) result = [result]; // unify with list format for sanitization

  /** -----------------------------------------------
   * 7) Populate sanitization (populateRef mode)
   * ----------------------------------------------- */
  if (registryOutput?.isPopulationContext) {
    result = sanitizePopulated({
      results: result,
      allowedFields: registryOutput.allowedPopulateFields,
      modelName
    });
  }

  /** -----------------------------------------------
   * 8) afterRead hook
   * ----------------------------------------------- */
  if (serviceInstance?.afterRead) {
    ctx.data = result;
    result = await serviceInstance.afterRead(ctx);
  }

  const finalResult = docId ? result?.[0] : result;
  queryOptimizer.setCache(cacheKey, finalResult);
  return finalResult;
}
