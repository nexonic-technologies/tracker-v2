/**
 * Dashboard Engine — Visualization Widget (§2.1 Registry Widget #3)
 *
 * 2026-Grade Recharts-powered multi-series visualization:
 * - Area Chart (gradient fills, smooth spline curves)
 * - Bar Chart (multi-metric & stacked bars)
 * - Line Chart (dual & multi-series tracking)
 * - Donut / Pie Chart (custom center labels & badges)
 */
import React from 'react';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';

const SERIES_PALETTE = {
  created: { color: 'var(--tracker-info, #0ea5e9)', label: 'Created' },
  inProgress: { color: 'var(--tracker-warning, #f59e0b)', label: 'In Progress' },
  resolved: { color: 'var(--tracker-success, #10b981)', label: 'Resolved' },
  closed: { color: 'var(--tracker-ink-muted, #64748b)', label: 'Closed' },
  completed: { color: 'var(--tracker-success, #10b981)', label: 'Completed' },
  overdue: { color: 'var(--tracker-danger, #ef4444)', label: 'Overdue' },
  present: { color: 'var(--tracker-success, #10b981)', label: 'Present' },
  wfh: { color: 'var(--brand-teal, #14b8a6)', label: 'WFH' },
  late: { color: 'var(--tracker-warning, #f59e0b)', label: 'Late' },
  leave: { color: 'var(--module-hr, #8b5cf6)', label: 'Leave' },
  attendanceRate: { color: 'var(--brand-solid, #6366f1)', label: 'Attendance %' },
  value: { color: 'var(--brand-solid, #6366f1)', label: 'Value' },
};

const DEFAULT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-[var(--tracker-radius-md)] p-2.5 shadow-md text-xs z-50">
      <p className="font-semibold text-[var(--tracker-ink)] mb-1">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-[var(--tracker-ink-subtle)]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-bold text-[var(--tracker-ink)]">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function AreaChartView({ data, xKey = 'label', seriesKeys = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={150}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          {seriesKeys.map((s, idx) => {
            const color = SERIES_PALETTE[s]?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            return (
              <linearGradient key={s} id={`grad-${s}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tracker-border)" opacity={0.6} />
        <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--tracker-ink-subtle)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--tracker-ink-subtle)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />}
        {seriesKeys.map((s, idx) => {
          const color = SERIES_PALETTE[s]?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
          const name = SERIES_PALETTE[s]?.label || s;
          return (
            <Area
              key={s}
              type="monotone"
              dataKey={s}
              name={name}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#grad-${s})`}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BarChartView({ data, xKey = 'label', seriesKeys = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={150}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tracker-border)" opacity={0.6} />
        <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--tracker-ink-subtle)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--tracker-ink-subtle)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />}
        {seriesKeys.map((s, idx) => {
          const color = SERIES_PALETTE[s]?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
          const name = SERIES_PALETTE[s]?.label || s;
          return (
            <Bar
              key={s}
              dataKey={s}
              name={name}
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartView({ data, xKey = 'label', seriesKeys = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={150}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tracker-border)" opacity={0.6} />
        <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--tracker-ink-subtle)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--tracker-ink-subtle)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />}
        {seriesKeys.map((s, idx) => {
          const color = SERIES_PALETTE[s]?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
          const name = SERIES_PALETTE[s]?.label || s;
          return (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              name={name}
              stroke={color}
              strokeWidth={2.2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

function DonutChartView({ data, xKey = 'label', yKey = 'value' }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={150}>
      <PieChart>
        <Pie
          data={data}
          dataKey={yKey}
          nameKey={xKey}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={68}
          paddingAngle={4}
        >
          {(data || []).map((entry, index) => (
            <Cell key={`cell-${index}`} fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function VisualizationWidget({ config, data }) {
  const { chartType = 'area', xKey = 'label', yKey, series } = config;
  const items = Array.isArray(data) ? data : (Array.isArray(data?.payload) ? data.payload : []);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[140px] text-center text-xs text-[var(--tracker-ink-subtle)] space-y-1.5 p-4 border border-dashed border-[var(--tracker-border)] rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]">
        <p className="font-medium text-[var(--tracker-ink)]">No trend data available</p>
        <p className="text-[11px]">No activity recorded for this metric within the selected date range</p>
      </div>
    );
  }

  const sample = items[0] || {};
  // Safe X-Axis resolution: use config.xKey if present on sample, otherwise fallback to 'label' or 'date'
  const effectiveXKey = (xKey && sample[xKey] !== undefined)
    ? xKey
    : (sample['label'] !== undefined ? 'label' : (sample['date'] !== undefined ? 'date' : Object.keys(sample)[0] || 'label'));

  // Auto-detect series keys if not explicitly provided
  let seriesKeys = series;
  if (!seriesKeys || seriesKeys.length === 0) {
    const candidateKeys = ['created', 'inProgress', 'resolved', 'closed', 'completed', 'overdue', 'present', 'wfh', 'late', 'leave', 'attendanceRate', 'value'];
    seriesKeys = candidateKeys.filter(k => k in sample);
    if (seriesKeys.length === 0 && yKey && sample[yKey] !== undefined) seriesKeys = [yKey];
    if (seriesKeys.length === 0) {
      // Pick all numeric keys that aren't the x-axis key
      seriesKeys = Object.keys(sample).filter(k => k !== effectiveXKey && typeof sample[k] === 'number');
    }
    if (seriesKeys.length === 0) seriesKeys = ['value'];
  }

  return (
    <div className="w-full h-full min-h-[150px] pt-1">
      {chartType === 'area' && <AreaChartView data={items} xKey={effectiveXKey} seriesKeys={seriesKeys} />}
      {chartType === 'bar' && <BarChartView data={items} xKey={effectiveXKey} seriesKeys={seriesKeys} />}
      {chartType === 'line' && <LineChartView data={items} xKey={effectiveXKey} seriesKeys={seriesKeys} />}
      {chartType === 'donut' && <DonutChartView data={items} xKey={effectiveXKey} yKey={seriesKeys[0] || yKey || 'value'} />}
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
    { type: 'metricPicker', name: 'dataSource', label: 'Data source (e.g. stats.ticketTrends, stats.taskTrends, stats.attendanceTrends)' },
    { type: 'select', name: 'chartType', label: 'Chart Type', options: [
      { value: 'area', label: 'Area Chart (Smooth Gradients)' },
      { value: 'bar', label: 'Bar Chart (Multi-Metric)' },
      { value: 'line', label: 'Line Chart (Spline Curves)' },
      { value: 'donut', label: 'Donut Chart (Proportions)' },
    ]},
    { type: 'textbox', name: 'xKey', label: 'X Axis Key (Default: label)', defaultValue: 'label' },
  ],
  defaultConfig: { chartType: 'area', xKey: 'label' },
};

registerWidget('visualization', VisualizationWidget, manifest);
export default VisualizationWidget;
