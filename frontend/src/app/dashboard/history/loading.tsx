import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function HistoryLoading() {
  return (
    <div className="min-h-screen dashboard-bg">
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface-low/80 backdrop-blur-md">
        <div className="flex h-14 items-center px-6">
          <Skeleton className="h-5 w-48 skeleton-pulse" />
        </div>
      </header>

      <div className="p-5 lg:p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1 skeleton-pulse rounded-xl" />
          <Skeleton className="h-9 w-48 skeleton-pulse rounded-xl" />
        </div>

        <div className="space-y-6">
          <div className="space-y-3 mt-8">
            <Skeleton className="h-4 w-32 skeleton-pulse mb-4" />
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i} className="dashboard-card flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-xl skeleton-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 skeleton-pulse" />
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-16 skeleton-pulse" />
                    <Skeleton className="h-3 w-20 skeleton-pulse" />
                  </div>
                </div>
                <div className="w-24 space-y-2 hidden sm:block">
                  <Skeleton className="h-3 w-full skeleton-pulse" />
                  <Skeleton className="h-3 w-2/3 skeleton-pulse ml-auto" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
