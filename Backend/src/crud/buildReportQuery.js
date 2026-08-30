// src/crud/buildReportQuery.js
import { getModel } from "../utils/appRegistry.js";
import { getService } from "../utils/servicesCache.js";
import { pathToFileURL } from "url";
import { cachedImport } from "../utils/importCache.js";
import runRegistry from "../utils/policy/registryExecutor.js";
import { DEFAULT_POPULATE_FIELDS } from "../Config/defaultPopulateFields.js";
import safeAggregate from "../utils/safeAggregator.js";

import { resolvePolicy } from "../utils/policy/policyEngine.js";

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

  policy = policy || await resolvePolicy(ctx, modelName);

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
  const modelService = getService(modelName);

  let serviceInstance = null;

  if (modelService) {
    const fileUrl = pathToFileURL(modelService).href;
    const serviceModule = await cachedImport(fileUrl);
    serviceInstance = serviceModule.default?.();

    if (typeof serviceInstance?.beforeReport === "function") {
      const hook = await serviceInstance.beforeReport(ctx);
      if (hook?.data !== undefined) return hook.data;
      if (hook?.filter) filter = hook.filter;
      if (hook?.pipeline) ctx.pipeline = hook.pipeline;
      if (hook?.fields) fields = hook.fields;
    }
  }

  /** -----------------------------------------------
   * 4) PIPELINE ASSEMBLY (CONNECTING FILTERS & STAGES)
   * ----------------------------------------------- */
  const pipeline = [];

  // Generic schema-driven filter normalization
  const baseMatch = normalizeReportFilter(filter, Model);
  pipeline.push({ $match: baseMatch });

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

  // Generic Schema-Driven Population (Driven by Request / Central Config, Zero Hardcoded Strings)
  if (Array.isArray(result) && result.length > 0 && typeof Model.populate === 'function' && Model.schema?.paths) {
    const populatePaths = [];

    // Parse request-provided populateFields if present
    let reqPopulate = {};
    if (typeof populateFields === 'object' && populateFields !== null) {
      reqPopulate = populateFields;
    } else if (typeof populateFields === 'string' && populateFields.trim()) {
      populateFields.split(',').forEach(item => {
        const [p, f] = item.split(':');
        if (p) reqPopulate[p.trim()] = f ? f.trim().replace(/,/g, ' ') : null;
      });
    }

    const defaultConfig = DEFAULT_POPULATE_FIELDS[modelName] || DEFAULT_POPULATE_FIELDS[modelName.toLowerCase()] || {};

    Object.entries(Model.schema.paths).forEach(([pathName, pathObj]) => {
      const ref = pathObj.options?.ref || pathObj.caster?.options?.ref;
      if (ref && !['_id', '__v'].includes(pathName)) {
        const userSelect = reqPopulate[pathName];
        const defaultSelect = defaultConfig[pathName];
        const selectFields = userSelect || defaultSelect || null;

        populatePaths.push({
          path: pathName,
          ...(selectFields ? { select: typeof selectFields === 'string' ? selectFields.replace(/,/g, ' ') : selectFields } : {})
        });
      }
    });

    if (populatePaths.length > 0) {
      try {
        result = await Model.populate(result, populatePaths);
      } catch (_) {}
    }
  }

  /** -----------------------------------------------
   * 6) SERVICE LIFECYCLE HOOK (afterReport)
   * ----------------------------------------------- */
  if (typeof serviceInstance?.afterReport === "function") {
    ctx.data = result;
    result = await serviceInstance.afterReport(ctx);
  }

  return result;
}

/**
 * Generic schema-driven filter sanitizer & alias resolver
 * Strips wildcard strings ('all', 'undefined', 'null', '') and resolves schema paths dynamically.
 */
function normalizeReportFilter(rawFilter, Model) {
  if (!rawFilter || typeof rawFilter !== 'object') return {};
  const cleaned = {};

  for (const [key, val] of Object.entries(rawFilter)) {
    if (val === 'all' || val === 'undefined' || val === 'null' || val === '' || val === null || val === undefined) {
      continue;
    }

    let targetKey = key;
    if (key === 'departmentId' && Model?.schema?.path('department')) {
      targetKey = 'department';
    } else if (key === 'employeeId' && Model?.schema?.path('employee')) {
      targetKey = 'employee';
    }

    cleaned[targetKey] = val;
  }

  return cleaned;
}
