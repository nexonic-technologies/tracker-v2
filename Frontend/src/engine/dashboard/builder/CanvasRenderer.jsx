/**
 * Dashboard Engine — Builder Canvas Renderer (§2.11)
 *
 * Renders the active layout on the grid with selection handles and drag/resize affordances.
 */
import React, { useEffect, useRef } from 'react';
import WidgetFactory from '../factory/WidgetFactory';
import DashboardGrid from '../layout/DashboardGrid';

export default function CanvasRenderer({
  widgets = [],
  selectedWidgetId,
  onSelectWidget,
}) {
  const containerRef = useRef(null);

  // Auto-scroll to selected widget when a new widget is added or selected
  useEffect(() => {
    if (!selectedWidgetId || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-builder-selected="true"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedWidgetId]);

  if (widgets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 border-2 border-dashed border-[var(--tracker-border)] rounded-[var(--tracker-radius-lg)] m-4 bg-[var(--tracker-surface)]">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-[var(--tracker-ink)]">
            Canvas is Empty
          </p>
          <p className="text-xs text-[var(--tracker-ink-subtle)] max-w-xs">
            Select or click a widget from the library on the left to add it to this dashboard layout.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 scroll-smooth">
      <DashboardGrid widgets={widgets}>
        {widgets.map((widget) => {
          const isSelected = selectedWidgetId === widget.id;

          return (
            <div
              key={widget.id}
              onClick={() => onSelectWidget(widget.id)}
              data-builder-selected={isSelected ? 'true' : 'false'}
              className={`relative group h-full rounded-[var(--tracker-radius-card)] cursor-pointer transition-all ${
                isSelected
                  ? 'ring-2 ring-[var(--brand-solid,#6366f1)] shadow-xl z-10'
                  : 'hover:ring-1 hover:ring-[var(--tracker-border-focus)]'
              }`}
            >
              {/* Selection Badge overlay */}
              {isSelected && (
                <div className="absolute -top-2.5 -left-2.5 z-20 px-2 py-0.5 bg-[var(--brand-solid,#6366f1)] text-white text-[10px] font-bold rounded-full shadow flex items-center gap-1">
                  <span>Selected</span>
                  <span className="opacity-80">({widget.layout?.x ?? 0},{widget.layout?.y ?? 0} · {widget.layout?.w}x{widget.layout?.h})</span>
                </div>
              )}

              {/* Render actual widget preview inside factory */}
              <WidgetFactory descriptor={widget} />
            </div>
          );
        })}
      </DashboardGrid>
    </div>
  );
}
