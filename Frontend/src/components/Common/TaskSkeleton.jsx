export default function TaskSkeleton() {
  return (
    <div className="flex flex-col h-full bg-canvas animate-pulse p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-hairline-soft">
        <div className="space-y-3 w-1/3">
          <div className="h-3 w-16 bg-surface-2 rounded" />
          <div className="h-6 w-48 bg-surface-2 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-surface-2 rounded-tracker-md" />
          <div className="h-8 w-24 bg-surface-2 rounded-tracker-md" />
        </div>
      </div>

      {/* Board skeleton */}
      <div className="flex gap-4 overflow-hidden h-full">
        {[1, 2, 3, 4].map(col => (
          <div key={col} className="w-[300px] flex-shrink-0 flex flex-col gap-3">
            <div className="h-8 w-full bg-surface-2 rounded-tracker-md" />
            <div className="h-24 w-full bg-surface-1 rounded-tracker-card border border-hairline" />
            <div className="h-32 w-full bg-surface-1 rounded-tracker-card border border-hairline" />
            <div className="h-20 w-full bg-surface-1 rounded-tracker-card border border-hairline" />
          </div>
        ))}
      </div>
    </div>
  );
}
