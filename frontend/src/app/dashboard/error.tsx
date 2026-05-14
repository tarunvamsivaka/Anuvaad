"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="mt-5 text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          An unexpected error occurred in the dashboard. This has been logged and we&apos;re looking into it.
        </p>
        {error.message && (
          <p className="mt-3 text-xs text-muted-foreground font-mono bg-muted/50 rounded-lg px-3 py-2 break-all">
            {error.message}
          </p>
        )}
        <Button onClick={reset} className="mt-6 gap-2 bg-amber-600 hover:bg-amber-700">
          <RotateCcw className="h-4 w-4" /> Try Again
        </Button>
      </Card>
    </div>
  );
}
