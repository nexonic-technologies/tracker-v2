/**
 * Canonical Model Name Registry
 * Standardizes model aliases and casing across the entire application to guarantee
 * consistent lookup in tenantContext.getModel() and policy Engine.
 */

import { CANONICAL_MODEL_NAMES, getCanonicalModelName } from './canonicalMapDefinitions.js';

export { CANONICAL_MODEL_NAMES, getCanonicalModelName };
export default CANONICAL_MODEL_NAMES;
