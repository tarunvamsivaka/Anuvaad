import Link from "next/link";
import { GitPullRequest } from "lucide-react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrReviewPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto flex max-w-3xl flex-col px-4 py-16 sm:px-6">
        <Card>
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
              <GitPullRequest className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle>Pull request review is not available yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-6 text-muted-foreground">
            <p>
              Anuvaad does not currently run CI, review live pull requests, or submit GitHub approvals. We have paused this feature while its repository authorization and review workflow are completed.
            </p>
            <Button render={<Link href="/dashboard/translate" />}>
              Go to code translation
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
