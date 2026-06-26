"use client";

import { useRef, useEffect } from "react";
import {
  Code2, Languages, BookOpen, Zap, Shield, Download,
  Clock, Search, BarChart3, KeyboardIcon, Smartphone, Sparkles,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const LARGE_FEATURES = [
  {
    icon: Code2,
    title: "Code → English",
    description: "Paste any code and get a clear, block-by-block explanation in plain English. Perfect for onboarding, code review, and legacy system archaeology.",
    badge: "Core",
    highlight: true,
    preview: (
      <div className="mt-5 rounded-2xl border border-black/07 bg-neutral-50 p-4">
        <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-neutral-400">Translation preview</p>
        <p className="font-mono text-[11px] text-neutral-500 leading-relaxed">
          {"// calculateTotal(items, taxRate)"}<br />
          <span className="text-neutral-800 block mt-2" style={{ fontFamily: "var(--font-garamond, Georgia, serif)", fontStyle: "italic", fontSize: "13px", lineHeight: "1.65" }}>
            Sums all item prices, applies the tax rate as a multiplier, and returns the final amount rounded to 2 decimal places.
          </span>
        </p>
      </div>
    ),
  },
  {
    icon: BookOpen,
    title: "English → Code",
    description: "Describe what you want in natural language. Get production-ready code generated instantly in any of 35+ languages.",
    badge: "Generate",
    highlight: false,
  },
  {
    icon: Languages,
    title: "Code → Code",
    description: "Translate between Python, JavaScript, Go, Rust, Java, C++, TypeScript, and 30+ more. Handles idioms, not just syntax.",
    badge: "35+ Languages",
    highlight: false,
  },
];

const SMALL_FEATURES = [
  { icon: Clock, title: "Translation History", description: "Cloud-synced history of every translation. Search, re-run, and pick up where you left off." },
  { icon: Download, title: "Export Anywhere", description: "Export as Markdown, JSON, or PDF. Perfect for documentation and team sharing." },
  { icon: Search, title: "Search & Filter", description: "Full-text search across all your past translations with instant results." },
  { icon: BarChart3, title: "Usage Analytics", description: "Track your most-used languages, translation counts, and usage patterns." },
  { icon: KeyboardIcon, title: "Keyboard Shortcuts", description: "Power-user shortcuts for every action — stay in flow without touching your mouse." },
  { icon: Zap, title: "Instant Results", description: "AI-powered inference with intelligent caching. Most translations in under 3 seconds." },
  { icon: Shield, title: "Secure by Design", description: "Code is never stored beyond your session. Processed in real-time and returned immediately." },
  { icon: Smartphone, title: "PWA Support", description: "Install as a native app on any device. Full offline access to your history." },
  { icon: Sparkles, title: "AI Generation", description: "From natural language to working code. Powered by Gemini and cutting-edge models." },
];

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".feature-card-reveal",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.07,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 78%",
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="wispr-section-light relative py-32 overflow-hidden"
    >
      {/* Subtle noise texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="feature-card-reveal mb-16 max-w-2xl">
          <div className="wispr-eyebrow-pill-light mb-5">
            <Sparkles className="h-3 w-3 opacity-60" />
            Everything You Need
          </div>
          <h2
            className="wispr-headline text-neutral-900 mb-5"
            style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
          >
            Built for developers who{" "}
            <span style={{ color: "#c8860a", fontStyle: "italic" }}>understand code.</span>
          </h2>
          <p className="text-[17px] text-neutral-500 leading-relaxed">
            Three powerful translation modes, 35+ languages, and a suite of professional tools — all built around one mission: making code comprehensible.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Large featured cards */}
          {LARGE_FEATURES.map((f) => (
            <div
              key={f.title}
              className={`feature-card-reveal group rounded-3xl border p-7 transition-all duration-400 cursor-default overflow-hidden relative ${
                f.highlight
                  ? "border-amber-200/80 bg-white shadow-[0_8px_40px_rgba(200,134,10,0.08)] col-span-1 md:col-span-2 lg:col-span-1 hover:shadow-[0_12px_60px_rgba(200,134,10,0.12)]"
                  : "border-black/07 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.10)] hover:border-amber-200/60"
              }`}
              style={{ transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              {/* Hover shimmer — very subtle warm */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/0 to-amber-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl" />

              <div className="flex items-start justify-between relative z-10">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 ${
                  f.highlight
                    ? "border-amber-200 bg-amber-50 group-hover:bg-amber-100 group-hover:border-amber-300"
                    : "border-neutral-200 bg-neutral-50 group-hover:bg-amber-50 group-hover:border-amber-200"
                }`}>
                  <f.icon className="h-5 w-5 text-amber-600" />
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                  f.highlight
                    ? "border border-amber-200 bg-amber-50 text-amber-700"
                    : "border border-neutral-200 bg-neutral-50 text-neutral-500"
                }`}>
                  {f.badge}
                </span>
              </div>
              <h3
                className="relative z-10 mt-5 text-xl font-semibold tracking-tight text-neutral-900"
                style={{ fontFamily: "var(--font-garamond, Georgia, serif)" }}
              >
                {f.title}
              </h3>
              <p className="relative z-10 mt-2.5 text-sm leading-relaxed text-neutral-500 group-hover:text-neutral-600 transition-colors">
                {f.description}
              </p>
              {f.preview}
            </div>
          ))}

          {/* Small utility cards */}
          {SMALL_FEATURES.map((f) => (
            <div
              key={f.title}
              className="feature-card-reveal group rounded-3xl border border-black/07 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)] cursor-default relative overflow-hidden hover:shadow-[0_6px_32px_rgba(0,0,0,0.09)] hover:border-amber-200/60"
              style={{ transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-amber-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />

              <div className="relative z-10 mb-3.5 flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 group-hover:bg-amber-50 group-hover:border-amber-200 transition-all duration-300">
                <f.icon className="h-4 w-4 text-neutral-400 group-hover:text-amber-600 transition-colors" />
              </div>
              <h3 className="relative z-10 text-sm font-semibold text-neutral-900 tracking-tight">{f.title}</h3>
              <p className="relative z-10 mt-1.5 text-xs leading-relaxed text-neutral-400 group-hover:text-neutral-500 transition-colors">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
