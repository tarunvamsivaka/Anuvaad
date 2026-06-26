"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SceneBaseProps {
  id: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
  sceneName: string;
  sceneNumber: string;
  /** Optional: render with WisprFlow light background instead of default dark */
  lightBg?: boolean;
}

export function SceneBase({
  id,
  active,
  className,
  children,
  sceneName,
  sceneNumber,
  lightBg = false,
}: SceneBaseProps) {
  return (
    <div
      className={cn(
        "w-full h-full flex flex-col justify-center items-center relative transition-opacity duration-500",
        lightBg ? "text-neutral-900 bg-[#f5f3ef]" : "text-slate-100 bg-transparent",
        active ? "opacity-100" : "opacity-30",
        className
      )}
      data-scene-base={id}
    >
      {/* Subtle ambient glow */}
      {!lightBg && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.025),rgba(255,255,255,0))] pointer-events-none" />
      )}

      {/* Active scene scanning line */}
      {active && !lightBg && (
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/10 to-transparent pointer-events-none" />
      )}

      <div className="container mx-auto px-6 h-full flex flex-col justify-between py-20 relative z-10">
        {/* Scene label (top-left chip) */}
        <div className="flex items-center gap-3 w-full justify-start select-none">
          <span className={cn(
            "text-[10px] tracking-widest font-extrabold uppercase px-2 py-0.5 rounded-full",
            lightBg
              ? "text-amber-700 bg-amber-500/10 border border-amber-500/20"
              : "text-amber-400 bg-amber-500/10 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
          )}>
            {sceneName}
          </span>
          <span className={cn("text-xs font-mono", lightBg ? "text-neutral-400" : "text-white/40")}>
            {sceneNumber}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 w-full flex items-center justify-center my-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
