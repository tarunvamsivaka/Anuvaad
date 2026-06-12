import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div className="min-h-screen dashboard-bg p-5 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header skeleton */}
        <Skeleton className="h-10 w-full rounded-xl skeleton-pulse" />
        {/* Subscription card */}
        <Skeleton className="h-48 w-full rounded-xl skeleton-pulse" />
        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl skeleton-pulse" />
          <Skeleton className="h-64 rounded-xl skeleton-pulse" />
        </div>
      </div>
    </div>
  );
}
