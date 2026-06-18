"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassPaneProps extends HTMLMotionProps<"div"> {
  intensity?: "low" | "medium" | "high";
  children: React.ReactNode;
}

export function GlassPane({
  intensity = "medium",
  className,
  children,
  ...props
}: GlassPaneProps) {
  const intensityMap = {
    low: "bg-background/40 backdrop-blur-sm border-white/5",
    medium: "bg-background/60 backdrop-blur-md border-white/10",
    high: "bg-background/80 backdrop-blur-xl border-white/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-2xl border shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
        intensityMap[intensity],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
