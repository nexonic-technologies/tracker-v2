import mongoose from "mongoose";
import { setCache, getPolicy, getRoleMeta } from "../cache.js";
import { getService } from "../servicesCache.js";
import { getModel } from "../appRegistry.js";
import { getTenantStore } from "../../tenant/tenantContext.js";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

// Remove immediate cache initialization
// setCache(); // This will be called from index.js after DB connection

/**
 * Resolve effective policy for a user/role on a target model.
 * Single Source of Truth for policy and permission resolution.
 */
export async function resolvePolicy(ctx, targetModelName) {
  const { user, tenantContext: customTenantContext } = ctx;
  let tenantContext = customTenantContext || ctx.tenantContext || getTenantStore();
  const role = user?.role || ctx.role;

  if (!role || !targetModelName) return null;

  const roleIdOrName = typeof role === 'object' ? (role._id || role.id || role.name || '') : role;
  let roleMeta = getRoleMeta(roleIdOrName) || getRoleMeta(role);

  if (!roleMeta && tenantContext && typeof tenantContext.getModel === 'function') {
    try {
      const RoleModel = tenantContext.getModel('roles');
      if (RoleModel) {
        const isObjId = mongoose.Types.ObjectId.isValid(roleIdOrName);
        const roleDoc = await RoleModel.findOne({
          $or: [
            ...(isObjId ? [{ _id: roleIdOrName }] : []),
            { name: roleIdOrName }
          ]
        }).lean();
        if (roleDoc) {
          roleMeta = {
            id: roleDoc._id?.toString(),
            name: roleDoc.name,
            isSuperAdmin: !!roleDoc.isSuperAdmin,
            level: roleDoc.level || 1
          };
        }
      }
    } catch (_) {}
  }

  const isSuperAdmin = !!user?.isSuperAdmin ||
    !!roleMeta?.isSuperAdmin ||
    !!ctx.policy?.isSuperAdmin ||
    (typeof role === 'object' && !!role?.isSuperAdmin);

  const isAdmin = isSuperAdmin ||
    !!roleMeta?.isAdmin ||
    roleMeta?.level === 1;

  if (isAdmin) {
    return {
      role: roleMeta?.id || roleIdOrName || role,
      modelName: targetModelName,
      permissions: { read: true, create: true, update: true, delete: true, report: true },
      forbiddenAccess: { read: [], create: [], update: [], delete: [] },
      allowAccess: { read: ["*"], create: ["*"], update: ["*"], delete: ["*"] },
      conditions: {},
      isSuperAdmin: true
    };
  }

  let policy = tenantContext?.policyOverrides?.[role]?.[targetModelName] ||
    tenantContext?.policyOverrides?.[role]?.[targetModelName.toLowerCase()] ||
    getPolicy(role, targetModelName);

  if (!policy && ['notifications', 'notification_preferences', 'notificationreceptionist', 'notificationrules', 'notification_deliveries', 'session', 'auditlog', 'dashboard_schemas', 'dashboard_widgets'].includes(targetModelName.toLowerCase())) {
    return {
      role,
      modelName: targetModelName,
      permissions: { read: true, create: true, update: true, delete: false, report: true },
      forbiddenAccess: { read: [], create: [], update: [], delete: [] },
      allowAccess: { read: ["*"], create: ["*"], update: ["*"], delete: [] },
      conditions: {}
    };
  }

  if (role === 'guest' || role === 'GuestCandidate') {
    if (targetModelName === 'job_openings') {
      return {
        role,
        modelName: targetModelName,
        permissions: { read: true, create: false, update: false, delete: false },
        forbiddenAccess: { read: [], create: [], update: [], delete: [] },
        allowAccess: { read: ["*"], create: [], update: [], delete: [] },
        conditions: {}
      };
    } else if (targetModelName === 'candidates') {
      return {
        role,
        modelName: targetModelName,
        permissions: { read: true, create: true, update: true, delete: false },
        forbiddenAccess: { read: [], create: [], update: [], delete: [] },
        allowAccess: { read: ["*"], create: ["*"], update: ["*"], delete: [] },
        conditions: {}
      };
    }
  }

  return policy || null;
}

export async function buildQuery(ctx) {
  const {
    action: rawAction,
    modelName,
    docId,
    fields,
    body,
    filter,
    populateFields,
    returnFilter = false, // New flag for returning just the filter
    user
  } = ctx;

  let tenantContext = ctx.tenantContext || getTenantStore();
  if (!tenantContext) {
    throw new Error(`TenantContextRequiredError: Tenant context is required for buildQuery execution on model "${modelName}"`);
  }
  ctx.tenantContext = tenantContext;

  let role = user?.role || ctx.role;
  const userId = user?.id || ctx.userId;

  // Normalize action aliases so "list" → "read", "statistics" → "report", etc.
  const PERMISSION_ALIASES = { list: 'read', statistics: 'report' };
  const action = PERMISSION_ALIASES[rawAction] || rawAction;

  if (!role || !modelName) throw new Error(`Role and modelName are required (role=${role}, modelName=${modelName})`);

  const Model = typeof tenantContext.getModel === 'function' ? tenantContext.getModel(modelName) : getModel(modelName);
  if (!Model) throw new Error(`Model "${modelName}" not found in active tenant context`);

  // Load model-specific policy via Single Source of Truth
  const policy = await resolvePolicy(ctx, modelName);

  // STRICT MODE: Fail Closed & Strict Rejection Setup
  if (!policy) {
    const err = new Error(`⛔ CRITICAL SECURITY: No policy defined for role '${role}' on model '${modelName}'. Request strictly rejected.`);
    err.status = 403;
    err.code = 'POLICY_NOT_FOUND';
    throw err;
  }

  if (policy.permissions && policy.permissions[action] === false) {
    const err = new Error(`⛔ ACCESS DENIED: Role '${role}' does not have '${action.toUpperCase()}' permission on model '${modelName}'. Request strictly rejected.`);
    err.status = 403;
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const safeFilter = filter;
  const safeFields = fields;
  const safeBody = body;

  // If only filter is requested, return it
  if (returnFilter) {
    return safeFilter;
  }
  // --------------------------------------------------
  //  2️⃣ IMPORT THE CORRECT CRUD HANDLER
  // --------------------------------------------------
  const crudFile = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    `../../crud/build${capitalize(action)}Query.js`
  );
  let crudHandler;
  try {
    crudHandler = (await import(pathToFileURL(crudFile).href)).default;
  } catch (err) {
    console.error(`[policyEngine] Failed to import CRUD handler from ${crudFile}:`, err);
    throw new Error(`❌ CRUD handler not found: ${crudFile}`);
  }

  // --------------------------------------------------
  //  3️⃣ EXECUTE CRUD WITH SAFE DATA ONLY
  // --------------------------------------------------
  ctx.fields = safeFields;
  ctx.body = safeBody;
  ctx.filter = safeFilter;
  ctx.policy = policy;

  return await crudHandler(ctx);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
