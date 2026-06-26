"use client";

import { useState, useEffect, useRef } from "react";
import { LiveCounter } from "@/features/landing/_components/LiveCounter";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const STATS = [
  {
    id: "translations",
    label: "Translations made",
    isLive: true,
  },
  {
    id: "languages",
    value: "35+",
    label: "Languages supported",
    isLive: false,
  },
  {
    id: "speed",
    value: "< 3s",
    label: "Avg. translation time",
    isLive: false,
  },
  {
    id: "rating",
    value: "4.9 / 5",
    label: "Avg. user rating",
    isLive: false,
  },
];

export function StatsBanner() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".stats-item",
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: ref.current, start: "top 85%" },
        }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ref}
      className="relative w-full border-y border-black/06 bg-white/60 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.id}
              className={`stats-item opacity-0 flex flex-col items-center text-center ${
                i < STATS.length - 1
                  ? "md:border-r md:border-black/06"
                  : ""
              }`}
            >
              {stat.isLive ? (
                <LiveCounter
                  initialValue={4127000}
                  className="text-3xl font-bold tracking-tight"
                  style={{ color: "#c8860a", fontFamily: "var(--font-garamond, Georgia, serif)" } as React.CSSProperties}
                />
              ) : (
                <span
                  className="text-3xl font-bold tracking-tight"
                  style={{ color: "#c8860a", fontFamily: "var(--font-garamond, Georgia, serif)" }}
                >
                  {stat.value}
                </span>
              )}
              <span className="mt-1.5 text-xs font-medium uppercase tracking-widest text-neutral-400">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
