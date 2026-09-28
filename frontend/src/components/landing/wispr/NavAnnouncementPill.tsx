"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ANNOUNCEMENT_KEY = "anuvaad_announcement_dismissed_v1";
const ANNOUNCEMENT_TEXT = "DeepSeek R1 reasoning model now live";
const ANNOUNCEMENT_HREF = "#playground";

export function NavAnnouncementPill({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if not dismissed
    try {
      const dismissed = localStorage.getItem(ANNOUNCEMENT_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVisible(false);
    try {
      localStorage.setItem(ANNOUNCEMENT_KEY, "1");
    } catch {
      // ignore storage errors
    }
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "w-full flex items-center justify-center py-2 px-4 bg-amber-500/8 border-b border-amber-500/15 text-xs font-medium text-slate-700 dark:text-slate-300",
        className
      )}
      role="banner"
      aria-label="Product announcement"
    >
      <Link
        href={ANNOUNCEMENT_HREF}
        className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-white transition-colors group"
      >
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wide border border-amber-500/20">
          <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
          New
        </span>
        <span>{ANNOUNCEMENT_TEXT}</span>
        <span className="text-amber-500 group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
          &rarr;
        </span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="ml-4 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default NavAnnouncementPill;
