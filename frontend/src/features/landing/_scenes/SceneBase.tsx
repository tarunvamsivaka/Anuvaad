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
}

export function SceneBase({
  id,
  active,
  className,
  children,
  sceneName,
  sceneNumber,
}: SceneBaseProps) {
  return (
    <div
      className={cn(
        "w-full h-full flex flex-col justify-center items-center relative text-slate-100 transition-opacity duration-500",
        active ? "opacity-100" : "opacity-30",
        className
      )}
      data-scene-base={id}
    >
      {/* Subtle background glow mapping to tokens */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.02),rgba(255,255,255,0))] pointer-events-none" />

      {/* Decorative scanning line */}
      {active && (
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/10 to-transparent pointer-events-none" />
      )}

      <div className="container mx-auto px-6 h-full flex flex-col justify-between py-20 relative z-10">
        {/* Top bar indicating active scene state */}
        <div className="flex items-center gap-3 w-full justify-start select-none">
          <span className="text-[10px] tracking-widest font-extrabold text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            {sceneName}
          </span>
          <span className="text-xs text-white/40 font-mono">
            {sceneNumber}
          </span>
        </div>

        {/* Content area */}
        <div className="flex-1 w-full flex items-center justify-center my-auto">
          {children}
        </div>

        {/* Bottom indicator placeholder */}
        <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-500 select-none">
          <div className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-amber-400 animate-pulse" : "bg-white/10")} />
            <span>{active ? "SCENE_ACTIVE" : "SCENE_STANDBY"}</span>
          </div>
          <span>Anuvaad Experiential Narrative</span>
        </div>
      </div>
    </div>
  );
}
