/**
 * Dashboard Engine — Metric Widget (§2.1 Registry Widget #1)
 *
 * Single KPI display: hero number, optional trend, comparison, icon.
 * The most common widget type — used for stat cards.
 *
 * Config shape:
 *   valueKey: string    — key in data payload to display
 *   format: "number" | "percentage" | "currency"
 *   semanticColor: "positive" | "negative" | "warning" | "info" | "neutral" | "auto"
 *   icon: string        — lucide icon name
 *   thresholds: { positive: number, warning: number }  — for "auto" color
 *   comparison: { label: string, value: number }
 */
import React from 'react';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import {
  TrendingUp, TrendingDown, Minus,
  ClipboardCheck, AlertCircle, Ticket,
  HeartPulse, Users, DollarSign, Clock,
  BarChart3, ShieldAlert, Briefcase, CircleDot,
} from 'lucide-react';

/** Icon name → component map (subset of lucide) */
const ICON_MAP = {
  ClipboardCheck, AlertCircle, Ticket,
  HeartPulse, Users, DollarSign, Clock,
  BarChart3, ShieldAlert, Briefcase, CircleDot,
  TrendingUp, TrendingDown,
};

/** Format a value based on format type */
function formatValue(value, format) {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (isNaN(num)) return String(value);

  switch (format) {
    case 'percentage':
      return `${num}%`;
    case 'currency':
      if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
      if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
      return `₹${num.toLocaleString('en-IN')}`;
    case 'number':
    default:
      return num.toLocaleString('en-IN');
  }
}

/** Resolve semantic color from value + thresholds */
function resolveColor(value, semanticColor, thresholds) {
  if (semanticColor !== 'auto' || !thresholds) return semanticColor || 'neutral';

  const num = Number(value);
  if (isNaN(num)) return 'neutral';
  if (num >= thresholds.positive) return 'positive';
  if (num >= thresholds.warning) return 'warning';
  return 'negative';
}

/**
 * @param {Object} props
 * @param {Object} props.config - widget configuration
 * @param {Object} props.data - resolved data payload
 */
function MetricWidget({ config, data }) {
  const {
    valueKey = 'value',
    format = 'number',
    semanticColor = 'neutral',
    icon,
    thresholds,
    comparison,
  } = config;

  // Extract the display value
  const rawValue = typeof data === 'object' && data !== null
    ? data[valueKey] ?? data
    : data;
  const displayValue = typeof rawValue === 'object'
    ? rawValue?.value ?? rawValue
    : rawValue;

  const color = resolveColor(displayValue, semanticColor, thresholds);
  const IconComponent = icon ? ICON_MAP[icon] : null;

  // Trend from comparison
  const trend = comparison ? {
    direction: comparison.value > 0 ? 'up' : comparison.value < 0 ? 'down' : 'flat',
    label: comparison.label || '',
    value: comparison.value,
  } : null;

  return (
    <div className="flex flex-col justify-between h-full pt-1">
      {/* Icon + Value row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className={`dsh-figure dsh-figure--hero dsh-color-${color}`}>
            {formatValue(displayValue, format)}
          </span>
        </div>

        {IconComponent && (
          <div className={`dsh-bg-${color} flex items-center justify-center w-12 h-12 rounded-2xl flex-shrink-0 transition-transform duration-300 hover:scale-105`}>
            <IconComponent size={22} strokeWidth={1.8} />
          </div>
        )}
      </div>

      {/* Trend line */}
      {trend && (
        <div className={`dsh-trend dsh-trend--${trend.direction} mt-2`}>
          {trend.direction === 'up' && <TrendingUp size={12} />}
          {trend.direction === 'down' && <TrendingDown size={12} />}
          {trend.direction === 'flat' && <Minus size={12} />}
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  );
}

// Self-register (§2.1)
const manifest = {
  id: 'metric',
  name: 'Metric Widget',
  icon: 'BarChart3',
  category: WIDGET_CATEGORIES.METRICS,
  configurable: true,
  supportedDataTypes: ['number', 'percentage', 'currency'],
  sizeConstraints: { minW: 2, maxW: 6, minH: 2, maxH: 3, defaultW: 3, defaultH: 2 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
    { type: 'metricPicker', name: 'dataSource', label: 'Data source' },
    { type: 'select', name: 'format', label: 'Format', options: [
      { value: 'number', label: 'Number' },
      { value: 'percentage', label: 'Percentage' },
      { value: 'currency', label: 'Currency (₹)' },
    ]},
    { type: 'select', name: 'semanticColor', label: 'Color', options: [
      { value: 'neutral', label: 'Neutral' },
      { value: 'positive', label: 'Positive (Green)' },
      { value: 'negative', label: 'Negative (Red)' },
      { value: 'warning', label: 'Warning (Amber)' },
      { value: 'info', label: 'Info (Blue)' },
      { value: 'auto', label: 'Auto (from thresholds)' },
    ]},
    { type: 'iconPicker', name: 'icon', label: 'Icon' },
  ],
  defaultConfig: {
    format: 'number',
    semanticColor: 'neutral',
    valueKey: 'value',
  },
};

registerWidget('metric', MetricWidget, manifest);
export default MetricWidget;
