/**
 * Dashboard Engine — Quick Action Widget (§2.1 Registry Widget #9)
 *
 * Configurable grid of quick action buttons.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import {
  Plus, Calendar, Users, Clock,
  FileText, Briefcase, CheckSquare, ClipboardList,
} from 'lucide-react';

const ICON_MAP = {
  Plus, Calendar, Users, Clock,
  FileText, Briefcase, CheckSquare, ClipboardList,
};

function QuickActionWidget({ config, actions }) {
  const navigate = useNavigate();

  // Combine actions from config or props
  const actionList = config.actions || actions || [];

  if (actionList.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {actionList.map((act, idx) => {
        const IconComponent = act.icon ? (typeof act.icon === 'string' ? ICON_MAP[act.icon] : act.icon) : Plus;

        return (
          <button
            key={idx}
            onClick={() => act.to && navigate(act.to)}
            type="button"
            className="flex items-center gap-2.5 p-2.5 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)] hover:bg-[var(--tracker-surface-2)] transition-colors text-left text-xs font-medium text-[var(--tracker-ink)]"
          >
            {IconComponent && (
              <div className="p-1.5 rounded-md bg-[var(--tracker-surface)] text-[var(--brand-solid)] flex-shrink-0">
                <IconComponent size={14} />
              </div>
            )}
            <span className="truncate">{act.label || 'Action'}</span>
          </button>
        );
      })}
    </div>
  );
}

const manifest = {
  id: 'quickActions',
  name: 'Quick Actions Widget',
  icon: 'Zap',
  category: WIDGET_CATEGORIES.ACTIONS,
  configurable: true,
  supportedDataTypes: ['array'],
  sizeConstraints: { minW: 3, maxW: 6, minH: 2, maxH: 4, defaultW: 4, defaultH: 3 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
  ],
  defaultConfig: {
    actions: [],
  },
};

registerWidget('quickActions', QuickActionWidget, manifest);
export default QuickActionWidget;
