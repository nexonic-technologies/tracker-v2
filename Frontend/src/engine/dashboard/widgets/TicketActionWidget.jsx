/**
 * Dashboard Engine — Ticket Action Widget
 *
 * Dedicated widget for HelpDesk / Support Ticket operations:
 * - Direct Raise Ticket button
 * - My Queue & Unassigned Ticket buttons
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import { Ticket, Plus, Inbox, ArrowRight, LifeBuoy } from 'lucide-react';

function TicketActionWidget({ config, data }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col justify-between h-full space-y-3 p-1">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-[var(--tracker-surface-1)] text-[var(--module-ticket)]">
          <LifeBuoy size={20} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-[var(--tracker-ink)]">HelpDesk Support</h4>
          <p className="text-[11px] text-[var(--tracker-ink-subtle)]">Resolve customer & internal tickets</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate('/tickets/form')}
          type="button"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--tracker-radius-md)] bg-[var(--module-ticket)] hover:opacity-90 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Plus size={14} /> New Ticket
        </button>

        <button
          onClick={() => navigate('/tickets/my-tickets')}
          type="button"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)] hover:bg-[var(--tracker-surface-2)] text-[var(--tracker-ink)] text-xs font-semibold border border-[var(--tracker-border)] transition-all cursor-pointer"
        >
          <Inbox size={14} /> My Queue
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--tracker-ink-subtle)] pt-1 border-t border-[var(--tracker-border)]">
        <span>Support SLA Active</span>
        <button
          onClick={() => navigate('/Tickets?status=Open')}
          className="flex items-center gap-1 text-[var(--module-ticket)] hover:underline font-semibold cursor-pointer"
          type="button"
        >
          Open Queue <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

const manifest = {
  id: 'ticketAction',
  name: 'HelpDesk Operations Widget',
  icon: 'Ticket',
  category: WIDGET_CATEGORIES.ACTIONS,
  configurable: true,
  supportedDataTypes: ['object'],
  sizeConstraints: { minW: 3, maxW: 6, minH: 2, maxH: 4, defaultW: 4, defaultH: 3 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
  ],
  defaultConfig: {
    title: 'Ticket Actions',
  },
};

registerWidget('ticketAction', TicketActionWidget, manifest);
export default TicketActionWidget;
