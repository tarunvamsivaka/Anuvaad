"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, ArrowRight, Copy, CheckCheck } from "lucide-react";
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
  const cliCommand = "npx anuvaad-cli init";

  const [sectionRef, isVisible] = useScrollReveal<HTMLElement>({ threshold: 0.2 });

  // Trigger checkmark stagger when section becomes visible
  useEffect(() => {
    if (isVisible) {
      const t = setTimeout(() => setCheckmarks(true), 600);
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
    "Zero Code Storage Guarantee",
    "SOC2 Type II Certified",
  ];

  return (
    <section
      ref={sectionRef}
      id="cta"
      className={cn("py-16 px-4 sm:px-6 lg:px-8 w-full", className)}
      aria-label="Get Started Call to Action"
    >
      <div className="max-w-6xl mx-auto rounded-3xl bg-slate-950 text-white p-10 sm:p-16 border border-slate-800 shadow-2xl relative overflow-hidden text-center">

        {/* Pulsing radial glow background */}
        <div
          className="radial-breathe pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.18),transparent_60%)]"
          style={{ animation: "radial-glow-breathe 4s ease-in-out infinite" }}
          aria-hidden="true"
        />

        {/* Subtle corner glows */}
        <div className="pointer-events-none absolute top-0 left-0 w-64 h-64 bg-[radial-gradient(ellipse,rgba(245,158,11,0.05),transparent_70%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse,rgba(56,189,248,0.04),transparent_70%)]" aria-hidden="true" />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Eyebrow */}
          <div
            className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-6 sr-fade-up", isVisible && "is-visible")}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ready for Instant Code Comprehension?</span>
          </div>

          {/* Headline */}
          <h2
            className={cn("text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 sr-fade-up", isVisible && "is-visible")}
            style={{ "--sr-delay": "100ms" } as React.CSSProperties}
          >
            Transform How Your Engineering Team Reads Code.
          </h2>

          {/* Subtitle */}
          <p
            className={cn("text-base sm:text-lg text-slate-400 leading-relaxed mb-8 sr-fade-up", isVisible && "is-visible")}
            style={{ "--sr-delay": "200ms" } as React.CSSProperties}
          >
            Join thousands of developers turning cryptographic legacy
            repositories into clean, readable documentation. Start in under 60
            seconds.
          </p>

          {/* Pricing Tier Grid */}
          <div
            className={cn("grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 text-left sr-fade-up", isVisible && "is-visible")}
            style={{ "--sr-delay": "250ms" } as React.CSSProperties}
          >
            {/* Free Tier */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 flex flex-col gap-2 hover:border-slate-600 transition-colors">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Free</div>
              <div className="text-2xl font-extrabold text-white">₹0<span className="text-sm font-normal text-slate-500">/mo</span></div>
              <ul className="space-y-1.5 text-xs text-slate-400 mt-1">
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> 10 translations/day</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> 35+ languages</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Zero code storage</li>
                <li className="flex items-center gap-1.5"><span className="text-slate-600">○</span> No PR review</li>
              </ul>
            </div>

            {/* Pro Tier — highlighted */}
            <div className="rounded-2xl border border-amber-500/50 bg-amber-500/5 p-4 flex flex-col gap-2 relative hover:border-amber-500/70 transition-colors">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                RECOMMENDED
              </span>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Pro</div>
              <div className="text-2xl font-extrabold text-white">₹499<span className="text-sm font-normal text-slate-500">/mo</span></div>
              <ul className="space-y-1.5 text-xs text-slate-300 mt-1">
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Unlimited translations</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Priority &lt;1.5s latency</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Full PR AI review</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> API access</li>
              </ul>
            </div>

            {/* Enterprise Tier */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 flex flex-col gap-2 hover:border-slate-600 transition-colors">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Enterprise</div>
              <div className="text-2xl font-extrabold text-white">Custom</div>
              <ul className="space-y-1.5 text-xs text-slate-400 mt-1">
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Unlimited team seats</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> SOC2 + HIPAA BAA</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> VPC / air-gap deploy</li>
                <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> SAML SSO + SCIM</li>
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
                className="cta-btn-glow w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                style={{ animation: "cta-glow-breathe 3.5s ease-in-out 1s infinite" }}
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/signup"
                className="cta-btn-glow w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                style={{ animation: "cta-glow-breathe 3.5s ease-in-out 1s infinite" }}
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {onBookDemo ? (
              <button
                onClick={onBookDemo}
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold border border-slate-700 bg-slate-900/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200 hover:text-white transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Book Enterprise Demo</span>
              </button>
            ) : (
              <a
                href="#enterprise-contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold border border-slate-700 bg-slate-900/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200 hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Book Enterprise Demo</span>
              </a>
            )}
          </div>

          {/* CLI Quick Action Pill — with blinking cursor */}
          <div
            className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 mb-8 font-mono text-xs text-slate-300 transition-colors group sr-fade-up", isVisible && "is-visible")}
            style={{ "--sr-delay": "400ms" } as React.CSSProperties}
          >
            <span className="text-slate-500">$</span>
            <span className="select-all">{cliCommand}</span>
            {/* Blinking cursor */}
            <span
              className="inline-block w-[6px] h-[13px] bg-amber-500/70 rounded-sm"
              style={{ animation: "cursor-blink 1.1s step-end infinite" }}
              aria-hidden="true"
            />
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
            {copied && (
              <span className="text-[10px] text-emerald-400 font-sans font-medium">
                Copied!
              </span>
            )}
          </div>

          {/* Trust Checklist — staggered entrance */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
            {TRUST_ITEMS.map((item, idx) => (
              <div
                key={item}
                className={cn(
                  "flex items-center gap-1.5 transition-all duration-500",
                  checkmarks ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                )}
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                {/* Animated SVG check */}
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
                    style={{ transition: `stroke-dashoffset 0.4s ease ${idx * 100 + 200}ms` }}
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
