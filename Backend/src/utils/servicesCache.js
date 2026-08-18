// utils/servicesCache.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CANONICAL_MODEL_NAMES, getCanonicalModelName } from "../models/canonicalModelMap.js";

let servicesCache = {};
let lastUpdated = null;
const SERVICES_DIR = fileURLToPath(new URL("../services", import.meta.url));
const CACHE_REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes

function resolveCanonical(name) {
  if (!name) return null;
  const direct = getCanonicalModelName(name);
  if (direct) return direct;
  if (name.endsWith("s")) {
    const sing = getCanonicalModelName(name.slice(0, -1));
    if (sing) return sing;
  } else {
    const plur = getCanonicalModelName(`${name}s`);
    if (plur) return plur;
  }
  return null;
}

/**
 * Load all service files dynamically into cache with canonical alias resolution
 */
function loadServices() {
  const cache = {};
  if (!fs.existsSync(SERVICES_DIR)) {
    return cache;
  }

  const files = fs.readdirSync(SERVICES_DIR).filter((f) => f.endsWith(".js"));
  for (const file of files) {
    const rawName = path.basename(file, ".js");
    const filePath = path.join(SERVICES_DIR, file);

    cache[rawName] = filePath;
    cache[rawName.toLowerCase()] = filePath;

    const stripped = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
    cache[stripped] = filePath;

    const canonical = resolveCanonical(rawName) || resolveCanonical(stripped);
    if (canonical) {
      cache[canonical] = filePath;
      cache[canonical.toLowerCase()] = filePath;
    }
  }

  // Map all known canonical aliases from registry
  if (CANONICAL_MODEL_NAMES) {
    for (const [alias, canonical] of Object.entries(CANONICAL_MODEL_NAMES)) {
      const strippedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetPath =
        cache[canonical] ||
        cache[alias] ||
        cache[strippedAlias] ||
        (strippedAlias.endsWith("s") ? cache[strippedAlias.slice(0, -1)] : cache[`${strippedAlias}s`]);

      if (targetPath) {
        cache[alias] = targetPath;
        cache[alias.toLowerCase()] = targetPath;
        cache[strippedAlias] = targetPath;
        cache[canonical] = targetPath;
        cache[canonical.toLowerCase()] = targetPath;
      }
    }
  }

  lastUpdated = Date.now();
  servicesCache = cache;
}

/**
 * Get service file path by model name with deep canonical fallback
 * @param {string} modelName
 * @returns {string|null} service file path
 */
export function getService(modelName) {
  if (!modelName) return null;
  // Auto-refresh if older than interval
  if (!lastUpdated || Date.now() - lastUpdated > CACHE_REFRESH_INTERVAL) {
    loadServices();
  }

  if (servicesCache[modelName]) return servicesCache[modelName];

  const canonical = resolveCanonical(modelName);
  if (canonical && servicesCache[canonical]) return servicesCache[canonical];

  const stripped = String(modelName).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (servicesCache[stripped]) return servicesCache[stripped];

  if (stripped.endsWith("s") && servicesCache[stripped.slice(0, -1)]) {
    return servicesCache[stripped.slice(0, -1)];
  }
  if (!stripped.endsWith("s") && servicesCache[`${stripped}s`]) {
    return servicesCache[`${stripped}s`];
  }

  const lower = String(modelName).toLowerCase();
  if (servicesCache[lower]) return servicesCache[lower];

  return null;
}

/**
 * Force refresh services cache manually
 */
export function refreshServicesCache() {
  loadServices();
}

/**
 * Returns proxy for service cache so dynamic property access also runs canonical lookup
 */
export function getAllServices() {
  if (!lastUpdated || Date.now() - lastUpdated > CACHE_REFRESH_INTERVAL) {
    loadServices();
  }
  return new Proxy(servicesCache, {
    get(target, prop) {
      if (typeof prop !== "string") return target[prop];
      if (prop in target) return target[prop];
      return getService(prop);
    }
  });
}

// Initial load
loadServices();

// Background auto-refresh
setInterval(loadServices, CACHE_REFRESH_INTERVAL);
