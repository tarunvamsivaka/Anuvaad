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

const stats = [
  {
    label: "Translations Today",
    value: "3",
    limit: "/10",
    icon: Code2,
    color: "text-amber-600",
    bg: "bg-amber-600/10",
  },
  {
    label: "This Week",
    value: "18",
    icon: TrendingUp,
    color: "text-blue-600",
    bg: "bg-blue-600/10",
  },
  {
    label: "Total Translations",
    value: "127",
    icon: FileText,
    color: "text-emerald-600",
    bg: "bg-emerald-600/10",
  },
  {
    label: "Avg. Response",
    value: "1.2s",
    icon: Clock,
    color: "text-purple-600",
    bg: "bg-purple-600/10",
  },
];

const recentTranslations = [
  {
    title: "fibonacci.py",
    language: "Python",
    mode: "Code → English",
    time: "2 min ago",
  },
  {
    title: "quicksort.java",
    language: "Java",
    mode: "Code → English",
    time: "15 min ago",
  },
  {
    title: "React useState hook",
    language: "JavaScript",
    mode: "English → Code",
    time: "1 hour ago",
  },
  {
    title: "binary_search.cpp",
    language: "C++",
    mode: "Code → Code",
    time: "3 hours ago",
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold">Dashboard</h1>
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
          {stats.map((stat) => {
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
                  <span className="text-2xl font-bold">{stat.value}</span>
                  {stat.limit && (
                    <span className="text-sm text-muted-foreground">
                      {stat.limit}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quick actions + Recent translations */}
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

          {/* Recent translations */}
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent Translations</h2>
              <Link
                href="/dashboard/history"
                className="text-xs font-medium text-amber-600 hover:text-amber-700"
              >
                View All →
              </Link>
            </div>
            <div className="mt-4 space-y-1">
              {recentTranslations.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                    {t.language.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.mode}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {t.language}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t.time}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Upgrade banner for free users */}
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
      </div>
    </div>
  );
}
