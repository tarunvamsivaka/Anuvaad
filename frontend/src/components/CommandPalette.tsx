"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Code2, History, LayoutDashboard, Moon, Sun, Monitor, LogOut, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const { signOut } = useAuth();
  const { workspaces, setActiveWorkspace } = useWorkspace();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => setOpen(false)}
      />
      
      <div className="relative z-50 w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200/20 bg-white/95 dark:bg-[#1a1b26]/95 p-2 shadow-2xl backdrop-blur-md">
        <Command 
          className="flex h-full w-full flex-col overflow-hidden bg-transparent"
          label="Global Command Menu"
        >
          <div className="flex items-center border-b border-slate-200 dark:border-white/10 px-3 pb-2">
            <Command.Input 
              autoFocus
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 text-slate-900 dark:text-slate-100" 
              placeholder="Type a command or search..." 
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-slate-500">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-slate-500">
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard"))}
                className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-slate-100 aria-selected:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:aria-selected:bg-blue-600/20 dark:aria-selected:text-blue-400")}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard/translate"))}
                className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-slate-100 aria-selected:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:aria-selected:bg-blue-600/20 dark:aria-selected:text-blue-400")}
              >
                <Code2 className="mr-2 h-4 w-4" />
                <span>New Translation</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard/history"))}
                className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-slate-100 aria-selected:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:aria-selected:bg-blue-600/20 dark:aria-selected:text-blue-400")}
              >
                <History className="mr-2 h-4 w-4" />
                <span>Translation History</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Workspaces" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-slate-500 mt-2">
              <Command.Item 
                onSelect={() => runCommand(() => {
                  setActiveWorkspace(null);
                  router.push("/dashboard");
                })}
                className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-slate-100 aria-selected:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:aria-selected:bg-blue-600/20 dark:aria-selected:text-blue-400")}
              >
                <Briefcase className="mr-2 h-4 w-4 text-emerald-500" />
                <span>Personal Workspace</span>
              </Command.Item>
              {workspaces.map(w => (
                <Command.Item 
                  key={w.id}
                  onSelect={() => runCommand(() => {
                    setActiveWorkspace(w);
                    router.push("/dashboard");
                  })}
                  className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-slate-100 aria-selected:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:aria-selected:bg-blue-600/20 dark:aria-selected:text-blue-400")}
                >
                  <Briefcase className="mr-2 h-4 w-4 text-blue-500" />
                  <span>Switch to: {w.name}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Theme" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-slate-500 mt-2">
              <Command.Item onSelect={() => runCommand(() => setTheme("light"))} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-slate-100 aria-selected:text-slate-900 dark:aria-selected:bg-blue-600/20 dark:aria-selected:text-blue-400">
                <Sun className="mr-2 h-4 w-4" /> Light
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => setTheme("dark"))} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-slate-100 aria-selected:text-slate-900 dark:aria-selected:bg-blue-600/20 dark:aria-selected:text-blue-400">
                <Moon className="mr-2 h-4 w-4" /> Dark
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => setTheme("system"))} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-slate-100 aria-selected:text-slate-900 dark:aria-selected:bg-blue-600/20 dark:aria-selected:text-blue-400">
                <Monitor className="mr-2 h-4 w-4" /> System
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Account" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-slate-500 mt-2">
              <Command.Item onSelect={() => runCommand(() => signOut())} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-red-100 aria-selected:text-red-900 dark:aria-selected:bg-red-500/20 dark:aria-selected:text-red-400">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </Command.Item>
            </Command.Group>

          </Command.List>
        </Command>
      </div>
    </div>
  );
}
