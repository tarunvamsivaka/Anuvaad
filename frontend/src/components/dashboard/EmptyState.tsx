import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export interface EmptyStateProps {
  /** SVG icon or illustration to display */
  icon?: React.ReactNode;
  /** Primary heading */
  title: string;
  /** Descriptive subtitle */
  description: string;
  /** Primary CTA */
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Secondary CTA */
  secondaryCta?: {
    label: string;
    href?: string;
  };
  className?: string;
}

/**
 * Reusable empty state component for dashboard sections with zero data.
 * Displays an SVG illustration, heading, description, and CTA buttons.
 */
export function EmptyState({
  icon,
  title,
  description,
  cta,
  secondaryCta,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30",
        className
      )}
      role="status"
      aria-label={title}
    >
      {/* Illustration */}
      {icon ? (
        <div className="mb-5 text-slate-300 dark:text-slate-600">{icon}</div>
      ) : (
        // Default: code translation icon
        <div className="mb-5" aria-hidden="true">
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-slate-300 dark:text-slate-700"
          >
            {/* Outer rounded rect */}
            <rect x="4" y="8" width="48" height="40" rx="8" stroke="currentColor" strokeWidth="2" />
            {/* Top bar dots */}
            <circle cx="14" cy="18" r="2.5" fill="currentColor" opacity="0.5" />
            <circle cx="21" cy="18" r="2.5" fill="currentColor" opacity="0.35" />
            <circle cx="28" cy="18" r="2.5" fill="currentColor" opacity="0.2" />
            {/* Left code bracket */}
            <path d="M16 28 L12 32 L16 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Right code bracket */}
            <path d="M24 28 L28 32 L24 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Divider arrow */}
            <path d="M32 32 H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M40 29 L44 32 L40 35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Amber accent on the arrow */}
            <path d="M32 32 H38" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Text */}
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mb-6">
        {description}
      </p>

      {/* CTAs */}
      {(cta || secondaryCta) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {cta && (
            cta.href ? (
              <Link
                href={cta.href}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all hover:scale-105 active:scale-95 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {cta.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={cta.onClick}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all hover:scale-105 active:scale-95 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {cta.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )
          )}
          {secondaryCta && secondaryCta.href && (
            <Link
              href={secondaryCta.href}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors underline underline-offset-2"
            >
              {secondaryCta.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
