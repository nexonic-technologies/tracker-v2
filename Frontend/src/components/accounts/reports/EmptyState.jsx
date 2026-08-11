import React from "react";
import { Calendar } from "lucide-react";

export default function EmptyState({
  icon: IconComponent = Calendar,
  title = "No data available",
  description = "No records match the selected filter criteria."
}) {
  return (
    <div className="pay-card p-8 text-center flex flex-col items-center justify-center">
      <div className="lmx-icon-tile mb-3">
        <IconComponent size={24} className="text-ink-muted" />
      </div>
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      <p className="text-[13px] text-ink-muted mt-1 max-w-sm">{description}</p>
    </div>
  );
}
