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
      <div className="mt-4 rounded-xl border border-amber-500/10 bg-[#020204]/60 p-4">
        <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-amber-500/50">Translation preview</p>
        <p className="font-mono text-[11px] text-amber-300/70 leading-relaxed">
          {"// calculateTotal(items, taxRate)"}<br />
          <span className="text-amber-200 not-italic" style={{ fontFamily: "var(--font-lora, Georgia, serif)", fontStyle: "italic" }}>
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
  { icon: Search, title: "Search & Filter", description: "Full-text search across all your past translations." },
  { icon: BarChart3, title: "Statistics", description: "Track your most-used languages, translation counts, and usage patterns." },
  { icon: KeyboardIcon, title: "Keyboard Shortcuts", description: "Power-user shortcuts for every action — stay in flow without touching your mouse." },
  { icon: Zap, title: "Instant Results", description: "Groq-powered inference with intelligent caching. Most translations in under 3 seconds." },
  { icon: Shield, title: "Secure by Design", description: "Code is never stored. Processed in real-time and returned immediately." },
  { icon: Smartphone, title: "PWA Support", description: "Install as a native app on any device. Full offline access to your history." },
  { icon: Sparkles, title: "AI Generation", description: "From natural language to working code. Powered by DeepSeek and Groq." },
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
          stagger: 0.08,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
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
      className="landing-section relative border-t border-amber-500/8 py-32 overflow-hidden"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute bottom-0 right-0 -z-10 h-[500px] w-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%)" }}
      />

      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="feature-card-reveal mb-16 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
            Features
          </div>
          <h2
            className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight"
            style={{ fontFamily: "var(--font-lora, Georgia, serif)" }}
          >
            Everything you need to{" "}
            <span className="headline-gradient">understand code.</span>
          </h2>
          <p className="mt-5 text-lg text-slate-400">
            Three powerful translation modes, 35+ languages, and a suite of professional tools — all built around one mission: making code comprehensible.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Large featured cards */}
          {LARGE_FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`feature-card-reveal group rounded-2xl border p-7 transition-all duration-500 hover:scale-[1.02] cursor-default ${
                f.highlight
                  ? "border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-[#0c0c0f] to-[#0c0c0f] shadow-[0_0_40px_rgba(245,158,11,0.06)] col-span-1 md:col-span-2 lg:col-span-1"
                  : "border-white/5 bg-[#0c0c0f]/70 shadow-xl shadow-black/40 backdrop-blur-sm hover:border-amber-500/15"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/15 bg-amber-500/8 transition-all duration-300 group-hover:bg-amber-500/15 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <f.icon className="h-5 w-5 text-amber-400" />
                </div>
                <span className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-400/70">{f.badge}</span>
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.description}</p>
              {f.preview}
            </div>
          ))}

          {/* Small utility cards */}
          {SMALL_FEATURES.map((f) => (
            <div
              key={f.title}
              className="feature-card-reveal group rounded-2xl border border-white/5 bg-[#0c0c0f]/70 p-5 shadow-lg shadow-black/30 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/12 hover:scale-[1.02] cursor-default"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/12 bg-amber-500/5 transition-all duration-300 group-hover:bg-amber-500/12">
                <f.icon className="h-4 w-4 text-amber-400/80" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
