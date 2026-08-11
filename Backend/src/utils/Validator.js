//  src/utils/validator.js

import { getRoleMeta } from "./cache.js";

/* ─────────────────────────────────────────────── */
/*     ⚡️ ROLE EXTRACTION HELPER                   */
/* ─────────────────────────────────────────────── */
function extractRoleInfo(r) {
  if (!r) return { id: "", name: "", isSuperAdmin: false };

  if (typeof r === "object") {
    const id = r._id ? String(r._id) : (r.id ? String(r.id) : "");
    const name = r.name || "";
    const meta = getRoleMeta(id || name) || {};
    return {
      id: meta.id || id,
      name: meta.name || name,
      isSuperAdmin: !!meta.isSuperAdmin || !!r.isSuperAdmin
    };
  }

  const str = String(r).trim();
  if (str === "agent") {
    const agentId = "6a25cbc1cd36294f5e578696";
    const meta = getRoleMeta(agentId) || {};
    return { id: agentId, name: meta.name || "Agent", isSuperAdmin: true };
  }

  const meta = getRoleMeta(str);
  if (meta) {
    return {
      id: meta.id,
      name: meta.name || "",
      isSuperAdmin: !!meta.isSuperAdmin
    };
  }

  const isName = /[a-zA-Z]/.test(str) && !/^[0-9a-fA-F]{24}$/.test(str);
  return {
    id: isName ? "" : str,
    name: isName ? str : "",
    isSuperAdmin: str === "6a25cbc1cd36294f5e578696"
  };
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ CONDITION RESOLUTION ENGINE             */
/* ─────────────────────────────────────────────── */
function resolveConditions({ conditions = [], context }) {
  for (const rule of conditions) {
    let matched = true;
    for (const key in rule) {
      if (["effect", "fields"].includes(key)) continue;
      if (key.startsWith("!")) {
        const prop = key.slice(1);
        if (context[prop] === true) matched = false;
      } else if (context[key] !== true) {
        matched = false;
      }
    }
    if (matched) return rule;
  }
  return null;
}

export function conditionsValidator({ policy, action, filter, fields, body, context }) {
  const conditions = policy.conditions?.[action];
  if (!conditions || !conditions.length) return { filter, fields, body };

  const matched = resolveConditions({ conditions, context });
  if (!matched) return { filter, fields, body };

  if (matched.effect === "deny") {
    throw new Error(`⛔ Access denied by conditional rule for ${action}`);
  }

  if (matched.effect === "allow") {
    if (matched.fields?.includes("*")) return { filter, fields, body };
    fields = matched.fields?.join(",") ?? fields;
  }

  return { filter, fields, body };
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ 2. FIELD SELECT VALIDATOR              */
/* ─────────────────────────────────────────────── */
export function fieldsValidator({ policy, action, modelName, fields }) {
  if (!fields) return fields;

  const allowed = policy.allowAccess?.[action] || [];
  const forbidden = policy.forbiddenAccess?.[action] || [];

  if (allowed.includes("*")) {
    return Array.isArray(fields)
      ? fields.filter((f) => !forbidden.includes(f))
      : fields;
  }

  if (Array.isArray(fields)) {
    return fields.filter((f) => allowed.includes(f) && !forbidden.includes(f));
  }

  return fields;
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ 3. BODY VALIDATOR (create/update)       */
/* ─────────────────────────────────────────────── */
export function bodyValidator({ policy, action, modelName, body }) {
  if (!body || typeof body !== "object") return body;

  const allowed = policy.allowAccess?.[action] || [];
  const forbidden = policy.forbiddenAccess?.[action] || [];

  const cleanBody = { ...body };
  forbidden.forEach((field) => {
    delete cleanBody[field];
  });

  if (allowed.includes("*") || !allowed.length) {
    return cleanBody;
  }

  const restrictedBody = {};
  allowed.forEach((field) => {
    if (cleanBody[field] !== undefined) {
      restrictedBody[field] = cleanBody[field];
    }
  });

  return restrictedBody;
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ 4. FILTER VALIDATOR (read query)        */
/* ─────────────────────────────────────────────── */
export function filterValidator({ policy, action, modelName, filter }) {
  if (!filter || typeof filter !== "object") return filter;
  const forbidden = policy.forbiddenAccess?.[action] || [];
  forbidden.forEach((field) => delete filter[field]);
  return filter;
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ 5. AGGREGATE (LOOKUP) VALIDATOR         */
/* ─────────────────────────────────────────────── */
export function aggregateValidator({ filter, role, action, modelName, getPolicy }) {
  if (!filter || typeof filter !== "object") return filter;
  Object.keys(filter).forEach((key) => {
    if (key === "$lookup") {
      const lookupModel = filter.$lookup?.from;
      if (lookupModel) {
        const targetPolicy = getPolicy ? getPolicy(role, lookupModel) : null;
        if (targetPolicy && targetPolicy.permissions?.[action] === false) {
          throw new Error(`⛔ Lookup forbidden: '${role}' cannot ${action} '${lookupModel}' via aggregation`);
        }
      }
    }
    if (Array.isArray(filter[key])) {
      filter[key].forEach((sub) => {
        if (typeof sub === "object") aggregateValidator({ filter: sub, role, action, modelName, getPolicy });
      });
    }
  });
  return filter;
}

/* ─────────────────────────────────────────────── */
/*     ⚡️ 6. MAIN VALIDATOR (default export)      */
/* ─────────────────────────────────────────────── */
export default function validator({ action, modelName, role, userId, docId, filter, fields, body, policy, getPolicy }) {
  const userRoleInfo = extractRoleInfo(role);

  if (userRoleInfo.isSuperAdmin) {
    return { filter: filter || {}, fields, body };
  }

  if (!policy) return { filter: filter || {}, fields, body };

  const policyRoleInfo = extractRoleInfo(policy.role);
  const matchesId = userRoleInfo.id && policyRoleInfo.id && userRoleInfo.id === policyRoleInfo.id;
  const matchesName = userRoleInfo.name && policyRoleInfo.name && userRoleInfo.name.toLowerCase() === policyRoleInfo.name.toLowerCase();
  const matchesRaw = String(policy.role) === String(role) || String(policy.role) === userRoleInfo.id;

  if (!matchesId && !matchesName && !matchesRaw) {
    throw new Error(`⛔ Role mismatch`);
  }

  if (policy.permissions?.[action] === false) {
    throw new Error(`⛔ '${role}' has no permission to ${action} '${modelName}'`);
  }

  const context = {
    isSelf: docId && String(docId) === String(userId),
    isLeave: body?.status === "Leave" || filter?.status === "Leave",
    isPopulate: !!fields,
    isSalary: fields?.includes("salary") || body?.salary != null,
    isTeamMember: false,
    isAssigned: false,
    isRecipient: false,
  };

  // 1️⃣ Conditional rules
  const condRes = conditionsValidator({
    policy,
    action,
    filter,
    fields,
    body,
    context,
  });
  filter = condRes.filter;
  fields = condRes.fields;
  body = condRes.body;

  // 2️⃣ Field select access
  fields = fieldsValidator({ policy, action, modelName, fields });

  // 3️⃣ Body access (create / update)
  if (["create", "update"].includes(action)) {
    body = bodyValidator({ policy, action, modelName, body });
  }

  // 4️⃣ Filter (query) field access
  filter = filterValidator({ policy, action, modelName, filter });

  // 5️⃣ Aggregation protection (lookup + projection)
  filter = aggregateValidator({ filter, role, action, modelName, getPolicy });

  return { filter, fields, body };
}
