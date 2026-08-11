import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * V2WorkforcePulse - Blueprint Command Header Instrument.
 * Single source of truth for headline org vitals.
 */
export default function V2WorkforcePulse({ pulse, stats = {}, scope = 'org' }) {
  if (!pulse) return null;

  const total = pulse.total || 0;
  const present = pulse.present || 0;
  const overdue = stats.overdueTasks?.value ?? 0;
  const tickets = stats.openTickets?.value ?? 0;
  const approvals = stats.pendingApprovals?.value ?? 0;
  const exposure = stats.financialExposure?.value ?? 0;

  const totalNeedsAttention = (overdue > 0 ? 1 : 0) + (approvals > 0 ? 1 : 0) + (pulse.unchecked > 0 ? 1 : 0);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#0A1E40] bg-gradient-to-b from-[#0E2A55] to-[#0A1E40] p-4 sm:p-5 text-[#EAF0FB] shadow-sm select-none">
      {/* Blueprint Grid Texture Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-10" 
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }} 
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Label with Live Pulse Dot */}
        <div className="flex items-center gap-2.5 pr-4 lg:border-r border-white/15 flex-shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-200">
            Org Pulse
          </span>
        </div>

        {/* Vital Stats Row */}
        <div className="flex-1 flex flex-wrap items-center gap-6 sm:gap-8">
          {/* Present */}
          <div className="space-y-0.5">
            <div className="font-mono text-xl sm:text-2xl font-bold leading-none text-amber-300">
              {present} <span className="text-xs font-normal text-blue-200">/ {total}</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
              Present Now
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="space-y-0.5">
            <div className={`font-mono text-xl sm:text-2xl font-bold leading-none ${overdue > 0 ? 'text-rose-400' : 'text-white'}`}>
              {overdue}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
              Overdue Tasks
            </div>
          </div>

          {/* Open Tickets */}
          <div className="space-y-0.5">
            <div className="font-mono text-xl sm:text-2xl font-bold leading-none text-white">
              {tickets}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
              Open Tickets
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="space-y-0.5">
            <div className="font-mono text-xl sm:text-2xl font-bold leading-none text-white">
              {approvals}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
              Pending Approvals
            </div>
          </div>

          {/* Financial Exposure */}
          <div className="space-y-0.5">
            <div className="font-mono text-xl sm:text-2xl font-bold leading-none text-emerald-300">
              ₹{exposure}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
              Financial Exposure
            </div>
          </div>
        </div>

        {/* Attention Badge */}
        <div className="flex-shrink-0">
          {totalNeedsAttention > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{totalNeedsAttention} {totalNeedsAttention === 1 ? 'item needs' : 'items need'} attention</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>All Systems Operational</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Reconciled Note */}
      <div className="relative z-10 mt-3.5 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10.5px] text-blue-300/70">
        <span>Single source of truth — reconciled live with attendance & task engine.</span>
        <span className="font-mono">Live · Synced just now</span>
      </div>
    </div>
  );
}
