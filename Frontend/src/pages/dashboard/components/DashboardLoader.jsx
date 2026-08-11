import React from 'react';


export default function DashboardLoader() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[50vh] bg-canvas">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-surface-2" />
        <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-[var(--module-accent)] animate-spin" />
      </div>
      <p className="mt-4 text-ink-muted font-medium text-base">Loading Dashboard...</p>
    </div>
  );
}
