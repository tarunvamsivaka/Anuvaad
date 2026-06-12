import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="min-h-screen dashboard-bg p-5 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header skeleton */}
        <Skeleton className="h-10 w-full rounded-xl skeleton-pulse" />
        {/* Team members list */}
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl skeleton-pulse" />
        ))}
      </div>
    </div>
  );
}
