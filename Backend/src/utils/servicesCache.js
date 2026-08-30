// utils/servicesCache.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import staticModelMap, { MODULE_DEFINITIONS } from "../models/tenantRegistry.js";

let servicesCache = {};
let lastUpdated = null;
const SERVICES_DIR = fileURLToPath(new URL("../services", import.meta.url));
const CACHE_REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes

/**
 * Normalizes any string to alphanumeric lowercase token for O(1) declarative matching.
 */
function normalizeKey(str) {
  return typeof str === 'string' ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

/**
 * Builds declarative service registry linking file paths directly to canonical model definitions.
 * Conforms strictly to Sacred Anti-Hardcoding Architecture.
 */
function loadServices() {
  const cache = {};
  if (!fs.existsSync(SERVICES_DIR)) {
    return cache;
  }

  // 1. Index all service files on disk by their raw and normalized names
  const files = fs.readdirSync(SERVICES_DIR).filter((f) => f.endsWith(".js"));
  const fileMap = new Map();

  for (const file of files) {
    const rawName = path.basename(file, ".js");
    const filePath = path.join(SERVICES_DIR, file);
    const cleanName = normalizeKey(rawName);

    fileMap.set(rawName, filePath);
    fileMap.set(rawName.toLowerCase(), filePath);
    fileMap.set(cleanName, filePath);

    cache[rawName] = filePath;
    cache[rawName.toLowerCase()] = filePath;
    cache[cleanName] = filePath;
  }

  // 2. Declaratively map all schema model definitions from the tenantRegistry single source of truth
  if (staticModelMap) {
    for (const [modelKey, modelRef] of Object.entries(staticModelMap)) {
      const cleanKey = normalizeKey(modelKey);
      const modelNameClean = modelRef?.modelName ? normalizeKey(modelRef.modelName) : '';

      // Direct file match
      const matchedPath = fileMap.get(cleanKey) ||
                          fileMap.get(modelNameClean) ||
                          fileMap.get(modelKey.toLowerCase());

      if (matchedPath) {
        cache[modelKey] = matchedPath;
        cache[modelKey.toLowerCase()] = matchedPath;
        cache[cleanKey] = matchedPath;
        if (modelRef?.modelName) {
          cache[modelRef.modelName] = matchedPath;
          cache[modelRef.modelName.toLowerCase()] = matchedPath;
          cache[modelNameClean] = matchedPath;
        }
      }
    }
  }

  // 3. Declaratively index module collection list aliases from MODULE_DEFINITIONS
  if (MODULE_DEFINITIONS) {
    for (const collectionList of Object.values(MODULE_DEFINITIONS)) {
      if (Array.isArray(collectionList)) {
        for (const col of collectionList) {
          const cleanCol = normalizeKey(col);
          const matchedPath = fileMap.get(cleanCol) || fileMap.get(col.toLowerCase());
          if (matchedPath) {
            cache[col] = matchedPath;
            cache[col.toLowerCase()] = matchedPath;
            cache[cleanCol] = matchedPath;
          }
        }
      }
    }
  }

  lastUpdated = Date.now();
  servicesCache = cache;
}

/**
 * Resolves service file path by model name through declarative registry lookup (O(1)).
 * @param {string} modelName
 * @returns {string|null} service file path
 */
export function getService(modelName) {
  if (!modelName) return null;
  if (!lastUpdated || Date.now() - lastUpdated > CACHE_REFRESH_INTERVAL) {
    loadServices();
  }

  const raw = String(modelName).trim();
  const lower = raw.toLowerCase();
  const clean = normalizeKey(raw);

  return servicesCache[raw] || servicesCache[lower] || servicesCache[clean] || null;
}

/**
 * Force refresh services cache manually
 */
export function refreshServicesCache() {
  loadServices();
}

/**
 * Returns proxy for service cache
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
