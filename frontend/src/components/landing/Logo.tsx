"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  iconSize?: number;
  textSize?: string;
}

export function Logo({
  className,
  showText = true,
  iconSize = 28,
  textSize = "text-xl",
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {/* ── HIGH-FIDELITY GLOWING SVG LOGO MARK ── */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-500 hover:scale-110 hover:rotate-3"
      >
        <defs>
          {/* Gradient for left bracket (Indigo -> Purple) */}
          <linearGradient id="chevron-left-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          {/* Gradient for right bracket (Purple -> Pink) */}
          <linearGradient id="chevron-right-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          {/* Gradient for crossbar bridge (Cyan -> Blue) */}
          <linearGradient id="bridge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          {/* Drop shadow / glow filters */}
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer subtle shield container */}
        <path
          d="M50 5 L88 25 V65 L50 92 L12 65 V25 L50 5 Z"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="1.5"
          fill="rgba(6, 6, 19, 0.2)"
        />

        {/* Left Chevron (forms left side of 'A') */}
        <path
          d="M40 32 L22 50 L40 68"
          stroke="url(#chevron-left-grad)"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#neon-glow)"
        />

        {/* Right Chevron (forms right side of 'A') */}
        <path
          d="M60 32 L78 50 L60 68"
          stroke="url(#chevron-right-grad)"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#neon-glow)"
        />

        {/* Horizontal Translation Bridge (completes the 'A') */}
        <path
          d="M33 50 H67"
          stroke="url(#bridge-grad)"
          strokeWidth="8.5"
          strokeLinecap="round"
          filter="url(#neon-glow)"
        />

        {/* Central glowing core node */}
        <circle cx="50" cy="50" r="4.5" fill="#ffffff" filter="url(#neon-glow)" />
      </svg>

      {/* ── BRAND NAME TYPOGRAPHY ── */}
      {showText && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent",
              textSize
            )}
          >
            Anuvaad
          </span>
          <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.15)]">
            AI
          </span>
        </div>
      )}
    </div>
  );
}
