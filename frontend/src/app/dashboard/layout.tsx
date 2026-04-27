"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Code2, History, Settings, CreditCard,
  LayoutDashboard, ChevronLeft, ChevronRight, User, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";

const sidebarLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Translate", href: "/dashboard/translate", icon: Code2 },
  { label: "History", href: "/dashboard/history", icon: History },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isPro, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!loading && !user) router.push("/signin");
  }, [loading, user, router]);

  // Show nothing while checking auth
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border/60 bg-card transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}>
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-amber-600 text-xs font-bold text-white">A</div>
          {!collapsed && <span className="text-sm font-semibold tracking-tight">Anuvaad</span>}
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-2 py-3">
          {sidebarLinks.map((link) => {
            const isActive = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
            const Icon = link.icon;
            const linkEl = (
              <Link key={link.href} href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-amber-600/10 text-amber-700 dark:text-amber-500" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}>
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && link.label}
              </Link>
            );
            if (collapsed) {
              return (
                <Tooltip key={link.href}>
                  <TooltipTrigger>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right">{link.label}</TooltipContent>
                </Tooltip>
              );
            }
            return linkEl;
          })}
        </nav>

        <Separator />

        {/* User section */}
        <div className="space-y-1 px-2 py-3">
          {/* Theme toggle */}
          <div className={cn("flex", collapsed ? "justify-center" : "px-3")}>
            <ThemeToggle />
          </div>

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger>
                <button className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                  <User className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{user.email}</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium">{user.email}</p>
                  <p className="text-[10px] text-muted-foreground">{isPro ? "✦ Pro Plan" : "Free Plan"}</p>
                </div>
              </div>
              <button onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground">
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      <main className={cn("flex-1 transition-all duration-200", collapsed ? "ml-[60px]" : "ml-[220px]")}>
        {children}
      </main>
    </div>
  );
}
