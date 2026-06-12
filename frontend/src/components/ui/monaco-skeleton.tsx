import { Skeleton } from "@/components/ui/skeleton";

/**
 * P6 (4.5): Monaco-shaped editor skeleton that matches the dark editor
 * pane dimensions. Renders during the dynamic import cold-start instead
 * of a generic spinner, preserving the layout and reducing CLS.
 */
export function MonacoSkeleton({ lines = 14 }: { lines?: number }) {
  // Vary widths to look like actual code lines
  const widths = [72, 58, 84, 48, 90, 64, 76, 52, 88, 60, 70, 82, 56, 66];

  return (
    <div
      className="rounded-xl overflow-hidden bg-surface-mid border border-white/[0.06] h-full flex flex-col"
      aria-hidden="true"
      role="presentation"
    >
      {/* Tab bar */}
      <div className="h-9 bg-surface-high border-b border-white/[0.06] flex items-center px-4 gap-3 shrink-0">
        <Skeleton className="h-3 w-20 rounded skeleton-pulse opacity-60" />
        <Skeleton className="h-3 w-16 rounded skeleton-pulse opacity-40" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-4 w-4 rounded skeleton-pulse opacity-30" />
          <Skeleton className="h-4 w-4 rounded skeleton-pulse opacity-30" />
        </div>
      </div>

      {/* Editor body: gutter + code lines */}
      <div className="flex flex-1 overflow-hidden">
        {/* Line number gutter */}
        <div className="w-10 shrink-0 py-4 px-2 flex flex-col gap-[10px] bg-surface-high/40 border-r border-white/[0.04]">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="h-4 flex items-center justify-end">
              <Skeleton
                className="h-2.5 rounded skeleton-pulse opacity-20"
                style={{ width: `${i < 9 ? 8 : 14}px` }}
              />
            </div>
          ))}
        </div>

        {/* Code content */}
        <div className="flex-1 p-4 space-y-[6px] overflow-hidden">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="flex items-center h-5">
              <Skeleton
                className="h-3 rounded skeleton-pulse"
                style={{
                  width: `${widths[i % widths.length]}%`,
                  opacity: 0.15 + (i % 3) * 0.05,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 bg-surface-high border-t border-white/[0.06] flex items-center px-4 gap-3 shrink-0">
        <Skeleton className="h-2 w-16 rounded skeleton-pulse opacity-25" />
        <Skeleton className="h-2 w-24 rounded skeleton-pulse opacity-20" />
        <div className="ml-auto">
          <Skeleton className="h-2 w-12 rounded skeleton-pulse opacity-20" />
        </div>
      </div>
    </div>
  );
}
