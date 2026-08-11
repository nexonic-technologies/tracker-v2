import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

/**
 * Reusable quick-actions grid.
 *
 * Props:
 *   actions — array of { to, icon, label } from dashboardConfig
 */
export default function QuickActions({ actions = [] }) {
  if (!actions.length) return null;

  return (
    <section className="tracker-card-plain p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-[var(--module-accent)]" />
        <h3 className="text-sm font-semibold text-ink">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 p-3.5 bg-surface border border-hairline rounded-tracker-md hover:border-[var(--module-accent)] transition-all"
          >
            <div className="lmx-icon-tile w-fit !p-2">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-ink flex-1">{label}</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-subtle group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>
    </section>
  );
}
