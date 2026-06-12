import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen dashboard-bg">
      <div className="topbar px-6 py-2 flex items-center justify-between border-b border-border-subtle bg-surface-low/80 backdrop-blur-md sticky top-0 z-20">
        <Skeleton className="h-6 w-32 skeleton-pulse rounded-md" />
        <Skeleton className="h-8 w-8 rounded-lg skeleton-pulse" />
      </div>

      <div className="p-5 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="dashboard-card p-5 border-border-faint">
              <div className="flex items-start justify-between">
                <Skeleton className="h-3 w-24 skeleton-pulse" />
                <Skeleton className="h-8 w-8 rounded-lg skeleton-pulse" />
              </div>
              <Skeleton className="mt-4 h-8 w-16 skeleton-pulse" />
              <Skeleton className="mt-2 h-3 w-32 skeleton-pulse" />
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-4 space-y-5">
            <Card className="dashboard-card p-5 h-64 border-border-faint">
              <Skeleton className="h-4 w-32 mb-4 skeleton-pulse" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full skeleton-pulse" />)}
              </div>
            </Card>
            <Card className="dashboard-card p-5 h-48 border-border-faint">
              <Skeleton className="h-4 w-24 mb-6 skeleton-pulse" />
              <div className="flex items-end gap-2 justify-between">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <Skeleton className="w-6 h-24 skeleton-pulse rounded-t-sm" />
                    <Skeleton className="w-6 h-2 skeleton-pulse" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="xl:col-span-8 space-y-5">
            <Card className="dashboard-card p-5 min-h-[400px] border-border-faint">
              <Skeleton className="h-4 w-40 mb-6 skeleton-pulse" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl skeleton-pulse shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full skeleton-pulse" />
                      <Skeleton className="h-3 w-1/3 skeleton-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
