// src/crud/buildReportQuery.js
import { getModel } from "../utils/appRegistry.js";
import { getAllServices } from "../utils/servicesCache.js";
import { getPolicy } from "../utils/cache.js";
import { pathToFileURL } from "url";
import { cachedImport } from "../utils/importCache.js";
import runRegistry from "../utils/registryExecutor.js";
import safeAggregate from "../utils/safeAggregator.js";

export default async function buildReportQuery(ctx) {
  let {
    modelName,
    filter = {},
    fields,
    populateFields,
    body = {},
    policy,
    user
  } = ctx;

  const role = user?.role;
  const userId = user?.id;

  const Model = ctx.tenantContext?.getModel ? ctx.tenantContext.getModel(modelName) : getModel(modelName);
  if (!Model) throw new Error(`Model "${modelName}" not found`);

  /** -----------------------------------------------
   * 1) CRUD PERMISSION CHECK
   * ----------------------------------------------- */
  if (!policy?.permissions?.read && !policy?.permissions?.report) {
    throw new Error(`Role "${role}" has no READ/REPORT permission on model "${modelName}"`);
  }

  /** -----------------------------------------------
   * 2) REGISTRY EXECUTION (SECURITY & ABAC FILTERS)
   * ----------------------------------------------- */
  const registryOutput = await runRegistry({
    role,
    userId,
    modelName,
    action: "read",
    policy,
    existingFilter: filter
  });

  if (registryOutput?.filter) filter = registryOutput.filter;
  if (registryOutput?.fields) fields = registryOutput.fields;

  /** -----------------------------------------------
   * 3) SERVICE DISCOVERY & beforeReport HOOK
   * ----------------------------------------------- */
  const serviceCache = getAllServices();
  const lowerName = modelName.toLowerCase();
  const modelService = serviceCache?.[modelName]
    || serviceCache?.[lowerName]
    || serviceCache?.[`${lowerName}s`]
    || (lowerName.endsWith('s') ? serviceCache?.[lowerName.slice(0, -1)] : null);

  let serviceInstance = null;

  if (modelService) {
    const fileUrl = pathToFileURL(modelService).href;
    const serviceModule = await cachedImport(fileUrl);
    serviceInstance = serviceModule.default?.();

    if (typeof serviceInstance?.beforeReport === "function") {
      const hook = await serviceInstance.beforeReport(ctx);
      if (hook?.filter) filter = hook.filter;
      if (hook?.pipeline) ctx.pipeline = hook.pipeline;
      if (hook?.fields) fields = hook.fields;
    }
  }

  /** -----------------------------------------------
   * 4) PIPELINE ASSEMBLY (CONNECTING FILTERS & STAGES)
   * ----------------------------------------------- */
  const pipeline = [];

  // Match stage (Security filter + Query filters)
  if (Object.keys(filter).length > 0) {
    pipeline.push({ $match: filter });
  }

  // Date range match stage
  if (body.dateRange || filter.dateRange) {
    const dr = body.dateRange || filter.dateRange;
    const { startDate, endDate, dateField = 'createdAt' } = dr;
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      pipeline.push({ $match: { [dateField]: dateFilter } });
    }
  }

  // Pipeline stages provided by service hook (ctx.pipeline) or input payload
  const givenStages = ctx.pipeline || filter.stages || body.stages;
  if (Array.isArray(givenStages) && givenStages.length > 0) {
    pipeline.push(...givenStages);
  }

  // Payload-driven GroupBy/Sum stages (if no explicit pipeline given)
  if (body.groupBy && (!givenStages || givenStages.length === 0)) {
    const groupStage = {
      _id: `$${body.groupBy}`,
      count: { $sum: 1 }
    };
    if (body.sum) {
      const sumFields = Array.isArray(body.sum) ? body.sum : [body.sum];
      sumFields.forEach(f => { groupStage[f] = { $sum: `$${f}` }; });
    }
    pipeline.push({ $group: groupStage });
    pipeline.push({ $sort: { count: -1 } });
  }

  // Sort, skip, limit
  if (body.sort) pipeline.push({ $sort: body.sort });
  if (body.skip) pipeline.push({ $skip: body.skip });
  if (body.limit) pipeline.push({ $limit: body.limit });

  /** -----------------------------------------------
   * 5) EXECUTE VIA safeAggregate (FINALIZES QUERY & EXECUTES)
   * ----------------------------------------------- */
  let result = await safeAggregate(Model, pipeline);

  /** -----------------------------------------------
   * 6) SERVICE LIFECYCLE HOOK (afterReport)
   * ----------------------------------------------- */
  if (typeof serviceInstance?.afterReport === "function") {
    ctx.data = result;
    result = await serviceInstance.afterReport(ctx);
  }

  return result;
}