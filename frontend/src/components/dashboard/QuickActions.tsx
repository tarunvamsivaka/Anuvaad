"use client";

import Link from "next/link";
import { ArrowRight, Code2, FileText, ArrowLeftRight, Upload, Clock, GitBranch } from "lucide-react";
import { Card } from "@/components/ui/card";

export function QuickActions() {
  const actions = [
    {
      href: "/dashboard/translate",
      icon: FileText,
      label: "Understand Code",
      desc: "Code → English",
      color: "text-amber-500",
    },
    {
      href: "/dashboard/translate?mode=english-to-code",
      icon: Code2,
      label: "Modify Using English",
      desc: "English → Code",
      color: "text-emerald-500",
    },
    {
      href: "/dashboard/translate?mode=code-to-code",
      icon: ArrowLeftRight,
      label: "Convert Language",
      desc: "Code → Code",
      color: "text-blue-500",
    },
    {
      href: "/dashboard/translate?import=repo",
      icon: GitBranch,
      label: "Import Repository",
      desc: "Connect GitHub",
      color: "text-violet-500",
    },
    {
      href: "/dashboard/translate?upload=true",
      icon: Upload,
      label: "Upload File",
      desc: "Local machine",
      color: "text-rose-500",
    },
    {
      href: "/dashboard/history",
      icon: Clock,
      label: "Open Recent Project",
      desc: "View history",
      color: "text-cyan-500",
    },
  ];

  return (
    <Card className="dashboard-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-border-faint">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Quick Actions</h2>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map(({ href, icon: Icon, label, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="quick-action-item flex items-center gap-3 rounded-xl p-3 group"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-mid border border-border-subtle ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary group-hover:text-text-amber transition-colors">{label}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{desc}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-text-muted group-hover:text-text-amber group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>
    </Card>
  );
}
