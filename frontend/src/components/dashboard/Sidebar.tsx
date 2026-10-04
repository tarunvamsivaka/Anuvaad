"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Code2, History, Settings, CreditCard,
  LayoutDashboard, Menu, X, Users,
  Zap, GitPullRequest, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/landing/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, Suspense } from "react";
import { WorkspaceSwitcher } from "@/components/dashboard/TopBar";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ErrorCard } from "@/components/ui/error-card";

const sidebarLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, desc: "Overview" },
  { label: "Translate", href: "/dashboard/translate", icon: Code2, desc: "Translate" },
  { label: "PR Review", href: "/dashboard/pr-review", icon: GitPullRequest, desc: "Reviews" },
  { label: "Workspace", href: "/dashboard/workspace", icon: Users, desc: "Team" },
  { label: "History", href: "/dashboard/history", icon: History, desc: "Logs" },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, desc: "Plan" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, desc: "Config" },
];

function SidebarContent({
  pathname,
  isPro,
  onNavigate,
  showSwitcher = false,
  isCollapsed = false,
  onToggleCollapse,
}: {
  pathname: string;
  isPro: boolean;
  onNavigate?: () => void;
  showSwitcher?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo and Collapse Toggle Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-3 overflow-hidden">
        <div className="flex items-center gap-2 overflow-hidden">
          <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
            <Logo showText={!isCollapsed} iconSize={22} textSize="text-sm" />
          </Link>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar (Cmd+B)" : "Collapse sidebar (Cmd+B)"}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-mid hover:text-text-primary transition-colors"
            title={isCollapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {showSwitcher && (
        <div className="px-3 py-3 border-b border-border-faint">
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Nav section label */}
      {!isCollapsed && (
        <div className="px-4 pt-4 pb-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-muted">Navigation</span>
        </div>
      )}

      {/* Nav links */}
      <nav role="navigation" aria-label="Dashboard navigation" className="flex-1 space-y-1 px-2.5 pt-2 overflow-y-auto overflow-x-hidden">
        {sidebarLinks.map((link) => {
          const isActive = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
          const Icon = link.icon;

          const linkElement = (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              aria-label={link.label}
              className={cn(
                "group flex items-center rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all duration-150 relative overflow-hidden",
                isCollapsed ? "justify-center gap-0" : "gap-3",
                isActive
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold shadow-xs before:absolute before:left-0 before:inset-y-1 before:w-[3px] before:rounded-r before:bg-amber-500"
                  : "text-text-muted hover:bg-surface-mid hover:text-text-primary"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive ? "text-amber-500" : "text-text-muted group-hover:text-text-primary"
              )} aria-hidden="true" />
              {!isCollapsed && (
                <span className="truncate whitespace-nowrap text-xs sm:text-sm">{link.label}</span>
              )}
            </Link>
          );

          if (isCollapsed) {
            return (
              <div key={link.href} title={link.label}>
                {linkElement}
              </div>
            );
          }

          return linkElement;
        })}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 p-2.5 space-y-2">
        {/* Upgrade CTA for free users */}
        {!isPro && (
          <div className={cn(
            "relative overflow-hidden rounded-xl border border-border-medium bg-gradient-to-br from-amber-500/10 to-orange-500/5 transition-all duration-200 p-2.5",
            isCollapsed ? "flex items-center justify-center h-10 p-0" : "block"
          )}>
            {isCollapsed ? (
              <Link
                href="/dashboard/billing"
                className="flex items-center justify-center w-full h-full text-amber-500 hover:text-amber-400 py-2.5"
                aria-label="Upgrade to Pro"
                title="Upgrade to Pro"
              >
                <Zap className="h-4 w-4 fill-current" />
              </Link>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500 fill-current" />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Upgrade to Pro</span>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="block w-full text-center text-[11px] font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg py-1.5 transition-colors shadow-xs"
                >
                  Upgrade Now
                </Link>
              </div>
            )}
          </div>
        )}
        {!isCollapsed && (
          <div className="px-2 py-1.5 font-mono text-[10px] text-slate-500 border-t border-border-faint flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="led-indicator led-emerald" aria-hidden="true" />
              <span>Review output beside source</span>
            </span>
          </div>
        )}
        <div className="flex justify-center border-t border-border-faint pt-2">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isPro } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load initial collapsed state from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("anuvaad_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  // Toggle collapse with keyboard shortcut Cmd+B / Ctrl+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsCollapsed((prev) => {
          const next = !prev;
          try {
            localStorage.setItem("anuvaad_sidebar_collapsed", String(next));
          } catch {}
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("anuvaad_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    requestAnimationFrame(() => {
      setMobileOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    if (!loading && user) {
      if (!user.user_metadata?.onboarded && pathname !== "/dashboard/welcome") {
        router.push("/dashboard/welcome");
      }
    }
  }, [user, loading, pathname, router]);

  return (
    <div className="flex min-h-screen bg-surface-low text-text-primary relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        Skip to main content
      </a>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3.5 left-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-mid shadow-md md:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-white dark:bg-surface-mid transition-transform duration-300 md:hidden shadow-2xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent
          pathname={pathname}
          isPro={isPro}
          onNavigate={() => setMobileOpen(false)}
          showSwitcher={true}
          isCollapsed={false}
        />
      </aside>

      {/* Desktop sidebar - Pinned collapsible rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden md:flex flex-col border-r border-border-subtle bg-surface-mid transition-all duration-300 ease-in-out overflow-hidden",
          isCollapsed ? "w-[64px]" : "w-[240px]"
        )}
      >
        <SidebarContent
          pathname={pathname}
          isPro={isPro}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </aside>

      {/* Main content — smoothly pushed by the sidebar */}
      <main
        id="main-content"
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out ml-0",
          isCollapsed ? "md:ml-[64px]" : "md:ml-[240px]"
        )}
      >
        <ErrorBoundary
          fallback={({ error, reset }) => (
            <ErrorCard
              title="Something went wrong"
              description={error.message}
              onRetry={reset}
            />
          )}
        >
          <Suspense
            fallback={
              <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500/20 border-t-amber-500" />
              </div>
            }
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
