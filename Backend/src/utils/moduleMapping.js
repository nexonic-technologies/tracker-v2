// src/utils/moduleMapping.js
import { MODULE_DEFINITIONS } from '../models/tenantRegistry.js';

// Dynamically build reverse index: collection/model -> moduleKey from MODULE_DEFINITIONS
const MODEL_TO_MODULE = new Map();
for (const [modKey, collections] of Object.entries(MODULE_DEFINITIONS)) {
  if (Array.isArray(collections)) {
    for (const col of collections) {
      const normalized = col.toLowerCase();
      MODEL_TO_MODULE.set(normalized, modKey.toLowerCase());
      
      const kebab = normalized.replace(/_/g, '-');
      MODEL_TO_MODULE.set(kebab, modKey.toLowerCase());

      // Morphological policy/policies mapping
      if (normalized.endsWith('_policy')) {
        MODEL_TO_MODULE.set(normalized.replace(/_policy$/, '_policies'), modKey.toLowerCase());
        MODEL_TO_MODULE.set(kebab.replace(/-policy$/, '-policies'), modKey.toLowerCase());
      }
      if (normalized.endsWith('_policies')) {
        MODEL_TO_MODULE.set(normalized.replace(/_policies$/, '_policy'), modKey.toLowerCase());
        MODEL_TO_MODULE.set(kebab.replace(/-policies$/, '-policy'), modKey.toLowerCase());
      }
    }
  }
}

// All active module keys declared in the tenant registry
const REGISTERED_MODULES = new Set(Object.keys(MODULE_DEFINITIONS).map(k => k.toLowerCase()));

/**
 * Resolves standard module key derived strictly from tenantRegistry.js (MODULE_DEFINITIONS) as the single source of truth.
 * @param {string} mainRoute - The route path (e.g. '/master-data/departments', '/attendance/shift-roster')
 * @param {string} title - Optional title of the sidebar/entity
 * @returns {string} Standard moduleKey ('core', 'hrms', 'attendance', 'tasks', 'tickets', 'crm', 'assets', 'recruitment', 'feed')
 */
export function resolveModuleKey(mainRoute = '', title = '') {
  const routeClean = (mainRoute || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  const titleLower = (title || '').trim().toLowerCase();

  if (!routeClean && !titleLower) return 'core';

  const segments = routeClean.split('/');

  // 1. Direct segment check against MODULE_DEFINITIONS collections (from specific to broad)
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (MODEL_TO_MODULE.has(seg)) {
      return MODEL_TO_MODULE.get(seg);
    }
    // Check plural / singular variations
    if (seg.endsWith('s') && MODEL_TO_MODULE.has(seg.slice(0, -1))) {
      return MODEL_TO_MODULE.get(seg.slice(0, -1));
    }
    if (!seg.endsWith('s') && MODEL_TO_MODULE.has(seg + 's')) {
      return MODEL_TO_MODULE.get(seg + 's');
    }
  }

  // 2. Direct segment check against registered module keys (e.g. '/attendance', '/crm', '/tasks')
  for (const seg of segments) {
    if (REGISTERED_MODULES.has(seg)) {
      return seg;
    }
  }

  // 3. Fallback matching against title / keywords matching registered modules
  for (const modKey of REGISTERED_MODULES) {
    if (titleLower.includes(modKey)) {
      return modKey;
    }
  }

  // 4. Default to 'core'
  return 'core';
}

export { MODULE_DEFINITIONS };
