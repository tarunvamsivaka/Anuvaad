"use client";

import React, { useEffect, useRef, useState } from "react";
import { LiveCounter } from "@/features/landing/_components/LiveCounter";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionSafe } from "@/lib/motion";

export const STATS = [
  {
    id: "translations",
    label: "Translations made",
    isLive: true,
    initialTarget: 4127000,
    value: "4,127,000+",
  },
  {
    id: "languages",
    numericTarget: 35,
    suffix: "+",
    label: "Languages supported",
    isLive: false,
    value: "35+",
  },
  {
    id: "speed",
    prefix: "< ",
    numericTarget: 3,
    suffix: "s",
    label: "Avg. translation time",
    isLive: false,
    value: "< 3s",
  },
  {
    id: "rating",
    numericTarget: 4.9,
    decimals: 1,
    suffix: " / 5",
    label: "Avg. user rating",
    isLive: false,
    value: "4.9 / 5",
  },
];

interface SlotMachineStatProps {
  stat: (typeof STATS)[number];
  hasTriggered: boolean;
  isReducedMotion: boolean;
  isLast: boolean;
}

function SlotMachineStat({ stat, hasTriggered, isReducedMotion, isLast }: SlotMachineStatProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [hovered, setHovered] = useState(false);

  // Synchronized count-up animation when triggered
  useEffect(() => {
    if (!hasTriggered || stat.isLive || stat.numericTarget === undefined) return;

    if (isReducedMotion) {
      setCurrentValue(stat.numericTarget);
      return;
    }

    const start = 0;
    const end = stat.numericTarget;
    const duration = 1600;
    const startTime = performance.now();

    let animId: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrentValue(start + (end - start) * eased);
      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        setCurrentValue(end);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [hasTriggered, stat.isLive, stat.numericTarget, isReducedMotion]);

  const formattedValue = () => {
    if (stat.isLive) return null;
    const num = (stat.decimals ?? 0) > 0 ? currentValue.toFixed(stat.decimals) : Math.floor(currentValue).toString();
    return `${stat.prefix ?? ""}${num}${stat.suffix ?? ""}`;
  };

  return (
    <div
      ref={itemRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`stats-item stats-slot-3d opacity-0 flex flex-col items-center text-center px-4 py-2 transition-transform duration-300 ${
        !isLast ? "md:border-r border-[#e5e0d8]" : ""
      }`}
      style={{
        transformStyle: isReducedMotion ? "flat" : "preserve-3d",
        transform: !isReducedMotion && hovered ? "translateZ(14px) rotateY(4deg)" : "translateZ(0px)",
      }}
    >
      <div
        className="stats-reel-3d flex items-center justify-center min-h-[44px]"
        style={{
          transformStyle: isReducedMotion ? "flat" : "preserve-3d",
        }}
      >
        {stat.isLive ? (
          <LiveCounter
            initialValue={stat.initialTarget}
            className="text-3xl font-bold tracking-tight"
            style={
              {
                color: "#c8860a",
                fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))",
              } as React.CSSProperties
            }
          />
        ) : (
          <span
            className="text-3xl font-bold tracking-tight select-none"
            style={{
              color: "#c8860a",
              fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))",
            }}
          >
            {hasTriggered ? formattedValue() : stat.prefix ? `${stat.prefix}0${stat.suffix}` : `0${stat.suffix ?? ""}`}
          </span>
        )}
      </div>

      <span
        className="mt-1.5 text-xs font-medium uppercase tracking-widest text-[#9e8d72]"
        style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
      >
        {stat.label}
      </span>
    </div>
  );
}

export function StatsBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  const motionSafe = useMotionSafe();
  const isReducedMotion = !motionSafe;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      if (isReducedMotion) {
        gsap.fromTo(
          ".stats-item",
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 85%",
              onEnter: () => setHasTriggered(true),
            },
          }
        );
        return;
      }

      // 3D Slot-Machine Cylindrical Reel Y-Axis Spin Entrance
      const items = gsap.utils.toArray<HTMLElement>(".stats-slot-3d");
      gsap.fromTo(
        items,
        {
          opacity: 0,
          rotateY: 720,
          z: -60,
          scale: 0.85,
        },
        {
          opacity: 1,
          rotateY: 0,
          z: 0,
          scale: 1,
          duration: 1.2,
          ease: "power4.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 85%",
            onEnter: () => setHasTriggered(true),
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [isReducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        borderTop: "1px solid rgba(26,18,8,0.08)",
        borderBottom: "1px solid rgba(26,18,8,0.08)",
        background: "#ffffff",
        perspective: isReducedMotion ? "none" : "800px",
      }}
    >
      <div className="mx-auto max-w-5xl px-6 py-10" style={{ transformStyle: "preserve-3d" }}>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4" style={{ transformStyle: "preserve-3d" }}>
          {STATS.map((stat, i) => (
            <SlotMachineStat
              key={stat.id}
              stat={stat}
              hasTriggered={hasTriggered}
              isReducedMotion={isReducedMotion}
              isLast={i === STATS.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default StatsBanner;
