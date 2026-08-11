// src/utils/registryExecutor.js
import { getRegistry } from "./policy/registry/index.js";

/**
 * Registry evaluator
 *
 * Runs all ABAC registry rules for the current action and returns a merged filter.
 * The security scoping filter (e.g. isSelf → { employee: userId }) is $and-merged
 * with the caller's existing query filter so that MongoDB can always use compound
 * indexes.  CRUD handlers must NOT do their own filter merge — they just use
 * registryOutput.filter directly.
 *
 * Return shape:
 * {
 *   fields,                   // field restriction override (or null)
 *   filter,                   // already-merged { $and: [securityFilter, existingFilter] }
 *   isPopulationContext,      // true when read is triggered by a populate
 *   allowedPopulateFields     // list of allowed fields for sanitizePopulated()
 * }
 */
export default async function runRegistry({
  role,
  userId,
  modelName,
  action,
  policy,
  existingFilter = null   // ← caller passes its current query filter
}) {
  const result = {
    fields: null,
    filter: null,
    isPopulationContext: false,
    allowedPopulateFields: null
  };

  const rules = policy?.conditions?.[action];
  if (!Array.isArray(rules) || rules.length === 0) return result;

  const securityFilters = [];

  // Process every condition entry
  for (const rule of rules) {
    if (!rule.registry) continue;

    const registryFn = getRegistry(rule.registry);
    if (typeof registryFn !== "function") continue; // ignore missing registry

    // Registry functions expect (user, record, context) parameters
    const user = { id: userId, role };
    const record = {}; // empty — list queries resolve via filter, not record
    const context = {
      role,
      userId,
      modelName,
      fields: rule.fields,
      effect: rule.effect,
      action
    };

    let outcome = null;
    try {
      outcome = await registryFn(user, record, context);
    } catch (error) {
      console.warn(`Registry ${rule.registry} failed:`, error.message);
      continue; // lenient skip if registry throws
    }

    // -------------------------------------------------------
    // populateRef: marks this as a population context only
    // -------------------------------------------------------
    if (rule.registry === "populateRef" && outcome === true) {
      result.isPopulationContext = true;
      if (Array.isArray(rule.fields) && rule.effect === "allow") {
        result.allowedPopulateFields = rule.fields;
      }
      continue;
    }

    // -------------------------------------------------------
    // Collect security filters + field overrides
    // -------------------------------------------------------
    if (outcome && typeof outcome === "object" && outcome.filter) {
      securityFilters.push(outcome.filter);
    }
    if (outcome && typeof outcome === "object" && outcome.fields) {
      result.fields = outcome.fields;
    }
  }

  // -------------------------------------------------------
  // Merge security filters among themselves ($or between
  // multiple registry rules, e.g. isSelf OR isManager)
  // -------------------------------------------------------
  if (securityFilters.length === 0) return result;

  const securityFilter =
    securityFilters.length === 1 ? securityFilters[0] : { $or: securityFilters };

  // -------------------------------------------------------
  // $and-merge with caller's existingFilter so MongoDB can
  // use compound indexes (e.g. { employee:1, date:-1 })
  // -------------------------------------------------------
  const hasExisting =
    existingFilter &&
    typeof existingFilter === "object" &&
    Object.keys(existingFilter).length > 0;

  result.filter = hasExisting
    ? { $and: [securityFilter, existingFilter] }
    : securityFilter;

  return result;
}
