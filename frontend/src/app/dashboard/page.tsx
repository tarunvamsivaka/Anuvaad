"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Code2, ArrowRight, Zap, FileText, TrendingUp,
  BarChart3, Sparkles, Clock, ArrowLeftRight, Upload, GitBranch
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTranslationStats } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { QuickActions } from "@/components/dashboard/QuickActions";

// Mini bar chart component using pure SVG
function ActivityBar({ value, max, label, index }: { value: number; max: number; label: string; index: number }) {
  const height = max > 0 ? Math.max((value / max) * 48, value > 0 ? 4 : 0) : 0;
  const isToday = label === "Today";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] font-bold text-text-muted">{value > 0 ? value : ""}</span>
      <div className="flex items-end h-12 w-6 justify-center">
        <div
          className={cn(
            "activity-bar w-full rounded-t",
            isToday
              ? "bg-amber-500 shadow-[var(--glow-xs)]"
              : "bg-surface-mid hover:bg-surface-high"
          )}
          style={{ height: `${height}px`, "--delay": `${index * 50}ms` } as React.CSSProperties}
        />
      </div>
      <span className={cn("text-[9px] font-medium", isToday ? "text-text-amber" : "text-text-muted")}>{label}</span>
    </div>
  );
}

// Radial progress ring
function QuotaRing({ used, total, isPro }: { used: number; total: number; isPro: boolean }) {
  const pct = isPro ? 100 : Math.min((used / total) * 100, 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const status = isPro ? "success" : pct >= 90 ? "danger" : pct >= 70 ? "warning" : "success";

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width="72"
        height="72"
        className="-rotate-90"
        aria-label={isPro ? "Quota: Unlimited (Pro plan)" : `Quota used: ${used} of ${total} translations today`}
        role="img"
      >
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="5" className="quota-ring-track" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`quota-ring-fill ${status}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-black text-text-primary leading-none">
          {isPro ? "∞" : used}
        </span>
        {!isPro && <span className="text-[9px] text-text-muted font-medium">/{total}</span>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, session, isPro } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const { stats, recentTranslations, isLoading } = useTranslationStats(user?.email, session?.access_token);

  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // 7-day activity data
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];
  const remainingWeek = Math.max(0, stats.week - stats.today);
  const baseDayValue = Math.floor(remainingWeek / 6);
  const remainder = remainingWeek % 6;
  const weekActivity = Array.from(
    { length: 6 },
    (_, i) => baseDayValue + (i < remainder ? 1 : 0)
  ).concat(stats.today);
  const maxActivity = Math.max(...weekActivity, 1);

  const statCards = [
    {
      label: "Today's Translations",
      value: isPro ? "∞" : stats.today.toString(),
      limit: isPro ? undefined : " / 10",
      icon: Code2,
      accent: "text-amber-500",
      detail: isPro ? "Unlimited" : `${10 - stats.today} remaining`,
    },
    {
      label: "This Week",
      value: stats.week.toString(),
      icon: TrendingUp,
      accent: "text-emerald-500",
      detail: "translations",
    },
    {
      label: "All Time",
      value: stats.total.toString(),
      icon: BarChart3,
      accent: "text-blue-500",
      detail: "translations",
    },
    {
      label: "Current Plan",
      value: isPro ? "Pro" : "Free",
      icon: Zap,
      accent: isPro ? "text-amber-500" : "text-text-muted",
      detail: isPro ? "Unlimited access" : "10 / day",
    },
  ];

  return (
    <div className="min-h-screen dashboard-bg">
      <TopBar 
        breadcrumb={
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight text-text-primary">
              Welcome back, <span className="text-text-amber">{firstName}</span>
            </h1>
          </div>
        }
        action={
          <Link
            href="/dashboard/translate"
            className={cn(
              buttonVariants({ size: "sm" }),
              "gap-2 bg-amber-500 hover:bg-amber-400 text-surface-base font-bold transition-all shadow-[var(--glow-xs)] rounded-lg"
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
            New Translation
          </Link>
        }
      />

      <div className="p-5 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
        
        {/* Primary Widget: Recent Work (Moved to top per redesign) */}
        <Card className="dashboard-card border-border-subtle overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border-faint">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Recent Translations</h2>
            </div>
            <Link
              href="/dashboard/history"
              className="text-[11px] font-semibold text-text-muted hover:text-text-amber transition-colors flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {isLoading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl skeleton-pulse" />)
            ) : recentTranslations.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle p-8 text-center bg-surface-card">
                <FileText className="h-6 w-6 text-text-muted mb-2" />
                <p className="text-sm font-semibold text-text-primary">No recent work</p>
                <p className="text-xs text-text-muted mt-1 max-w-[260px]">Start your first translation to see it here.</p>
              </div>
            ) : (
              recentTranslations.slice(0, 3).map((tx, idx) => (
                <Link
                  key={tx.id}
                  href={`/dashboard/translate?historyId=${tx.id}`}
                  className="animate-block-in flex flex-col justify-between rounded-xl border border-border-subtle bg-surface-card p-4 hover:border-border-active hover:bg-surface-mid transition-all group"
                  style={{ "--delay": `${idx * 100}ms` } as React.CSSProperties}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-[9px] font-bold bg-amber-500/5 text-text-amber border-amber-500/20 px-1.5 py-0.5">
                        {tx.mode}
                      </Badge>
                      <span className="text-[10px] text-text-muted">{new Date(tx.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-mono font-medium truncate text-text-primary group-hover:text-amber-400 transition-colors">
                      {tx.repository_name ? `${tx.repository_name}${tx.file_path ? `/${tx.file_path}` : ''}` : (tx.input_preview || "Code Snippet") + "..."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-faint">
                    <span className="text-[10px] font-medium text-text-muted">
                      {tx.source_language} → {tx.target_language}
                    </span>
                    <ArrowRight className="h-3 w-3 text-text-muted group-hover:text-amber-400 transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Secondary Grid: Stats & Quick Actions */}
        <div className="grid gap-6 xl:grid-cols-12">
          
          <div className="xl:col-span-8 space-y-6">
            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.label}
                    className="dashboard-card relative overflow-hidden p-5 stat-card-enter"
                    style={{ "--delay": `${i * 100}ms` } as React.CSSProperties}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">
                        {stat.label}
                      </p>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface-mid">
                        <Icon className={cn("h-4 w-4", stat.accent)} />
                      </div>
                    </div>
                    <div
                      className="mt-3 flex items-baseline gap-1"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {isLoading ? (
                        <Skeleton className="h-8 w-16 skeleton-pulse" />
                      ) : (
                        <>
                          <span className="text-3xl font-black tracking-tight text-text-primary">{stat.value}</span>
                          {stat.limit && (
                            <span className="text-sm font-semibold text-text-muted">{stat.limit}</span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] text-text-muted">{stat.detail}</p>
                    {/* Bottom glow bar on hover */}
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                  </Card>
                );
              })}
            </div>

            {/* Quick Actions Component */}
            <QuickActions />
            
          </div>

          {/* Tertiary Column: Activity & Quota */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Weekly Activity Chart */}
            <Card className="dashboard-card p-5 border-border-subtle">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">7-Day Activity</h2>
                </div>
                <span className="text-[10px] font-semibold text-text-muted">{stats.week} this week</span>
              </div>
              {mounted && (
                <div className="flex items-end justify-between gap-1">
                  {weekDays.map((day, i) => (
                    <ActivityBar key={day} value={weekActivity[i]} max={maxActivity} label={day} index={i} />
                  ))}
                </div>
              )}
            </Card>

            {/* Daily Quota */}
            {!isPro && mounted && (
              <Card className="dashboard-card p-5 border-border-subtle">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Daily Quota</h2>
                </div>
                <div className="flex items-center gap-5">
                  <QuotaRing used={stats.today} total={10} isPro={isPro} />
                  <div>
                    <p className="text-sm font-bold text-text-primary">
                      {stats.today >= 10 ? "Limit reached" : `${10 - stats.today} remaining`}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1">Resets at midnight UTC</p>
                    <Link
                      href="/dashboard/billing"
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-500 hover:text-amber-400 transition-colors bg-amber-500/10 px-2 py-1 rounded-md"
                    >
                      <Sparkles className="h-3 w-3" /> Get unlimited
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Upgrade banner */}
        {!isPro && (
          <Card className="overflow-hidden border border-border-medium bg-surface-high relative group mt-6">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-600/10 to-orange-500/5" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <h3 className="text-base font-bold text-text-primary">Upgrade to Pro</h3>
                </div>
                <p className="text-sm text-text-muted leading-relaxed max-w-xl">
                  Remove the daily limit, unlock priority processing, team workspaces, and translate entire codebases with higher context windows.
                </p>
              </div>
              <Link
                href="/dashboard/billing"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "shrink-0 gap-2 bg-amber-500 hover:bg-amber-400 text-surface-base font-bold shadow-[var(--glow-xs)] rounded-lg px-6 py-5"
                )}
              >
                <Zap className="h-4 w-4" />
                Upgrade Now
              </Link>
            </div>
            {/* Shimmer sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
          </Card>
        )}
      </div>
    </div>
  );
}
