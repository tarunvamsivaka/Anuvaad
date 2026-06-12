import { Skeleton } from "@/components/ui/skeleton";
import { MonacoSkeleton } from "@/components/ui/monaco-skeleton";

/**
 * P6 (4.5): Monaco-shaped loading skeleton for the translate route.
 * Reduces CLS and gives users a realistic preview of the two editor panes.
 */
export default function TranslateLoading() {
  return (
    <div className="h-screen flex flex-col overflow-hidden relative dashboard-bg">
      {/* Toolbar skeleton */}
      <div className="shrink-0 z-20 h-14 border-b border-border-subtle bg-surface-low/80 backdrop-blur-md flex items-center px-6 gap-4">
        <Skeleton className="h-5 w-48 skeleton-pulse" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg skeleton-pulse" />
          <Skeleton className="h-8 w-20 rounded-lg skeleton-pulse" />
        </div>
      </div>

      {/* Mode selector skeleton */}
      <div className="shrink-0 z-10 flex px-6 py-3 border-b border-border-faint bg-surface-low/60 backdrop-blur-md gap-3">
        <Skeleton className="h-9 w-64 skeleton-pulse rounded-lg" />
        <Skeleton className="h-9 w-40 skeleton-pulse rounded-lg" />
        <div className="ml-auto">
          <Skeleton className="h-9 w-28 skeleton-pulse rounded-lg" />
        </div>
      </div>

      {/* Two-column Monaco-shaped editor skeletons (P6) */}
      <div className="flex-1 overflow-hidden grid lg:grid-cols-2 gap-4 p-4 md:p-6 pt-3">
        <div className="h-full min-h-0">
          <MonacoSkeleton lines={18} />
        </div>
        <div className="h-full min-h-0">
          <MonacoSkeleton lines={18} />
        </div>
      </div>
    </div>
  );
}
