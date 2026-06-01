"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Code2, History, Settings, CreditCard,
  LayoutDashboard, ChevronLeft, ChevronRight, User, LogOut, Menu, X, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { WorkspaceProvider, useWorkspace } from "@/context/WorkspaceContext";

const sidebarLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workspace", href: "/dashboard/workspace", icon: Users },
  { label: "Translate", href: "/dashboard/translate", icon: Code2 },
  { label: "History", href: "/dashboard/history", icon: History },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  
  if (collapsed) return null;

  return (
    <div className="px-3 py-2">
      <select 
        className="w-full rounded-md border border-border/60 bg-muted/50 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
        value={activeWorkspace?.id || "personal"}
        onChange={(e) => {
          if (e.target.value === "personal") {
            setActiveWorkspace(null);
          } else {
            const ws = workspaces.find(w => w.id === e.target.value);
            if (ws) setActiveWorkspace(ws);
          }
        }}
      >
        <option value="personal" className="bg-background text-foreground">Personal Workspace</option>
        {workspaces.map(ws => (
          <option key={ws.id} value={ws.id} className="bg-background text-foreground">{ws.name}</option>
        ))}
      </select>
    </div>
  );
}

function SidebarContent({
  collapsed,
  pathname,
  user,
  isPro,
  onSignOut,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  user: SupabaseUser | null;
  isPro: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-amber-600 text-xs font-bold text-white">A</div>
        {!collapsed && <span className="text-sm font-semibold tracking-tight">Anuvaad</span>}
      </div>

      <WorkspaceSwitcher collapsed={collapsed} />

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {sidebarLinks.map((link) => {
          const isActive = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
          const Icon = link.icon;
          const linkEl = (
            <Link key={link.href} href={link.href} onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-amber-600/10 text-amber-700 dark:text-amber-500" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
              aria-current={isActive ? "page" : undefined}>
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
            <TooltipContent side="right">{user?.email}</TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground">{isPro ? "✦ Pro Plan" : "Free Plan"}</p>
              </div>
            </div>
            <button onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </>
        )}
      </div>
    </>
  );
}

function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isPro, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth redirect is handled server-side by middleware.ts — no flash.
  useEffect(() => {
    requestAnimationFrame(() => {
      setMobileOpen(false);
    });
  }, [pathname]);

  // Onboarding redirect
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
    <div className="flex min-h-screen bg-background relative">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
        Skip to main content
      </a>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3.5 left-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card shadow-sm md:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar (drawer) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border/60 bg-card transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent
          collapsed={false}
          pathname={pathname}
          user={user}
          isPro={isPro}
          onSignOut={handleSignOut}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 hidden md:flex flex-col border-r border-border/60 bg-card transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}>
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          user={user}
          isPro={isPro}
          onSignOut={handleSignOut}
        />

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Main content — responsive margin */}
      <main id="main-content" className={cn(
        "flex-1 transition-all duration-200",
        "ml-0 md:ml-[220px]",
        collapsed && "md:ml-[60px]"
      )}>
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <DashboardSidebar>{children}</DashboardSidebar>
    </WorkspaceProvider>
  );
}
