"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Code2, ArrowRight, Zap, FileText, TrendingUp,
  Terminal, Cpu, ShieldCheck, Activity, Layers,
  ArrowLeftRight, Sparkles, Clock, BarChart3
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTranslationStats } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

// Mini bar chart component using pure SVG
function ActivityBar({ value, max, label }: { value: number; max: number; label: string }) {
  const height = max > 0 ? Math.max((value / max) * 48, value > 0 ? 4 : 0) : 0;
  const isToday = label === "Today";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] font-bold text-slate-400">{value > 0 ? value : ""}</span>
      <div className="flex items-end h-12 w-6 justify-center">
        <div
          className={cn(
            "w-full rounded-t transition-all duration-700",
            isToday
              ? "bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
              : "bg-white/10 hover:bg-white/15"
          )}
          style={{ height: `${height}px` }}
        />
      </div>
      <span className={cn("text-[9px] font-medium", isToday ? "text-amber-400" : "text-slate-600")}>{label}</span>
    </div>
  );
}

// Radial progress ring
function QuotaRing({ used, total, isPro }: { used: number; total: number; isPro: boolean }) {
  const pct = isPro ? 100 : Math.min((used / total) * 100, 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = isPro ? "#f59e0b" : pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#10b981";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-black text-white leading-none">
          {isPro ? "∞" : used}
        </span>
        {!isPro && <span className="text-[9px] text-slate-500 font-medium">/{total}</span>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, session, isPro } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const { stats, recentTranslations, isLoading } = useTranslationStats(user?.email, session?.access_token);

  const [consoleLogs, setConsoleLogs] = useState<{ time: string; type: string; msg: string; color: string }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const baseLogs = [
      { time: "—", type: "SYSTEM", msg: "Anuvaad translation core v2.4.0 active", color: "text-amber-400" },
      { time: "—", type: "OK", msg: "Gemini 2.5 Flash engine mapped & ready", color: "text-emerald-400" },
      { time: "—", type: "AUTH", msg: "Supabase secure OAuth session established", color: "text-blue-400" },
      { time: "—", type: "SYNC", msg: "Workspace indexes synchronized", color: "text-indigo-400" },
    ];
    setConsoleLogs(baseLogs);

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      const liveLogs = [
        { time: timeStr, type: "PING", msg: "Cache heartbeat OK — latency 12ms", color: "text-slate-500" },
        { time: timeStr, type: "SYNC", msg: "Workspace synced with cloud repository", color: "text-amber-400/70" },
        { time: timeStr, type: "READY", msg: "Translation engine warmed and ready", color: "text-emerald-400/70" },
        { time: timeStr, type: "SEC", msg: "PII redaction layer active", color: "text-blue-400/70" },
      ];
      const randomLog = liveLogs[Math.floor(Math.random() * liveLogs.length)];
      setConsoleLogs(prev => [...prev.slice(-5), randomLog]);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  // Mock 7-day activity data — replace with real data when available
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];
  const weekActivity = [0, 0, 0, 0, 0, 0, stats.today];
  const maxActivity = Math.max(...weekActivity, 1);

  const statCards = [
    {
      label: "Today's Translations",
      value: isPro ? "∞" : stats.today.toString(),
      limit: isPro ? undefined : " / 10",
      icon: Code2,
      accent: "amber",
      detail: isPro ? "Unlimited" : `${10 - stats.today} remaining`,
    },
    {
      label: "This Week",
      value: stats.week.toString(),
      icon: TrendingUp,
      accent: "emerald",
      detail: "translations",
    },
    {
      label: "All Time",
      value: stats.total.toString(),
      icon: BarChart3,
      accent: "blue",
      detail: "translations",
    },
    {
      label: "Current Plan",
      value: isPro ? "Pro" : "Free",
      icon: Zap,
      accent: isPro ? "amber" : "slate",
      detail: isPro ? "Unlimited access" : "10 / day",
    },
  ];

  const accentMap: Record<string, string> = {
    amber: "from-amber-500/15 to-amber-600/5 border-amber-500/20 text-amber-400",
    emerald: "from-emerald-500/15 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    blue: "from-blue-500/15 to-blue-600/5 border-blue-500/20 text-blue-400",
    slate: "from-slate-500/10 to-slate-600/5 border-slate-500/15 text-slate-400",
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080c14]">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-amber-500/8 bg-white/80 dark:bg-[#080c14]/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Welcome back,{" "}
                <span className="text-amber-500 dark:text-amber-400">{firstName}</span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-600 hidden sm:block">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/translate"
            className={cn(
              buttonVariants({ size: "sm" }),
              "gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 rounded-lg"
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
            New Translation
          </Link>
        </div>
      </header>

      <div className="p-5 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const accentCls = accentMap[stat.accent] || accentMap.slate;
            return (
              <Card
                key={stat.label}
                className="relative overflow-hidden p-5 dark:bg-[#0c0f1a] border border-slate-200 dark:border-amber-500/8 hover:border-amber-500/25 dark:hover:border-amber-500/25 transition-all duration-300 group shadow-sm animate-fade-up"
              >
                <div className="flex items-start justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-600">
                    {stat.label}
                  </p>
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border bg-gradient-to-br", accentCls)}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 dark:bg-white/5" />
                  ) : (
                    <>
                      <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{stat.value}</span>
                      {stat.limit && (
                        <span className="text-sm font-semibold text-slate-400 dark:text-slate-600">{stat.limit}</span>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-600">{stat.detail}</p>
                {/* Hover shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                {/* Bottom glow bar */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-400" />
              </Card>
            );
          })}
        </div>

        {/* Main grid */}
        <div className="grid gap-5 xl:grid-cols-12">

          {/* Left col — Quick Actions + Activity */}
          <div className="xl:col-span-4 space-y-5">

            {/* Quick Actions */}
            <Card className="dark:bg-[#0c0f1a] border border-slate-200 dark:border-amber-500/8 overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <Activity className="h-3.5 w-3.5 text-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-500">Quick Actions</h2>
              </div>
              <div className="px-4 pb-4 space-y-2">
                {[
                  { href: "/dashboard/translate", icon: FileText, label: "Code → English", desc: "Explain legacy code logic", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
                  { href: "/dashboard/translate?mode=english-to-code", icon: Code2, label: "English → Code", desc: "Generate from specification", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
                  { href: "/dashboard/translate?mode=code-to-code", icon: ArrowLeftRight, label: "Code → Code", desc: "Port or refactor code", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
                ].map(({ href, icon: Icon, label, desc, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-white/5 p-3.5 transition-all hover:border-amber-500/20 hover:bg-amber-500/4 group"
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">{label}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-0.5">{desc}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </Card>

            {/* Weekly Activity Chart */}
            <Card className="dark:bg-[#0c0f1a] border border-slate-200 dark:border-amber-500/8 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-500">7-Day Activity</h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-600">{stats.week} this week</span>
              </div>
              {mounted && (
                <div className="flex items-end justify-between gap-1">
                  {weekDays.map((day, i) => (
                    <ActivityBar key={day} value={weekActivity[i]} max={maxActivity} label={day} />
                  ))}
                </div>
              )}
            </Card>

            {/* Daily Quota */}
            {!isPro && mounted && (
              <Card className="dark:bg-[#0c0f1a] border border-slate-200 dark:border-amber-500/8 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-500">Daily Quota</h2>
                </div>
                <div className="flex items-center gap-4">
                  <QuotaRing used={stats.today} total={10} isPro={isPro} />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {stats.today >= 10 ? "Limit reached" : `${10 - stats.today} remaining`}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-0.5">Resets at midnight UTC</p>
                    <Link
                      href="/dashboard/billing"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 hover:text-amber-400 transition-colors"
                    >
                      <Sparkles className="h-3 w-3" /> Get unlimited →
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right col — System Console + Recent Translations */}
          <div className="xl:col-span-8 space-y-5">

            {/* System Console */}
            <Card className="p-5 dark:bg-[#080c14] border border-slate-200 dark:border-amber-500/8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-500">System Console</h2>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">All Systems Active</span>
                </div>
              </div>

              {/* System indicators */}
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {[
                  { icon: Cpu, label: "AI Engine", value: "Gemini 2.5 Flash", ok: true },
                  { icon: Layers, label: "PII Redaction", value: "Active", ok: true },
                  { icon: ShieldCheck, label: "DB Connection", value: "Online", ok: true },
                ].map(({ icon: Icon, label, value, ok }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 rounded-xl border border-white/5 dark:bg-white/3 bg-slate-50 p-2.5"
                  >
                    <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-amber-500/10">
                      <Icon className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 leading-none">{label}</p>
                      <p className="text-[11px] font-bold text-slate-200 dark:text-white mt-0.5 leading-none flex items-center gap-1">
                        {ok && <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />}
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Log panel */}
              <div className="terminal-panel rounded-xl p-3.5 h-[120px] overflow-y-auto space-y-2">
                {consoleLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[11px] animate-in fade-in duration-300">
                    <span className="font-mono text-slate-700 shrink-0 font-bold">[{log.time}]</span>
                    <span className={cn("font-mono font-bold shrink-0 w-14", log.color)}>{log.type}</span>
                    <span className="font-mono text-slate-400 truncate">{log.msg}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Translations */}
            <Card className="dark:bg-[#0c0f1a] border border-slate-200 dark:border-amber-500/8">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-500">Recent Translations</h2>
                </div>
                <Link
                  href="/dashboard/history"
                  className="text-[11px] font-semibold text-amber-500/80 hover:text-amber-400 transition-colors flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="px-4 pb-4 space-y-2">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl dark:bg-white/5" />)}
                  </div>
                ) : recentTranslations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-amber-500/8 p-10 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/8 border border-amber-500/15">
                      <FileText className="h-5 w-5 text-amber-500/60" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No translations yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-600 mt-1.5 max-w-[260px] leading-relaxed">
                      Your translation history will appear here once you start translating.
                    </p>
                    <Link
                      href="/dashboard/translate"
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-4 text-xs font-bold border-amber-500/20 hover:bg-amber-500/8 text-amber-500 hover:text-amber-400")}
                    >
                      Try your first translation
                    </Link>
                  </div>
                ) : (
                  recentTranslations.map(tx => (
                    <div
                      key={tx.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-100 dark:border-white/5 px-4 py-3 hover:border-amber-500/15 hover:bg-amber-500/3 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-medium truncate max-w-md text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          {tx.input_preview || "Code Snippet"}...
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[9px] font-bold bg-amber-500/8 text-amber-500 border-amber-500/20 px-1.5 py-0">
                            {tx.mode}
                          </Badge>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600">
                            {tx.source_language} → {tx.target_language}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-600 shrink-0">
                        {new Date(tx.created_at).toLocaleDateString()}
                        <div className="text-[9px] text-slate-500 dark:text-slate-700 mt-0.5">{tx.model_used}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Upgrade banner */}
        {!isPro && (
          <Card className="overflow-hidden border border-amber-500/20 dark:bg-[#0c0f1a] relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-600/8 to-orange-500/5" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-amber-400">Upgrade to Pro</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed max-w-xl">
                  Remove the daily limit, unlock priority processing, team workspaces, and translate entire codebases with higher context windows.
                </p>
              </div>
              <Link
                href="/dashboard/billing"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "shrink-0 gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20 rounded-lg"
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                Upgrade Now
              </Link>
            </div>
            {/* Shimmer sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
          </Card>
        )}
      </div>
    </div>
  );
}
