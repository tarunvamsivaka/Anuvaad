"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  ArrowRight,
  Zap,
  Clock,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTranslationStats } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user, isPro, session } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const { stats, recentTranslations, isLoading } = useTranslationStats(user?.email);

  const statCards = [
    {
      label: "Translations Today",
      value: isPro ? "∞" : stats.today.toString(),
      limit: isPro ? undefined : "/10",
      icon: Code2,
      color: "text-amber-600",
      bg: "bg-amber-600/10",
    },
    {
      label: "This Week",
      value: stats.week.toString(),
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-600/10",
    },
    {
      label: "Total Translations",
      value: stats.total.toString(),
      icon: FileText,
      color: "text-emerald-600",
      bg: "bg-emerald-600/10",
    },
    {
      label: "Plan",
      value: isPro ? "Pro" : "Free",
      icon: Zap,
      color: "text-purple-600",
      bg: "bg-purple-600/10",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold">Welcome, {firstName}</h1>
          </div>
          <Link
            href="/dashboard/translate"
            className={cn(
              buttonVariants({ size: "sm" }),
              "gap-1.5 bg-amber-600 hover:bg-amber-700"
            )}
          >
            <Code2 className="h-3.5 w-3.5" /> New Translation
          </Link>
        </div>
      </header>

      <div className="p-6">
        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      stat.bg
                    )}
                  >
                    <Icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-0.5">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <span className="text-2xl font-bold">{stat.value}</span>
                      {stat.limit && (
                        <span className="text-sm text-muted-foreground">
                          {stat.limit}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quick actions + Getting started */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Quick actions */}
          <Card className="p-5 lg:col-span-1">
            <h2 className="text-sm font-semibold">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <Link
                href="/dashboard/translate"
                className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600/10">
                  <Code2 className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Code → English</p>
                  <p className="text-xs text-muted-foreground">
                    Explain code in plain English
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                href="/dashboard/translate?mode=english-to-code"
                className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">English → Code</p>
                  <p className="text-xs text-muted-foreground">
                    Generate code from instructions
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                href="/dashboard/translate?mode=code-to-code"
                className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/10">
                  <Zap className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Code → Code</p>
                  <p className="text-xs text-muted-foreground">
                    Convert between languages
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </Card>

          {/* Recent Translations */}
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent Translations</h2>
              <Link href="/dashboard/history">
                <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-muted">View All</Badge>
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                   <Skeleton className="h-16 w-full rounded-lg" />
                   <Skeleton className="h-16 w-full rounded-lg" />
                   <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : recentTranslations.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
                   <FileText className="h-8 w-8 text-muted-foreground mb-3" />
                   <p className="text-sm font-medium">No translations yet</p>
                   <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                     Your recent translation history will appear here once you start using the app.
                   </p>
                   <Link href="/dashboard/translate" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-4")}>
                     Try your first translation
                   </Link>
                </div>
              ) : (
                recentTranslations.map(tx => (
                  <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{tx.input_preview || "Code Snippet"}...</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{tx.mode}</Badge>
                        <span className="text-xs text-muted-foreground">{tx.source_language} → {tx.target_language}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 sm:text-right">
                      {new Date(tx.created_at).toLocaleDateString()}<br/>
                      <span className="text-[10px]">{tx.model_used}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Upgrade banner for free users */}
        {!isPro && (
          <Card className="mt-8 overflow-hidden border-amber-600/20 bg-gradient-to-r from-amber-600/5 to-amber-500/5 p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold">
                  Upgrade to Pro for unlimited translations
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Remove the daily limit, get priority processing, and support
                  larger inputs.
                </p>
              </div>
              <Link
                href="/dashboard/billing"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700"
                )}
              >
                <Zap className="h-3.5 w-3.5" /> Upgrade Now
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
