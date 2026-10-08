"use client";

import React from "react";
import {
  FolderTree,
  Code2,
  GitPullRequest,
  ShieldCheck,
  Network,
  Settings,
} from "lucide-react";
import { useTranslationStore } from "@/stores/translationStore";

export function GlobalSidebar() {
  const { activeView, setActiveView, openGithubPrModal } = useTranslationStore();

  const navItems = [
    { id: "repo", label: "Repository Tree", icon: FolderTree },
    { id: "editor", label: "Dual-Pane Editor", icon: Code2 },
    { id: "symbols", label: "AST Symbol Graph", icon: Network },
    { id: "audit", label: "ZDR Audit Receipts", icon: ShieldCheck },
  ] as const;

  return (
    <aside
      className="flex h-full w-[60px] flex-col items-center justify-between border-r border-[#202020] bg-[#0c0c0f] py-4"
      aria-label="Application navigation"
    >
      {/* Top Brand Logo */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-[#0a0a0a] font-bold text-base shadow-lg shadow-[#f59e0b]/20">
          अ
        </div>

        {/* Primary View Navigation */}
        <nav className="flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0f] ${
                  isActive
                    ? "bg-[#171717] text-[#f59e0b]"
                    : "text-[#94a3b8] hover:bg-[#141416] hover:text-[#f8fafc]"
                }`}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[#f59e0b]" />
                )}
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Tools & Actions */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={openGithubPrModal}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#141416] hover:text-[#22c55e] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0f]"
          title="Create GitHub Pull Request"
          aria-label="Create GitHub Pull Request"
        >
          <GitPullRequest className="h-5 w-5" />
        </button>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#141416] hover:text-[#f8fafc] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0f]"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
