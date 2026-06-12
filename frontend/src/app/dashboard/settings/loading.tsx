import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="min-h-screen dashboard-bg p-5 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header skeleton */}
        <Skeleton className="h-10 w-full rounded-xl skeleton-pulse" />
        {/* Settings sections */}
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl skeleton-pulse" />
        ))}
      </div>
    </div>
  );
}
