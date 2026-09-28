"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  iconSize?: number;
  textSize?: string;
  theme?: "light" | "dark" | "auto";
}

export function Logo({
  className,
  showText = true,
  iconSize = 28,
  textSize = "text-xl",
  theme = "auto",
}: LogoProps) {
  const id = useId();
  const gradientId = `logo-grad-${id}`;
  const glowId = `logo-glow-${id}`;
  const bridgeGradId = `logo-bridge-${id}`;

  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      {/* ── ANUVAAD SVG LOGOMARK — Amber Brand Aligned ── */}
      {/* Two chevrons forming the letter "A" with a translation bridge crossbar */}
      {/* Represents: code (left) → language bridge (center) → english (right) */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Anuvaad logo"
        role="img"
        className="shrink-0 transition-transform duration-300 hover:scale-110 hover:rotate-3"
      >
        <defs>
          {/* Left chevron: deep amber → amber */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          {/* Right chevron: amber → orange for depth */}
          <linearGradient id={bridgeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          {/* Soft amber glow filter */}
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer shield outline — very subtle, only visible on dark bg */}
        <path
          d="M50 5 L88 25 V65 L50 92 L12 65 V25 L50 5 Z"
          stroke="rgba(245,158,11,0.08)"
          strokeWidth="1.5"
          fill="rgba(245,158,11,0.04)"
        />

        {/* Left Chevron — code bracket < */}
        <path
          d="M40 30 L20 50 L40 70"
          stroke={`url(#${gradientId})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />

        {/* Right Chevron — code bracket > */}
        <path
          d="M60 30 L80 50 L60 70"
          stroke={`url(#${bridgeGradId})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />

        {/* Horizontal Translation Bridge — the crossbar of the A */}
        {/* This element represents the act of translation between languages */}
        <path
          d="M30 50 H70"
          stroke="#fcd34d"
          strokeWidth="7"
          strokeLinecap="round"
          filter={`url(#${glowId})`}
        />

        {/* Central glowing core node — the AI nexus point */}
        <circle cx="50" cy="50" r="4" fill="#ffffff" filter={`url(#${glowId})`} />
      </svg>

      {/* Brand wordmark */}
      {showText && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-bold tracking-tight",
              theme === "light"
                ? "text-slate-900"
                : theme === "dark"
                ? "text-white"
                : "text-slate-900 dark:text-white",
              textSize
            )}
          >
            Anuvaad
          </span>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
              theme === "light"
                ? "border border-amber-200 bg-amber-50 text-amber-700"
                : theme === "dark"
                ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            )}
          >
            AI
          </span>
        </div>
      )}
    </div>
  );
}
