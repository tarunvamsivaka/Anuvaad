"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Code2, History, Settings, CreditCard,
  LayoutDashboard, LogOut, Menu, X, Users,
  Sparkles, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/landing/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef, Suspense } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { WorkspaceProvider, useWorkspace } from "@/context/WorkspaceContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ErrorCard } from "@/components/ui/error-card";
import { CommandPalette } from "@/components/CommandPalette";
import "./layout.css";

const sidebarLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, desc: "Overview" },
  { label: "Workspace", href: "/dashboard/workspace", icon: Users, desc: "Team" },
  { label: "Translate", href: "/dashboard/translate", icon: Code2, desc: "Translate" },
  { label: "History", href: "/dashboard/history", icon: History, desc: "Logs" },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, desc: "Plan" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, desc: "Config" },
];





function SidebarContent({
  pathname,
  isPro,
  onNavigate,
}: {
  pathname: string;
  isPro: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center border-b border-border-subtle px-4 overflow-hidden">
        <Logo showText={true} iconSize={22} textSize="text-sm" />
      </div>

      {/* Nav section label (hidden when collapsed via CSS) */}
      <div className="sidebar-label px-5 pt-4 pb-2 opacity-0 transition-opacity duration-200">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-muted">Navigation</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto overflow-x-hidden">
        {sidebarLinks.map((link) => {
          const isActive = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              title={link.label}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "nav-link-active"
                  : "text-text-muted hover:bg-surface-mid hover:text-text-primary"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive ? "text-amber-400" : "text-text-muted group-hover:text-text-primary"
              )} />
              <span className="sidebar-text truncate whitespace-nowrap opacity-0 transition-opacity duration-200">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 p-3 space-y-2">
        {/* Upgrade CTA for free users */}
        {!isPro && (
          <div className="sidebar-upgrade relative overflow-hidden rounded-xl border border-border-medium bg-gradient-to-br from-amber-500/10 to-orange-500/5 transition-all duration-200 p-3 h-[44px]">
            <div className="absolute left-3 top-3 flex items-center justify-center">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="sidebar-upgrade-content ml-8 opacity-0 transition-opacity duration-200 w-[150px]">
              <p className="text-xs font-bold text-amber-400 mb-1">Upgrade to Pro</p>
              <Link
                href="/dashboard/billing"
                className="block w-full text-center text-[10px] font-bold text-surface-base bg-amber-400 hover:bg-amber-300 rounded-lg py-1 transition-colors"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        )}
        <div className="flex justify-center border-t border-border-faint pt-2">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isPro, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen bg-surface-low text-text-primary relative">
      {/* ARCH-02: Auth guard is handled server-side by proxy.ts middleware.
          The useEffect redirect was removed to prevent flash-of-unauthenticated-content (FOUC). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        Skip to main content
      </a>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3.5 left-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-amber-500/15 bg-white dark:bg-surface-mid shadow-md md:hidden"
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
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-amber-500/10 bg-white dark:bg-[#090d17] transition-transform duration-300 md:hidden shadow-2xl",
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
        />
      </aside>

      {/* Desktop sidebar - Hover to expand */}
      <aside
        className={cn(
          "desktop-sidebar fixed inset-y-0 left-0 z-30 hidden md:flex flex-col border-r border-border-subtle bg-surface-mid transition-all duration-250 ease-out-expo overflow-hidden"
        )}
      >
        <SidebarContent
          pathname={pathname}
          isPro={isPro}
        />
      </aside>

      {/* Main content — wrapped in ErrorBoundary + Suspense (FRONT-03) */}
      <main
        id="main-content"
        className="flex-1 transition-all duration-250 ml-0 md:ml-[60px]"
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <DashboardSidebar>{children}</DashboardSidebar>
      <CommandPalette />
    </WorkspaceProvider>
  );
}
