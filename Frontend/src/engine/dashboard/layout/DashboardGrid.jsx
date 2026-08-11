/**
 * Dashboard Engine — Dashboard Grid Layout (§2.5)
 *
 * 12-column CSS Grid renderer. Reads { x, y, w, h } per widget
 * and produces grid-column / grid-row styles. Layout is stored and
 * mutated independently of widget content.
 *
 * Responsive breakpoints:
 *  - Desktop (≥1024px): 12 columns
 *  - Tablet (768-1023px): 6 columns (widgets wrap)
 *  - Mobile (<768px): 1 column (full width stack)
 */
import React from 'react';

/**
 * Converts a widget's layout descriptor to CSS Grid placement.
 * @param {{ x: number, y: number, w: number, h: number }} layout
 * @returns {Object} React inline style
 */
function getGridPlacement(layout) {
  if (!layout) return {};

  return {
    gridColumn: `${(layout.x || 0) + 1} / span ${layout.w || 3}`,
    gridRow: `${(layout.y || 0) + 1} / span ${layout.h || 2}`,
  };
}

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - WidgetFactory instances
 * @param {Array<Object>} props.widgets - widget descriptors (for layout)
 * @param {string} [props.className] - additional classes
 */
export default function DashboardGrid({ children, widgets = [], className = '' }) {
  // Calculate total rows needed from widget positions
  const maxRow = widgets.reduce((max, w) => {
    const bottom = (w.layout?.y || 0) + (w.layout?.h || 2);
    return Math.max(max, bottom);
  }, 1);

  return (
    <div
      className={`dsh-grid ${className}`}
      style={{
        '--dsh-grid-rows': maxRow,
      }}
    >
      {React.Children.map(children, (child, index) => {
        const widget = widgets[index];
        if (!child || !widget) return child;

        return (
          <div
            className="dsh-grid__cell"
            style={getGridPlacement(widget.layout)}
            data-widget-id={widget.id}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
