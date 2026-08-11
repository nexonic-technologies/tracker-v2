import React from "react";
import { BarChart3, Download } from "lucide-react";

export default function ReportHeader({
  eyebrow = "ACCOUNTS & FINANCE",
  title = "Financial Reports",
  description = "Period verification and expense approval reports",
  icon: IconComponent = BarChart3,
  onExport,
  exportLabel = "Export"
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="lmx-page-eyebrow mb-1">{eyebrow}</p>
        <h1 className="text-[28px] font-semibold text-ink flex items-center gap-2.5 tracking-tight">
          <IconComponent size={22} className="text-brand flex-shrink-0" />
          {title}
        </h1>
        <p className="text-sm text-ink-muted mt-0.5">{description}</p>
      </div>
      {onExport && (
        <button
          onClick={onExport}
          className="tracker-btn-ghost flex items-center gap-1.5 text-[12px] self-start sm:self-auto"
        >
          <Download size={13} /> {exportLabel}
        </button>
      )}
    </div>
  );
}
