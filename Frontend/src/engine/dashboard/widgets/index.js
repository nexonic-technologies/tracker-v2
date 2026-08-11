/**
 * Dashboard Engine — Widget Module Index
 *
 * Importing this file imports all 10 widget types, triggering their self-registration
 * into widgetRegistry.js.
 */
import './MetricWidget';
import './CollectionWidget';
import './VisualizationWidget';
import './FeedWidget';
import './CalendarWidget';
import './StatusWidget';
import './RiskWidget';
import './InsightWidget';
import './QuickActionWidget';
import './GoalWidget';

export { default as MetricWidget } from './MetricWidget';
export { default as CollectionWidget } from './CollectionWidget';
export { default as VisualizationWidget } from './VisualizationWidget';
export { default as FeedWidget } from './FeedWidget';
export { default as CalendarWidget } from './CalendarWidget';
export { default as StatusWidget } from './StatusWidget';
export { default as RiskWidget } from './RiskWidget';
export { default as InsightWidget } from './InsightWidget';
export { default as QuickActionWidget } from './QuickActionWidget';
export { default as GoalWidget } from './GoalWidget';
