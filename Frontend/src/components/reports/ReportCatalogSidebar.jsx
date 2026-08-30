import React from 'react';
import { Layers, ChevronRight, UserCheck, HelpCircle } from 'lucide-react';

export default function ReportCatalogSidebar({
  reports,
  activeReport,
  onSelectReport
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        <Layers className="w-3 h-3" /> Domain Reports ({reports.length})
      </h3>

      <div className="space-y-1.5">
        {reports.map(report => {
          const isSelected = activeReport === report.id;
          return (
            <button
              key={report.id}
              onClick={() => onSelectReport(report.id)}
              className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/90 border-blue-500/40 text-blue-900 dark:bg-blue-950/40 dark:border-blue-500/40 dark:text-blue-200 shadow-xs ring-1 ring-blue-500/30'
                  : 'bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-blue-600/10 text-blue-700 dark:text-blue-400">
                    {report.code || 'R-01'}
                  </span>
                  <span className="font-bold text-xs truncate">{report.label}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'translate-x-0.5 text-blue-600' : 'text-slate-400'}`} />
              </div>

              {/* Consumer / Audience Tag */}
              {report.audience && (
                <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50">
                  <UserCheck className="w-2.5 h-2.5 text-blue-600" />
                  <span className="truncate">Consumer: {report.audience}</span>
                </div>
              )}

              {/* Business Question */}
              {report.businessQuestion && (
                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-medium leading-tight flex items-start gap-1">
                  <HelpCircle className="w-2.5 h-2.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="italic line-clamp-2">"{report.businessQuestion}"</span>
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
