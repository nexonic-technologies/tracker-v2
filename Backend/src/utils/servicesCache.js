// utils/servicesCache.js
import fs from "fs";
import path from "path";


let servicesCache = {};
let lastUpdated = null;
const SERVICES_DIR = path.resolve("./src/services");
const CACHE_REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes

/**
 * Load all service files dynamically into cache
 */
function loadServices() {
  const cache = {};
  if (!fs.existsSync(SERVICES_DIR)){
    return cache;
  } 

  const files = fs.readdirSync(SERVICES_DIR).filter((f) => f.endsWith(".js"));
  for (const file of files) {
    const modelName = path.basename(file, ".js");
    cache[modelName] = path.join(SERVICES_DIR, file);
  }
  lastUpdated = Date.now();
  servicesCache = cache;
}

/**
 * Get service file path by model name
 * @param {string} modelName
 * @returns {string|null} service file path
 */
export function getService(modelName) {
  // Auto-refresh if older than interval
  if (!lastUpdated || Date.now() - lastUpdated > CACHE_REFRESH_INTERVAL) {
    loadServices();
  }
  return servicesCache[modelName] || null;
}

/**
 * Force refresh services cache manually
 */
export function refreshServicesCache() {
  loadServices();
}

export function getAllServices() {
  return { ...servicesCache };
}

// Initial load
loadServices();

// Optional: background auto-refresh every 20 mins
setInterval(loadServices, CACHE_REFRESH_INTERVAL);
