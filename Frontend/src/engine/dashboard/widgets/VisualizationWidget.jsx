/**
 * Dashboard Engine — Visualization Widget (§2.1 Registry Widget #3)
 *
 * Recharts-powered visualization: bar, line, pie/donut charts.
 * Config-driven data mapping and chart selection.
 *
 * Config shape:
 *   chartType: "bar" | "line" | "donut"
 *   xKey: string
 *   yKey: string
 *   color: string
 */
import React from 'react';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

const DEFAULT_COLORS = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function BarChartView({ data, xKey = 'label', yKey = 'value', color = '#8b5cf6' }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={140}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tracker-border)" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'var(--tracker-ink-subtle)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--tracker-ink-subtle)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--tracker-surface)',
            borderColor: 'var(--tracker-border)',
            borderRadius: 'var(--tracker-radius-md)',
            color: 'var(--tracker-ink)',
            fontSize: '12px',
          }}
        />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartView({ data, xKey = 'label', yKey = 'value', color = '#8b5cf6' }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={140}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tracker-border)" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'var(--tracker-ink-subtle)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--tracker-ink-subtle)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--tracker-surface)',
            borderColor: 'var(--tracker-border)',
            borderRadius: 'var(--tracker-radius-md)',
            color: 'var(--tracker-ink)',
            fontSize: '12px',
          }}
        />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DonutChartView({ data, xKey = 'label', yKey = 'value' }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={140}>
      <PieChart>
        <Pie
          data={data}
          dataKey={yKey}
          nameKey={xKey}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={60}
          paddingAngle={4}
        >
          {(data || []).map((entry, index) => (
            <Cell key={`cell-${index}`} fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--tracker-surface)',
            borderColor: 'var(--tracker-border)',
            borderRadius: 'var(--tracker-radius-md)',
            color: 'var(--tracker-ink)',
            fontSize: '12px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function VisualizationWidget({ config, data }) {
  const { chartType = 'bar', xKey = 'label', yKey = 'value', color = '#8b5cf6' } = config;
  const items = Array.isArray(data) ? data : [];

  if (items.length === 0) return null;

  return (
    <div className="w-full h-full min-h-[140px]">
      {chartType === 'line' && <LineChartView data={items} xKey={xKey} yKey={yKey} color={color} />}
      {chartType === 'donut' && <DonutChartView data={items} xKey={xKey} yKey={yKey} />}
      {chartType === 'bar' && <BarChartView data={items} xKey={xKey} yKey={yKey} color={color} />}
    </div>
  );
}

const manifest = {
  id: 'visualization',
  name: 'Visualization Widget',
  icon: 'PieChart',
  category: WIDGET_CATEGORIES.VISUALIZATIONS,
  configurable: true,
  supportedDataTypes: ['array'],
  sizeConstraints: { minW: 3, maxW: 12, minH: 3, maxH: 6, defaultW: 6, defaultH: 4 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
    { type: 'metricPicker', name: 'dataSource', label: 'Data source' },
    { type: 'select', name: 'chartType', label: 'Chart Type', options: [
      { value: 'bar', label: 'Bar Chart' },
      { value: 'line', label: 'Line Chart' },
      { value: 'donut', label: 'Donut Chart' },
    ]},
    { type: 'textbox', name: 'xKey', label: 'X Axis Key', defaultValue: 'label' },
    { type: 'textbox', name: 'yKey', label: 'Y Axis Key', defaultValue: 'value' },
  ],
  defaultConfig: { chartType: 'bar', xKey: 'label', yKey: 'value' },
};

registerWidget('visualization', VisualizationWidget, manifest);
export default VisualizationWidget;
