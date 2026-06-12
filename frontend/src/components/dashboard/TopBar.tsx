"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/context/WorkspaceContext";

function WorkspaceSwitcher() {
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

  const currentName = activeWorkspace?.name || "Personal Workspace";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-xs font-medium text-text-primary hover:border-border-active transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-amber-500/15 text-[9px] font-bold text-amber-500 border border-amber-500/20">
            {currentName[0].toUpperCase()}
          </div>
          <span className="truncate max-w-[120px]">{currentName}</span>
        </div>
        <ChevronDown className={cn("h-3 w-3 shrink-0 text-text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-48 rounded-lg border border-border-subtle bg-surface-overlay shadow-xl overflow-hidden z-50">
          <div
            onClick={() => { setActiveWorkspace(null); setOpen(false); }}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition-colors",
              !activeWorkspace ? "bg-amber-500/10 text-text-amber" : "text-text-primary hover:bg-white/5 hover:text-white"
            )}
          >
            <div className="flex h-4 w-4 items-center justify-center rounded bg-surface-mid border border-border-subtle text-[8px] font-bold">
              P
            </div>
            Personal Workspace
          </div>
          {workspaces.map(ws => (
            <div
              key={ws.id}
              onClick={() => { setActiveWorkspace(ws); setOpen(false); }}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition-colors",
                activeWorkspace?.id === ws.id ? "bg-amber-500/10 text-text-amber" : "text-text-primary hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="flex h-4 w-4 items-center justify-center rounded bg-amber-500/15 border border-amber-500/20 text-[8px] font-bold text-text-amber">
                {ws.name[0].toUpperCase()}
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
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-xs font-bold text-on-brand shadow-sm">
      {letter}
    </div>
  );
}

export function TopBar({ breadcrumb, action }: { breadcrumb?: React.ReactNode; action?: React.ReactNode }) {
  const { user, isPro } = useAuth();

  return (
    <header className="topbar flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {breadcrumb ? (
          <div className="text-sm font-semibold tracking-tight text-text-primary">{breadcrumb}</div>
        ) : (
          <div className="text-sm font-semibold tracking-tight text-text-primary invisible">Dashboard</div>
        )}
      </div>

      <div className="flex items-center justify-center absolute left-1/2 -translate-x-1/2">
        <WorkspaceSwitcher />
      </div>

      <div className="flex items-center gap-3">
        {action}
        <ThemeToggle />
        <div className="group relative">
          <UserAvatar email={user?.email} />
          <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border-subtle bg-surface-overlay p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-50 shadow-xl">
            <p className="truncate text-xs font-semibold text-text-primary">{user?.email}</p>
            <div className="mt-1 flex items-center gap-1.5">
              {isPro ? (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-text-amber">
                  <Sparkles className="h-2.5 w-2.5" /> Pro Plan
                </span>
              ) : (
                <span className="rounded bg-surface-mid px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                  Free Plan
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
