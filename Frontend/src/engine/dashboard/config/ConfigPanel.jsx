/**
 * Dashboard Engine — Schema-Driven Property Panel (§2.6)
 *
 * Self-generates property editing fields based on the selected widget manifest's `configSchema`.
 * Provides live updates to the widget descriptor.
 */
import React from 'react';
import { getWidget } from '../registry/widgetRegistry';
import { TextField, NumberField, SelectField, MetricPicker } from './fields/index';
import { Trash2, Move, ArrowLeft } from 'lucide-react';

export default function ConfigPanel({ widget, onChange, onDelete, onClose }) {
  if (!widget) {
    return (
      <div className="p-5 text-center text-xs text-[var(--tracker-ink-subtle)] flex flex-col items-center gap-2">
        <Move size={24} strokeWidth={1.5} />
        <p>Select a widget on the canvas to edit its properties</p>
      </div>
    );
  }

  const entry = getWidget(widget.type);
  const manifest = entry?.manifest;
  const configSchema = manifest?.configSchema || [];

  const handleConfigChange = (name, val) => {
    onChange({
      ...widget,
      config: {
        ...widget.config,
        [name]: val,
      },
    });
  };

  const handleTitleChange = (newTitle) => {
    onChange({
      ...widget,
      title: newTitle,
    });
  };

  const handleLayoutChange = (axis, val) => {
    const minVal = (axis === 'x' || axis === 'y') ? 0 : 1;
    onChange({
      ...widget,
      layout: {
        ...widget.layout,
        [axis]: Math.max(minVal, Number(val) || 0),
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--tracker-surface)] border-l border-[var(--tracker-border)] w-80 flex-shrink-0">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--tracker-border)]">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--tracker-ink-subtle)] hover:bg-[var(--tracker-surface-1)] md:hidden"
              type="button"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h3 className="text-sm font-semibold text-[var(--tracker-ink)]">
              {manifest?.name || 'Widget Properties'}
            </h3>
            <span className="text-[11px] text-[var(--tracker-ink-subtle)] font-mono">
              type: {widget.type}
            </span>
          </div>
        </div>

        <button
          onClick={() => onDelete(widget.id)}
          className="p-1.5 rounded-[var(--tracker-radius-sm)] text-[var(--dsh-negative)] hover:bg-[var(--dsh-negative-light)] transition-colors"
          title="Delete widget"
          type="button"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title field */}
        <TextField
          field={{ label: 'Widget Title', placeholder: 'Enter widget title' }}
          value={widget.title || ''}
          onChange={handleTitleChange}
        />

        {/* Layout size & position fields */}
        <div className="space-y-3 pt-2 border-t border-[var(--tracker-border)]">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--tracker-ink-subtle)]">
            Grid Placement & Dimensions
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-[var(--tracker-ink-subtle)]">Column (X: 0-11)</label>
              <input
                type="number"
                min={0}
                max={11}
                value={widget.layout?.x ?? 0}
                onChange={(e) => handleLayoutChange('x', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:border-[var(--brand-solid)]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--tracker-ink-subtle)]">Row (Y: 0+)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={widget.layout?.y ?? 0}
                onChange={(e) => handleLayoutChange('y', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:border-[var(--brand-solid)]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--tracker-ink-subtle)]">Width (Cols)</label>
              <input
                type="number"
                min={manifest?.sizeConstraints?.minW || 1}
                max={manifest?.sizeConstraints?.maxW || 12}
                value={widget.layout?.w || 3}
                onChange={(e) => handleLayoutChange('w', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:border-[var(--brand-solid)]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--tracker-ink-subtle)]">Height (Rows)</label>
              <input
                type="number"
                min={manifest?.sizeConstraints?.minH || 1}
                max={manifest?.sizeConstraints?.maxH || 8}
                value={widget.layout?.h || 2}
                onChange={(e) => handleLayoutChange('h', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:border-[var(--brand-solid)]"
              />
            </div>
          </div>
        </div>

        {/* Schema-generated fields */}
        {configSchema.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-[var(--tracker-border)]">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--tracker-ink-subtle)]">
              Configuration
            </label>

            {configSchema.map((field) => {
              if (field.name === 'title') return null; // already handled above

              const val = widget.config?.[field.name];

              switch (field.type) {
                case 'metricPicker':
                case 'scopePicker':
                  return (
                    <MetricPicker
                      key={field.name}
                      field={field}
                      value={val}
                      onChange={(v) => handleConfigChange(field.name, v)}
                    />
                  );
                case 'select':
                  return (
                    <SelectField
                      key={field.name}
                      field={field}
                      value={val}
                      onChange={(v) => handleConfigChange(field.name, v)}
                    />
                  );
                case 'number':
                  return (
                    <NumberField
                      key={field.name}
                      field={field}
                      value={val}
                      onChange={(v) => handleConfigChange(field.name, v)}
                    />
                  );
                case 'textbox':
                default:
                  return (
                    <TextField
                      key={field.name}
                      field={field}
                      value={val}
                      onChange={(v) => handleConfigChange(field.name, v)}
                    />
                  );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}
