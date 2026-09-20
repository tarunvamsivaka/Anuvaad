"use client";

import React, { type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal, type UseScrollRevealOptions } from "@/lib/use-scroll-reveal";

export interface ScrollRevealProps extends UseScrollRevealOptions {
  children: ReactNode;
  className?: string;
  /** Animation variant. Default "fade-up" */
  variant?: "fade-up" | "fade-down" | "fade-left" | "fade-right" | "scale-in" | "fade";
  /** Delay in ms before animation starts. Default 0 */
  delay?: number;
  /** HTML element to render as. Default "div" */
  as?: ElementType;
}

const VARIANT_CLASSES: Record<NonNullable<ScrollRevealProps["variant"]>, string> = {
  "fade-up":    "sr-fade-up",
  "fade-down":  "sr-fade-down",
  "fade-left":  "sr-fade-left",
  "fade-right": "sr-fade-right",
  "scale-in":   "sr-scale-in",
  "fade":       "sr-fade",
};

/**
 * Wraps children in a scroll-reveal container.
 * On viewport entry the `is-visible` class is applied, triggering CSS animations.
 *
 * @example
 * <ScrollReveal variant="fade-up" delay={200}>
 *   <MyCard />
 * </ScrollReveal>
 */
export function ScrollReveal({
  children,
  className,
  variant = "fade-up",
  delay = 0,
  threshold,
  once,
  rootMargin,
  as,
}: ScrollRevealProps) {
  const [ref, isVisible] = useScrollReveal<HTMLElement>({ threshold, once, rootMargin });
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      ref={ref}
      className={cn(VARIANT_CLASSES[variant], isVisible && "is-visible", className)}
      style={delay > 0 ? ({ "--sr-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}

export default ScrollReveal;
