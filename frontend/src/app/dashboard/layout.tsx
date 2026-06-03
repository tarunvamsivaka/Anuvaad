"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Code2, History, Settings, CreditCard,
  LayoutDashboard, ChevronLeft, ChevronRight, LogOut, Menu, X, Users,
  ChevronDown, Sparkles, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/landing/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { WorkspaceProvider, useWorkspace } from "@/context/WorkspaceContext";

const sidebarLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, desc: "Overview" },
  { label: "Workspace", href: "/dashboard/workspace", icon: Users, desc: "Team" },
  { label: "Translate", href: "/dashboard/translate", icon: Code2, desc: "Translate" },
  { label: "History", href: "/dashboard/history", icon: History, desc: "Logs" },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, desc: "Plan" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, desc: "Config" },
];

function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (collapsed) return null;

  const currentName = activeWorkspace?.name || "Personal Workspace";

  return (
    <div className="px-3 py-2" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-amber-500/10 bg-amber-500/4 px-3 py-2 text-xs font-medium text-slate-300 hover:border-amber-500/20 hover:bg-amber-500/8 transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-5 w-5 shrink-0 rounded bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
            <span className="text-[9px] font-bold text-amber-400">{currentName[0].toUpperCase()}</span>
          </div>
          <span className="truncate">{currentName}</span>
        </div>
        <ChevronDown className={cn("h-3 w-3 shrink-0 text-slate-500 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg border border-amber-500/10 bg-[#0c0f1a] shadow-xl overflow-hidden">
          <div
            onClick={() => { setActiveWorkspace(null); setOpen(false); }}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition-colors",
              !activeWorkspace ? "bg-amber-500/10 text-amber-400" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            )}
          >
            <div className="h-4 w-4 rounded bg-slate-700 flex items-center justify-center">
              <span className="text-[8px] font-bold text-slate-300">P</span>
            </div>
            Personal Workspace
          </div>
          {workspaces.map(ws => (
            <div
              key={ws.id}
              onClick={() => { setActiveWorkspace(ws); setOpen(false); }}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition-colors",
                activeWorkspace?.id === ws.id ? "bg-amber-500/10 text-amber-400" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <div className="h-4 w-4 rounded bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <span className="text-[8px] font-bold text-amber-400">{ws.name[0].toUpperCase()}</span>
              </div>
              {ws.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserAvatar({ email }: { email?: string }) {
  const letter = email ? email[0].toUpperCase() : "U";
  const colors = [
    "from-amber-500 to-orange-600",
    "from-violet-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-blue-500 to-indigo-600",
    "from-rose-500 to-pink-600",
  ];
  const colorIdx = email ? email.charCodeAt(0) % colors.length : 0;
  return (
    <div className={cn(
      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold text-white",
      colors[colorIdx]
    )}>
      {letter}
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
      <div className="flex h-14 items-center border-b border-amber-500/8 px-4 overflow-hidden">
        <Logo showText={!collapsed} iconSize={22} textSize="text-sm" />
      </div>

      <WorkspaceSwitcher collapsed={collapsed} />

      {/* Nav section label */}
      {!collapsed && (
        <div className="px-5 pt-2 pb-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">Navigation</span>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 px-2 py-1">
        {sidebarLinks.map((link) => {
          const isActive = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              title={collapsed ? link.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                isActive
                  ? "bg-amber-500/10 text-amber-400 nav-active-glow"
                  : "text-slate-500 hover:bg-white/4 hover:text-slate-200",
                collapsed && "justify-center px-0"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active left border accent */}
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              )}
              <Icon className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive ? "text-amber-400" : "text-slate-600 group-hover:text-slate-300"
              )} />
              {!collapsed && (
                <span className="flex-1">{link.label}</span>
              )}
              {!collapsed && isActive && (
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
              )}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-amber-500/8 mx-3 w-auto" />

      {/* Bottom user section */}
      <div className="space-y-2 px-2 py-3">
        {/* Theme toggle */}
        <div className={cn("flex", collapsed ? "justify-center px-0" : "px-3")}>
          <ThemeToggle />
        </div>


        {collapsed ? (
          <button
            title={user?.email}
            className="flex w-full items-center justify-center rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
          >
            <UserAvatar email={user?.email} />
          </button>
        ) : (
          <>
            {/* User card */}
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/8 bg-amber-500/3 px-3 py-2.5">
              <UserAvatar email={user?.email} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold text-slate-200">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isPro ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                      <Sparkles className="h-2.5 w-2.5" /> Pro Plan
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500">Free Plan</span>
                  )}
                </div>
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-white/4 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </>
        )}

        {/* Upgrade CTA for free users */}
        {!isPro && !collapsed && (
          <div className="mx-1 rounded-xl border border-amber-500/15 bg-gradient-to-br from-amber-500/8 to-orange-500/4 p-3 mt-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <p className="text-xs font-bold text-amber-400">Upgrade to Pro</p>
            </div>
            <p className="text-[10px] text-slate-500 mb-2.5 leading-relaxed">
              Unlimited translations, priority AI, team workspaces.
            </p>
            <Link
              href="/dashboard/billing"
              className="block w-full text-center text-[10px] font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg py-1.5 transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#080c14] text-slate-900 dark:text-slate-100 relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        Skip to main content
      </a>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3.5 left-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-amber-500/15 bg-white dark:bg-[#0c0f1a] shadow-md md:hidden"
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
          collapsed={false}
          pathname={pathname}
          user={user}
          isPro={isPro}
          onSignOut={handleSignOut}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden md:flex flex-col border-r border-amber-500/8 bg-white dark:bg-[#090d17] transition-all duration-250 shadow-[1px_0_0_rgba(245,158,11,0.04)]",
          collapsed ? "w-[60px]" : "w-[224px]"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          user={user}
          isPro={isPro}
          onSignOut={handleSignOut}
        />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-[72px] flex h-6 w-6 items-center justify-center rounded-full border border-amber-500/15 bg-[#090d17] text-slate-500 shadow-md hover:text-amber-400 hover:border-amber-500/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Main content */}
      <main
        id="main-content"
        className={cn(
          "flex-1 transition-all duration-250",
          "ml-0 md:ml-[224px]",
          collapsed && "md:ml-[60px]"
        )}
      >
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
