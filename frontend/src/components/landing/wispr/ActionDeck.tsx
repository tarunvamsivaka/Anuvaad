"use client";

/**
 * ActionDeck — The final conversion surface.
 *
 * Pricing is intentionally simple: Free, Pro (₹499), Enterprise (custom).
 * The billing toggle saves 20% on annual and is the only interactive pricing
 * element — no per-seat or feature-matrix complexity that buries the signal.
 *
 * The CLI command `npx anuvaad-cli init` is the secondary CTA for developers
 * who'd rather install than sign up through a browser. Keep it in sync with
 * what actually ships.
 *
 * The SVG checkmarks use stroke-dashoffset animation. If you change the check
 * path geometry, recalculate the dasharray via:
 *   `document.querySelector('path').getTotalLength()` in browser devtools.
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, ArrowRight, Copy, CheckCheck, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/lib/use-scroll-reveal";

export interface ActionDeckProps {
  onGetStarted?: () => void;
  onBookDemo?: () => void;
  className?: string;
}

export function ActionDeck({
  onGetStarted,
  onBookDemo,
  className,
}: ActionDeckProps) {
  const [copied, setCopied] = useState(false);
  const [checkmarks, setCheckmarks] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const proPrice = isAnnual ? 399 : 499;
  const proSavings = isAnnual ? "Save 20%" : null;
  const cliCommand = "npx anuvaad-cli init";

  const [sectionRef, isVisible] = useScrollReveal<HTMLElement>({ threshold: 0.2 });

  useEffect(() => {
    if (isVisible) {
      const t = setTimeout(() => setCheckmarks(true), 400);
      return () => clearTimeout(t);
    }
  }, [isVisible]);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(cliCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const TRUST_ITEMS = [
    "10 Free Translations / Day",
    "No Credit Card Required",
    "HMAC-SHA256 Audit Receipts",
    "CLI package available",
  ];

  return (
    <section
      ref={sectionRef}
      id="cta"
      className={cn("py-16 px-4 sm:px-6 lg:px-8 w-full", className)}
      aria-label="Get Started Call to Action"
    >
      <div className="max-w-6xl mx-auto rounded-3xl obsidian-deck text-white p-8 sm:p-14 relative overflow-hidden text-center border border-white/10">
        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Eyebrow */}
          <div
            className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-6 sr-fade-up", isVisible && "is-visible")}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Explore the workspace</span>
          </div>

          {/* Headline */}
          <h2
            className={cn("font-display text-3xl sm:text-5xl font-black tracking-tight text-white mb-6 sr-fade-up [text-wrap:balance]", isVisible && "is-visible")}
            style={{ "--sr-delay": "100ms" } as React.CSSProperties}
          >
            Your codebase shouldn&apos;t need a Rosetta Stone.
            <span className="text-amber-500"> But if it does, here&apos;s one.</span>
          </h2>

          {/* Subtitle */}
          <p
            className={cn("text-base sm:text-lg text-slate-400 leading-relaxed mb-8 sr-fade-up", isVisible && "is-visible")}
            style={{ "--sr-delay": "200ms" } as React.CSSProperties}
          >
            Paste any code — Python, Rust, Go, SQL, whatever — and get a plain-English explanation in under 2 seconds. Free to start, no card needed.
          </p>

          {/* Billing Toggle */}
          <div
            className={cn("flex items-center justify-center gap-3 mb-6 sr-fade-up", isVisible && "is-visible")}
            style={{ "--sr-delay": "220ms" } as React.CSSProperties}
          >
            <span className={cn("text-sm font-medium", !isAnnual ? "text-white" : "text-slate-400")}>Monthly</span>
            <button
              type="button"
              role="switch"
              aria-checked={isAnnual}
              aria-label="Toggle annual billing"
              onClick={() => setIsAnnual((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer",
                isAnnual ? "bg-amber-500" : "bg-slate-800"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                  isAnnual ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
            <span className={cn("text-sm font-medium", isAnnual ? "text-white" : "text-slate-400")}>
              Annual
              {isAnnual && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Save 20%
                </span>
              )}
            </span>
          </div>

          {/* Pricing Tier Grid */}
          <div
            className={cn("grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left sr-fade-up", isVisible && "is-visible")}
            style={{ "--sr-delay": "250ms" } as React.CSSProperties}
          >
            {/* Free Tier */}
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 flex flex-col gap-2 hover:border-white/20 transition-colors">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Free</div>
              <div className="text-2xl font-extrabold text-white font-mono">₹0<span className="text-sm font-normal text-slate-500">/mo</span></div>
              <ul className="space-y-1.5 text-xs text-slate-400 mt-1">
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> 10 translations/day</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> 35+ languages</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Zero code storage</li>
                <li className="flex items-center gap-1.5"><span className="text-slate-600">○</span> No PR review</li>
              </ul>
            </div>

            {/* Pro Tier — highlighted */}
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 flex flex-col gap-2 relative hover:border-amber-500/60 transition-colors">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 font-mono">
                RECOMMENDED
              </span>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">Pro</div>
              <div className="text-2xl font-extrabold text-white font-mono">
                ₹{proPrice}
                <span className="text-sm font-normal text-slate-500">/mo</span>
                {proSavings && (
                  <span className="ml-2 text-xs font-bold text-emerald-400 font-sans">{proSavings}</span>
                )}
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 mt-1">
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Unlimited translations</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> More room for larger projects</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Workspace access</li>
              </ul>
            </div>

            {/* Enterprise Tier */}
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 flex flex-col gap-2 hover:border-white/20 transition-colors">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Enterprise</div>
              <div className="text-2xl font-extrabold text-white font-mono">Custom</div>
              <ul className="space-y-1.5 text-xs text-slate-400 mt-1">
                <li className="flex items-center gap-1.5"><span className="text-slate-500">•</span> Ask about current availability</li>
                <li className="flex items-center gap-1.5"><span className="text-slate-500">•</span> Share your workspace needs</li>
              </ul>
            </div>
          </div>

          {/* Dual CTA Triggers */}
          <div
            className={cn("flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 sr-fade-up", isVisible && "is-visible")}
            style={{ "--sr-delay": "300ms" } as React.CSSProperties}
          >
            {onGetStarted ? (
              <button
                onClick={onGetStarted}
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md active:scale-98 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md active:scale-98 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {onBookDemo ? (
              <button
                onClick={onBookDemo}
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold border border-white/15 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Book Enterprise Demo</span>
              </button>
            ) : (
              <a
                href="#enterprise-contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold border border-white/15 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Book Enterprise Demo</span>
              </a>
            )}
          </div>

          {/* CLI Terminal Pill */}
          <div
            className={cn("inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-white/20 mb-8 font-mono text-xs text-slate-300 transition-colors group sr-fade-up", isVisible && "is-visible")}
            style={{ "--sr-delay": "350ms" } as React.CSSProperties}
          >
            <Terminal className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-slate-500">anuvaad ❯</span>
            <span className="select-all text-slate-200 font-semibold">{cliCommand}</span>
            <button
              onClick={handleCopy}
              type="button"
              aria-label={copied ? "Copied to clipboard" : "Copy CLI command to clipboard"}
              className="ml-2 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {copied ? (
                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            {copied ? (
              <span className="text-[10px] text-emerald-400 font-sans font-medium">
                Copied!
              </span>
            ) : (
              <kbd className="kbd-keycap hidden sm:inline-flex">⌘C</kbd>
            )}
          </div>

          {/* Trust Checklist */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 font-mono">
            {TRUST_ITEMS.map((item, idx) => (
              <div
                key={item}
                className={cn(
                  "flex items-center gap-1.5 transition-all duration-300",
                  checkmarks ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                )}
                style={{ transitionDelay: `${idx * 80}ms` }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="7" cy="7" r="6.5" stroke="rgba(52,211,153,0.3)" strokeWidth="1" />
                  <path
                    d="M4 7l2 2 4-4"
                    stroke="#34d399"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="10"
                    strokeDashoffset={checkmarks ? 0 : 10}
                    style={{ transition: `stroke-dashoffset 0.3s ease ${idx * 80 + 100}ms` }}
                  />
                </svg>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ActionDeck;
