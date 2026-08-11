/**
 * Dashboard Engine — Widget Manifest Types (§2.2)
 *
 * Every widget exposes this metadata shape for the Builder UI.
 * The Builder reads manifests to populate the widget library and
 * the configuration panel. Never hardcode widget lists elsewhere.
 *
 * @typedef {Object} WidgetManifest
 * @property {string} id            - unique type identifier (e.g. "metric")
 * @property {string} name          - display name for builder UI (e.g. "Metric Widget")
 * @property {string} icon          - lucide-react icon name (e.g. "BarChart3")
 * @property {string} category      - grouping: "Metrics" | "Collections" | "Visualizations" | "Actions" | "Status" | "Insights"
 * @property {boolean} configurable - true if widget has editable config fields
 * @property {string[]} supportedDataTypes - e.g. ["number", "percentage", "currency"]
 * @property {ConfigField[]} configSchema  - field declarations for the config panel
 * @property {Object} defaultConfig        - default config values for a new instance
 * @property {SizeConstraints} sizeConstraints - min/max grid span
 */

/**
 * @typedef {Object} ConfigField
 * @property {string} type   - field control type: "textbox" | "select" | "metricPicker" | "scopePicker" | "colorPicker" | "iconPicker" | "toggle" | "number"
 * @property {string} name   - config key this field maps to
 * @property {string} label  - human-readable label (§3.5: name things as the viewer would)
 * @property {string} [placeholder]
 * @property {boolean} [required]
 * @property {Array<{value: string, label: string}>} [options] - for select fields
 * @property {*} [defaultValue]
 */

/**
 * @typedef {Object} SizeConstraints
 * @property {number} minW   - minimum grid columns (1-12)
 * @property {number} maxW   - maximum grid columns (1-12)
 * @property {number} minH   - minimum grid rows
 * @property {number} maxH   - maximum grid rows
 * @property {number} defaultW - default width on drop
 * @property {number} defaultH - default height on drop
 */

/**
 * Widget data status values used in the universal contract.
 * WidgetShell uses these to decide which visual state to show (§3.2).
 */
export const DATA_STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error',
  STALE: 'stale',
};

/**
 * Widget permission visibility levels (§2.9).
 * Computed from config + viewer's role.
 */
export const PERMISSION_LEVEL = {
  VISIBLE: 'visible',
  HIDDEN: 'hidden',
  READ_ONLY: 'read-only',
  EDITABLE: 'editable',
};

/**
 * Standard widget categories for the builder library.
 */
export const WIDGET_CATEGORIES = {
  METRICS: 'Metrics',
  COLLECTIONS: 'Collections',
  VISUALIZATIONS: 'Visualizations',
  ACTIONS: 'Actions',
  STATUS: 'Status',
  INSIGHTS: 'Insights',
};
