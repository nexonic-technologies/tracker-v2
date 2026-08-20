import routes from "~react-pages";

/**
 * Dynamic Canonical Route Auto-Resolver
 * Automatically inspects live routes registered by `vite-plugin-pages` (~react-pages).
 * Zero hardcoded route dictionaries — automatically discovers and resolves new routes as pages are added.
 */

// Tokenizes strings into normalized singular root stems (e.g. "asset_allocations" -> ["asset", "allocation"])
function tokenize(str) {
  if (!str) return [];
  return str
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .map((t) => {
      if (t.endsWith("ies")) return t.slice(0, -3) + "y";
      if (t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
      return t;
    });
}

// Recursively flattens all routes registered in ~react-pages
function flattenRoutePaths(routeList, parent = "") {
  let paths = [];
  for (const r of routeList || []) {
    const full = [parent, r.path].filter(Boolean).join("/").replace(/\/+/g, "/");
    if (full) paths.push(full.replace(/^\//, ""));
    if (r.children && r.children.length > 0) {
      paths = paths.concat(flattenRoutePaths(r.children, full));
    }
  }
  return paths;
}

// Cache all active route paths once on initial import
const ALL_PAGE_ROUTES = flattenRoutePaths(routes).filter(
  (p) => !p.startsWith("[model]") && !p.startsWith("admin/[model]")
);

/**
 * Dynamically resolves the canonical route for any model name and ID by matching against registered Vite routes.
 * @param {string} modelName - The entity model name (e.g. 'leaves', 'tickets', 'operational_events', 'assets_allocations')
 * @param {string} id - The optional record ID
 * @returns {string|null} Canonical URL path
 */
export function getCanonicalPageRoute(modelName, id) {
  if (!modelName) return null;
  const modelTokens = tokenize(modelName);
  if (modelTokens.length === 0) return null;

  // 1. Highest Priority: Parameterized detail routes with ':id' matching model tokens
  const idRoutes = ALL_PAGE_ROUTES.filter((p) => p.includes("/:id") || p.endsWith("/:id"));
  for (const r of idRoutes) {
    const routeTokens = tokenize(r.replace(/:id/g, ""));
    const isExactTokenMatch =
      modelTokens.length > 0 &&
      modelTokens.every((mt) => routeTokens.includes(mt));

    if (isExactTokenMatch) {
      return id ? `/${r.replace(/:id/g, encodeURIComponent(id))}` : `/${r.replace(/\/:id/g, "")}`;
    }
  }

  // 2. Second Priority: Parameterized detail routes where route tokens match subset of model tokens
  for (const r of idRoutes) {
    const routeTokens = tokenize(r.replace(/:id/g, ""));
    const isSubsetMatch =
      routeTokens.length > 0 &&
      routeTokens.every((rt) => modelTokens.includes(rt));

    if (isSubsetMatch) {
      return id ? `/${r.replace(/:id/g, encodeURIComponent(id))}` : `/${r.replace(/\/:id/g, "")}`;
    }
  }

  // 3. Third Priority: Standard list / dashboard pages matching model tokens
  for (const r of ALL_PAGE_ROUTES) {
    if (r.includes(":") || r.includes("login") || r.includes("password") || r.includes("logout")) continue;
    const routeTokens = tokenize(r);
    const isMatch =
      modelTokens.length > 0 &&
      (modelTokens.every((mt) => routeTokens.includes(mt)) ||
        routeTokens.every((rt) => modelTokens.includes(rt)));

    if (isMatch) {
      return id ? `/${r}?id=${encodeURIComponent(id)}` : `/${r}`;
    }
  }

  // 4. Heuristic Fallback for operational/SLA events
  if (modelTokens.includes("operational") || modelTokens.includes("sla")) {
    return id ? `/attendance?slaEventId=${encodeURIComponent(id)}` : `/attendance`;
  }

  return null;
}
