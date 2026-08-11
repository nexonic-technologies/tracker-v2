/**
 * Dashboard Engine — Widget Library Panel (§2.11)
 *
 * Displays catalog of registered widgets grouped by category.
 * Allows adding widgets onto the canvas.
 */
import React, { useState } from 'react';
import { getAllWidgets, getCategories } from '../registry/widgetRegistry';
import {
  BarChart3, List, PieChart, Rss, Calendar,
  Activity, ShieldAlert, Sparkles, Zap, Target, Plus, Search
} from 'lucide-react';

const ICON_MAP = {
  BarChart3, List, PieChart, Rss, Calendar,
  Activity, ShieldAlert, Sparkles, Zap, Target
};

export default function WidgetLibrary({ onAddWidget }) {
  const [search, setSearch] = useState('');
  const widgets = getAllWidgets();
  const categories = getCategories();

  const filteredWidgets = widgets.filter((w) =>
    w.manifest.name.toLowerCase().includes(search.toLowerCase()) ||
    w.type.toLowerCase().includes(search.toLowerCase()) ||
    w.manifest.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[var(--tracker-surface)] border-r border-[var(--tracker-border)] w-72 flex-shrink-0">
      {/* Search Header */}
      <div className="p-4 border-b border-[var(--tracker-border)] space-y-2">
        <h3 className="text-sm font-semibold text-[var(--tracker-ink)]">Widget Library</h3>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-[var(--tracker-ink-subtle)]" />
          <input
            type="text"
            placeholder="Search widgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-[var(--tracker-radius-sm)] border border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] text-[var(--tracker-ink)] focus:outline-none focus:border-[var(--brand-solid)]"
          />
        </div>
      </div>

      {/* Catalog List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {categories.map((cat) => {
          const catWidgets = filteredWidgets.filter((w) => w.manifest.category === cat);
          if (catWidgets.length === 0) return null;

          return (
            <div key={cat} className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--tracker-ink-subtle)] px-1">
                {cat}
              </span>

              <div className="space-y-1.5">
                {catWidgets.map(({ type, manifest }) => {
                  const Icon = ICON_MAP[manifest.icon] || BarChart3;

                  return (
                    <div
                      key={type}
                      onClick={() => onAddWidget(type, manifest)}
                      className="flex items-center justify-between p-2.5 rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] hover:bg-[var(--tracker-surface-1)] hover:border-[var(--brand-solid)] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-[var(--tracker-radius-sm)] bg-[var(--tracker-surface-1)] text-[var(--brand-solid)] group-hover:bg-[var(--brand-solid)] group-hover:text-white transition-colors">
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--tracker-ink)] truncate">
                            {manifest.name}
                          </p>
                          <p className="text-[10px] text-[var(--tracker-ink-subtle)]">
                            {manifest.sizeConstraints.defaultW}x{manifest.sizeConstraints.defaultH} grid
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="p-1 rounded text-[var(--tracker-ink-subtle)] group-hover:text-[var(--brand-solid)]"
                        title="Add to canvas"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
