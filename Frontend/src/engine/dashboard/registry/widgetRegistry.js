/**
 * Dashboard Engine — Widget Registry (§2.1)
 *
 * Singleton registry. Every widget type self-registers here.
 * The WidgetFactory resolves type → Component from this registry.
 * The Builder UI reads manifests from this registry.
 *
 * Usage (inside a widget file):
 *   import { registerWidget } from '../registry/widgetRegistry';
 *   registerWidget('metric', MetricWidget, metricManifest);
 */

/** @type {Map<string, { component: React.ComponentType, manifest: import('./widgetManifest').WidgetManifest }>} */
const registry = new Map();

/**
 * Register a widget type with its component and manifest.
 * @param {string} type - unique widget type identifier
 * @param {React.ComponentType} component - the React component
 * @param {import('./widgetManifest').WidgetManifest} manifest - widget metadata
 */
export function registerWidget(type, component, manifest) {
  if (registry.has(type)) {
    console.warn(`[WidgetRegistry] Overwriting existing widget type: "${type}"`);
  }
  registry.set(type, { component, manifest });
}

/**
 * Get a registered widget by type.
 * @param {string} type
 * @returns {{ component: React.ComponentType, manifest: import('./widgetManifest').WidgetManifest } | undefined}
 */
export function getWidget(type) {
  return registry.get(type);
}

/**
 * Get all registered widgets as an array.
 * @returns {Array<{ type: string, component: React.ComponentType, manifest: import('./widgetManifest').WidgetManifest }>}
 */
export function getAllWidgets() {
  return [...registry.entries()].map(([type, entry]) => ({
    type,
    ...entry,
  }));
}

/**
 * Get all registered widgets filtered by category.
 * @param {string} category
 * @returns {Array<{ type: string, component: React.ComponentType, manifest: import('./widgetManifest').WidgetManifest }>}
 */
export function getWidgetsByCategory(category) {
  return getAllWidgets().filter((w) => w.manifest.category === category);
}

/**
 * Get all unique categories from registered widgets.
 * @returns {string[]}
 */
export function getCategories() {
  const categories = new Set();
  for (const { manifest } of registry.values()) {
    if (manifest.category) categories.add(manifest.category);
  }
  return [...categories];
}

/**
 * Check if a widget type is registered.
 * @param {string} type
 * @returns {boolean}
 */
export function hasWidget(type) {
  return registry.has(type);
}
