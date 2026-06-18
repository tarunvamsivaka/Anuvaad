"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface FlowCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  pattern?: "dots" | "grid";
  size?: number;
  opacity?: number;
}

export function FlowCanvas({
  children,
  className,
  pattern = "dots",
  size = 24,
  opacity = 0.15,
  ...props
}: FlowCanvasProps) {
  return (
    <div className={cn("relative min-h-[400px] w-full overflow-hidden", className)} {...props}>
      {/* Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity,
          backgroundImage: pattern === "dots"
            ? `radial-gradient(circle at center, currentColor 1.5px, transparent 1.5px)`
            : `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: `${size}px ${size}px`,
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
      {/* Content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
